import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { getUserUsageSummary, recordUsage } from '../services/usageService.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticateToken);

/**
 * GET /api/usage/summary
 * Returns comprehensive usage statistics (OCR pages, embedding tokens, AI tokens, quotas)
 */
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user.id;
    const summary = await getUserUsageSummary(userId);
    return res.json({ success: true, data: summary });
  } catch (error) {
    logger.error('USAGE_ROUTES', 'Failed to fetch usage summary', { error: error.message });
    return res.status(500).json({ error: 'Failed to fetch usage summary' });
  }
});

/**
 * POST /api/usage/record
 * Record a client-side or external usage event
 */
router.post('/record', async (req, res) => {
  try {
    const userId = req.user.id;
    const { modelName, usageType, inputTokens, outputTokens, totalTokens, ocrPages } = req.body;

    const record = await recordUsage({
      userId,
      modelName,
      usageType,
      inputTokens,
      outputTokens,
      totalTokens,
      ocrPages,
    });

    return res.json({ success: true, record });
  } catch (error) {
    logger.error('USAGE_ROUTES', 'Failed to record usage', { error: error.message });
    return res.status(500).json({ error: 'Failed to record usage' });
  }
});

export default router;
