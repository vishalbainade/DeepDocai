import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate embeddings using Gemini text-embedding-004 model
 */
export const generateEmbedding = async (text) => {
  try {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Text input is empty or invalid');
    }

    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    
    const result = await model.embedContent(text);
    
    // Handle different possible response structures
    let embedding;
    if (result.embedding) {
      // Check if it's an object with values property
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
      console.error('Unexpected embedding response structure:', JSON.stringify(result, null, 2));
      throw new Error('Invalid embedding response structure from Gemini');
    }

    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('Invalid embedding response: empty or not an array');
    }

    // Validate embedding dimensions (text-embedding-004 produces 768-dimensional vectors)
    if (embedding.length !== 768) {
      console.error(`❌ ERROR: Embedding dimension is ${embedding.length}, expected 768`);
      console.error(`   - Input text length: ${text.length} characters`);
      console.error(`   - This will cause vector search to fail!`);
      throw new Error(`Invalid embedding dimension: ${embedding.length} (expected 768)`);
    }

    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    console.error('Input text length:', text?.length || 0);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
};

/**
 * Generate embeddings for multiple texts in batch
 */
export const generateEmbeddings = async (texts) => {
  try {
    const embeddings = [];
    
    console.log(`\n🔮 Generating embeddings for ${texts.length} chunks...`);
    
    // Process embeddings sequentially to avoid rate limits
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      const embedding = await generateEmbedding(text);
      
      // Validate dimension
      if (embedding.length !== 768) {
        throw new Error(`Chunk ${i}: Invalid embedding dimension ${embedding.length}, expected 768`);
      }
      
      embeddings.push(embedding);
      
      // Log progress every 10 chunks
      if ((i + 1) % 10 === 0) {
        console.log(`   Progress: ${i + 1}/${texts.length} embeddings generated (dimension: ${embedding.length})`);
      }
    }
    
    console.log(`✅ Generated ${embeddings.length} embeddings, all with dimension 768`);

    return embeddings;
  } catch (error) {
    console.error('Error generating embeddings batch:', error);
    throw error;
  }
};

