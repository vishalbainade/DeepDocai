import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import {
  DEFAULT_TEXT_MODEL,
  getAvailableTextModels,
  getTextFallbackModels,
  isUnsupportedModelError,
  resolveTextModel,
} from '../config/modelRegistry.js';
import logger from '../utils/logger.js';

dotenv.config();

const loadApiKeys = () => {
  const multiKeys = process.env.GEMINI_API_KEYS;
  if (multiKeys) {
    const keys = multiKeys.split(',').map((key) => key.trim()).filter(Boolean);
    if (keys.length > 0) {
      logger.info('LLM', 'Gemini API keys loaded', { keyCount: keys.length });
      return keys;
    }
  }

  const singleKey = process.env.GEMINI_API_KEY;
  if (singleKey) {
    logger.info('LLM', 'Gemini API keys loaded', { keyCount: 1 });
    return [singleKey];
  }

  // Don't crash — API keys are now managed in the database.
  // The new providerRouter loads keys from the ai_api_keys table.
  logger.warn('LLM', 'No Gemini API keys in .env — keys will be loaded from database via providerRouter');
  return [];
};

const apiKeys = loadApiKeys();
const clients = apiKeys.map((key) => new GoogleGenerativeAI(key));
let currentKeyIndex = 0;

const EMBEDDING_MODELS = ['gemini-embedding-001'];

const isRateLimitError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  const status = error?.status || error?.httpStatusCode || error?.response?.status || null;
  return (
    status === 429 ||
    message.includes('429') ||
    message.includes('resource_exhausted') ||
    message.includes('rate limit') ||
    message.includes('quota')
  );
};

const getNextClient = () => {
  currentKeyIndex = (currentKeyIndex + 1) % clients.length;
  return clients[currentKeyIndex];
};

const dedupe = (items) => [...new Set(items.filter(Boolean))];
const normalizeRequestedModel = (modelName) => {
  if (!modelName) {
    return DEFAULT_TEXT_MODEL.apiModel;
  }

  const resolved = resolveTextModel(modelName);
  if (resolved?.id === modelName || resolved?.apiModel === modelName) {
    return resolved.apiModel;
  }

  return modelName;
};

export const executeWithFallback = async (callFn, options = {}) => {
  const taskLabel = options.taskLabel || 'Gemini call';
  const taskLogger = logger.child({ taskLabel });
  const preferredModel = normalizeRequestedModel(options.preferredModel || DEFAULT_TEXT_MODEL.id);
  const fallbackModels =
    options.fallbackModels && options.fallbackModels.length > 0
      ? options.fallbackModels.map((model) => normalizeRequestedModel(model))
      : preferredModel === EMBEDDING_MODELS[0]
        ? []
        : getTextFallbackModels(preferredModel);

  const models = dedupe([preferredModel, ...fallbackModels]);
  const totalAttempts = clients.length * models.length;
  let attempt = 0;
  let lastError = null;

  for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
    const modelName = models[modelIndex];
    let shouldAdvanceModel = false;
    let rateLimitHits = 0;
    const rateLimitedKeys = [];

    for (let keyAttempt = 0; keyAttempt < clients.length; keyAttempt += 1) {
      attempt += 1;
      const client = clients[currentKeyIndex];
      const keyLabel = `key-${currentKeyIndex + 1}/${clients.length}`;

      try {
        const result = await callFn(client, modelName);
        taskLogger.info('LLM', 'Model execution succeeded', {
          modelName,
          attempt,
          totalAttempts,
          keyLabel,
        });
        return {
          result,
          modelName,
          attempt,
          totalAttempts,
          requestedModel: preferredModel,
          fallbackModels: models.filter((candidate) => candidate !== modelName),
        };
      } catch (error) {
        lastError = error;

        if (isRateLimitError(error)) {
          rateLimitHits += 1;
          rateLimitedKeys.push(keyLabel);
          getNextClient();
          continue;
        }

        if (isUnsupportedModelError(error)) {
          taskLogger.warn('LLM', 'Unsupported or unavailable model, moving to fallback', {
            modelName,
            attempt,
            totalAttempts,
          });
          shouldAdvanceModel = true;
          break;
        }

        throw error;
      }
    }

    if (rateLimitHits > 0) {
      taskLogger.warn('LLM', 'Rate limit hit for model', {
        modelName,
        rateLimitHits,
        attemptedKeys: rateLimitedKeys,
        attempt,
        totalAttempts,
      });
    }

    if (shouldAdvanceModel || modelIndex < models.length - 1) {
      const nextModel = models[modelIndex + 1];
      if (nextModel) {
        taskLogger.info('LLM', 'Switching to fallback model', {
          fromModel: modelName,
          toModel: nextModel,
        });
      }
    }
  }

  throw lastError || new Error(`All Gemini API keys and fallback models failed for ${taskLabel}`);
};

export const getGenAI = () => clients[currentKeyIndex];

export const MODELS = {
  TEXT: DEFAULT_TEXT_MODEL.id,
  TEXT_API: DEFAULT_TEXT_MODEL.apiModel,
  TEXT_FALLBACKS: getTextFallbackModels(DEFAULT_TEXT_MODEL.id),
  TEXT_OPTIONS: getAvailableTextModels(),
  EMBEDDING: EMBEDDING_MODELS[0],
};

export default {
  executeWithFallback,
  getGenAI,
  MODELS,
  isRateLimitError,
};
