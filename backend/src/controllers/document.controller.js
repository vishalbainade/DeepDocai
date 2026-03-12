import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { downloadFromInputBucket, uploadToInputBucket } from '../services/storage.service.js';
import { extractDocumentWithSarvam } from '../services/sarvam.service.js';
import { reconstructSearchablePdf } from '../services/documentReconstructionService.js';
import { cleanText } from '../utils/cleanup.js';
import { extractLayoutChunks } from '../services/layoutChunkingService.js';
import { generateEmbeddings } from '../services/embedding.service.js';
import { storeEmbeddings } from '../services/vector_service.js';
import { query } from '../db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const processDocument = async (req, res) => {
  const { documentId, fileName, gcsFileName } = req.body;
  const storageFileName = req.body.storageFileName || gcsFileName;

  if (!documentId || !fileName || !storageFileName) {
    return res.status(400).json({
      error: 'documentId, fileName, and storageFileName are required',
    });
  }

  let tempFilePath = null;

  try {
    console.log(`\n📄 ========== DOCUMENT INGESTION PIPELINE ==========`);
    console.log(`[UPLOAD] Processing document ${documentId} (${fileName})`);

    // Ensure the document exists in DB first with 'uploaded' status
    const initialStorageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/${process.env.SUPABASE_INPUT_BUCKET || 'file-inputs'}/original/${storageFileName}`;
    
    // Check if doc exists, if not create it (it should have been created on upload, but let's be safe)
    const docCheckResult = await query('SELECT id FROM documents WHERE id = $1', [documentId]);
    if (docCheckResult.rows.length === 0) {
      await query(
        'INSERT INTO documents (id, file_name, storage_url, status) VALUES ($1, $2, $3, $4)',
        [documentId, fileName, initialStorageUrl, 'processing']
      );
    } else {
      await updateDocumentStatus(documentId, 'processing');
    }

    // [1] Download original PDF
    console.log('\n[1/7] Downloading original PDF from storage...');
    const originalFileBuffer = await downloadFromInputBucket(storageFileName);

    const tempDir = path.join(__dirname, '../../temp');
    await fs.mkdir(tempDir, { recursive: true });
    tempFilePath = path.join(tempDir, `temp-${Date.now()}.pdf`);
    await fs.writeFile(tempFilePath, originalFileBuffer);

    // [2] Extract via Sarvam
    console.log('\n[2/7] Extracting OCR data via Sarvam Document Intelligence...');
    const extractedData = await extractDocumentWithSarvam(tempFilePath);
    const { text: extractedText, ocrMetadataPages } = extractedData;

    if (!extractedText || !ocrMetadataPages || ocrMetadataPages.length === 0) {
      throw new Error('Sarvam API failed to return valid text or metadata');
    }

    // [3] Reconstruct Searchable PDF
    console.log('\n[3/7] Reconstructing digital searchable PDF from layout structure...');
    const ocrPdfBytes = await reconstructSearchablePdf(ocrMetadataPages);

    // [4] Upload OCR PDF
    console.log('\n[4/7] Uploading pristine digital PDF back to storage...');
    const ocrStorageFileName = `ocr-${storageFileName}`;
    await uploadToInputBucket(Buffer.from(ocrPdfBytes), ocrStorageFileName);
    
    const ocrStorageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${process.env.SUPABASE_INPUT_BUCKET || 'file-inputs'}/${ocrStorageFileName}`;
    await updateDocumentStatus(documentId, 'ocr_complete', ocrStorageUrl);

    // [5] Clean & Chunk Text
    console.log('\n[5/7] Extracting Layout-Aware Chunks...');
    // We now deeply parse the layout bounds and paragraph bounds instead of dumb-chunking.
    const chunks = extractLayoutChunks(ocrMetadataPages, documentId);

    if (!chunks || chunks.length === 0) {
      throw new Error('No layout-aware chunks created from document');
    }

    console.log(`✅ Chunking SUCCESS: Created ${chunks.length} chunks`);

    // [6] Embeddings
    console.log(`\n[6/7] Generating embeddings for ${chunks.length} chunks...`);
    // Safe extraction fallback supporting plain strings or objects
    const chunkTexts = chunks.map(chunk => chunk.content || chunk.text || chunk);
    const embeddings = await generateEmbeddings(chunkTexts);

    // [7] Store in DB
    console.log(`\n[7/7] Storing embeddings in Vector DB...`);
    await storeEmbeddings(embeddings, chunks, documentId);
    
    await updateDocumentStatus(documentId, 'embedding_complete');

    console.log(`\n✅ ========== INGESTION PIPELINE COMPLETE ==========`);
    
    // Return early before cleanups that don't need to block response
    res.json({
      success: true,
      documentId: documentId,
      fileName: fileName,
      ocrPdfUrl: ocrStorageUrl, // explicit for frontend viewer
      storageUrl: ocrStorageUrl,
      chunksCount: chunks.length,
    });
    
  } catch (error) {
    console.error(`❌ [PIPELINE ERROR] Document ${documentId}:`, error);
    try {
      await updateDocumentStatus(documentId, 'failed');
    } catch (dbErr) {
      console.error('Failed to update status to failed:', dbErr);
    }
    
    res.status(500).json({
      error: 'Failed to process document',
      message: error.message,
    });
  } finally {
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }
  }
};

/**
 * Helper to update document status and optionally update the storage_url
 */
async function updateDocumentStatus(documentId, status, storageUrl = null) {
  if (storageUrl) {
    await query('UPDATE documents SET status = $1, storage_url = $2 WHERE id = $3', [status, storageUrl, documentId]);
  } else {
    await query('UPDATE documents SET status = $1 WHERE id = $2', [status, documentId]);
  }
}
