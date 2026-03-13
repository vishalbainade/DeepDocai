import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { 
  askQuestion, 
  streamQuestion, 
  getHistory,
  improveText,
  getAvailableModels,
} from '../controllers/chat.controller.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * POST /api/ask
 * Ask a question about a document (non-streaming)
 */
router.post('/', askQuestion);
router.get('/', askQuestion);
router.get('/models', getAvailableModels);

/**
 * POST /api/chat/stream
 * Ask a question with streaming response (Server-Sent Events payload via fetch)
 */
router.post('/stream', streamQuestion);
router.get('/stream', streamQuestion);

/**
 * GET /api/ask/history/:chatId
 * Get chat history for a specific chat
 */
router.get('/history/:chatId', getHistory);

/**
 * POST /api/improve-text
 * Improve/enhance user's input text using Gemini
 */
router.post('/improve-text', improveText);

export default router;
