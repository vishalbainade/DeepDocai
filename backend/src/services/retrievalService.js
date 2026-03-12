import { query } from '../db/index.js';
import { reciprocalRankFusion } from '../utils/rrf.js';
import { getTopChunksByOrder, getAllDocumentChunks } from './vector_service.js';

const mapToStandardOutput = (rows) => {
  return rows.map(r => ({
    text: r.content || r.chunk_text || '',
    metadata: {
      documentId: r.document_id,
      chunkIndex: r.chunk_index,
      chunkType: r.chunk_type || 'text',
      pageNumber: r.page_number,
      sourceMeta: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata
    },
    similarity: r.similarity || r.rrfScore || 0
  }));
};

/**
 * Hybrid Search combining pgvector cosine distance and PostgreSQL Full-Text Search.
 * Includes fallback constraints and detailed console logging.
 */
export const hybridSearch = async (queryString, queryEmbedding, documentId, isGenericQuery = false, isTableQuery = false) => {
  if (isTableQuery) {
    console.log('\n[RETRIEVAL] Table query: Retrieving ALL chunks');
    return await getAllDocumentChunks(documentId, true);
  }
  
  // Generic query handling (e.g. summaries)
  if (isGenericQuery) {
    console.log('\n[RETRIEVAL] Generic query: Using ordered chunks');
    return await getTopChunksByOrder(documentId, 10);
  }

  const vectorString = `[${queryEmbedding.join(',')}]`;
  console.log(`\n[RETRIEVAL] Query: "${queryString}"`);

  // --- VECTOR SEARCH ---
  const tVec = Date.now();
  const vectorRes = await query(`
    SELECT id, document_id, chunk_index, content, chunk_type, page_number,
           metadata, 1 - (embedding <=> $1::vector) as similarity
    FROM chunks
    WHERE document_id = $2
    ORDER BY embedding <=> $1::vector
    LIMIT 10
  `, [vectorString, documentId]);
  const vectorTime = Date.now() - tVec;
  console.log(`[VECTOR SEARCH]\nTop results: ${vectorRes.rows.length}\nTime: ${vectorTime}ms`);

  // --- KEYWORD SEARCH ---
  const tKey = Date.now();
  const keywordRes = await query(`
    SELECT id, document_id, chunk_index, content, chunk_type, page_number,
           metadata, ts_rank(search_vector, websearch_to_tsquery('english', $1)) as similarity
    FROM chunks
    WHERE document_id = $2 AND search_vector @@ websearch_to_tsquery('english', $1)
    ORDER BY similarity DESC
    LIMIT 10
  `, [queryString, documentId]);
  const keywordTime = Date.now() - tKey;
  console.log(`[KEYWORD SEARCH]\nMatches: ${keywordRes.rows.length}\nTime: ${keywordTime}ms`);

  // --- COMBINED FALLBACK CHECK ---
  const totalResults = vectorRes.rows.length + keywordRes.rows.length;
  if (totalResults < 3) {
    console.log(`[RERANK]\nFallback triggered (results < 3).\nReturning vector results purely.`);
    return mapToStandardOutput(vectorRes.rows.slice(0, 5));
  }

  // --- RERANK MERGE ---
  const fused = reciprocalRankFusion([vectorRes.rows, keywordRes.rows]);
  const finalChunks = fused.slice(0, 5); // Limit strictly to top 5 out of hybrid sum
  
  console.log(`[RERANK]\nRRF merge complete\nFinal chunks: ${finalChunks.length}`);

  return mapToStandardOutput(finalChunks);
};
