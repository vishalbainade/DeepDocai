import express from 'express';
import { query } from '../db/index.js';

const router = express.Router();

/**
 * GET /api/history/documents
 * Get all uploaded documents with their metadata
 */
router.get('/documents', async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        id,
        file_name,
        gcs_url,
        created_at,
        (SELECT COUNT(*) FROM chat_history WHERE document_id = documents.id) as message_count
       FROM documents
       ORDER BY created_at DESC
       LIMIT 100`,
      []
    );

    res.json({
      success: true,
      documents: result.rows.map((row) => ({
        id: row.id,
        fileName: row.file_name,
        gcsUrl: row.gcs_url,
        createdAt: row.created_at,
        messageCount: parseInt(row.message_count) || 0,
      })),
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({
      error: 'Failed to fetch documents',
      message: error.message,
    });
  }
});

/**
 * GET /api/history/chat/:documentId
 * Get chat history for a specific document
 */
router.get('/chat/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;

    // Verify document exists
    const docResult = await query(
      'SELECT id, file_name FROM documents WHERE id = $1',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Document not found',
      });
    }

    // Get chat history
    const chatResult = await query(
      `SELECT 
        id,
        role,
        content,
        created_at
       FROM chat_history
       WHERE document_id = $1
       ORDER BY created_at ASC`,
      [documentId]
    );

    res.json({
      success: true,
      documentId: documentId,
      fileName: docResult.rows[0].file_name,
      messages: chatResult.rows.map((row) => ({
        id: row.id,
        role: row.role,
        content: row.content,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({
      error: 'Failed to fetch chat history',
      message: error.message,
    });
  }
});

export default router;

