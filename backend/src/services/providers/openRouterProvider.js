import logger from '../../utils/logger.js';

/**
 * OpenRouter Provider
 * Routes requests through the OpenRouter unified API to access
 * GPT-4o, Claude, Llama, and other models.
 */
export const PROVIDER_SLUG = 'openrouter';
const BASE_URL = 'https://openrouter.ai/api/v1';

export const generateText = async ({ apiKey, modelName, prompt, config = {} }) => {
  const startTime = Date.now();
  const providerLogger = logger.child({ provider: PROVIDER_SLUG, model: modelName });

  providerLogger.info('PROVIDER', 'OpenRouter request initiated', {
    event: 'EXTERNAL_API_CALL_START',
    endpoint: BASE_URL,
    modelName,
    promptLength: prompt.length,
  });

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://deepdocai.netlify.app',
        'X-Title': 'DeepDocAI',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: config.temperature ?? 0.4,
        top_p: config.topP ?? 0.95,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenRouter API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const latency = Date.now() - startTime;
    const tokensUsed = data.usage?.total_tokens || null;

    providerLogger.info('PROVIDER', 'OpenRouter request completed', {
      event: 'EXTERNAL_API_CALL_SUCCESS',
      provider: PROVIDER_SLUG,
      endpoint: `${BASE_URL}/chat/completions`,
      latencyMs: latency,
      responseLength: text.length,
      tokensUsed,
    });

    return {
      text,
      latencyMs: latency,
      tokensUsed,
      provider: PROVIDER_SLUG,
      model: modelName,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    providerLogger.error('PROVIDER', 'OpenRouter request failed', {
      event: 'EXTERNAL_API_CALL_FAILURE',
      provider: PROVIDER_SLUG,
      endpoint: `${BASE_URL}/chat/completions`,
      latencyMs: latency,
      error: error.message,
    });
    throw error;
  }
};

export const generateTextStream = async function* ({ apiKey, modelName, prompt, config = {} }) {
  const startTime = Date.now();
  const providerLogger = logger.child({ provider: PROVIDER_SLUG, model: modelName });

  providerLogger.info('PROVIDER', 'OpenRouter streaming request initiated', {
    event: 'EXTERNAL_API_STREAM_START',
    endpoint: BASE_URL,
    modelName,
  });

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://deepdocai.netlify.app',
        'X-Title': 'DeepDocAI',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: config.temperature ?? 0.4,
        top_p: config.topP ?? 0.95,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenRouter streaming API error ${response.status}: ${errorBody}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let tokenCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;

        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content || '';
          if (token) {
            tokenCount++;
            yield token;
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    const latency = Date.now() - startTime;
    providerLogger.info('PROVIDER', 'OpenRouter streaming completed', {
      event: 'EXTERNAL_API_STREAM_SUCCESS',
      provider: PROVIDER_SLUG,
      latencyMs: latency,
      tokenCount,
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    providerLogger.error('PROVIDER', 'OpenRouter streaming failed', {
      event: 'EXTERNAL_API_STREAM_FAILURE',
      provider: PROVIDER_SLUG,
      latencyMs: latency,
      error: error.message,
    });
    throw error;
  }
};

export const isRateLimitError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('429') || message.includes('rate limit') || message.includes('quota');
};

export default { PROVIDER_SLUG, generateText, generateTextStream, isRateLimitError };
