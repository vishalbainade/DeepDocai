import express from 'express';
import { randomUUID } from 'crypto';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { getSelectedModel, saveSelectedModel } from '../services/userSettingsService.js';
import { getModelById, getActiveModels } from '../services/aiModelService.js';
import { query } from '../db/index.js';
import logger from '../utils/logger.js';
import geminiClient from '../services/gemini-client.js';

const router = express.Router();

// Apply authentication
router.use(authenticateToken);

/**
 * GET /api/user/preferences
 * Returns the user's full preferences (theme, notifications, language, memories, etc.).
 * Auto-creates a row if none exists.
 */
router.get('/preferences', async (req, res) => {
  try {
    const userId = req.user.id;
    
    let result = await query('SELECT * FROM user_preferences WHERE user_id = $1', [userId]);
    
    if (!result.rows.length) {
      // Auto-create default row
      const userResult = await query('SELECT name FROM users WHERE id = $1', [userId]);
      const displayName = userResult.rows[0]?.name || 'User';
      
      await query(
        `INSERT INTO user_preferences (user_id, display_name, theme, language, timezone, notify_email, notify_push, notify_digest, memories, memory_enabled, history_limit)
         VALUES ($1, $2, 'system', 'en', 'UTC', true, false, true, '[]'::jsonb, true, 10)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, displayName]
      );
      result = await query('SELECT * FROM user_preferences WHERE user_id = $1', [userId]);
    }

    const prefs = result.rows[0];
    return res.json({
      displayName: prefs.display_name,
      theme: prefs.theme,
      language: prefs.language,
      timezone: prefs.timezone,
      defaultModelId: prefs.default_model_id,
      customInstructions: prefs.custom_instructions || '',
      persona: prefs.persona || 'legal_counsel',
      tone: prefs.tone || 'concise',
      jurisdiction: prefs.jurisdiction || 'general',
      outputFormat: prefs.output_format || 'citations_tables',
      memories: prefs.memories || [],
      memoryEnabled: prefs.memory_enabled !== false,
      historyLimit: prefs.history_limit || 10,
      notifications: {
        email: prefs.notify_email,
        push: prefs.notify_push,
        digest: prefs.notify_digest,
      },
    });
  } catch (error) {
    logger.error('USER_PREFS', 'Failed to fetch preferences', { userId: req.user.id, error: error.message });
    return res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

/**
 * PUT /api/user/preferences
 * Updates user preferences. Only sent fields are updated.
 */
router.put('/preferences', async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      displayName, theme, language, timezone, defaultModelId, notifications,
      customInstructions, persona, tone, jurisdiction, outputFormat,
      memories, memoryEnabled, historyLimit
    } = req.body;

    // Ensure row exists
    await query(
      `INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    // Build dynamic SET clause
    const sets = [];
    const params = [];
    let idx = 1;

    if (displayName !== undefined)  { sets.push(`display_name = $${idx++}`);    params.push(displayName); }
    if (theme !== undefined)        { sets.push(`theme = $${idx++}`);           params.push(theme); }
    if (language !== undefined)     { sets.push(`language = $${idx++}`);        params.push(language); }
    if (timezone !== undefined)     { sets.push(`timezone = $${idx++}`);        params.push(timezone); }
    if (defaultModelId !== undefined){ sets.push(`default_model_id = $${idx++}`); params.push(defaultModelId || null); }
    if (customInstructions !== undefined) { sets.push(`custom_instructions = $${idx++}`); params.push(customInstructions); }
    if (persona !== undefined)      { sets.push(`persona = $${idx++}`);         params.push(persona); }
    if (tone !== undefined)         { sets.push(`tone = $${idx++}`);            params.push(tone); }
    if (jurisdiction !== undefined) { sets.push(`jurisdiction = $${idx++}`);    params.push(jurisdiction); }
    if (outputFormat !== undefined) { sets.push(`output_format = $${idx++}`);    params.push(outputFormat); }
    if (memories !== undefined)     { sets.push(`memories = $${idx++}`);         params.push(JSON.stringify(memories)); }
    if (memoryEnabled !== undefined){ sets.push(`memory_enabled = $${idx++}`);   params.push(Boolean(memoryEnabled)); }
    if (historyLimit !== undefined) { sets.push(`history_limit = $${idx++}`);    params.push(Math.min(Math.max(Number(historyLimit) || 10, 2), 30)); }
    if (notifications?.email !== undefined)  { sets.push(`notify_email = $${idx++}`);  params.push(notifications.email); }
    if (notifications?.push !== undefined)   { sets.push(`notify_push = $${idx++}`);   params.push(notifications.push); }
    if (notifications?.digest !== undefined) { sets.push(`notify_digest = $${idx++}`); params.push(notifications.digest); }

    sets.push(`updated_at = CURRENT_TIMESTAMP`);

    if (sets.length > 1) {
      params.push(userId);
      await query(
        `UPDATE user_preferences SET ${sets.join(', ')} WHERE user_id = $${idx}`,
        params
      );
    }

    // If displayName was updated, also update the users table
    if (displayName !== undefined) {
      await query('UPDATE users SET name = $1 WHERE id = $2', [displayName, userId]);
    }

    logger.info('USER_PREFS', 'Preferences updated', { userId, fields: sets.map(s => s.split(' =')[0].trim()) });

    // Return updated prefs
    const result = await query('SELECT * FROM user_preferences WHERE user_id = $1', [userId]);
    const prefs = result.rows[0];

    return res.json({
      success: true,
      displayName: prefs.display_name,
      theme: prefs.theme,
      language: prefs.language,
      timezone: prefs.timezone,
      defaultModelId: prefs.default_model_id,
      customInstructions: prefs.custom_instructions || '',
      persona: prefs.persona || 'legal_counsel',
      tone: prefs.tone || 'concise',
      jurisdiction: prefs.jurisdiction || 'general',
      outputFormat: prefs.output_format || 'citations_tables',
      memories: prefs.memories || [],
      memoryEnabled: prefs.memory_enabled !== false,
      historyLimit: prefs.history_limit || 10,
      notifications: {
        email: prefs.notify_email,
        push: prefs.notify_push,
        digest: prefs.notify_digest,
      },
    });
  } catch (error) {
    logger.error('USER_PREFS', 'Failed to update preferences', { userId: req.user.id, error: error.message });
    return res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * GET /api/user/memories
 * Returns the list of memories and memoryEnabled state
 */
router.get('/memories', async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query('SELECT memories, memory_enabled, history_limit FROM user_preferences WHERE user_id = $1', [userId]);
    const row = result.rows[0] || {};
    return res.json({
      memories: row.memories || [],
      memoryEnabled: row.memory_enabled !== false,
      historyLimit: row.history_limit || 10,
    });
  } catch (error) {
    logger.error('USER_MEMORIES', 'Failed to fetch memories', { userId: req.user.id, error: error.message });
    return res.status(500).json({ error: 'Failed to fetch memories' });
  }
});

/**
 * POST /api/user/memories
 * Add a new manual memory
 */
router.post('/memories', async (req, res) => {
  try {
    const userId = req.user.id;
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Memory content is required' });
    }

    const result = await query('SELECT memories FROM user_preferences WHERE user_id = $1', [userId]);
    const currentMemories = result.rows[0]?.memories || [];

    const newMemory = {
      id: randomUUID(),
      content: content.trim(),
      type: 'manual',
      createdAt: new Date().toISOString(),
    };

    const updated = [newMemory, ...currentMemories];
    await query(
      `UPDATE user_preferences SET memories = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
      [JSON.stringify(updated), userId]
    );

    return res.json({ success: true, memory: newMemory, memories: updated });
  } catch (error) {
    logger.error('USER_MEMORIES', 'Failed to add memory', { userId: req.user.id, error: error.message });
    return res.status(500).json({ error: 'Failed to add memory' });
  }
});

/**
 * DELETE /api/user/memories/:id
 * Delete a specific memory item
 */
router.delete('/memories/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await query('SELECT memories FROM user_preferences WHERE user_id = $1', [userId]);
    const currentMemories = result.rows[0]?.memories || [];
    const updated = currentMemories.filter((m) => m.id !== id);

    await query(
      `UPDATE user_preferences SET memories = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
      [JSON.stringify(updated), userId]
    );

    return res.json({ success: true, memories: updated });
  } catch (error) {
    logger.error('USER_MEMORIES', 'Failed to delete memory', { userId: req.user.id, error: error.message });
    return res.status(500).json({ error: 'Failed to delete memory' });
  }
});

/**
 * DELETE /api/user/memories
 * Clear all memories
 */
router.delete('/memories', async (req, res) => {
  try {
    const userId = req.user.id;
    await query(
      `UPDATE user_preferences SET memories = '[]'::jsonb, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
      [userId]
    );
    return res.json({ success: true, memories: [] });
  } catch (error) {
    logger.error('USER_MEMORIES', 'Failed to clear memories', { userId: req.user.id, error: error.message });
    return res.status(500).json({ error: 'Failed to clear memories' });
  }
});

/**
 * POST /api/user/memories/extract
 * Analyze recent chat conversations and generate Claude-style memory items
 */
router.post('/memories/extract', async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch recent messages authored by user in recent chats
    const msgsResult = await query(
      `SELECT ch.content FROM chat_history ch
       JOIN chats c ON ch.chat_id = c.id
       WHERE c.user_id = $1 AND ch.role = 'user'
       ORDER BY ch.created_at DESC LIMIT 25`,
      [userId]
    );

    let messages = msgsResult.rows.map((r) => r.content).filter(Boolean);

    // Fallback: Check document chats
    if (messages.length < 2) {
      const docMsgs = await query(
        `SELECT ch.content FROM chat_history ch
         JOIN documents d ON ch.document_id = d.id
         WHERE d.user_id = $1 AND ch.role = 'user'
         ORDER BY ch.created_at DESC LIMIT 25`,
        [userId]
      );
      messages = [...messages, ...docMsgs.rows.map((r) => r.content).filter(Boolean)];
    }

    if (messages.length < 2) {
      return res.status(400).json({
        error: 'Not enough conversation history yet. Chat with a document first to let DeepDoc AI learn your preferences!',
      });
    }

    const conversationSample = messages.slice(0, 15).map((m, i) => `${i + 1}. "${m}"`).join('\n');

    const prompt = `You are the DeepDoc AI Memory Profiler (similar to Claude Memory).
Review the following user questions and interaction prompts from recent conversations:
${conversationSample}

Identify 1 to 4 enduring, high-value facts about this user to personalize future legal analysis.
Focus on:
- User's legal domain or role (e.g., corporate commercial contracts, employment agreements, IP/patents, compliance auditor)
- Specific jurisdictions or laws referenced (e.g., California/Delaware law, EU GDPR, Indian Companies Act)
- Preferred presentation style (e.g., concise bullet points, risk matrices, executive summaries)
- Specific business or document concerns (e.g., strict indemnity caps, termination clauses)

DO NOT include ephemeral questions (e.g., "what is page 2?", "explain paragraph 3"). Only extract durable user profile preferences.

Output format rule:
Return ONLY a valid JSON array of strings, for example:
[
  "Focuses primarily on commercial SaaS and software licensing agreements",
  "Prefers risk analysis structured into bulleted impact summaries",
  "Operates primarily within Delaware and California corporate frameworks"
]

If no clear enduring user traits or preferences can be determined from the inputs, return:
[]`;

    const execution = await geminiClient.executeWithFallback(
      async (genAI, modelName) => {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        });
        return model.generateContent(prompt);
      },
      { taskLabel: 'Memory Extraction', preferredModel: geminiClient.MODELS.TEXT }
    );

    const rawText = (await execution.result.response).text();
    let extracted = [];
    try {
      extracted = JSON.parse(rawText.trim());
      if (!Array.isArray(extracted)) extracted = [];
    } catch {
      extracted = [];
    }

    // Fetch existing memories to avoid duplicates
    const currentRes = await query('SELECT memories FROM user_preferences WHERE user_id = $1', [userId]);
    const existing = currentRes.rows[0]?.memories || [];
    const existingContents = new Set(existing.map((m) => (typeof m === 'string' ? m : m.content).toLowerCase()));

    const newItems = extracted
      .filter((text) => typeof text === 'string' && text.trim().length > 5)
      .filter((text) => !existingContents.has(text.trim().toLowerCase()))
      .map((text) => ({
        id: randomUUID(),
        content: text.trim(),
        type: 'auto_extracted',
        createdAt: new Date().toISOString(),
      }));

    if (newItems.length > 0) {
      const merged = [...newItems, ...existing];
      await query(
        `UPDATE user_preferences SET memories = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
        [JSON.stringify(merged), userId]
      );
      return res.json({
        success: true,
        newCount: newItems.length,
        newMemories: newItems,
        memories: merged,
        message: `Learned ${newItems.length} new memory item${newItems.length === 1 ? '' : 's'} from your conversations!`,
      });
    }

    return res.json({
      success: true,
      newCount: 0,
      newMemories: [],
      memories: existing,
      message: 'All current chat patterns are already captured in your existing memories.',
    });
  } catch (error) {
    logger.error('USER_MEMORIES', 'Failed to extract memories', { userId: req.user.id, error: error.message });
    return res.status(500).json({ error: 'Failed to extract memories: ' + error.message });
  }
});

/**
 * GET /api/user/selected-model
 */
router.get('/selected-model', async (req, res) => {
  try {
    const userId = req.user.id;
    const selected = await getSelectedModel(userId);

    if (selected) {
      return res.json({ selected });
    }

    const allModels = await getActiveModels();
    if (allModels.length > 0) {
      const defaultModel = allModels[0];
      return res.json({
        selected: {
          modelId: defaultModel.id,
          modelName: defaultModel.modelName,
          displayName: defaultModel.displayName,
          modelFamily: defaultModel.modelFamily,
          providerSlug: defaultModel.providerSlug,
          providerName: defaultModel.providerName,
          isDefault: true,
        },
      });
    }

    return res.json({ selected: null });
  } catch (error) {
    logger.error('USER_SETTINGS_API', 'Failed to fetch selected model', {
      userId: req.user.id,
      error: error.message,
    });
    return res.status(500).json({ error: 'Failed to fetch selected model' });
  }
});

/**
 * POST /api/user/select-model
 */
router.post('/select-model', async (req, res) => {
  try {
    const userId = req.user.id;
    const { modelId } = req.body;

    if (!modelId) {
      return res.status(400).json({ error: 'modelId is required' });
    }

    const model = await getModelById(modelId);
    if (!model) {
      return res.status(404).json({ error: 'Model not found or inactive' });
    }

    await saveSelectedModel(userId, modelId);

    logger.info('USER_SETTINGS_API', 'User model selection updated', {
      event: 'USER_MODEL_CHANGED',
      userId,
      modelId,
      modelName: model.modelName,
      provider: model.providerSlug,
    });

    return res.json({
      success: true,
      selected: {
        modelId: model.id,
        modelName: model.modelName,
        displayName: model.displayName,
        providerSlug: model.providerSlug,
        providerName: model.providerName,
      },
    });
  } catch (error) {
    logger.error('USER_SETTINGS_API', 'Failed to save model selection', {
      userId: req.user.id,
      error: error.message,
    });
    return res.status(500).json({ error: 'Failed to save model selection' });
  }
});

export default router;
