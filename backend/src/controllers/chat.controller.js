import { randomUUID } from 'crypto';
import { query } from '../db/index.js';
import { generateAnswer } from '../services/rag_service.js';
import { streamRagResponse } from '../services/streamingService.js';
import { buildCitations } from '../services/citationService.js';
import logger from '../utils/logger.js';
import { getAvailableTextModels } from '../config/modelRegistry.js';
import { recordUsage } from '../services/usageService.js';

const getChatPayload = (req) => {
  if (req.method === 'GET') {
    return req.query || {};
  }

  return req.body || {};
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const resolveOwnedDocumentId = async ({ documentId, userId }) => {
  if (!documentId || !UUID_REGEX.test(documentId)) {
    return null;
  }

  const documentResult = await query(
    'SELECT id FROM documents WHERE id = $1 AND user_id = $2',
    [documentId, userId]
  );

  if (documentResult.rows.length === 0) {
    throw createHttpError('Document not found', 404);
  }

  return documentResult.rows[0].id;
};

const ensureChat = async ({ chatId, userId, documentId, question }) => {
  if (chatId) {
    const chatResult = await query(
      `SELECT id, document_id
       FROM chats
       WHERE id = $1 AND user_id = $2`,
      [chatId, userId]
    );

    if (chatResult.rows.length === 0) {
      throw createHttpError('Chat not found', 404);
    }

    const chat = chatResult.rows[0];
    if (documentId && chat.document_id && documentId !== chat.document_id) {
      throw createHttpError('This document does not belong to the current chat', 409);
    }

    return {
      id: chat.id,
      documentId: chat.document_id,
    };
  }

  const chatResult = await query(
    `INSERT INTO chats (user_id, document_id, title)
     VALUES ($1, $2, $3)
     RETURNING id, document_id`,
    [userId, documentId, `${question.substring(0, 50)}${question.length > 50 ? '...' : ''}`]
  );

  return {
    id: chatResult.rows[0].id,
    documentId: chatResult.rows[0].document_id,
  };
};

const titleNewChatFromFirstMessage = async ({ chatId, userId, question }) => {
  const title = `${question.trim().substring(0, 50)}${question.trim().length > 50 ? '...' : ''}`;
  if (!title) return;

  await query(
    `UPDATE chats
     SET title = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
       AND user_id = $3
       AND title = 'New Chat'
       AND NOT EXISTS (
         SELECT 1 FROM chat_history WHERE chat_id = $2
       )`,
    [title, chatId, userId]
  );
};

const storeUserMessage = async ({ chatId, documentId, question }) => {
  await query(
    `INSERT INTO chat_history (chat_id, document_id, role, content)
     VALUES ($1, $2, 'user', $3)`,
    [chatId, documentId, question]
  );
};

// Projects carry their own working instructions. Resolve them server-side so a
// client cannot accidentally apply another user's project configuration.
const getProjectInstructions = async ({ projectId, userId }) => {
  if (!projectId) return '';

  const result = await query(
    `SELECT custom_instructions
     FROM projects
     WHERE id = $1 AND user_id = $2`,
    [projectId, userId]
  );

  return result.rows[0]?.custom_instructions || '';
};

const applyProjectInstructions = async ({ personalization, projectId, userId }) => {
  const projectInstructions = await getProjectInstructions({ projectId, userId });
  if (!projectInstructions.trim()) return personalization;

  return {
    ...personalization,
    customInstructions: [
      `Project instructions: ${projectInstructions.trim()}`,
      personalization?.customInstructions?.trim(),
    ].filter(Boolean).join('\n\n'),
  };
};

export const askQuestion = async (req, res) => {
  const { documentId, question, chatId, intent, model, thinkingMode, webMode, projectId, personalization } = getChatPayload(req);
  const requestId = randomUUID();
  const requestLogger = logger.child({ requestId, documentId, chatId });

  try {
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const isThinking = thinkingMode === true || thinkingMode === 'true';
    const isWeb = webMode === true || webMode === 'true';
    const validDocumentId = await resolveOwnedDocumentId({ documentId, userId: req.user.id });

    // Fetch user personalization preferences & learned memories
    const prefsResult = await query(
      `SELECT custom_instructions, persona, tone, jurisdiction, output_format, memories, memory_enabled, history_limit 
       FROM user_preferences WHERE user_id = $1`,
      [req.user.id]
    );
    const userPrefs = prefsResult.rows[0] || {};
    const interactionLimit = Math.min(Math.max(Number(userPrefs.history_limit) || 10, 2), 30);
    const activeMemories = userPrefs.memory_enabled !== false ? (userPrefs.memories || []) : [];

    let mergedPersonalization = {
      customInstructions: personalization?.customInstructions || userPrefs.custom_instructions || '',
      persona: personalization?.persona || userPrefs.persona || 'legal_counsel',
      tone: personalization?.tone || userPrefs.tone || 'concise',
      jurisdiction: personalization?.jurisdiction || userPrefs.jurisdiction || 'general',
      outputFormat: personalization?.outputFormat || userPrefs.output_format || 'citations_tables',
      memories: activeMemories,
    };
    mergedPersonalization = await applyProjectInstructions({
      personalization: mergedPersonalization,
      projectId,
      userId: req.user.id,
    });

    requestLogger.info('CHAT REQUEST', 'Query received', {
      question,
      requestedModel: model || 'default',
      intent: intent || 'auto',
      thinkingMode: isThinking,
      webMode: isWeb,
      memoriesCount: activeMemories.length,
      interactionLimit,
      hasDocument: !!validDocumentId,
    });

    const currentChat = await ensureChat({
      chatId,
      userId: req.user.id,
      documentId: validDocumentId,
      question,
    });
    const currentChatId = currentChat.id;
    const chatDocumentId = currentChat.documentId;

    let chatHistory = [];
    if (chatId) {
      const historyResult = await query(
        `SELECT role, content FROM chat_history 
         WHERE chat_id = $1 
         ORDER BY created_at DESC LIMIT $2`,
        [currentChatId, interactionLimit]
      );
      chatHistory = historyResult.rows.reverse();
    }

    await titleNewChatFromFirstMessage({ chatId: currentChatId, userId: req.user.id, question });
    await storeUserMessage({ chatId: currentChatId, documentId: chatDocumentId, question });

    const result = await generateAnswer(question, chatDocumentId, intent, model, chatHistory, {
      thinkingMode: isThinking,
      webMode: isWeb,
      personalization: mergedPersonalization,
      projectId,
    });

    const citations = buildCitations(result.sources || []);
    requestLogger.info('DATA FLOW', 'Answer generated', {
      answerType: result.answer_type || 'text',
      modelUsed: result.modelUsed || model || null,
      citationCount: citations.length,
      paragraphCitationCount: (result.paragraphCitations || []).length,
      webSourcesCount: (result.webSources || []).length,
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
      [currentChatId, chatDocumentId, aiContent || '']
    );
    await query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [currentChatId]);

    // Record token usage
    const inputTokens = result.inputTokens || Math.round(question.length / 4) + 500;
    const outputTokens = result.outputTokens || Math.round((result.answer || '').length / 4);
    const totalTokens = inputTokens + outputTokens;

    await recordUsage({
      userId: req.user.id,
      chatId: currentChatId,
      documentId: chatDocumentId,
      projectId,
      modelName: result.modelUsed || model || 'default',
      usageType: 'chat',
      inputTokens,
      outputTokens,
      totalTokens,
    });

    return res.json({
      answer: result.answer || '',
      answer_type: result.answer_type || 'text',
      table: result.table || null,
      citations,
      paragraphCitations: result.paragraphCitations || [],
      webSources: result.webSources || [],
      thinkingMode: isThinking,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens,
        modelUsed: result.modelUsed || model || 'default',
      },
      chatId: currentChatId,
    });
  } catch (error) {
    requestLogger.error('ERROR', 'Chat request failed', {
      area: 'CHAT CONTROLLER',
      error: error.message,
    });
    return res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Failed to process question',
      message: error.message,
    });
  }
};

