import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../../utils/logger.js';

/**
 * Google AI Studio (Gemini) Provider
 * Handles text generation for all Gemini and Gemma models.
 */
export const PROVIDER_SLUG = 'google';

export const generateText = async ({ apiKey, modelName, prompt, config = {} }) => {
  const startTime = Date.now();
  const providerLogger = logger.child({ provider: PROVIDER_SLUG, model: modelName });

  providerLogger.info('PROVIDER', 'Gemini request initiated', {
    event: 'EXTERNAL_API_CALL_START',
    endpoint: 'generativelanguage.googleapis.com',
    modelName,
    promptLength: prompt.length,
  });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: config.temperature ?? 0.4,
        topP: config.topP ?? 0.95,
        ...(config.responseMimeType ? { responseMimeType: config.responseMimeType } : {}),
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const latency = Date.now() - startTime;

    providerLogger.info('PROVIDER', 'Gemini request completed', {
      event: 'EXTERNAL_API_CALL_SUCCESS',
      provider: PROVIDER_SLUG,
      endpoint: 'generativelanguage.googleapis.com',
      latencyMs: latency,
      responseLength: text.length,
      tokensUsed: response.usageMetadata?.totalTokenCount || null,
    });

    return {
      text,
      latencyMs: latency,
      tokensUsed: response.usageMetadata?.totalTokenCount || null,
      provider: PROVIDER_SLUG,
      model: modelName,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    providerLogger.error('PROVIDER', 'Gemini request failed', {
      event: 'EXTERNAL_API_CALL_FAILURE',
      provider: PROVIDER_SLUG,
      endpoint: 'generativelanguage.googleapis.com',
      latencyMs: latency,
      error: error.message,
      status: error.status || error.httpStatusCode || null,
    });
    throw error;
  }
};

export const generateTextStream = async function* ({ apiKey, modelName, prompt, config = {} }) {
  const startTime = Date.now();
  const providerLogger = logger.child({ provider: PROVIDER_SLUG, model: modelName });

  providerLogger.info('PROVIDER', 'Gemini streaming request initiated', {
    event: 'EXTERNAL_API_STREAM_START',
    endpoint: 'generativelanguage.googleapis.com',
    modelName,
  });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: config.temperature ?? 0.4,
        topP: config.topP ?? 0.95,
      },
    });

    let result;
    try {
      result = await model.generateContentStream(prompt);
    } catch (initError) {
      providerLogger.error('PROVIDER', 'Gemini stream initialization failed', {
        event: 'EXTERNAL_API_STREAM_INIT_FAILURE',
        error: initError.message,
        modelName,
      });
      throw new Error(`Failed to initialize stream for ${modelName}: ${initError.message}`);
    }

    let totalTokens = 0;
    try {
      for await (const chunk of result.stream) {
        const token = chunk.text();
        if (token) {
          totalTokens++;
          yield token;
        }
      }
    } catch (streamError) {
      providerLogger.error('PROVIDER', 'Gemini stream parsing failed during iteration', {
        event: 'EXTERNAL_API_STREAM_ITERATION_FAILURE',
        error: streamError.message,
        modelName,
      });
      
      if (streamError.message.includes('Failed to parse stream')) {
        throw new Error(`The model "${modelName}" returned an invalid stream response. This often happens if the model is unavailable or the API key has exceeded its quota.`);
      }
      throw streamError;
    }

    const latency = Date.now() - startTime;
    providerLogger.info('PROVIDER', 'Gemini streaming completed', {
      event: 'EXTERNAL_API_STREAM_SUCCESS',
      provider: PROVIDER_SLUG,
      latencyMs: latency,
      tokenCount: totalTokens,
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    providerLogger.error('PROVIDER', 'Gemini streaming fatal error', {
      event: 'EXTERNAL_API_STREAM_FATAL',
      provider: PROVIDER_SLUG,
      latencyMs: latency,
      error: error.message,
    });
    throw error;
  }
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
