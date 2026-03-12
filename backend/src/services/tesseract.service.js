import { createWorker } from 'tesseract.js';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse';
import { downloadFromInputBucket } from './storage.service.js';
import { extractTextWithOCR, extractTextAndTablesWithOCR } from './ocr_service.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

/**
 * Download PDF from Supabase Storage and extract text
 * Strategy:
 * 1. Try pdf-parse (fast, works for text-based PDFs)
 * 2. If insufficient text, use Gemini OCR (handles image-based PDFs natively)
 * 3. Tesseract is reserved for actual image files (not PDFs)
 * @param {string} storageFileName - File name in Supabase storage bucket
 * @returns {Promise<string>} Extracted text
 */
export const extractTextWithTesseract = async (storageFileName) => {
  try {
    console.log(`Starting text extraction for ${storageFileName}...`);
    
    // Download file from Supabase Storage
    const fileBuffer = await downloadFromInputBucket(storageFileName);
    
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
