import { estimateTokens, truncateToTokenLimit } from '../utils/tokenizer.js';
import { cleanText } from '../utils/cleanup.js';
import logger from '../utils/logger.js';

const normalizeBbox = (rawBbox) => {
  if (Array.isArray(rawBbox) && rawBbox.length === 4) {
    return rawBbox.map((value) => Number(Number(value).toFixed(2)));
  }

  if (rawBbox && typeof rawBbox === 'object' && 'x1' in rawBbox && 'y1' in rawBbox) {
    return [
      Number(Number(rawBbox.x1).toFixed(2)),
      Number(Number(rawBbox.y1).toFixed(2)),
      Number(Number(rawBbox.x2).toFixed(2)),
      Number(Number(rawBbox.y2).toFixed(2)),
    ];
  }

  return null;
};

const resolveChunkType = (type) => {
  if (type.includes('table')) return 'table';
  if (type.includes('heading') || type.includes('title')) return 'heading';
  if (type.includes('list')) return 'list';
  return 'paragraph';
};

export const extractLayoutChunks = (ocrMetadataPages, documentId) => {
  logger.info('CHUNKING', 'Layout-aware chunking started', { documentId });

  const chunks = [];
  let currentSectionTitle = 'General';
  let headingCount = 0;
  let paragraphCount = 0;
  let tableCount = 0;

  for (let pageIndex = 0; pageIndex < ocrMetadataPages.length; pageIndex += 1) {
    const page = ocrMetadataPages[pageIndex];
    if (!page || !Array.isArray(page.blocks)) {
      continue;
    }

    const pageNumber = page.page_num || pageIndex + 1;

    for (const block of page.blocks) {
      const text = cleanText(block?.text || '');
      if (!text) {
        continue;
      }

      const rawType = String(block?.block_type || block?.type || block?.label || 'paragraph').toLowerCase();
      const chunkType = resolveChunkType(rawType);
      const tokenCount = estimateTokens(text);
      const pageWidth = block?.page_width || page?.image_width || page?.page_width || null;
      const pageHeight = block?.page_height || page?.image_height || page?.page_height || null;
      const bbox = normalizeBbox(block?.coordinates || block?.box || null);
      const boundedContent =
        chunkType === 'table'
          ? truncateToTokenLimit(text, 700)
          : tokenCount > 400
            ? truncateToTokenLimit(text, 400)
            : text;

      if (chunkType === 'heading') {
        currentSectionTitle = boundedContent.substring(0, 100);
        headingCount += 1;
      } else if (chunkType === 'table') {
        tableCount += 1;
      } else {
        paragraphCount += 1;
      }

      chunks.push({
        document_id: documentId,
        content: boundedContent.trim(),
        chunk_type: chunkType,
        page_number: pageNumber,
        bbox,
        page_width: pageWidth,
        page_height: pageHeight,
        metadata: {
          section: currentSectionTitle,
          source: 'sarvam',
          originalBlockType: rawType,
          tokenCount: chunkType === 'table' ? Math.min(tokenCount, 700) : Math.min(tokenCount, 400),
          bbox,
          pageWidth,
          pageHeight,
        },
      });
    }
  }

  logger.info('CHUNKING', 'Layout chunks created', {
    documentId,
    totalChunks: chunks.length,
    headingChunks: headingCount,
    paragraphChunks: paragraphCount,
    tableChunks: tableCount,
  });

  if (chunks.length > 0) {
    const bboxChunks = chunks.filter((chunk) => Array.isArray(chunk.bbox) && chunk.bbox.length === 4).length;
    logger.info('CHUNKING', 'BBox coverage calculated', {
      documentId,
      bboxChunks,
      bboxCoverage: Number(((bboxChunks / chunks.length) * 100).toFixed(1)),
    });
  }

  return chunks;
};
