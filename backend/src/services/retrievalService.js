import { query } from '../db/index.js';
import { reciprocalRankFusion } from '../utils/rrf.js';
import { getAllDocumentChunks, getTopChunksByOrder } from './vector_service.js';
import { generateEmbedding } from './embedding.service.js';
import logger from '../utils/logger.js';

const summarizeChunksForTable = (chunks = []) =>
  chunks.map((chunk, index) => ({
    rank: index + 1,
    chunkId: chunk.id,
    type: chunk.chunkType,
    page: chunk.pageNumber,
    similarity: Number(chunk.similarity || 0).toFixed(4),
    hasBBox: Array.isArray(chunk.bbox) ? 'yes' : 'no',
    preview: String(chunk.content || '').replace(/\s+/g, ' ').trim().slice(0, 80),
  }));

const mapRow = (row) => {
  let metadata = {};
  let bbox = row.bbox;

  if (typeof row.metadata === 'string') {
    try {
      metadata = JSON.parse(row.metadata);
    } catch {
      metadata = {};
    }
  } else {
    metadata = row.metadata || {};
  }

  if (typeof row.bbox === 'string') {
    try {
      bbox = JSON.parse(row.bbox);
    } catch {
      bbox = null;
    }
  }

  return {
    id: row.id,
    documentId: row.document_id,
    chunkIndex: row.chunk_index,
    content: row.content || '',
    text: row.content || '',
    chunkType: row.chunk_type || metadata.chunkType || 'paragraph',
    pageNumber: row.page_number || metadata.pageNumber || 1,
    bbox,
    pageWidth: row.page_width || metadata.pageWidth || null,
    pageHeight: row.page_height || metadata.pageHeight || null,
    similarity: Number(row.similarity ?? row.rrfScore ?? 0),
    metadata: {
      ...metadata,
      documentId: row.document_id,
      chunkIndex: row.chunk_index,
      chunkType: row.chunk_type || metadata.chunkType || 'paragraph',
      pageNumber: row.page_number || metadata.pageNumber || 1,
      bbox,
      pageWidth: row.page_width || metadata.pageWidth || null,
      pageHeight: row.page_height || metadata.pageHeight || null,
    },
  };
};

export const cleanQueryForSearch = (question) => {
  if (!question || typeof question !== 'string') {
    return question;
  }

  const formattingPatterns = [
    /\bin\s+tabular\s+format\b/gi,
    /\bin\s+a\s+table\b/gi,
    /\bin\s+table\s+format\b/gi,
    /\bas\s+a\s+table\b/gi,
    /\bin\s+table\b/gi,
    /\btabular\s+format\b/gi,
    /\btable\s+format\b/gi,
    /\bin\s+tabular\b/gi,
    /\bshow\s+in\s+table\b/gi,
    /\bdisplay\s+in\s+table\b/gi,
    /\bpresent\s+in\s+table\b/gi,
    /\bformat\s+as\s+table\b/gi,
    /\bin\s+points\b/gi,
    /\bas\s+points\b/gi,
    /\bin\s+bullet\s+points\b/gi,
    /\bas\s+bullet\s+points\b/gi,
    /\bin\s+list\s+format\b/gi,
    /\bas\s+a\s+list\b/gi,
    /\bin\s+markdown\b/gi,
  ];

  let cleaned = question.trim();
  formattingPatterns.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, '');
  });

  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned.length >= 3 ? cleaned : question.trim();
};

export const isTableRequest = (question) => {
  const lowerQuestion = String(question || '').toLowerCase();
  const keywords = [
    'tabular format',
    'table format',
    'in table',
    'as table',
    'tabular',
    'timeline',
    'summary table',
    'show in table',
    'display in table',
    'create a table',
    'format as table',
  ];

  return keywords.some((keyword) => lowerQuestion.includes(keyword));
};

export const isGenericQuery = (question) => {
  const lowerQuestion = String(question || '').toLowerCase();
  const keywords = [
    'summarize',
    'summary',
    'summarise',
    'overview',
    'key points',
    'important points',
    'highlights',
    'what is',
    'what are',
    'tell me about',
    'explain',
    'describe',
    'whole document',
  ];

  const wordCount = lowerQuestion.split(/\s+/).filter(Boolean).length;
  return keywords.some((keyword) => lowerQuestion.includes(keyword)) || wordCount <= 4;
};

