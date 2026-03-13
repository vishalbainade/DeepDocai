import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
  askQuestion,
  getHistory,
  improveText,
  getAvailableModels,
} from '../controllers/chat.controller.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/', askQuestion);
router.get('/', askQuestion);
router.get('/models', getAvailableModels);
router.get('/history/:chatId', getHistory);
router.post('/improve-text', improveText);

export default router;
