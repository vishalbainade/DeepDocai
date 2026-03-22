import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { getActiveModels, getActiveProviders } from '../services/aiModelService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Apply authentication
router.use(authenticateToken);

/**
 * GET /api/models
 * Returns all active models with provider info.
 * Response format designed for the frontend model selector.
 */
router.get('/', async (req, res) => {
  try {
    const models = await getActiveModels();

    const formatted = models.map((m) => ({
      id: m.id,
      modelName: m.modelName,
      displayName: m.displayName,
      modelFamily: m.modelFamily,
      sortOrder: m.sortOrder,
      provider: {
        id: m.providerId,
        name: m.providerName,
        slug: m.providerSlug,
      },
    }));

    logger.info('MODELS_API', 'Active models fetched', {
      event: 'MODELS_LIST_FETCHED',
      userId: req.user.id,
      modelCount: formatted.length,
    });

    return res.json({ models: formatted });
  } catch (error) {
    logger.error('MODELS_API', 'Failed to fetch models', {
      error: error.message,
    });
    return res.status(500).json({ error: 'Failed to fetch models' });
  }
});

/**
 * GET /api/models/providers
 * Returns all active providers.
 */
router.get('/providers', async (req, res) => {
  try {
    const providers = await getActiveProviders();
    return res.json({ providers });
  } catch (error) {
    logger.error('MODELS_API', 'Failed to fetch providers', { error: error.message });
    return res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

export default router;
