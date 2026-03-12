import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseLayoutBlocks } from '../utils/layoutParser.js';
import { PdfRenderer } from '../utils/pdfRenderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Strips invalid characters (e.g., null bytes, non-printable characters)
 * that might break the PDF encoding.
 */
const sanitizeText = (text) => {
  if (!text) return '';
  return text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
};

/**
 * Core Service returning a clean digital PDF generated entirely from the layout structure.
 * 
 * Replaces the old invisible text overlay paradigm, yielding a professional,
 * white A4 page layout built entirely from Sarvam logic.
 * 
 * @param {Array} ocrMetadataPages - Array of JSON objects from Sarvam metadata/page_***.json
 * @returns {Promise<Uint8Array>} Bytes of the generated searchable PDF
 */
export const reconstructSearchablePdf = async (ocrMetadataPages) => {
  console.log('\n[PDF RECONSTRUCTION] Starting generic digital A4 rebuild...');
  
  try {
    // Start with a clean slate
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    
    // Load Unicode font
    const fontPath = path.join(__dirname, '../../fonts/NotoSans-Regular.ttf');
    const fontBytes = await fs.readFile(fontPath);
    const customFont = await pdfDoc.embedFont(fontBytes);
    
    const renderer = new PdfRenderer(pdfDoc, customFont);

    // 1. Unpack geometry
    const blocks = parseLayoutBlocks(ocrMetadataPages);
    
    if (blocks.length === 0) {
       console.warn(`[PDF RECONSTRUCTION] Warning: Generated an empty PDF because no blocks existed.`);
    }

    // 2. Render blocks sequentially into logical A4 breaks
    blocks.forEach((block, index) => {
      if (!block.text) return;

      const cleanText = sanitizeText(block.text);

      let shortPreview = cleanText.substring(0, 30).replace(/\n/g, '');
      if (cleanText.length > 30) shortPreview += '...';
      
      console.log(`[RENDER BLOCK] Type: ${block.type.padEnd(10)} | Pg ${block.originalPage} | Text: ${shortPreview}`);

      renderer.drawBlock(cleanText, block.type);
    });

    // 3. Output
    const newPdfBytes = await pdfDoc.save();
    console.log(`[PDF COMPLETE] Digital document generated! Pages: ${renderer.pageCount}. Size: ${newPdfBytes.length} bytes.`);
    
    return newPdfBytes;

  } catch (error) {
    console.error(`[ERROR][PDF RECONSTRUCTION] FATAL ERROR:`, error.message);
    throw new Error(`Failed to sequentially render digital PDF: ${error.message}`);
  }
};