const recentStreamRequests = new Map();

export const streamQuestion = async (req, res) => {
  const { documentId, question, chatId, intent, model, thinkingMode, webMode, projectId, personalization } = getChatPayload(req);
  const requestId = randomUUID();
  const requestLogger = logger.child({ requestId, documentId, chatId });

  try {
    if (!question || !question.trim()) {
      if (!res.headersSent) {
        return res.status(400).json({ error: 'Question is required' });
      }

      res.write(`event: error\ndata: ${JSON.stringify({ error: 'Question is required' })}\n\n`);
      res.end();
      return;
    }

    // Deduplicate rapid identical stream requests (e.g. rapid double clicks or StrictMode)
    const dedupKey = `${req.user.id}:${chatId || 'new'}:${question.trim()}`;
    const now = Date.now();
    const lastRequestTime = recentStreamRequests.get(dedupKey);
    if (lastRequestTime && now - lastRequestTime < 1500) {
      requestLogger.info('DEDUPLICATION', 'Ignoring duplicate rapid stream request', { dedupKey });
      res.setHeader('Content-Type', 'text/event-stream');
      res.write(': duplicate ignored\n\n');
      res.end();
      return;
    }
    recentStreamRequests.set(dedupKey, now);
    if (recentStreamRequests.size > 200) {
      for (const [k, t] of recentStreamRequests.entries()) {
        if (now - t > 10000) recentStreamRequests.delete(k);
      }
    }

    const isThinking = thinkingMode === true || thinkingMode === 'true';
    const isWeb = webMode === true || webMode === 'true';
    const validDocumentId = await resolveOwnedDocumentId({ documentId, userId: req.user.id });

    // Fetch user personalization preferences & learned memories
    const prefsResult = await query(
      `SELECT custom_instructions, persona, tone, jurisdiction, output_format, memories, memory_enabled, history_limit 
       FROM user_preferences WHERE user_id = $1`,
      [req.user.id]
    );
    const userPrefs = prefsResult.rows[0] || {};
    const interactionLimit = Math.min(Math.max(Number(userPrefs.history_limit) || 10, 2), 30);
    const activeMemories = userPrefs.memory_enabled !== false ? (userPrefs.memories || []) : [];

    let mergedPersonalization = {
      customInstructions: personalization?.customInstructions || userPrefs.custom_instructions || '',
      persona: personalization?.persona || userPrefs.persona || 'legal_counsel',
      tone: personalization?.tone || userPrefs.tone || 'concise',
      jurisdiction: personalization?.jurisdiction || userPrefs.jurisdiction || 'general',
      outputFormat: personalization?.outputFormat || userPrefs.output_format || 'citations_tables',
      memories: activeMemories,
    };
    mergedPersonalization = await applyProjectInstructions({
      personalization: mergedPersonalization,
      projectId,
      userId: req.user.id,
    });

    requestLogger.info('CHAT REQUEST', 'Query received', {
      question,
      requestedModel: model || 'default',
      intent: intent || 'auto',
      thinkingMode: isThinking,
      webMode: isWeb,
      memoriesCount: activeMemories.length,
      interactionLimit,
      hasDocument: !!validDocumentId,
    });

    const currentChat = await ensureChat({
      chatId,
      userId: req.user.id,
      documentId: validDocumentId,
      question,
    });
    const currentChatId = currentChat.id;
    const chatDocumentId = currentChat.documentId;

    let chatHistory = [];
    if (chatId) {
      const historyResult = await query(
        `SELECT role, content FROM chat_history 
         WHERE chat_id = $1 
         ORDER BY created_at DESC LIMIT $2`,
        [currentChatId, interactionLimit]
      );
      chatHistory = historyResult.rows.reverse();
    }

    await titleNewChatFromFirstMessage({ chatId: currentChatId, userId: req.user.id, question });
    await storeUserMessage({ chatId: currentChatId, documentId: chatDocumentId, question });

    await streamRagResponse(req, res, {
      documentId: chatDocumentId,
      question,
      chatId: currentChatId,
      intent,
      model,
      requestId,
      chatHistory,
      thinkingMode: isThinking,
      webMode: isWeb,
      personalization: mergedPersonalization,
      projectId,
    });
  } catch (error) {
    requestLogger.error('ERROR', 'Failed to initialize stream', {
      area: 'STREAM CONTROLLER',
      error: error.message,
    });

    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({
        error: error.statusCode ? error.message : 'Failed to initialize stream',
        message: error.message,
      });
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
