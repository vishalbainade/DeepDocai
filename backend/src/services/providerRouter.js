import logger from '../utils/logger.js';
import { resolveModel, getApiKeyForProvider, getActiveModels } from './aiModelService.js';
import { getProvider } from './providers/index.js';

/**
 * Provider Router
 * The brain of the multi-model routing system.
 * 
 * Given a model identifier (UUID, model_name, or legacy id):
 *   1. Resolves it to a full model record with provider info
 *   2. Fetches an API key for that provider (round-robin)
 *   3. Dispatches to the correct provider client
 *   4. Implements fallback if the primary provider fails
 *   5. Logs every step in structured JSON format
 */

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Route a text generation request to the correct provider.
 */
export const routeTextRequest = async ({ modelIdentifier, prompt, config = {}, userId = null }) => {
  const routeLogger = logger.child({ userId });
  const startTime = Date.now();

  // ── Step 1: Incoming Request Log ────────────────────────────────────────
  routeLogger.info('ROUTER', 'Incoming text generation request', {
    event: 'INCOMING_REQUEST',
    userId,
    requestedModel: modelIdentifier,
    requestSize: prompt.length,
    timestamp: new Date().toISOString(),
  });

  // ── Step 2: Resolve Model ──────────────────────────────────────────────
  let model = await resolveModel(modelIdentifier);

  if (!model) {
    const allModels = await getActiveModels();
    
    if (modelIdentifier) {
      model = allModels.find(
        (m) => m.modelName === modelIdentifier || m.displayName === modelIdentifier
      );
    } else {
      model = allModels[0];
    }
    
    if (!model) {
      routeLogger.error('ROUTER', 'Model resolution failed', { requestedModel: modelIdentifier || 'default' });
      throw new Error(modelIdentifier 
        ? `Requested model '${modelIdentifier}' could not be resolved.` 
        : `No active models found in system model registry.`);
    }
  }

  routeLogger.info('ROUTER', 'Model resolved', {
    event: 'MODEL_ROUTED',
    userId,
    modelId: model.id,
    modelName: model.modelName,
    displayName: model.displayName,
    provider: model.providerSlug,
    timestamp: new Date().toISOString(),
  });

  // ── Step 3: Get Provider Client ────────────────────────────────────────
  const provider = getProvider(model.providerSlug);
  if (!provider) {
    throw new Error(`No provider implementation for: ${model.providerSlug}`);
  }

  // ── Step 4: Fetch API Key ─────────────────────────────────────────────
  const keyRow = await getApiKeyForProvider(model.providerId);
  if (!keyRow) {
    throw new Error(`No active API keys for provider: ${model.providerSlug}`);
  }

  routeLogger.info('ROUTER', 'API key selected', {
    event: 'API_KEY_USAGE',
    provider: model.providerSlug,
    keyId: keyRow.id.substring(0, 8) + '****',
    label: keyRow.label,
  });

  // ── Step 5: Call Provider with Retry ──────────────────────────────────
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const result = await provider.generateText({
        apiKey: keyRow.encrypted_key,
        modelName: model.modelName,
        prompt,
        config,
      });

      const totalLatency = Date.now() - startTime;

      // ── Step 6: Response Log ──────────────────────────────────────────
      routeLogger.info('ROUTER', 'Text generation completed', {
        event: 'RESPONSE_GENERATED',
        userId,
        model: model.modelName,
        provider: model.providerSlug,
        latencyMs: totalLatency,
        responseSize: result.text.length,
        tokensUsed: result.tokensUsed,
        attempt,
      });

      return {
        text: result.text,
        modelName: model.modelName,
        displayName: model.displayName,
        provider: model.providerSlug,
        latencyMs: totalLatency,
        tokensUsed: result.tokensUsed,
      };
    } catch (error) {
      lastError = error;

      if (provider.isRateLimitError?.(error) && attempt < MAX_RETRY_ATTEMPTS) {
        const retryDelay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        routeLogger.warn('ROUTER', 'Rate limit hit, retrying with backoff', {
          event: 'RATE_LIMIT_RETRY',
          provider: model.providerSlug,
          attempt,
          retryDelayMs: retryDelay,
        });
        await delay(retryDelay);
        continue;
      }

      routeLogger.error('ROUTER', 'Provider call failed', {
        event: 'PROVIDER_ERROR',
        provider: model.providerSlug,
        model: model.modelName,
        attempt,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  // ── Step 7: Conditional Fallback Chain ─────────────────────────────────
  // If the user picked a SPECIFIC model, they probably want to see the error
  // instead of silently falling back to a weaker model logic.
  if (modelIdentifier) {
    routeLogger.error('ROUTER', 'Selected model failed and fallback was bypassed (user requested explicit selection)', {
      event: 'FALLBACK_SKIPPED',
      modelIdentifier,
      error: lastError?.message
    });
    throw lastError;
  }

  // Fallback 1 → Google Gemma 3 4B
  // Fallback 2 → NVIDIA best model (Qwen 3.5 122B)
  routeLogger.warn('ROUTER', 'Primary provider failed, attempting fixed fallback chain', {
    event: 'FALLBACK_INITIATED',
    failedModel: model.modelName,
    failedProvider: model.providerSlug,
  });

  const allModels = await getActiveModels();

  // Hardcoded fallback chain
  const FALLBACK_CHAIN = [
    { modelName: 'gemma-3-4b-it', label: 'Google Gemma 3 4B' },
    { modelName: 'qwen/qwen3.5-122b-a10b', label: 'NVIDIA Qwen 3.5 122B' },
  ];

  // Build ordered fallback candidates from the chain
  const fallbackCandidates = [];
  for (const fb of FALLBACK_CHAIN) {
    const found = allModels.find((m) => m.modelName === fb.modelName && m.modelName !== model.modelName);
    if (found) {
      fallbackCandidates.push(found);
    }
  }

  routeLogger.info('ROUTER', 'Fallback chain resolved', {
    event: 'FALLBACK_CANDIDATES',
    chain: fallbackCandidates.map((m) => `${m.displayName} (${m.providerSlug})`),
  });

  for (const fallback of fallbackCandidates) {
    try {
      const fbProvider = getProvider(fallback.providerSlug);
      if (!fbProvider) continue;

      const fbKey = await getApiKeyForProvider(fallback.providerId);
      if (!fbKey) continue;

      routeLogger.info('ROUTER', 'Trying fallback model', {
        event: 'FALLBACK_ATTEMPT',
        model: fallback.displayName,
        modelName: fallback.modelName,
        provider: fallback.providerSlug,
      });

      const result = await fbProvider.generateText({
        apiKey: fbKey.encrypted_key,
        modelName: fallback.modelName,
        prompt,
        config,
      });

      const totalLatency = Date.now() - startTime;

      routeLogger.info('ROUTER', 'Fallback succeeded', {
        event: 'FALLBACK_SUCCESS',
        originalModel: model.modelName,
        originalProvider: model.providerSlug,
        fallbackModel: fallback.modelName,
        fallbackProvider: fallback.providerSlug,
        latencyMs: totalLatency,
      });

      return {
        text: result.text,
        modelName: fallback.modelName,
        displayName: fallback.displayName,
        provider: fallback.providerSlug,
        latencyMs: totalLatency,
        tokensUsed: result.tokensUsed,
        fallback: true,
        originalModel: model.modelName,
      };
    } catch (fbError) {
      routeLogger.warn('ROUTER', 'Fallback model failed, trying next in chain', {
        event: 'FALLBACK_FAILURE',
        model: fallback.modelName,
        provider: fallback.providerSlug,
        error: fbError.message,
      });
    }
  }

  // ── All fallbacks exhausted — return friendly message, don't throw ────
  routeLogger.error('ROUTER', 'All providers and fallback models failed', {
    event: 'ALL_FALLBACKS_EXHAUSTED',
    originalModel: model.modelName,
    originalProvider: model.providerSlug,
    lastError: lastError?.message || 'Unknown',
  });

  return {
    text: `⚠️ The selected model "${model.displayName}" and all fallback models are currently unavailable. Please try selecting a different model from the dropdown and try again.`,
    modelName: model.modelName,
    displayName: model.displayName,
    provider: model.providerSlug,
    latencyMs: Date.now() - startTime,
    tokensUsed: 0,
    fallback: true,
    allFailed: true,
  };
};

/**
 * Route a streaming text generation request.
 */
export const routeStreamRequest = async function* ({ modelIdentifier, prompt, config = {}, userId = null }) {
  const routeLogger = logger.child({ userId });

  routeLogger.info('ROUTER', 'Incoming streaming request', {
    event: 'INCOMING_STREAM_REQUEST',
    userId,
    requestedModel: modelIdentifier,
    requestSize: prompt.length,
    timestamp: new Date().toISOString(),
  });

  let model = await resolveModel(modelIdentifier);

  if (!model) {
    const allModels = await getActiveModels();
    
    if (modelIdentifier) {
      model = allModels.find(
        (m) => m.modelName === modelIdentifier || m.displayName === modelIdentifier
      );
    } else {
      model = allModels[0];
    }
    
    if (!model) {
      routeLogger.error('ROUTER', 'Stream model resolution failed', { requestedModel: modelIdentifier || 'default' });
      throw new Error(modelIdentifier 
        ? `Requested model '${modelIdentifier}' could not be resolved.` 
        : `No active models found in system model registry.`);
    }
  }

  routeLogger.info('ROUTER', 'Stream model resolved', {
    event: 'MODEL_ROUTED',
    userId,
    modelName: model.modelName,
    provider: model.providerSlug,
  });

  const provider = getProvider(model.providerSlug);
  if (!provider) {
    throw new Error(`No provider implementation for: ${model.providerSlug}`);
  }

  const keyRow = await getApiKeyForProvider(model.providerId);
  if (!keyRow) {
    throw new Error(`No active API keys for provider: ${model.providerSlug}`);
  }

  routeLogger.info('ROUTER', 'Stream API key selected', {
    event: 'API_KEY_USAGE',
    provider: model.providerSlug,
    keyId: keyRow.id.substring(0, 8) + '****',
  });

  const generator = provider.generateTextStream({
    apiKey: keyRow.encrypted_key,
    modelName: model.modelName,
    prompt,
    config,
  });

  // Yield tokens and track metadata
  let tokenCount = 0;
  for await (const token of generator) {
    tokenCount++;
    yield token;
  }

  routeLogger.info('ROUTER', 'Stream completed', {
    event: 'STREAM_COMPLETE',
    model: model.modelName,
    provider: model.providerSlug,
    tokenCount,
  });

  // Return metadata as the generator return value
  return {
    modelName: model.modelName,
    displayName: model.displayName,
    provider: model.providerSlug,
    tokenCount,
  };
};

export default { routeTextRequest, routeStreamRequest };
