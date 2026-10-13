import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { getSelectedModel, saveSelectedModel } from '../services/userSettingsService.js';
import { getModelById, getActiveModels } from '../services/aiModelService.js';
import { query } from '../db/index.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Apply authentication
router.use(authenticateToken);

/**
 * GET /api/user/preferences
 * Returns the user's full preferences (theme, notifications, language, etc.).
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
        `INSERT INTO user_preferences (user_id, display_name, theme, language, timezone, notify_email, notify_push, notify_digest)
         VALUES ($1, $2, 'system', 'en', 'UTC', true, false, true)
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
      customInstructions, persona, tone, jurisdiction, outputFormat 
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
