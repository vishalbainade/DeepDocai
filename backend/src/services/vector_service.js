import { query, getClient } from '../db/index.js';

/**
 * Store embeddings in PostgreSQL with pgvector
 * CRITICAL: Now supports chunk metadata (type, page_number) for table-aware retrieval
 */
export const storeEmbeddings = async (embeddings, chunks, documentId) => {
  const client = await getClient();
  
  try {
    if (embeddings.length !== chunks.length) {
      throw new Error('Mismatch between embeddings and chunks count');
    }

    console.log(`\n💾 Storing ${embeddings.length} embeddings for document ${documentId}...`);

    await client.query('BEGIN');

    try {
      let successCount = 0;
      let tableCount = 0;
      let textCount = 0;
      
      for (let i = 0; i < embeddings.length; i++) {
        const embedding = embeddings[i];
        const chunk = chunks[i];

        if (embedding.length !== 768) {
          console.warn(`⚠️ Chunk ${i}: Embedding dimension is ${embedding.length}, expected 768`);
        }

        const chunkText = typeof chunk === 'string' ? chunk : (chunk.text || '');
        const chunkType = typeof chunk === 'object' && chunk.type ? chunk.type : 'text';
        const pageNumber = typeof chunk === 'object' && chunk.page_number ? chunk.page_number : null;
        
        if (!chunkText || chunkText.trim().length === 0) {
          console.warn(`⚠️ Chunk ${i}: Empty chunk text, skipping...`);
          continue;
        }

        const vectorString = `[${embedding.join(',')}]`;

        await client.query(
          `INSERT INTO embeddings (document_id, chunk_index, chunk_text, embedding, chunk_type, page_number)
           VALUES ($1, $2, $3, $4::vector, $5, $6)`,
          [documentId, i, chunkText, vectorString, chunkType, pageNumber]
        );
        successCount++;
        
        if (chunkType === 'table') {
          tableCount++;
        } else {
          textCount++;
        }
        
        if ((i + 1) % 10 === 0) {
          console.log(`   Progress: ${i + 1}/${embeddings.length} embeddings stored...`);
        }
      }

      await client.query('COMMIT');
      console.log(`✅ Successfully stored ${successCount} embeddings for document ${documentId}`);
      console.log(`   - Text chunks: ${textCount}`);
      console.log(`   - Table chunks: ${tableCount}`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error storing embeddings:', error);
    throw new Error(`Failed to store embeddings: ${error.message}`);
  } finally {
    client.release();
  }
};

/**
 * Perform similarity search in PostgreSQL using pgvector
 * Returns top K most similar chunks using cosine distance
 */
export const searchSimilarChunks = async (queryEmbedding, documentId, topK = 4) => {
  try {
    if (!queryEmbedding || !Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
      throw new Error('Invalid query embedding');
    }

    if (!documentId) {
      throw new Error('Document ID is required');
    }

    const vectorString = `[${queryEmbedding.join(',')}]`;

    console.log(`\n🔍 Vector similarity search for document ${documentId}...`);
    
    const result = await query(
      `SELECT 
        id,
        document_id,
        chunk_index,
        chunk_text,
        chunk_type,
        page_number,
        1 - (embedding <=> $1::vector) as similarity,
        embedding <=> $1::vector as distance
       FROM embeddings
       WHERE embedding IS NOT NULL
         AND document_id = $2
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      [vectorString, documentId, topK]
    );

    if (!result.rows || result.rows.length === 0) {
      console.log(`⚠️ No results for document ${documentId}`);
      return [];
    }

    console.log(`✅ Found ${result.rows.length} similar chunks`);

    const chunks = result.rows.map((row) => ({
      text: row.chunk_text || '',
      metadata: {
        documentId: row.document_id,
        chunkIndex: row.chunk_index,
        chunkType: row.chunk_type || 'text',
        pageNumber: row.page_number,
      },
      distance: parseFloat(row.distance) || 0,
      similarity: parseFloat(row.similarity) || 0,
    }));

    return chunks;
  } catch (error) {
    console.error('Error in similarity search:', error);
    throw new Error(`Failed to search similar chunks: ${error.message}`);
  }
};

/**
 * Get top chunks by document order (for generic queries)
 */
export const getTopChunksByOrder = async (documentId, topK = 10) => {
  try {
    if (!documentId) {
      throw new Error('Document ID is required');
    }

    const result = await query(
      `SELECT 
        id,
        document_id,
        chunk_index,
        chunk_text,
        chunk_type,
        page_number
       FROM embeddings
       WHERE embedding IS NOT NULL
         AND document_id = $1
       ORDER BY chunk_index ASC
       LIMIT $2`,
      [documentId, topK]
    );

    if (!result.rows || result.rows.length === 0) {
      console.log(`No chunks found for document ${documentId}`);
      return [];
    }

    console.log(`Found ${result.rows.length} chunks by order`);

    return result.rows.map((row) => ({
      text: row.chunk_text || '',
      metadata: {
        documentId: row.document_id,
        chunkIndex: row.chunk_index,
        chunkType: row.chunk_type || 'text',
        pageNumber: row.page_number,
      },
      distance: 0.5,
      similarity: 0.5,
    }));
  } catch (error) {
    console.error('Error getting chunks by order:', error);
    throw new Error(`Failed to get chunks by order: ${error.message}`);
  }
};

/**
 * Get ALL chunks from a document (for table/summary queries)
 * CRITICAL: This retrieves ALL chunks to ensure comprehensive analysis
 * 
 * @param {string} documentId - Document ID
 * @param {boolean} prioritizeTables - If true, return table chunks first
 * @returns {Promise<Array>} Array of all chunks
 */
export const getAllDocumentChunks = async (documentId, prioritizeTables = false) => {
  try {
    if (!documentId) {
      throw new Error('Document ID is required');
    }

    // Get all chunks, optionally prioritizing tables
    const orderBy = prioritizeTables 
      ? 'ORDER BY chunk_type DESC, chunk_index ASC' // 'table' > 'text' alphabetically
      : 'ORDER BY chunk_index ASC';
    
    const result = await query(
      `SELECT 
        id,
        document_id,
        chunk_index,
        chunk_text,
        chunk_type,
        page_number,
        0.5 as similarity,
        0.5 as distance
       FROM embeddings
       WHERE embedding IS NOT NULL
         AND document_id = $1
       ${orderBy}`,
      [documentId]
    );

    if (!result.rows || result.rows.length === 0) {
      console.log(`No chunks found for document ${documentId}`);
      return [];
    }

    const tableChunks = result.rows.filter(r => r.chunk_type === 'table').length;
    const textChunks = result.rows.filter(r => r.chunk_type !== 'table').length;
    
    console.log(`📊 Retrieved ALL ${result.rows.length} chunks for document ${documentId}`);
    console.log(`   - Table chunks: ${tableChunks}`);
    console.log(`   - Text chunks: ${textChunks}`);

    const chunks = result.rows.map((row) => ({
      text: row.chunk_text || '',
      metadata: {
        documentId: row.document_id,
        chunkIndex: row.chunk_index,
        chunkType: row.chunk_type || 'text',
        pageNumber: row.page_number,
      },
      distance: 0.5,
      similarity: 0.5,
    }));

    return chunks;
  } catch (error) {
    console.error('Error getting all document chunks:', error);
    throw new Error(`Failed to get all document chunks: ${error.message}`);
  }
};

/**
 * Hybrid search: combines vector similarity with fallback strategies
 * CRITICAL: For table queries, retrieves ALL chunks
 */
export const hybridSearch = async (queryEmbedding, documentId, topK = 6, isGenericQuery = false, isTableQuery = false) => {
  try {
    // For table queries, retrieve ALL chunks from entire document
    if (isTableQuery) {
      console.log('📊 Table query: Retrieving ALL chunks');
      const allChunks = await getAllDocumentChunks(documentId, true);
      
      if (allChunks.length === 0) {
        throw new Error(`No chunks found for document ${documentId}`);
      }
      
      return allChunks;
    }
    
    // For generic queries, use ordered chunks
    if (isGenericQuery) {
      console.log('📝 Generic query: Using ordered chunks');
      return await getTopChunksByOrder(documentId, topK);
    }

    // For specific queries, use vector similarity
    console.log('🔍 Specific query: Using vector similarity');
    const vectorResults = await searchSimilarChunks(queryEmbedding, documentId, topK);
    
    if (vectorResults.length === 0) {
      console.log('⚠️ Vector search empty, falling back to ordered chunks');
      const fallbackChunks = await getTopChunksByOrder(documentId, topK);
      
      if (fallbackChunks.length === 0) {
        throw new Error(`No chunks found for document ${documentId}`);
      }
      
      return fallbackChunks;
    }
    
    return vectorResults;
  } catch (error) {
    console.error('Error in hybrid search:', error);
    
    // Try fallback
    try {
      const fallbackChunks = await getTopChunksByOrder(documentId, topK);
      if (fallbackChunks.length === 0) {
        throw new Error(`No chunks available for document ${documentId}`);
      }
      return fallbackChunks;
    } catch (fallbackError) {
      throw new Error(`Hybrid search failed: ${fallbackError.message}`);
    }
  }
};

/**
 * Delete all embeddings for a document
 */
export const deleteDocumentEmbeddings = async (documentId) => {
  try {
    const result = await query(
      'DELETE FROM embeddings WHERE document_id = $1 RETURNING id',
      [documentId]
    );

    const deletedCount = result.rowCount || 0;
    console.log(`Deleted ${deletedCount} embeddings for document ${documentId}`);
    return deletedCount;
  } catch (error) {
    console.error('Error deleting document embeddings:', error);
    throw new Error(`Failed to delete document embeddings: ${error.message}`);
  }
};

/**
 * Get document statistics
 */
export const getDocumentStats = async (documentId) => {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) as total_chunks,
        COUNT(CASE WHEN chunk_type = 'table' THEN 1 END) as table_chunks,
        COUNT(CASE WHEN chunk_type = 'text' THEN 1 END) as text_chunks,
        SUM(LENGTH(chunk_text)) as total_characters,
        AVG(LENGTH(chunk_text)) as avg_chunk_size
       FROM embeddings
       WHERE document_id = $1`,
      [documentId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      totalChunks: parseInt(result.rows[0].total_chunks) || 0,
      tableChunks: parseInt(result.rows[0].table_chunks) || 0,
      textChunks: parseInt(result.rows[0].text_chunks) || 0,
      totalCharacters: parseInt(result.rows[0].total_characters) || 0,
      avgChunkSize: parseInt(result.rows[0].avg_chunk_size) || 0,
    };
  } catch (error) {
    console.error('Error getting document stats:', error);
    return null;
  }
};
