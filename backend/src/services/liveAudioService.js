import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger.js';
import { getApiKeyForProvider, getActiveModels } from './aiModelService.js';
import { retrieveRelevantChunks } from './retrievalService.js';

export const processLiveAudioDialog = async ({
  transcript,
  documentId = null,
  modelName = 'gemini-3.8-live-extended-thinking',
  thinkingMode = true,
  grounding = true,
  customPrompt = '',
}) => {
  const startTime = Date.now();
  const audioLogger = logger.child({ area: 'LIVE_AUDIO', model: modelName });

  const isThinking = thinkingMode === true || thinkingMode === 'true';
  const isGrounding = grounding === true || grounding === 'true';

  audioLogger.info('LIVE_AUDIO', 'Processing live audio turn', {
    transcript,
    documentId,
    modelName,
    thinkingMode: isThinking,
    grounding: isGrounding,
    hasCustomPrompt: !!customPrompt,
  });

  const models = await getActiveModels();
  const providerId = models[0]?.providerId || '06f69623-b79b-443f-b1ab-cf1eff5ed63b';
  const keyRow = await getApiKeyForProvider(providerId);

  if (!keyRow?.encrypted_key) {
    throw new Error('No active Google AI Studio API key found.');
  }

  const genAI = new GoogleGenerativeAI(keyRow.encrypted_key);

  // Retrieve document context if valid documentId is provided
  let docContext = '';
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (documentId && UUID_REGEX.test(documentId)) {
    try {
      const retrieval = await retrieveRelevantChunks({ question: transcript, documentId, intent: null });
      if (retrieval.chunks?.length) {
        docContext = `\n\nDOCUMENT CONTEXT:\n${retrieval.chunks.map((c, i) => `[Page ${c.pageNumber || 'Doc'}]: ${c.content}`).join('\n\n')}`;
      }
    } catch (e) {
      audioLogger.warn('LIVE_AUDIO', 'Document retrieval failed for audio turn', { error: e.message });
    }
  }

  let thinkingDirective = '';
  if (isThinking) {
    thinkingDirective = `\nBefore answering, briefly output your reasoning inside <thought>...</thought> tags, then give your spoken response.`;
  }

  const customDirective = customPrompt?.trim()
    ? `\n\nCUSTOM USER PERSONALIZATION DIRECTIVE:\n${customPrompt.trim()}`
    : '';

  const systemInstruction = `You are the Live Voice AI for LexRay DeepDoc AI.
You are in an interactive, spoken voice dialog with the user.
Rules for voice dialog:
- Keep the spoken response natural, conversational, clear, and direct (2 to 4 sentences).
- Avoid complex Markdown symbols, raw URLs, or tables in the voice response.
- If referencing document facts or legal statutes, speak them clearly.${customDirective}${thinkingDirective}${docContext}`;

  const generationConfig = {
    temperature: 0.6,
    topP: 0.9,
    ...(isThinking ? { thinkingConfig: { thinkingBudget: 24576 } } : {}),
  };

  const tools = isGrounding ? [{ googleSearch: {} }] : undefined;

  const targetModels = [
    modelName,
    'gemini-2.5-flash',
    'gemini-3-flash-preview',
    'gemini-2.0-flash'
  ];

  let result = null;
  let activeModelUsed = modelName;

  for (const m of targetModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: m,
        systemInstruction,
        generationConfig,
        ...(tools ? { tools } : {}),
      });

      result = await model.generateContent(transcript);
      activeModelUsed = m;
      break;
    } catch (err) {
      if (err.message?.includes('404') || err.message?.includes('not found') || err.message?.includes('bidiGenerateContent') || err.message?.includes('WebSocket') || err.status === 400) {
        audioLogger.warn('LIVE_AUDIO', `Model ${m} requires Live WebSocket or returned error, continuing fallback...`);
        continue;
      }
      throw err;
    }
  }

  if (!result) {
    throw new Error('Failed to generate live audio response from Gemini.');
  }

  const response = await result.response;
  const rawText = response.text();

  // Extract thought block if present
  let thought = null;
  let cleanSpokenText = rawText;
  const thoughtMatch = rawText.match(/<thought>([\s\S]*?)<\/thought>/i);
  if (thoughtMatch) {
    thought = thoughtMatch[1].trim();
    cleanSpokenText = rawText.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
  }

  // Extract grounding metadata if present
  const groundingMeta = response.candidates?.[0]?.groundingMetadata;
  const webSources = (groundingMeta?.groundingChunks || [])
    .filter((c) => c.web?.uri)
    .map((c, i) => ({
      title: c.web.title || `Web Source ${i + 1}`,
      url: c.web.uri,
      source: c.web.title || 'Google Search',
    }));

  const latency = Date.now() - startTime;
  audioLogger.info('LIVE_AUDIO', 'Audio turn completed', {
    modelUsed: activeModelUsed,
    latencyMs: latency,
    hasThought: !!thought,
    sourcesCount: webSources.length,
  });

  return {
    spokenText: cleanSpokenText,
    thoughtText: thought,
    modelUsed: activeModelUsed,
    webSources,
    latencyMs: latency,
  };
};

export default {
  processLiveAudioDialog,
};
