import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { downloadFromInputBucket, uploadToInputBucket } from '../services/storage.service.js';
import { extractDocumentWithSarvam } from '../services/sarvam.service.js';
import { reconstructSearchablePdf } from '../services/documentReconstructionService.js';
import { extractLayoutChunks } from '../services/layoutChunkingService.js';
import { generateEmbeddings } from '../services/embedding.service.js';
import { storeEmbeddings } from '../services/vector_service.js';
import { query } from '../db/index.js';
import logger from '../utils/logger.js';

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
    logger.info('INGESTION', 'Document processing started', { documentId, fileName });

    const initialStorageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/${process.env.SUPABASE_INPUT_BUCKET || 'file-inputs'}/original/${storageFileName}`;
    const docCheckResult = await query('SELECT id FROM documents WHERE id = $1', [documentId]);

    if (!docCheckResult.rows.length) {
      await query(
        'INSERT INTO documents (id, file_name, storage_url, status) VALUES ($1, $2, $3, $4)',
        [documentId, fileName, initialStorageUrl, 'processing']
      );
    } else {
      await updateDocumentStatus(documentId, 'processing');
    }

    logger.info('INGESTION', 'Downloading original PDF', { documentId, stage: 'download' });
    const originalFileBuffer = await downloadFromInputBucket(storageFileName);

    const tempDir = path.join(__dirname, '../../temp');
    await fs.mkdir(tempDir, { recursive: true });
    tempFilePath = path.join(tempDir, `temp-${Date.now()}.pdf`);
    await fs.writeFile(tempFilePath, originalFileBuffer);

    logger.info('INGESTION', 'OCR extraction started', { documentId, stage: 'ocr' });
    const extractedData = await extractDocumentWithSarvam(tempFilePath);
    const { text: extractedText, ocrMetadataPages } = extractedData;

    if (!extractedText || !ocrMetadataPages?.length) {
      throw new Error('Sarvam API failed to return valid text or metadata');
    }

    logger.info('INGESTION', 'Searchable PDF reconstruction started', {
      documentId,
      stage: 'pdf_reconstruction',
      pageCount: ocrMetadataPages.length,
    });
    const ocrPdfBytes = await reconstructSearchablePdf(ocrMetadataPages);

    logger.info('INGESTION', 'Uploading reconstructed PDF', { documentId, stage: 'pdf_upload' });
    const ocrStorageFileName = `ocr-${storageFileName}`;
    await uploadToInputBucket(Buffer.from(ocrPdfBytes), ocrStorageFileName);

    const ocrStorageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${process.env.SUPABASE_INPUT_BUCKET || 'file-inputs'}/${ocrStorageFileName}`;
    await updateDocumentStatus(documentId, 'ocr_complete', ocrStorageUrl);

    logger.info('INGESTION', 'Layout chunking started', { documentId, stage: 'chunking' });
    const chunks = extractLayoutChunks(ocrMetadataPages, documentId);
    if (!chunks.length) {
      throw new Error('No layout-aware chunks created from document');
    }

    logger.info('INGESTION', 'Embedding generation started', {
      documentId,
      stage: 'embeddings',
      chunkCount: chunks.length,
    });
    const chunkTexts = chunks.map((chunk) => chunk.content || chunk.text || chunk);
    const embeddings = await generateEmbeddings(chunkTexts);

    logger.info('INGESTION', 'Persisting embeddings started', {
      documentId,
      stage: 'storage',
      chunkCount: chunks.length,
    });
    await storeEmbeddings(embeddings, chunks, documentId);

    await updateDocumentStatus(documentId, 'embedding_complete');
    logger.info('INGESTION', 'Document processing completed', { documentId, chunkCount: chunks.length });

    return res.json({
      success: true,
      documentId,
      fileName,
      ocrPdfUrl: ocrStorageUrl,
      storageUrl: ocrStorageUrl,
      chunksCount: chunks.length,
    });
  } catch (error) {
    logger.error('ERROR', 'Document processing failed', {
      area: 'INGESTION',
      documentId,
      error: error.message,
    });

    try {
      await updateDocumentStatus(documentId, 'failed');
    } catch (dbErr) {
      logger.error('ERROR', 'Failed to update document status', {
        area: 'INGESTION',
        documentId,
        error: dbErr.message,
      });
    }

    return res.status(500).json({
      error: 'Failed to process document',
      message: error.message,
    });
  } finally {
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }
  }
};

async function updateDocumentStatus(documentId, status, storageUrl = null) {
  if (storageUrl) {
    await query('UPDATE documents SET status = $1, storage_url = $2 WHERE id = $3', [status, storageUrl, documentId]);
    return;
  }

  await query('UPDATE documents SET status = $1 WHERE id = $2', [status, documentId]);
}
