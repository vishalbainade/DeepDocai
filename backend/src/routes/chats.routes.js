import express from 'express';
import { query } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

const getUserId = (req) => {
  return req.user.id;
};

/**
 * POST /api/chats
 * Create a new chat conversation
 */
router.post('/', async (req, res) => {
  try {
    const { documentId } = req.body;
    const userId = getUserId(req);

    if (!documentId) {
      return res.status(400).json({
        error: 'documentId is required',
      });
    }

    // Verify document exists
    const docResult = await query(
      'SELECT id FROM documents WHERE id = $1',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Document not found',
      });
    }

    // Create new chat
    const newChatResult = await query(
      `INSERT INTO chats (user_id, document_id, title) 
       VALUES ($1, $2, 'New Chat') 
       RETURNING id, title, document_id, created_at, updated_at`,
      [userId, documentId]
    );

    const chat = newChatResult.rows[0];

    res.status(201).json({
      success: true,
      chat: {
        id: chat.id,
        title: chat.title,
        documentId: chat.document_id,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
      },
    });
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({
      error: 'Failed to create chat',
      message: error.message,
    });
  }
});

/**
 * GET /api/chats
 * Get all chats for the current user, ordered by most recent first
 */
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);

    const result = await query(
      `SELECT 
        c.id,
        c.title,
        c.document_id,
        c.created_at,
        c.updated_at,
        d.file_name as document_name,
        (SELECT COUNT(*) FROM chat_history WHERE chat_id = c.id) as message_count
       FROM chats c
       LEFT JOIN documents d ON c.document_id = d.id
       WHERE c.user_id = $1
       ORDER BY c.updated_at DESC
       LIMIT 100`,
      [userId]
    );

    res.json({
      success: true,
      chats: result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        documentId: row.document_id,
        documentName: row.document_name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        messageCount: parseInt(row.message_count) || 0,
      })),
    });
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({
      error: 'Failed to fetch chats',
      message: error.message,
    });
  }
});

/**
 * GET /api/chats/:chatId
 * Get chat info (without messages)
 */
router.get('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = getUserId(req);

    // Verify chat exists and belongs to user
    const chatResult = await query(
      'SELECT id, title, document_id, created_at, updated_at FROM chats WHERE id = $1 AND user_id = $2',
      [chatId, userId]
    );

    if (chatResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Chat not found',
      });
    }

    const chat = chatResult.rows[0];

    res.json({
      success: true,
      chat: {
        id: chat.id,
        title: chat.title,
        documentId: chat.document_id,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
      },
    });
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({
      error: 'Failed to fetch chat',
      message: error.message,
    });
  }
});

/**
 * GET /api/chats/:chatId/messages
 * Get messages for a specific chat
 */
router.get('/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = getUserId(req);

    // Verify chat exists and belongs to user
    const chatResult = await query(
      'SELECT id, title, document_id FROM chats WHERE id = $1 AND user_id = $2',
      [chatId, userId]
    );

    if (chatResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Chat not found',
      });
    }

    const chat = chatResult.rows[0];

    // Get chat history - include messages with chat_id OR messages without chat_id but for this document
    // This handles legacy messages that might not have chat_id set
    const messagesResult = await query(
      `SELECT 
        id,
        role,
        content,
        created_at
       FROM chat_history
       WHERE (chat_id = $1 OR (chat_id IS NULL AND document_id = $2))
       ORDER BY created_at ASC`,
      [chatId, chat.document_id]
    );

    res.json({
      success: true,
      chat: {
        id: chat.id,
        title: chat.title,
        documentId: chat.document_id,
      },
      messages: messagesResult.rows.map((row) => ({
        id: row.id,
        role: row.role,
        content: row.content,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({
      error: 'Failed to fetch chat messages',
      message: error.message,
    });
  }
});

/**
 * PATCH /api/chats/:chatId
 * Rename a chat conversation
 */
router.patch('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { title } = req.body;
    const userId = getUserId(req);

    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        error: 'Title is required and cannot be empty',
      });
    }

    // Validate title length
    if (title.length > 255) {
      return res.status(400).json({
        error: 'Title must be 255 characters or less',
      });
    }

    // Verify chat exists and belongs to user
    const chatResult = await query(
      'SELECT id FROM chats WHERE id = $1 AND user_id = $2',
      [chatId, userId]
    );

    if (chatResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Chat not found',
      });
    }

    // Update chat title and updated_at
    const updateResult = await query(
      `UPDATE chats 
       SET title = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND user_id = $3
       RETURNING id, title, updated_at`,
      [title.trim(), chatId, userId]
    );

    res.json({
      success: true,
      chat: {
        id: updateResult.rows[0].id,
        title: updateResult.rows[0].title,
        updatedAt: updateResult.rows[0].updated_at,
      },
    });
  } catch (error) {
    console.error('Error renaming chat:', error);
    res.status(500).json({
      error: 'Failed to rename chat',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/chats/:chatId
 * Delete a chat conversation and all its messages
 */
router.delete('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = getUserId(req);

    // Verify chat exists and belongs to user
    const chatResult = await query(
      'SELECT id FROM chats WHERE id = $1 AND user_id = $2',
      [chatId, userId]
    );

    if (chatResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Chat not found',
      });
    }

    // Delete chat (CASCADE will delete all chat_history entries)
    await query('DELETE FROM chats WHERE id = $1 AND user_id = $2', [
      chatId,
      userId,
    ]);

    res.json({
      success: true,
      message: 'Chat deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({
      error: 'Failed to delete chat',
      message: error.message,
    });
  }
});

export default router;

