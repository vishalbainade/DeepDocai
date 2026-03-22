import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { generateSignedUploadUrl, generateSignedReadUrl, uploadToInputBucket, downloadFromInputBucket } from '../services/storage.service.js';
import { extractDocumentWithSarvam } from '../services/sarvam.service.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { chunkText, chunkTextAndTables } from '../services/chunk_service.js';
import { generateEmbeddings } from '../services/embedding.service.js';
import { storeEmbeddings } from '../services/vector_service.js';
import { query } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { processDocument } from '../controllers/document.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/upload/signed-url
 * Generate a signed URL for direct upload to Supabase Storage
 */
router.get('/signed-url', async (req, res) => {
  try {
    const { fileName } = req.query;

    if (!fileName) {
      return res.status(400).json({ error: 'fileName query parameter is required' });
    }

    // Generate documentId
    const documentId = uuidv4();
    const storageFileName = `${documentId}-${fileName}`;

    // Generate signed URL for upload
    const signedUrlData = await generateSignedUploadUrl(storageFileName);

    res.json({
      success: true,
      documentId: documentId,
      uploadUrl: signedUrlData.uploadUrl,
      token: signedUrlData.token,
      storagePath: signedUrlData.storagePath,
      fileName: storageFileName,
    });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({
      error: 'Failed to generate signed URL',
      message: error.message,
    });
  }
});

/**
 * POST /api/upload/process
 * Process uploaded document after frontend uploads to Supabase Storage
 * This endpoint is handled by document.controller.js
 */
router.post('/process', processDocument);

/**
 * GET /api/upload/preview/:documentId
 * Get signed URL for document preview
 */
router.get('/preview/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;

    // Get document info from database
    const docResult = await query(
      'SELECT file_name, storage_url FROM documents WHERE id = $1',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = docResult.rows[0];
    const storageUrl = doc.storage_url;
    
    if (!storageUrl) {
      return res.status(404).json({ error: 'Document storage URL not found' });
    }

    // Extract filename from storage URL
    const storageFileName = storageUrl.split('/').slice(-1)[0];

    // Generate signed read URL (valid for 1 hour)
    const previewUrl = await generateSignedReadUrl(storageFileName, 3600);

    res.json({
      success: true,
      previewUrl: previewUrl,
      fileName: doc.file_name,
    });
  } catch (error) {
    console.error('Error generating preview URL:', error);
    res.status(500).json({
      error: 'Failed to generate preview URL',
      message: error.message,
    });
  }
});

/**
 * GET /api/upload/metadata/:documentId
 * Fetch the metadata.json for the OCR viewer
 */
router.get('/metadata/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { downloadFromOutputBucket } = await import('../services/storage.service.js');
    
    // Attempt download of ocr-[documentId].json (which contains the full layout)
    const buffer = await downloadFromOutputBucket(`ocr-${documentId}.json`);
    const metadata = JSON.parse(buffer.toString('utf-8'));

    res.json(metadata);
  } catch (error) {
    console.warn(`[OCR_FETCH] Failed to find OCR layout for document ${req.params.documentId}:`, error.message);
    res.status(404).json({ error: 'OCR layout not found', message: error.message });
  }
});

/**
 * GET /api/upload/download/:documentId/:type
 * Download the document in PDF or DOCX format
 */
router.get('/download/:documentId/:type', async (req, res) => {
  try {
    const { documentId, type } = req.params;
    const { downloadFromOutputBucket, downloadFromInputBucket } = await import('../services/storage.service.js');
    const { generateDocxFromOCR } = await import('../services/docxService.js');

    // 1. Get document info
    const docResult = await query(
      'SELECT file_name, storage_url FROM documents WHERE id = $1',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = docResult.rows[0];

    if (type === 'pdf') {
      // PDF is stored in INPUT_BUCKET (reconstructed version)
      // The storage_url in DB points to the OCR version after processing
      const storageUrl = doc.storage_url;
      const storageFileName = storageUrl.split('/').slice(-1)[0];
      
      const buffer = await downloadFromInputBucket(storageFileName);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Searchable-${doc.file_name}"`);
      return res.send(buffer);
    } 

    if (type === 'docx') {
      // Generate DOCX on the fly from OCR layout data
      const jsonBuffer = await downloadFromOutputBucket(`ocr-${documentId}.json`);
      const metadata = JSON.parse(jsonBuffer.toString('utf-8'));
      
      const docxBuffer = await generateDocxFromOCR(metadata);
      
      const fileNameNoExt = doc.file_name.replace(/\.[^/.]+$/, "");
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${fileNameNoExt}.docx"`);
      return res.send(docxBuffer);
    }

    res.status(400).json({ error: 'Invalid download type. Use pdf or docx.' });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to generate download', message: error.message });
  }
});

export default router;
