import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { getSelectedModel, saveSelectedModel } from '../services/userSettingsService.js';
import { getModelById, getActiveModels } from '../services/aiModelService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Apply authentication
router.use(authenticateToken);

/**
 * GET /api/user/selected-model
 * Returns the user's currently selected model.
 * If no selection stored, returns the first active model as default.
 */
router.get('/selected-model', async (req, res) => {
  try {
    const userId = req.user.id;
    const selected = await getSelectedModel(userId);

    if (selected) {
      return res.json({ selected });
    }

    // No stored selection – return first active model as default
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
 * Saves the user's model selection.
 * Body: { modelId: string }
 */
router.post('/select-model', async (req, res) => {
  try {
    const userId = req.user.id;
    const { modelId } = req.body;

    if (!modelId) {
      return res.status(400).json({ error: 'modelId is required' });
    }

    // Verify the model exists and is active
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
      timestamp: new Date().toISOString(),
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
