import logger from '../utils/logger.js';

const normalizeBbox = (bbox) => {
  if (!Array.isArray(bbox) || bbox.length !== 4) {
    return null;
  }

  return bbox.map((value) => Number(Number(value).toFixed(2)));
};

const buildPreview = (text) => {
  const preview = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 140);
  return preview.length === 140 ? `${preview}...` : preview;
};

const buildCitation = (chunk) => {
  const citation = {
    page: chunk.pageNumber || chunk.metadata?.pageNumber || 1,
    bbox: normalizeBbox(chunk.bbox || chunk.metadata?.bbox),
    pageWidth: chunk.pageWidth || chunk.metadata?.pageWidth || null,
    pageHeight: chunk.pageHeight || chunk.metadata?.pageHeight || null,
    chunkId: chunk.id || `chunk_${chunk.chunkIndex ?? 'unknown'}`,
    preview: buildPreview(chunk.content || chunk.text),
  };

  logger.info('CITATION MAP', 'Citation mapped', {
    chunkId: citation.chunkId,
    page: citation.page,
    bbox: citation.bbox,
  });

  return citation;
};

const tokenize = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);

const scoreChunkForParagraph = (paragraph, chunk) => {
  const paragraphTerms = new Set(tokenize(paragraph));
  const chunkTerms = tokenize(chunk.content || chunk.text);
  if (!paragraphTerms.size || !chunkTerms.length) {
    return chunk.similarity || 0;
  }

  let overlap = 0;
  chunkTerms.forEach((term) => {
    if (paragraphTerms.has(term)) {
      overlap += 1;
    }
  });

  return overlap + (chunk.similarity || 0);
};

export const buildCitations = (chunks = []) => {
  const seen = new Set();

  return chunks
    .map((chunk) => buildCitation(chunk))
    .filter((citation) => {
      const key = `${citation.chunkId}:${citation.page}:${JSON.stringify(citation.bbox)}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
};

export const buildParagraphCitations = (answerText, chunks = []) => {
  const paragraphs = String(answerText || '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    return [];
  }

  return paragraphs.map((paragraph, index) => {
    const ranked = [...chunks]
      .sort((left, right) => scoreChunkForParagraph(paragraph, right) - scoreChunkForParagraph(paragraph, left))
      .slice(0, 2);

    return {
      paragraphIndex: index,
      text: paragraph,
      citations: buildCitations(ranked),
    };
  });
};
