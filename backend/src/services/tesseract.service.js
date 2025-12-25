import { createWorker } from 'tesseract.js';
import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse';
import { getStorage } from './storage.service.js';
import { extractTextWithOCR, extractTextAndTablesWithOCR } from './ocr_service.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const INPUT_BUCKET_NAME = process.env.GCS_INPUT_BUCKET || 'fileinputbucket';

/**
 * Convert PDF buffer to images and extract text using Tesseract OCR
 * Note: Tesseract.js cannot process PDFs directly, so we use Gemini OCR as fallback for PDFs
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<string>} Extracted text
 */
const extractTextFromPDFWithTesseract = async (pdfBuffer) => {
  // Tesseract.js doesn't support PDFs directly
  // For now, we'll use Gemini OCR for PDFs (which handles them natively)
  // Tesseract would require converting PDF pages to images first (needs pdf2pic + GraphicsMagick)
  throw new Error('Tesseract OCR requires PDF to be converted to images first. Use Gemini OCR for PDFs.');
};

/**
 * Download PDF from GCS and extract text
 * Strategy:
 * 1. Try pdf-parse (fast, works for text-based PDFs)
 * 2. If insufficient text, use Gemini OCR (handles image-based PDFs natively)
 * 3. Tesseract is reserved for actual image files (not PDFs)
 * @param {string} gcsFileName - File name in GCS bucket
 * @returns {Promise<string>} Extracted text
 */
export const extractTextWithTesseract = async (gcsFileName) => {
  try {
    console.log(`Starting text extraction for ${gcsFileName}...`);
    
    // Download file from GCS
    const storage = getStorage();
    const bucket = storage.bucket(INPUT_BUCKET_NAME);
    const file = bucket.file(gcsFileName);
    
    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`File ${gcsFileName} not found in GCS`);
    }

    // Download file to memory
    const [fileBuffer] = await file.download();
    
    // Step 1: Try pdf-parse for text-based PDFs (fastest)
    try {
      const pdfData = await pdfParse(fileBuffer);
      const extractedText = pdfData.text || '';
      
      // If we got substantial text, use it
      if (extractedText.trim().length > 500) {
        console.log(`Extracted ${extractedText.length} characters using pdf-parse`);
        return extractedText;
      }
      
      console.log(`pdf-parse extracted only ${extractedText.length} characters, falling back to Gemini OCR...`);
    } catch (pdfError) {
      console.log('pdf-parse failed, using Gemini OCR:', pdfError.message);
    }
    
    // Step 2: Fallback to Gemini OCR for image-based PDFs
    // Gemini OCR can handle PDFs directly without conversion
    console.log('Using Gemini OCR for PDF text extraction...');
    
    // Save buffer to temp file for Gemini OCR
    const tempDir = path.join(__dirname, '../../temp');
    await fs.mkdir(tempDir, { recursive: true });
    const tempFilePath = path.join(tempDir, `temp-${Date.now()}.pdf`);
    
    try {
      await fs.writeFile(tempFilePath, fileBuffer);
      const extractedText = await extractTextWithOCR(tempFilePath);
      
      // Clean up temp file
      await fs.unlink(tempFilePath).catch(() => {});
      
      if (extractedText && extractedText.trim().length > 0) {
        console.log(`Gemini OCR extracted ${extractedText.length} characters`);
        return extractedText;
      }
    } catch (ocrError) {
      // Clean up temp file on error
      await fs.unlink(tempFilePath).catch(() => {});
      throw ocrError;
    }
    
    throw new Error('Failed to extract text from PDF using both pdf-parse and Gemini OCR');
  } catch (error) {
    console.error('Error in text extraction:', error);
    throw new Error(`Failed to extract text: ${error.message}`);
  }
};

