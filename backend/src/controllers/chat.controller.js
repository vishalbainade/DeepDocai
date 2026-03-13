import { randomUUID } from 'crypto';
import { query } from '../db/index.js';
import { generateAnswer } from '../services/rag_service.js';
import { streamRagResponse } from '../services/streamingService.js';
import { buildCitations } from '../services/citationService.js';
import logger from '../utils/logger.js';
import { getAvailableTextModels } from '../config/modelRegistry.js';

const getChatPayload = (req) => {
  if (req.method === 'GET') {
    return req.query || {};
  }

  return req.body || {};
};

const ensureChat = async ({ chatId, userId, documentId, question }) => {
  if (chatId) {
    return chatId;
  }

  const chatResult = await query(
    `INSERT INTO chats (user_id, document_id, title)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [userId, documentId, `${question.substring(0, 50)}${question.length > 50 ? '...' : ''}`]
  );

  return chatResult.rows[0].id;
};

const storeUserMessage = async ({ chatId, documentId, question }) => {
  await query(
    `INSERT INTO chat_history (chat_id, document_id, role, content)
     VALUES ($1, $2, 'user', $3)`,
    [chatId, documentId, question]
  );
};

export const askQuestion = async (req, res) => {
  const { documentId, question, chatId, intent, model } = getChatPayload(req);
  const requestId = randomUUID();
  const requestLogger = logger.child({ requestId, documentId, chatId });

  try {
    if (!documentId || !question) {
      return res.status(400).json({ error: 'Document ID and question are required' });
    }

    requestLogger.info('CHAT REQUEST', 'Query received', {
      question,
      requestedModel: model || 'default',
      intent: intent || 'auto',
    });

    const currentChatId = await ensureChat({
      chatId,
      userId: req.user.id,
      documentId,
      question,
    });

    await storeUserMessage({ chatId: currentChatId, documentId, question });
    const result = await generateAnswer(question, documentId, intent, model);
    const citations = buildCitations(result.sources || []);
    requestLogger.info('DATA FLOW', 'Answer generated', {
      answerType: result.answer_type || 'text',
      modelUsed: result.modelUsed || model || null,
      citationCount: citations.length,
      paragraphCitationCount: (result.paragraphCitations || []).length,
    });

    const aiContent =
      result.answer_type === 'table'
        ? JSON.stringify({
            answer_type: 'table',
            answer: result.answer || '',
            table: result.table,
          })
        : result.answer;

    await query(
      `INSERT INTO chat_history (chat_id, document_id, role, content)
       VALUES ($1, $2, 'ai', $3)`,
      [currentChatId, documentId, aiContent || '']
    );
    await query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [currentChatId]);

    return res.json({
      answer: result.answer || '',
      answer_type: result.answer_type || 'text',
      table: result.table || null,
      citations,
      paragraphCitations: result.paragraphCitations || [],
      chatId: currentChatId,
    });
  } catch (error) {
    requestLogger.error('ERROR', 'Chat request failed', {
      area: 'CHAT CONTROLLER',
      error: error.message,
    });
    return res.status(500).json({
      error: 'Failed to process question',
      message: error.message,
    });
  }
};

export const streamQuestion = async (req, res) => {
  const { documentId, question, chatId, intent, model } = getChatPayload(req);
  const requestId = randomUUID();
  const requestLogger = logger.child({ requestId, documentId, chatId });

  try {
    if (!documentId || !question) {
      if (!res.headersSent) {
        return res.status(400).json({ error: 'Document ID and question are required' });
      }

      res.write(`event: error\ndata: ${JSON.stringify({ error: 'Document ID and question are required' })}\n\n`);
      res.end();
      return;
    }

    requestLogger.info('CHAT REQUEST', 'Query received', {
      question,
      requestedModel: model || 'default',
      intent: intent || 'auto',
    });

    const currentChatId = await ensureChat({
      chatId,
      userId: req.user.id,
      documentId,
      question,
    });

    await storeUserMessage({ chatId: currentChatId, documentId, question });

    await streamRagResponse(req, res, {
      documentId,
      question,
      chatId: currentChatId,
      intent,
      model,
      requestId,
    });
  } catch (error) {
    requestLogger.error('ERROR', 'Failed to initialize stream', {
      area: 'STREAM CONTROLLER',
      error: error.message,
    });

    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to initialize stream', message: error.message });
    }

    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
};

export const getHistory = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const chatCheck = await query('SELECT id FROM chats WHERE id = $1 AND user_id = $2', [chatId, userId]);
    if (!chatCheck.rows.length) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const result = await query(
      `SELECT id, role, content, created_at
       FROM chat_history
       WHERE chat_id = $1
       ORDER BY created_at ASC`,
      [chatId]
    );

    const messages = result.rows.map((message) => {
      let parsedContent = message.content;
      let answerType = 'text';
      let table = null;

      if (message.role === 'ai' && typeof message.content === 'string' && message.content.startsWith('{')) {
        try {
          const parsed = JSON.parse(message.content);
          if (parsed.answer_type === 'table' && parsed.table) {
            answerType = 'table';
            table = parsed.table;
            parsedContent = parsed.answer || '';
          }
        } catch {
          parsedContent = message.content;
        }
      }

      return {
        id: message.id,
        role: message.role,
        content: parsedContent,
        answer_type: answerType,
        table,
        createdAt: message.created_at,
      };
    });

    return res.json({ messages });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch chat history' });
  }
};

export const improveText = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const prompt = `Improve and enhance the following question for document analysis. Return only the improved text.

Original: ${text}

Improved:`;

    const geminiClient = (await import('../services/gemini-client.js')).default;
    const execution = await geminiClient.executeWithFallback(
      async (genAI, modelName) => {
        const model = genAI.getGenerativeModel({ model: modelName });
        return model.generateContent(prompt);
      },
      { taskLabel: 'Prompt Enhancement', preferredModel: geminiClient.MODELS.TEXT }
    );
    logger.info('LLM', 'Prompt improvement generated', {
      modelUsed: execution.modelName,
      requestedModel: execution.requestedModel,
      inputLength: text.length,
    });

    return res.json({ improvedText: (await execution.result.response).text().trim() });
  } catch (error) {
    logger.error('ERROR', 'Failed to improve text', {
      area: 'IMPROVE TEXT',
      error: error.message,
    });
    return res.status(500).json({
      error: 'Failed to improve text',
      message: error.message,
    });
  }
};

export const getAvailableModels = async (req, res) => {
  return res.json({
    models: getAvailableTextModels(),
  });
};