export const hybridSearch = async (queryString, queryEmbedding, documentId, isGeneric = false, isTable = false) => {
  if (isTable) {
    logger.info('RETRIEVAL', 'Table retrieval started', { documentId });
    return getAllDocumentChunks(documentId, true);
  }

  if (isGeneric) {
    logger.info('RETRIEVAL', 'Generic retrieval started', { documentId });
    return getTopChunksByOrder(documentId, 10);
  }

  logger.info('RETRIEVAL', 'Hybrid retrieval started', { documentId, query: queryString });
  const vectorString = `[${queryEmbedding.join(',')}]`;

  try {
    const vectorStartedAt = Date.now();
    const vectorRes = await query(
      `SELECT
        id,
        document_id,
        chunk_index,
        content,
        chunk_type,
        page_number,
        bbox,
        page_width,
        page_height,
        metadata,
        1 - (embedding <=> $1::vector) AS similarity
      FROM chunks
      WHERE document_id = $2
      ORDER BY embedding <=> $1::vector
      LIMIT 10`,
      [vectorString, documentId]
    );
    logger.info('VECTOR SEARCH', 'Vector search completed', {
      documentId,
      matches: vectorRes.rows.length,
      durationMs: Date.now() - vectorStartedAt,
    });

    const keywordStartedAt = Date.now();
    const keywordRes = await query(
      `SELECT
        id,
        document_id,
        chunk_index,
        content,
        chunk_type,
        page_number,
        bbox,
        page_width,
        page_height,
        metadata,
        ts_rank(search_vector, websearch_to_tsquery('english', $1)) AS similarity
      FROM chunks
      WHERE document_id = $2
        AND search_vector @@ websearch_to_tsquery('english', $1)
      ORDER BY similarity DESC
      LIMIT 10`,
      [queryString, documentId]
    );
    logger.info('KEYWORD SEARCH', 'Keyword search completed', {
      documentId,
      matches: keywordRes.rows.length,
      durationMs: Date.now() - keywordStartedAt,
    });

    const totalResults = vectorRes.rows.length + keywordRes.rows.length;
    if (totalResults < 3) {
      const fallback = vectorRes.rows.slice(0, 5).map((row) => mapRow(row));
      logger.info('RERANK', 'Fallback to vector results', {
        documentId,
        selectedChunkIds: fallback.map((chunk) => chunk.id),
      });
      return fallback;
    }

    const fused = reciprocalRankFusion([vectorRes.rows, keywordRes.rows]).slice(0, 5).map((row) => mapRow(row));
    logger.info('RERANK', 'Hybrid rerank completed', {
      documentId,
      selectedChunkIds: fused.map((chunk) => chunk.id),
    });
    return fused;
  } catch (error) {
    logger.error('ERROR', 'Hybrid retrieval failed', {
      area: 'RETRIEVAL',
      documentId,
      error: error.message,
    });
    throw error;
  }
};

export const retrieveRelevantChunks = async ({ question, documentId, intent }) => {
  const cleanedQuestion = cleanQueryForSearch(question);
  const tableQuery = intent === 'table' || (intent == null && isTableRequest(question));
  const genericQuery = intent === 'summary' || (intent == null && isGenericQuery(question));
  logger.info('DATA FLOW', 'Intent classification complete', {
    documentId,
    requestedIntent: intent || 'auto',
    effectiveIntent: tableQuery ? 'table' : genericQuery ? 'summary' : 'question',
    originalQuestion: question,
    cleanedQuestion,
  });

  const embeddingStartedAt = Date.now();
  const queryEmbedding = await generateEmbedding(cleanedQuestion);
  logger.info('RETRIEVAL', 'Query embedding generated', {
    documentId,
    durationMs: Date.now() - embeddingStartedAt,
    embeddingDimensions: queryEmbedding.length,
  });

  const chunks = await hybridSearch(cleanedQuestion, queryEmbedding, documentId, genericQuery, tableQuery);
  logger.table('INFO', 'DATA FLOW', 'Retrieved chunk summary', summarizeChunksForTable(chunks), {
    documentId,
    selectedCount: chunks.length,
    effectiveIntent: tableQuery ? 'table' : genericQuery ? 'summary' : 'question',
  });

  return {
    cleanedQuestion,
    queryEmbedding,
    isTable: tableQuery,
    isGeneric: genericQuery,
    chunks,
  };
};
