import dotenv from 'dotenv';
import geminiClient from './gemini-client.js';
import logger from '../utils/logger.js';

dotenv.config();

/**
 * Generate embeddings using Gemini gemini-embedding-001 model
 */
export const generateEmbedding = async (text) => {
  try {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Text input is empty or invalid');
    }

    const execution = await geminiClient.executeWithFallback(
      async (genAI, modelName) => {
        const model = genAI.getGenerativeModel({ model: modelName });
        return await model.embedContent({
          content: { parts: [{ text }] },
          outputDimensionality: 768,
        });
      },
      { taskLabel: 'Embedding Generation', preferredModel: geminiClient.MODELS.EMBEDDING, fallbackModels: [] }
    );

    const result = execution.result;
    logger.info('EMBEDDING', 'Embedding generated', {
      modelUsed: execution.modelName,
      requestedModel: execution.requestedModel,
      inputLength: text.length,
    });

    let embedding;
    if (result.embedding) {
      if (result.embedding.values && Array.isArray(result.embedding.values)) {
        embedding = result.embedding.values;
      } else if (Array.isArray(result.embedding)) {
        embedding = result.embedding;
      } else {
        throw new Error('Invalid embedding structure: embedding property exists but is not an array');
      }
    } else if (Array.isArray(result)) {
      embedding = result;
    } else {
      logger.error('EMBEDDING', 'Unexpected embedding response structure', {
        modelUsed: execution.modelName,
        inputLength: text.length,
      });
      throw new Error('Invalid embedding response structure from Gemini');
    }

    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('Invalid embedding response: empty or not an array');
    }

    if (embedding.length !== 768) {
      logger.error('EMBEDDING', 'Invalid embedding dimension detected', {
        dimension: embedding.length,
        expectedDimension: 768,
        inputLength: text.length,
        modelUsed: execution.modelName,
      });
      throw new Error(`Invalid embedding dimension: ${embedding.length} (expected 768)`);
    }

    return embedding;
  } catch (error) {
    logger.error('EMBEDDING', 'Error generating embedding', {
      error: error.message,
      inputLength: text?.length || 0,
    });
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
};

/**
 * Generate embeddings for multiple texts in batch
 */
export const generateEmbeddings = async (texts) => {
  try {
    const embeddings = [];

    logger.info('EMBEDDING', 'Batch embedding generation started', {
      chunkCount: texts.length,
    });

    for (let i = 0; i < texts.length; i += 1) {
      const text = texts[i];
      const embedding = await generateEmbedding(text);

      if (embedding.length !== 768) {
        throw new Error(`Chunk ${i}: Invalid embedding dimension ${embedding.length}, expected 768`);
      }

      embeddings.push(embedding);
      logger.debug('EMBEDDING', 'Batch embedding progress', {
        chunkIndex: i + 1,
        chunkCount: texts.length,
        dimension: embedding.length,
        inputLength: text.length,
      });
    }

    logger.info('EMBEDDING', 'Batch embedding generation complete', {
      chunkCount: embeddings.length,
      dimension: 768,
    });

    return embeddings;
  } catch (error) {
    logger.error('EMBEDDING', 'Error generating embeddings batch', {
      error: error.message,
    });
    throw error;
  }
};
