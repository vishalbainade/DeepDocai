import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Gemini Client with Multi-Key Rotation & Model Fallback
 * 
 * Supports multiple API keys (comma-separated in GEMINI_API_KEYS env var)
 * and automatically falls back to alternate models on rate limit errors.
 * 
 * ENV VARS:
 *   GEMINI_API_KEY  - Single key (backward compatible)
 *   GEMINI_API_KEYS - Comma-separated list of keys for rotation
 * 
 * FALLBACK ORDER (text models):
 *   1. gemini-2.5-flash       (5 RPM, 250K TPM, 20 RPD)
 *   2. gemini-2.5-flash-lite  (10 RPM, 250K TPM, 20 RPD)
 *   3. gemini-2.0-flash       (15 RPM, 1M TPM, 1500 RPD)
 */

// Load all API keys
const loadApiKeys = () => {
  const multiKeys = process.env.GEMINI_API_KEYS;
  if (multiKeys) {
    const keys = multiKeys.split(',').map(k => k.trim()).filter(Boolean);
    if (keys.length > 0) {
      console.log(`🔑 Loaded ${keys.length} Gemini API keys for rotation`);
      return keys;
    }
  }

  const singleKey = process.env.GEMINI_API_KEY;
  if (singleKey) {
    console.log('🔑 Loaded 1 Gemini API key');
    return [singleKey];
  }

  throw new Error('No Gemini API keys found. Set GEMINI_API_KEY or GEMINI_API_KEYS env var.');
};

const apiKeys = loadApiKeys();

// Create GoogleGenerativeAI instances for each key
const clients = apiKeys.map(key => new GoogleGenerativeAI(key));

// Track current key index (round-robin)
let currentKeyIndex = 0;

// Fallback model chain for text generation (Free Tier limits)
const TEXT_MODELS = [
  'gemini-2.5-flash',       // 5 RPM
  'gemini-3-flash',         // 5 RPM
  'gemini-2.5-flash-lite',  // 10 RPM
  'gemini-3.1-flash-lite',  // 15 RPM, 500 RPD
  'gemini-2.0-flash'        // 15 RPM
];

// Embedding models (no fallback chain needed, just rotate keys)
const EMBEDDING_MODELS = [
  'gemini-embedding-001',
];

/**
 * Check if an error is a rate limit error (429)
 */
const isRateLimitError = (error) => {
  if (!error) return false;
  const msg = error.message || '';
  const status = error.status || error.httpStatusCode || error?.response?.status;
  return (
    status === 429 ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('rate limit') ||
    msg.includes('quota')
  );
};

/**
 * Get the next API key client (round-robin)
 */
const getNextClient = () => {
  currentKeyIndex = (currentKeyIndex + 1) % clients.length;
  return clients[currentKeyIndex];
};

/**
 * Execute a Gemini call with automatic key rotation and model fallback.
 * 
 * @param {Function} callFn - Function that receives (genAI, modelName) and returns a promise
 * @param {Object} options
 * @param {string} options.preferredModel - Preferred model name (default: 'gemini-2.5-flash')
 * @param {string[]} options.fallbackModels - Override fallback model chain
 * @param {string} options.taskLabel - Label for logging (e.g. 'table extraction')
 * @returns {Promise<any>} - Result from the callFn
 */
export const executeWithFallback = async (callFn, options = {}) => {
  const {
    preferredModel = 'gemini-2.5-flash',
    fallbackModels = TEXT_MODELS,
    taskLabel = 'Gemini call',
  } = options;

  // Build the ordered model list: preferred first, then fallbacks
  const models = [preferredModel, ...fallbackModels.filter(m => m !== preferredModel)];
  const totalAttempts = clients.length * models.length;
  let attempt = 0;
  let lastError = null;

  for (const modelName of models) {
    for (let keyAttempt = 0; keyAttempt < clients.length; keyAttempt++) {
      attempt++;
      const client = clients[currentKeyIndex];
      const keyLabel = `key-${currentKeyIndex + 1}/${clients.length}`;

      try {
        const result = await callFn(client, modelName);
        return result;
      } catch (error) {
        lastError = error;

        if (isRateLimitError(error)) {
          console.warn(
            `⚠️ [${taskLabel}] Rate limited on ${modelName} (${keyLabel}). ` +
            `Attempt ${attempt}/${totalAttempts}`
          );
          // Try next key
          getNextClient();
        } else {
          // Non-rate-limit error — don't retry
          throw error;
        }
      }
    }
    // All keys exhausted for this model, move to next model
    const nextModel = models[models.indexOf(modelName) + 1];
    if (nextModel) {
      console.log(`\n======================================================`);
      console.log(`🔄 MODEL SWITCH: Exhausted limits for ${modelName}.`);
      console.log(`🚀 Switching to fallback model: ${nextModel}`);
      console.log(`======================================================\n`);
    }
  }

  // All keys and all models exhausted
  console.error(`❌ [${taskLabel}] All ${totalAttempts} attempts failed.`);
  throw lastError || new Error(`All Gemini API keys and models exhausted for: ${taskLabel}`);
};

/**
 * Get a generative model instance (for simple/direct usage).
 * Uses the current active key.
 */
export const getGenAI = () => {
  return clients[currentKeyIndex];
};

/**
 * Get model name constants
 */
export const MODELS = {
  TEXT: 'gemini-2.5-flash',
  EMBEDDING: 'gemini-embedding-001',
  TEXT_FALLBACKS: TEXT_MODELS,
};

export default { executeWithFallback, getGenAI, MODELS, isRateLimitError };
