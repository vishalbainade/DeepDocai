import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { processLiveAudioDialog } from '../services/liveAudioService.js';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticateToken);

/**
 * POST /api/audio/dialog
 * Interactive voice dialog turn
 */
router.post('/dialog', async (req, res) => {
  try {
    const { transcript, documentId, modelName, thinkingMode, grounding, customPrompt } = req.body;

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    const result = await processLiveAudioDialog({
      transcript: transcript.trim(),
      documentId,
      modelName: modelName || 'gemini-3.8-live-extended-thinking',
      thinkingMode: thinkingMode !== false,
      grounding: grounding !== false,
      customPrompt: customPrompt || '',
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('LIVE_AUDIO_ROUTE', 'Failed to process voice dialog', { error: error.message });
    return res.status(500).json({ error: error.message || 'Failed to process voice turn' });
  }
});

export default router;
