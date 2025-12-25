import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { generateSignedUploadUrl, generateSignedReadUrl } from '../services/storage.service.js';
import { extractTextWithTesseract } from '../services/tesseract.service.js';
import { extractTextAndTablesWithOCR } from '../services/ocr_service.js';
import { Storage } from '@google-cloud/storage';
import { getStorage } from '../services/storage.service.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { cleanText } from '../utils/cleanup.js';
import { chunkText, chunkTextAndTables } from '../services/chunk_service.js';
import { generateEmbeddings } from '../services/embedding.service.js';
import { storeEmbeddings } from '../services/vector_service.js';
import { query } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
// import {extractTextAndTablesWithOCR} from '../services/tesseract.service.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/upload/signed-url
 * Generate a signed URL for direct upload to GCS
 */
router.get('/signed-url', async (req, res) => {
  try {
    const { fileName } = req.query;

    if (!fileName) {
      return res.status(400).json({ error: 'fileName query parameter is required' });
    }

    // Generate documentId
    const documentId = uuidv4();
    const gcsFileName = `${documentId}-${fileName}`;

    // Generate signed URL for upload
    const signedUrlData = await generateSignedUploadUrl(gcsFileName, 'application/pdf', 15);

    res.json({
      success: true,
      documentId: documentId,
      uploadUrl: signedUrlData.uploadUrl,
      gcsPath: signedUrlData.gcsPath,
      fileName: gcsFileName,
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
 * Process uploaded document after frontend uploads to GCS
 * This endpoint is called after the file is uploaded via signed URL
 */
router.post('/process', async (req, res) => {
  try {
    const { documentId, fileName, gcsFileName } = req.body;

    if (!documentId || !fileName || !gcsFileName) {
      return res.status(400).json({
        error: 'documentId, fileName, and gcsFileName are required',
      });
    }

    console.log(`\n📄 ========== DOCUMENT INGESTION PIPELINE ==========`);
    console.log(`Processing document ${documentId} from GCS: ${gcsFileName}`);

    // Step 1: Extract text and detect tables using enhanced OCR
    console.log('\n[1/6] Extracting text and detecting tables with OCR...');
    let extractedText = '';
    let tables = [];
    
    try {
      // Download file from GCS for enhanced OCR
      const storage = getStorage();
      const INPUT_BUCKET_NAME = process.env.GCS_INPUT_BUCKET || 'fileinputbucket';
      const bucket = storage.bucket(INPUT_BUCKET_NAME);
      const file = bucket.file(gcsFileName);
      
      const [exists] = await file.exists();
      if (!exists) {
        throw new Error(`File ${gcsFileName} not found in GCS`);
      }
      
      // Download file to temp location for OCR
      const tempDir = path.join(__dirname, '../../temp');
      await fs.mkdir(tempDir, { recursive: true });
      const tempFilePath = path.join(tempDir, `temp-${Date.now()}.pdf`);
      
      try {
        const [fileBuffer] = await file.download();
        await fs.writeFile(tempFilePath, fileBuffer);
        
        // Try enhanced OCR with table detection
        const extractedData = await extractTextAndTablesWithOCR(tempFilePath);
        
        if (extractedData && typeof extractedData === 'object' && extractedData.text) {
          // New format: { text, tables }
          extractedText = extractedData.text || '';
          tables = extractedData.tables || [];
          console.log(`✅ Enhanced OCR with table detection: ${extractedText.length} chars, ${tables.length} tables`);
        } else {
          throw new Error('Enhanced OCR returned invalid format');
        }
      } finally {
        // Clean up temp file
        await fs.unlink(tempFilePath).catch(() => {});
      }
    } catch (enhancedError) {
      // Fallback to legacy OCR (no table detection)
      console.warn('⚠️ Enhanced OCR failed, falling back to basic OCR:', enhancedError.message);
      extractedText = await extractTextWithTesseract(gcsFileName);
      tables = [];
      console.log(`✅ Basic OCR fallback: ${extractedText.length} chars`);
    }

    if (!extractedText || extractedText.trim().length === 0) {
      console.error('❌ OCR FAILED: No text extracted');
      throw new Error('Failed to extract text from PDF');
    }

    console.log(`✅ OCR SUCCESS: Extracted ${extractedText.length} characters`);
    console.log(`   - Text preview: "${extractedText.substring(0, 200)}..."`);
    console.log(`   - Tables detected: ${tables.length}`);

    // Step 2: Clean extracted text
    console.log('\n[2/6] Cleaning extracted text...');
    const cleanedText = cleanText(extractedText);
    console.log(`✅ Text cleaned: ${cleanedText.length} characters (${extractedText.length - cleanedText.length} removed)`);

    // Step 3: Chunk text and tables with metadata
    // CRITICAL: Tables are preserved as single chunks and never split
    console.log('\n[3/6] Chunking text and tables...');
    const chunks = chunkTextAndTables(cleanedText, tables, 800, 100);

    if (chunks.length === 0) {
      console.error('❌ CHUNKING FAILED: No chunks created');
      throw new Error('No text chunks created from document');
    }

    console.log(`✅ Chunking SUCCESS: Created ${chunks.length} chunks`);
    
    // Calculate chunk sizes (chunks are now objects with .text property)
    const chunkSizes = chunks.map(c => (c.text || '').length);
    const totalSize = chunkSizes.reduce((sum, size) => sum + size, 0);
    const avgSize = chunks.length > 0 ? Math.round(totalSize / chunks.length) : 0;
    const minSize = chunkSizes.length > 0 ? Math.min(...chunkSizes) : 0;
    const maxSize = chunkSizes.length > 0 ? Math.max(...chunkSizes) : 0;
    
    console.log(`   - Average chunk size: ${avgSize} characters`);
    console.log(`   - Chunk size range: ${minSize} - ${maxSize} characters`);
    
    // Log first 3 chunks for verification
    chunks.slice(0, 3).forEach((chunk, idx) => {
      const chunkText = chunk.text || '';
      const chunkType = chunk.type || 'text';
      console.log(`   - Chunk ${idx + 1} (${chunkText.length} chars, type: ${chunkType}): "${chunkText.substring(0, 100)}..."`);
    });

    // Step 4: Generate embeddings using Gemini
    // Extract chunk texts for embedding generation
    const chunkTexts = chunks.map(chunk => chunk.text || chunk);
    console.log(`\n[4/6] Generating embeddings for ${chunks.length} chunks...`);
    const embeddings = await generateEmbeddings(chunkTexts);
    
    // Validate embeddings
    if (embeddings.length !== chunks.length) {
      console.error(`❌ EMBEDDING MISMATCH: Generated ${embeddings.length} embeddings but have ${chunks.length} chunks`);
      throw new Error(`Embedding count mismatch: ${embeddings.length} embeddings for ${chunks.length} chunks`);
    }
    
    // Validate embedding dimensions
    const embeddingDims = embeddings.map(e => e.length);
    const uniqueDims = [...new Set(embeddingDims)];
    if (uniqueDims.length > 1) {
      console.error(`❌ EMBEDDING DIMENSION MISMATCH: Found dimensions ${uniqueDims.join(', ')}`);
      throw new Error(`Inconsistent embedding dimensions: ${uniqueDims.join(', ')}`);
    }
    
    const embeddingDim = uniqueDims[0];
    if (embeddingDim !== 768) {
      console.warn(`⚠️ WARNING: Embedding dimension is ${embeddingDim}, expected 768`);
    }
    
    console.log(`✅ Embeddings SUCCESS: Generated ${embeddings.length} embeddings`);
    console.log(`   - Embedding dimension: ${embeddingDim}`);
    console.log(`   - All embeddings have same dimension: ${uniqueDims.length === 1 ? 'YES' : 'NO'}`);

    // Step 5: Store document metadata in PostgreSQL with GCS URL
    console.log(`\n[5/6] Storing document metadata...`);
    const gcsUrl = `gs://${process.env.GCS_INPUT_BUCKET || 'fileinputbucket'}/${gcsFileName}`;
    await query(
      'INSERT INTO documents (id, file_name, gcs_url) VALUES ($1, $2, $3)',
      [documentId, fileName, gcsUrl]
    );
    console.log(`✅ Document metadata stored: ${documentId}`);

    // Step 6: Store embeddings in PostgreSQL
    console.log(`\n[6/6] Storing embeddings in database...`);
    await storeEmbeddings(embeddings, chunks, documentId);
    
    // Verify embeddings were stored
    const verifyResult = await query(
      'SELECT COUNT(*) as count FROM embeddings WHERE document_id = $1',
      [documentId]
    );
    const storedCount = parseInt(verifyResult.rows[0]?.count || 0);
    
    if (storedCount !== chunks.length) {
      console.error(`❌ STORAGE MISMATCH: Stored ${storedCount} embeddings but expected ${chunks.length}`);
      throw new Error(`Embedding storage mismatch: ${storedCount} stored, ${chunks.length} expected`);
    }
    
    console.log(`✅ Embeddings stored: ${storedCount} embeddings for document ${documentId}`);
    console.log(`\n✅ ========== INGESTION PIPELINE COMPLETE ==========`);
    console.log(`   Document ID: ${documentId}`);
    console.log(`   Total chunks: ${chunks.length}`);
    console.log(`   Total embeddings: ${storedCount}`);
    console.log(`   Embedding dimension: ${embeddingDim}`);

    res.json({
      success: true,
      documentId: documentId,
      fileName: fileName,
      gcsUrl: gcsUrl,
      chunksCount: chunks.length,
    });
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({
      error: 'Failed to process document',
      message: error.message,
    });
  }
});

/**
 * GET /api/upload/preview/:documentId
 * Get signed URL for document preview
 */
router.get('/preview/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;

    // Get document info from database
    const docResult = await query(
      'SELECT file_name, gcs_url FROM documents WHERE id = $1',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = docResult.rows[0];
    
    // Extract GCS filename from gcs_url (format: gs://bucket/filename)
    const gcsUrl = doc.gcs_url;
    if (!gcsUrl) {
      return res.status(404).json({ error: 'Document GCS URL not found' });
    }

    const gcsFileName = gcsUrl.split('/').slice(-1)[0]; // Get filename from gs://bucket/filename

    // Generate signed read URL (valid for 1 hour)
    const previewUrl = await generateSignedReadUrl(gcsFileName, 60);

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

export default router;
