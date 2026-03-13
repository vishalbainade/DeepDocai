import { query } from '../db/index.js';
import { generateAnswerStream } from './rag_service.js';
import { buildCitations } from './citationService.js';
import logger from '../utils/logger.js';

const writeSse = (res, { event, data }) => {
  if (event) {
    res.write(`event: ${event}\n`);
  }

  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  String(payload)
    .split(/\r?\n/)
    .forEach((line) => {
      res.write(`data: ${line}\n`);
    });

  res.write('\n');
};

const persistAssistantMessage = async ({ chatId, documentId, finalResult, accumulatedText }) => {
  if (finalResult?.answer_type === 'table' && finalResult.table) {
    await query(
      `INSERT INTO chat_history (chat_id, document_id, role, content)
       VALUES ($1, $2, 'ai', $3)`,
      [
        chatId,
        documentId,
        JSON.stringify({
          answer_type: 'table',
          answer: finalResult.answer || '',
          table: finalResult.table,
        }),
      ]
    );
    return;
  }

  await query(
    `INSERT INTO chat_history (chat_id, document_id, role, content)
     VALUES ($1, $2, 'ai', $3)`,
    [chatId, documentId, finalResult?.answer || accumulatedText || '']
  );
};

export const streamRagResponse = async (req, res, { documentId, question, chatId, intent, model, requestId }) => {
  const requestLogger = logger.child({ requestId, chatId, documentId });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const heartbeat = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 15000);

  let connectionClosed = false;
  let streamCompleted = false;

  const handleConnectionClosed = () => {
    connectionClosed = true;
    clearInterval(heartbeat);
    if (!streamCompleted) {
      requestLogger.error('ERROR', 'Streaming connection closed', { area: 'STREAM' });
    }
  };

  res.on('close', handleConnectionClosed);

  requestLogger.info('LLM', 'Streaming started', { question });
  writeSse(res, { event: 'chatId', data: { chatId } });

  const generator = generateAnswerStream(question, documentId, intent, model);
  let accumulatedText = '';
  let finalResult = null;
  let tokenCount = 0;

  try {
    while (!connectionClosed) {
      const { value, done } = await generator.next();

      if (done) {
        finalResult = value || null;
        break;
      }

      if (typeof value === 'string') {
        accumulatedText += value;
        tokenCount += 1;
        if (requestLogger.isLevelEnabled('debug') && (tokenCount === 1 || tokenCount % 50 === 0)) {
          requestLogger.debug('TOKEN STREAM', 'Token emitted', {
            tokenCount,
            tokenPreview: value.slice(0, 40),
          });
        }
        writeSse(res, { data: value });
      }
    }

    if (connectionClosed) {
      return;
    }

    const citations = buildCitations(finalResult?.sources || []);
    writeSse(res, {
      event: 'citations',
      data: {
        citations,
        paragraphCitations: finalResult?.paragraphCitations || [],
      },
    });

    writeSse(res, {
      event: 'complete',
      data: {
        answer_type: finalResult?.answer_type || 'text',
        answer: finalResult?.answer || accumulatedText,
        table: finalResult?.table || null,
        citations,
        paragraphCitations: finalResult?.paragraphCitations || [],
      },
    });

    await persistAssistantMessage({ chatId, documentId, finalResult, accumulatedText });
    await query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [chatId]);

    requestLogger.info('STREAM COMPLETE', 'Streaming finished', {
      citationCount: citations.length,
      answerType: finalResult?.answer_type || 'text',
      modelUsed: finalResult?.modelUsed || model || null,
      tokenCount,
      answerLength: (finalResult?.answer || accumulatedText || '').length,
    });

    streamCompleted = true;
    writeSse(res, { event: 'done', data: { ok: true } });
    clearInterval(heartbeat);
    res.end();
  } catch (error) {
    clearInterval(heartbeat);
    requestLogger.error('ERROR', 'Streaming failed', {
      area: 'STREAM',
      error: error.message,
    });

    if (!connectionClosed) {
      writeSse(res, { event: 'error', data: { error: error.message } });
      res.end();
    }
  } finally {
    res.off?.('close', handleConnectionClosed);
  }
};
