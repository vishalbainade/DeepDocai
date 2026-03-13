import { query, getClient } from '../db/index.js';
import logger from '../utils/logger.js';

const parseJson = (value, fallback = null) => {
  if (value == null) {
    return fallback;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  return value;
};

const mapChunkRow = (row, fallbackSimilarity = 0.5) => {
  const metadata = parseJson(row.metadata, {}) || {};
  const bbox = parseJson(row.bbox, metadata.bbox || null);
  const pageWidth = row.page_width || metadata.pageWidth || null;
  const pageHeight = row.page_height || metadata.pageHeight || null;

  return {
    id: row.id,
    documentId: row.document_id,
    chunkIndex: row.chunk_index,
    content: row.content || row.chunk_text || '',
    text: row.content || row.chunk_text || '',
    chunkType: row.chunk_type || metadata.chunkType || 'paragraph',
    pageNumber: row.page_number || metadata.pageNumber || 1,
    bbox,
    pageWidth,
    pageHeight,
    metadata: {
      ...metadata,
      documentId: row.document_id,
      chunkIndex: row.chunk_index,
      chunkType: row.chunk_type || metadata.chunkType || 'paragraph',
      pageNumber: row.page_number || metadata.pageNumber || 1,
      bbox,
      pageWidth,
      pageHeight,
    },
    distance: Number(row.distance ?? 0),
    similarity: Number(row.similarity ?? fallbackSimilarity),
  };
};

export const storeEmbeddings = async (embeddings, chunks, documentId) => {
  const client = await getClient();

  try {
    if (embeddings.length !== chunks.length) {
      throw new Error('Mismatch between embeddings and chunks count');
    }

    logger.info('INGESTION', 'Storing chunk embeddings', {
      documentId,
      chunkCount: chunks.length,
    });

    await client.query('BEGIN');

    for (let index = 0; index < embeddings.length; index += 1) {
      const embedding = embeddings[index];
      const chunk = chunks[index];
      const chunkText = typeof chunk === 'string' ? chunk : chunk.content || chunk.text || '';

      if (!chunkText.trim()) {
        logger.warn('INGESTION', 'Skipping empty chunk', { documentId, chunkIndex: index });
        continue;
      }

      const vectorString = `[${embedding.join(',')}]`;
      const chunkType = typeof chunk === 'object' ? chunk.chunk_type || 'paragraph' : 'paragraph';
      const pageNumber = typeof chunk === 'object' ? chunk.page_number || null : null;
      const bbox = typeof chunk === 'object' && chunk.bbox ? JSON.stringify(chunk.bbox) : null;
      const pageWidth = typeof chunk === 'object' ? chunk.page_width || null : null;
      const pageHeight = typeof chunk === 'object' ? chunk.page_height || null : null;
      const metadata = typeof chunk === 'object' && chunk.metadata ? JSON.stringify(chunk.metadata) : null;

      await client.query(
        `INSERT INTO chunks (
          document_id,
          chunk_index,
          content,
          embedding,
          chunk_type,
          page_number,
          bbox,
          page_width,
          page_height,
          metadata
        )
         VALUES ($1, $2, $3, $4::vector, $5, $6, $7, $8, $9, $10)`,
        [documentId, index, chunkText, vectorString, chunkType, pageNumber, bbox, pageWidth, pageHeight, metadata]
      );
    }

    await client.query('COMMIT');
    logger.info('INGESTION', 'Chunk embeddings stored', {
      documentId,
      chunkCount: chunks.length,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error('ERROR', 'Failed to store embeddings', {
      area: 'VECTOR STORE',
      documentId,
      error: error.message,
    });
    throw new Error(`Failed to store embeddings: ${error.message}`);
  } finally {
    client.release();
  }
};

export const searchSimilarChunks = async (queryEmbedding, documentId, topK = 4) => {
  try {
    if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
      throw new Error('Invalid query embedding');
    }

    const vectorString = `[${queryEmbedding.join(',')}]`;
    const result = await query(
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
        1 - (embedding <=> $1::vector) AS similarity,
        embedding <=> $1::vector AS distance
      FROM chunks
      WHERE document_id = $2 AND embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $3`,
      [vectorString, documentId, topK]
    );

    return result.rows.map((row) => mapChunkRow(row, 0));
  } catch (error) {
    logger.error('ERROR', 'Vector search failed', {
      area: 'SIMILARITY SEARCH',
      documentId,
      error: error.message,
    });
    throw new Error(`Failed to search similar chunks: ${error.message}`);
  }
};

export const getTopChunksByOrder = async (documentId, topK = 10) => {
  try {
    const result = await query(
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
        metadata
      FROM chunks
      WHERE document_id = $1 AND embedding IS NOT NULL
      ORDER BY chunk_index ASC
      LIMIT $2`,
      [documentId, topK]
    );

    return result.rows.map((row) => mapChunkRow(row, 0.5));
  } catch (error) {
    logger.error('ERROR', 'Ordered chunk retrieval failed', {
      area: 'ORDERED RETRIEVAL',
      documentId,
      error: error.message,
    });
    throw new Error(`Failed to get chunks by order: ${error.message}`);
  }
};

export const getAllDocumentChunks = async (documentId, prioritizeTables = false) => {
  try {
    const orderBy = prioritizeTables ? 'ORDER BY chunk_type DESC, chunk_index ASC' : 'ORDER BY chunk_index ASC';
    const result = await query(
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
        0.5 AS similarity,
        0.5 AS distance
      FROM chunks
      WHERE document_id = $1 AND embedding IS NOT NULL
      ${orderBy}`,
      [documentId]
    );

    return result.rows.map((row) => mapChunkRow(row, 0.5));
  } catch (error) {
    logger.error('ERROR', 'Document chunk retrieval failed', {
      area: 'ALL CHUNKS',
      documentId,
      error: error.message,
    });
    throw new Error(`Failed to get all document chunks: ${error.message}`);
  }
};

export const deleteDocumentEmbeddings = async (documentId) => {
  try {
    const result = await query('DELETE FROM chunks WHERE document_id = $1 RETURNING id', [documentId]);
    logger.info('INGESTION', 'Document chunks deleted', {
      documentId,
      deletedCount: result.rowCount || 0,
    });
    return result.rowCount || 0;
  } catch (error) {
    logger.error('ERROR', 'Failed to delete document embeddings', {
      area: 'DELETE CHUNKS',
      documentId,
      error: error.message,
    });
    throw new Error(`Failed to delete document embeddings: ${error.message}`);
  }
};

export const getDocumentStats = async (documentId) => {
  try {
    const result = await query(
      `SELECT
        COUNT(*) AS total_chunks,
        COUNT(CASE WHEN chunk_type = 'table' THEN 1 END) AS table_chunks,
        COUNT(CASE WHEN chunk_type = 'paragraph' THEN 1 END) AS paragraph_chunks,
        SUM(LENGTH(content)) AS total_characters,
        AVG(LENGTH(content)) AS avg_chunk_size
      FROM chunks
      WHERE document_id = $1`,
      [documentId]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      totalChunks: Number(row.total_chunks || 0),
      tableChunks: Number(row.table_chunks || 0),
      paragraphChunks: Number(row.paragraph_chunks || 0),
      totalCharacters: Number(row.total_characters || 0),
      avgChunkSize: Number(row.avg_chunk_size || 0),
    };
  } catch (error) {
    logger.error('ERROR', 'Failed to load document stats', {
      area: 'DOCUMENT STATS',
      documentId,
      error: error.message,
    });
    return null;
  }
};
