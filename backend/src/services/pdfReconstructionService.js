import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { mapBboxToPdfCoords } from '../utils/bboxMapper.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Strips invalid characters (e.g., null bytes, non-printable characters)
 * that might break the PDF encoding.
 */
const sanitizeText = (text) => {
  if (!text) return '';
  // Remove null characters and standard non-printable ASCII (except newlines/tabs)
  // Also removes completely invalid Unicode sequences
  return text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
};

/**
 * Reconstructs an original PDF by injecting an invisible text layer 
 * using OCR bounding boxes, creating a "Searchable PDF" that preserves
 * all visual layouts securely.
 * 
 * @param {Buffer|Uint8Array} originalPdfBytes - The bytes of the original PDF
 * @param {Array} ocrMetadataPages - Array of JSON objects from Sarvam metadata/page_***.json
 * @returns {Promise<Uint8Array>} Bytes of the generated searchable PDF
 */
export const reconstructSearchablePdf = async (originalPdfBytes, ocrMetadataPages) => {
  console.log(`[PDF RECONSTRUCTION] Starting reconstruction of ${ocrMetadataPages.length} pages...`);
  
  try {
    // 1. Load the original PDF without modifying it directly
    const pdfDoc = await PDFDocument.load(originalPdfBytes);
    
    // Register fontkit to support custom Unicode fonts
    pdfDoc.registerFontkit(fontkit);
    
    // 2. Load Unicode font from the filesystem to support all OCR characters
    console.log('[PDF RECONSTRUCTION] Loading Unicode font...');
    const fontPath = path.join(__dirname, '../../fonts/NotoSans-Regular.ttf');
    const fontBytes = await fs.readFile(fontPath);
    const customFont = await pdfDoc.embedFont(fontBytes);
    
    const pages = pdfDoc.getPages();
    
    // Sort metadata array just to be safe
    ocrMetadataPages.sort((a, b) => a.page_num - b.page_num);

    // Using an array of promises for parallel execution as requested
    const pageProcessingPromises = pages.map(async (page, index) => {
      const pageMetadata = ocrMetadataPages[index];
      
      // Validation Check
      if (!pageMetadata) {
        console.warn(`[PDF RECONSTRUCTION] Missing metadata for page index ${index}`);
        return;
      }
      
      const { image_width: imgWidth, image_height: imgHeight, blocks } = pageMetadata;
      if (!imgWidth || !imgHeight || !blocks || !Array.isArray(blocks)) {
        console.warn(`[PDF RECONSTRUCTION] Invalid JSON metadata on page index ${index}`);
        return;
      }
      
      const { width: pdfWidth, height: pdfHeight } = page.getSize();
      
      // Inject each text block invisibly
      blocks.forEach(block => {
        if (!block.text || !block.coordinates) return;
        
        const scaledCoords = mapBboxToPdfCoords(
          block.coordinates,
          imgWidth,
          imgHeight,
          pdfWidth,
          pdfHeight
        );
        
        if (!scaledCoords) return;
        
        // Very basic font size heuristic based on box height
        const fontSize = Math.max(8, scaledCoords.height * 0.8);
        const cleanText = sanitizeText(block.text);

        if (cleanText) {
          page.drawText(cleanText, {
            x: scaledCoords.x,
            y: scaledCoords.y,
            size: fontSize,
            font: customFont,
            // Production safety: Use highly transparent color to ensure text is selectable but invisible
            // opacity: 0 can sometimes be aggressively stripped by basic PDF viewers.
            color: rgb(0, 0, 0),
            opacity: 0.01 
          });
        }
      });
      console.log(`[PDF RECONSTRUCTION] Page ${index + 1} reconstruction completed`);
    });

    console.log('[PDF RECONSTRUCTION] Injecting text layer across all pages...');
    // Run all page injections in parallel
    await Promise.all(pageProcessingPromises);
    
    // Save the newly modified PDF
    const newPdfBytes = await pdfDoc.save();
    console.log(`[PDF RECONSTRUCTION] PDF saved successfully. Size: ${newPdfBytes.length} bytes.`);
    return newPdfBytes;
    
  } catch (error) {
    console.error(`[PDF RECONSTRUCTION] FATAL ERROR:`, error.message);
    throw new Error(`Failed to reconstruct searchable PDF: ${error.message}`);
  }
};
