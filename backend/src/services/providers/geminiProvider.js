import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../../utils/logger.js';

/**
 * Google AI Studio (Gemini) Provider
 * Handles text generation for all Gemini and Gemma models.
 */
export const PROVIDER_SLUG = 'google';

// Model aliases fallback for stable Google AI endpoints
const FALLBACK_CANDIDATES = ['gemini-2.5-flash', 'gemini-2.5-pro'];

const resolveModelName = (name) => {
  if (!name) return 'gemini-2.5-flash';
  const clean = name.trim().toLowerCase();
  if (clean === 'gemini-2.5-pro' || clean.includes('2.5-pro')) return 'gemini-2.5-pro';
  if (clean.includes('gemini') || clean.includes('flash') || clean.includes('gemma')) return 'gemini-2.5-flash';
  return name;
};

export const generateText = async ({ apiKey, modelName, prompt, config = {} }) => {
  const startTime = Date.now();
  const primaryModel = resolveModelName(modelName);
  const providerLogger = logger.child({ provider: PROVIDER_SLUG, model: primaryModel });

  const isThinking = config.thinkingMode === true || config.thinkingMode === 'true';
  const isWeb = config.webMode === true || config.webMode === 'true' || config.grounding === true;

  providerLogger.info('PROVIDER', 'Gemini request initiated', {
    event: 'EXTERNAL_API_CALL_START',
    endpoint: 'generativelanguage.googleapis.com',
    modelName: primaryModel,
    promptLength: prompt.length,
    thinkingMode: isThinking,
    grounding: isWeb,
  });

  const genAI = new GoogleGenerativeAI(apiKey);

  const generationConfig = {
    temperature: config.temperature ?? 0.4,
    topP: config.topP ?? 0.95,
    ...(config.responseMimeType ? { responseMimeType: config.responseMimeType } : {}),
    ...(isThinking ? { thinkingConfig: { thinkingBudget: config.thinkingBudget || 24576 } } : {}),
  };

  const tools = isWeb ? [{ googleSearch: {} }] : undefined;

  // Attempt with resolved primary model, fallback if error
  const modelsToTry = [primaryModel, ...FALLBACK_CANDIDATES.filter((m) => m !== primaryModel)];
  let lastError = null;

  for (const currentModel of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: currentModel,
        generationConfig,
        ...(tools ? { tools } : {}),
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const latency = Date.now() - startTime;

      // Extract native Google Search grounding metadata if present
      const grounding = response.candidates?.[0]?.groundingMetadata;
      const webSources = (grounding?.groundingChunks || [])
        .filter((c) => c.web?.uri)
        .map((c, i) => ({
          title: c.web.title || `Web Source ${i + 1}`,
          url: c.web.uri,
          source: c.web.title || 'Google Search',
          snippet: c.web.uri,
        }));

      providerLogger.info('PROVIDER', 'Gemini request completed', {
        event: 'EXTERNAL_API_CALL_SUCCESS',
        provider: PROVIDER_SLUG,
        modelUsed: currentModel,
        latencyMs: latency,
        responseLength: text.length,
        tokensUsed: response.usageMetadata?.totalTokenCount || null,
        groundingSourcesCount: webSources.length,
      });

      return {
        text,
        latencyMs: latency,
        tokensUsed: response.usageMetadata?.totalTokenCount || null,
        provider: PROVIDER_SLUG,
        model: currentModel,
        webSources,
        groundingMetadata: grounding || null,
      };
    } catch (err) {
      lastError = err;
      if (err.message?.includes('404') || err.message?.includes('not found') || err.message?.includes('bidiGenerateContent') || err.message?.includes('WebSocket') || err.status === 404 || err.status === 400) {
        providerLogger.warn('PROVIDER', `Model ${currentModel} not available on REST endpoint, attempting candidate fallback...`);
        continue;
      }
      break;
    }
  }

  const latency = Date.now() - startTime;
  providerLogger.error('PROVIDER', 'Gemini request failed', {
    event: 'EXTERNAL_API_CALL_FAILURE',
    provider: PROVIDER_SLUG,
    latencyMs: latency,
    error: lastError?.message,
  });
  throw lastError;
};

