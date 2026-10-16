import { query } from '../db/index.js';
import { generateAnswerStream } from './rag_service.js';
import { buildCitations } from './citationService.js';
import { recordUsage } from './usageService.js';
import logger from '../utils/logger.js';

const writeSse = (res, { event, data }) => {
  if (res.writableEnded || res.destroyed) return;
  try {
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
  } catch {
    // Client connection closed, ignore write failure
  }
};

const persistAssistantMessage = async ({ chatId, documentId, finalResult, accumulatedText }) => {
  if (finalResult?.answer_type === 'table' && finalResult.table) {
    await query(
      `INSERT INTO chat_history (chat_id, document_id, role, content)
       VALUES ($1, $2, 'ai', $3)`,
      [
        chatId,
        documentId || null,
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
    [chatId, documentId || null, finalResult?.answer || accumulatedText || '']
  );
};

export const streamRagResponse = async (req, res, { 
  documentId, 
  question, 
  chatId, 
  intent, 
  model, 
  requestId, 
  chatHistory = [],
  thinkingMode = false,
  webMode = false,
  personalization = null,
  projectId = null,
}) => {
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
      requestLogger.info('STREAM_DISCONNECT', 'Client stream connection closed', { area: 'STREAM' });
    }
  };

  res.on('close', handleConnectionClosed);

  requestLogger.info('LLM', 'Streaming started', { question, thinkingMode, webMode });
  writeSse(res, { event: 'chatId', data: { chatId } });

  const generator = generateAnswerStream(question, documentId, intent, model, chatHistory, {
    thinkingMode,
    webMode,
    personalization,
  });

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
      generator.return?.();
      return;
    }

    // Emit live web sources if available
    if (finalResult?.webSources?.length) {
      writeSse(res, {
        event: 'webSources',
        data: {
          webSources: finalResult.webSources,
        },
      });
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
        webSources: finalResult?.webSources || [],
        thinkingMode,
      },
    });

    // Record token usage
    const inputTokens = finalResult?.inputTokens || Math.round(question.length / 4) + 500;
    const outputTokens = finalResult?.outputTokens || tokenCount;
    const totalTokens = inputTokens + outputTokens;
    const usedModel = finalResult?.modelUsed || model || 'default';

    if (req.user?.id) {
      await recordUsage({
        userId: req.user.id,
        chatId,
        documentId,
        projectId,
        modelName: usedModel,
        usageType: 'chat',
        inputTokens,
        outputTokens,
        totalTokens,
      });
    }

    // Emit usage stats event
    writeSse(res, {
      event: 'usage',
      data: {
        inputTokens,
        outputTokens,
        totalTokens,
        modelUsed: usedModel,
      },
    });

    await persistAssistantMessage({ chatId, documentId, finalResult, accumulatedText });
    await query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [chatId]);

    requestLogger.info('STREAM COMPLETE', 'Streaming finished', {
      citationCount: citations.length,
      answerType: finalResult?.answer_type || 'text',
      modelUsed: usedModel,
      tokenCount,
      inputTokens,
      outputTokens,
      answerLength: (finalResult?.answer || accumulatedText || '').length,
    });

    streamCompleted = true;
    writeSse(res, { event: 'done', data: { ok: true } });
    clearInterval(heartbeat);
    res.end();
  } catch (error) {
    clearInterval(heartbeat);
    if (!connectionClosed) {
      requestLogger.error('ERROR', 'Streaming failed', {
        area: 'STREAM',
        error: error.message,
      });

      writeSse(res, { event: 'error', data: { error: error.message } });
      try { res.end(); } catch {}
    } else {
      requestLogger.info('STREAM_DISCONNECT', 'Streaming aborted after client disconnect', {
        area: 'STREAM',
        reason: error.message,
      });
    }
  } finally {
    res.off?.('close', handleConnectionClosed);
  }
};
