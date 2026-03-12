import { estimateTokens, truncateToTokenLimit } from '../utils/tokenizer.js';
import { cleanText } from '../utils/cleanup.js';

/**
 * Layout-aware chunking service.
 * Consumes Sarvam's OCR metadata pages and extracts structured chunks.
 * 
 * Rules:
 * - Tables -> 1 chunk intact
 * - Headings -> split boundary
 * - Paragraphs -> merged until ~300 tokens (max 400 safeguard)
 */
export const extractLayoutChunks = (ocrMetadataPages, documentId) => {
  console.log('\n[CHUNKING] Layout-aware chunking started');
  const chunks = [];
  
  let currentSectionTitle = 'General';
  let currentMerge = {
    text: '',
    tokens: 0,
    pageNumbers: new Set(),
    bboxes: []
  };

  const pushCurrentMerge = () => {
    if (currentMerge.tokens > 0) {
      chunks.push({
        document_id: documentId,
        content: currentMerge.text.trim(),
        chunk_type: 'section',
        page_number: Array.from(currentMerge.pageNumbers)[0] || 1, // Store primary page
        metadata: {
          section: currentSectionTitle,
          pages: Array.from(currentMerge.pageNumbers),
          bboxes: currentMerge.bboxes,
          source: 'sarvam'
        }
      });
      // Reset merge state
      currentMerge = { text: '', tokens: 0, pageNumbers: new Set(), bboxes: [] };
    }
  };

  let tableCount = 0;
  let paragraphCount = 0;

  ocrMetadataPages.forEach((page, pageIndex) => {
    if (!page || !page.blocks) return;
    const pageNum = page.page_num || pageIndex + 1;

    page.blocks.forEach((block) => {
      const text = cleanText(block.text || '');
      if (!text) return;

      const type = (block.block_type || block.type || block.label || 'paragraph').toLowerCase();
      const tokens = estimateTokens(text);
      const bbox = block.coordinates || block.box || null;

      if (type.includes('table')) {
        // Force push existing merge before a table
        pushCurrentMerge();
        // Add table as dedicated chunk, untouchable
        chunks.push({
          document_id: documentId,
          content: text.trim(),
          chunk_type: 'table',
          page_number: pageNum,
          metadata: {
            section: currentSectionTitle,
            bboxes: bbox ? [bbox] : [],
            source: 'sarvam'
          }
        });
        tableCount++;
      } else if (type.includes('heading') || type.includes('title')) {
        // Force push existing merge at section boundaries
        pushCurrentMerge();
        currentSectionTitle = text.substring(0, 100); 
        
        currentMerge.text += text + '\n\n';
        currentMerge.tokens += tokens;
        currentMerge.pageNumbers.add(pageNum);
        if (bbox) currentMerge.bboxes.push(bbox);
      } else {
        // Standard mergeable block (Paragraph/List/etc)
        // If we breach the ~300 target (buffer allowed up to max token threshold ideally), push.
        if (currentMerge.tokens + tokens > 300 && currentMerge.tokens > 0) {
          pushCurrentMerge();
        }

        // SAFEGUARD: Hard limit single giant blocks from hitting 1000s of tokens
        if (tokens > 400) {
          const truncated = truncateToTokenLimit(text, 400);
          currentMerge.text += truncated + '\n\n';
          currentMerge.tokens += 400; // Heuristic
        } else {
          currentMerge.text += text + '\n\n';
          currentMerge.tokens += tokens;
        }

        currentMerge.pageNumbers.add(pageNum);
        if (bbox) currentMerge.bboxes.push(bbox);
        paragraphCount++;
      }
    });
  });

  // Flush remaining paragraphs
  pushCurrentMerge();

  const sectionChunks = chunks.filter(c => c.chunk_type !== 'table').length;
  console.log(`[CHUNKING] Section/Paragraph chunks created: ${sectionChunks}`);
  console.log(`[CHUNKING] Table chunks created: ${tableCount}`);
  
  return chunks;
};
