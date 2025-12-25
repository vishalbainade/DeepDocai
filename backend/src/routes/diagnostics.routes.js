import express from 'express';
import { query } from '../db/index.js';
import { diagnoseTableFormat } from '../services/rag_service.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/diagnostics/embeddings/:documentId
 * Check embeddings for a document
 */
router.get('/embeddings/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;

    // Get document info
    const docResult = await query(
      'SELECT id, file_name, gcs_url, created_at FROM documents WHERE id = $1',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get embedding count and sample
    const embeddingResult = await query(
      `SELECT 
        COUNT(*) as total_count,
        AVG(LENGTH(chunk_text)) as avg_chunk_length,
        MIN(LENGTH(chunk_text)) as min_chunk_length,
        MAX(LENGTH(chunk_text)) as max_chunk_length
       FROM embeddings
       WHERE document_id = $1`,
      [documentId]
    );

    // Get sample chunks
    const sampleResult = await query(
      `SELECT chunk_index, LEFT(chunk_text, 200) as chunk_preview
       FROM embeddings
       WHERE document_id = $1
       ORDER BY chunk_index
       LIMIT 5`,
      [documentId]
    );

    res.json({
      success: true,
      document: docResult.rows[0],
      embeddings: {
        total: parseInt(embeddingResult.rows[0]?.total_count || 0),
        avgChunkLength: parseFloat(embeddingResult.rows[0]?.avg_chunk_length || 0),
        minChunkLength: parseInt(embeddingResult.rows[0]?.min_chunk_length || 0),
        maxChunkLength: parseInt(embeddingResult.rows[0]?.max_chunk_length || 0),
        samples: sampleResult.rows,
      },
    });
  } catch (error) {
    console.error('Error in diagnostics:', error);
    res.status(500).json({
      error: 'Failed to get diagnostics',
      message: error.message,
    });
  }
});

/**
 * POST /api/diagnostics/table-format
 * Diagnose table format issues for a specific question and document
 * Returns detailed information about each step in the RAG pipeline
 */
router.post('/table-format', async (req, res) => {
  try {
    const { question, documentId } = req.body;

    if (!question || !documentId) {
      return res.status(400).json({
        error: 'Both question and documentId are required',
      });
    }

    // Verify document exists
    const docResult = await query(
      'SELECT id FROM documents WHERE id = $1',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if document has embeddings
    const embeddingCheck = await query(
      'SELECT COUNT(*) as count FROM embeddings WHERE document_id = $1',
      [documentId]
    );
    
    const embeddingCount = parseInt(embeddingCheck.rows[0]?.count || 0);
    
    if (embeddingCount === 0) {
      return res.status(400).json({
        error: 'Document has not been processed yet. Please wait for processing to complete.',
        message: 'No embeddings found for this document.',
      });
    }

    // Run diagnostic
    const diagnostics = await diagnoseTableFormat(question, documentId);

    res.json({
      success: true,
      diagnostics: diagnostics,
    });
  } catch (error) {
    console.error('Error in table format diagnostics:', error);
    res.status(500).json({
      error: 'Failed to run diagnostics',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

export default router;