export const generateTextStream = async function* ({ apiKey, modelName, prompt, config = {} }) {
  const startTime = Date.now();
  const primaryModel = resolveModelName(modelName);
  const providerLogger = logger.child({ provider: PROVIDER_SLUG, model: primaryModel });

  const isThinking = config.thinkingMode === true || config.thinkingMode === 'true';
  const isWeb = config.webMode === true || config.webMode === 'true' || config.grounding === true;

  providerLogger.info('PROVIDER', 'Gemini streaming request initiated', {
    event: 'EXTERNAL_API_STREAM_START',
    endpoint: 'generativelanguage.googleapis.com',
    modelName: primaryModel,
    thinkingMode: isThinking,
    grounding: isWeb,
  });

  const genAI = new GoogleGenerativeAI(apiKey);

  const generationConfig = {
    temperature: config.temperature ?? 0.4,
    topP: config.topP ?? 0.95,
    ...(isThinking ? { thinkingConfig: { thinkingBudget: config.thinkingBudget || 24576 } } : {}),
  };

  const tools = isWeb ? [{ googleSearch: {} }] : undefined;

  const modelsToTry = [primaryModel, ...FALLBACK_CANDIDATES.filter((m) => m !== primaryModel)];
  let activeModelUsed = primaryModel;
  let result = null;

  for (const currentModel of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: currentModel,
        generationConfig,
        ...(tools ? { tools } : {}),
      });

      result = await model.generateContentStream(prompt);
      activeModelUsed = currentModel;
      break;
    } catch (initError) {
      const isRetryable =
        initError.message?.includes('404') ||
        initError.message?.includes('503') ||
        initError.message?.includes('500') ||
        initError.message?.includes('not found') ||
        initError.message?.includes('demand') ||
        initError.message?.includes('Unavailable') ||
        initError.message?.includes('bidiGenerateContent') ||
        initError.message?.includes('WebSocket') ||
        initError.status === 404 ||
        initError.status === 503;

      if (isRetryable) {
        providerLogger.warn('PROVIDER', `Stream model ${currentModel} error (${initError.message}), trying candidate...`);
        continue;
      }
      providerLogger.error('PROVIDER', 'Gemini stream initialization failed', {
        event: 'EXTERNAL_API_STREAM_INIT_FAILURE',
        error: initError.message,
        modelName: currentModel,
      });
      throw new Error(`Failed to initialize stream for ${currentModel}: ${initError.message}`);
    }
  }

  if (!result) {
    throw new Error(`Failed to initialize stream with model ${modelName}`);
  }

  let totalTokens = 0;
  let webSources = [];

  try {
    for await (const chunk of result.stream) {
      const token = chunk.text();
      if (token) {
        totalTokens++;
        yield token;
      }
    }

    // Attempt to extract grounding metadata from the final resolved response
    try {
      const finalResp = await result.response;
      const grounding = finalResp.candidates?.[0]?.groundingMetadata;
      if (grounding?.groundingChunks?.length) {
        webSources = grounding.groundingChunks
          .filter((c) => c.web?.uri)
          .map((c, i) => ({
            title: c.web.title || `Web Source ${i + 1}`,
            url: c.web.uri,
            source: c.web.title || 'Google Search',
            snippet: c.web.uri,
          }));
      }
    } catch (metaErr) {
      // Non-fatal metadata read
    }
  } catch (streamError) {
    providerLogger.error('PROVIDER', 'Gemini stream parsing failed during iteration', {
      event: 'EXTERNAL_API_STREAM_ITERATION_FAILURE',
      error: streamError.message,
      modelName: activeModelUsed,
    });
    
    if (streamError.message?.includes('Failed to parse stream')) {
      throw new Error(`The model "${activeModelUsed}" returned an invalid stream response. This often happens if the model is unavailable or the API key has exceeded its quota.`);
    }
    throw streamError;
  }

  const latency = Date.now() - startTime;
  providerLogger.info('PROVIDER', 'Gemini streaming completed', {
    event: 'EXTERNAL_API_STREAM_SUCCESS',
    provider: PROVIDER_SLUG,
    modelUsed: activeModelUsed,
    latencyMs: latency,
    tokenCount: totalTokens,
    groundingSourcesCount: webSources.length,
  });

  return {
    modelName: activeModelUsed,
    totalTokens,
    webSources,
  };
};

export const isRateLimitError = (error) => {
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

export default { PROVIDER_SLUG, generateText, generateTextStream, isRateLimitError };
