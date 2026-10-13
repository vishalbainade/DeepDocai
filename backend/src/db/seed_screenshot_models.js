import { query } from './index.js';

async function seedExactGoogleModels() {
  console.log('Seeding exact Google models from screenshots...');

  // Provider ID for Google AI Studio
  const providerId = '06f69623-b79b-443f-b1ab-cf1eff5ed63b';

  // Clear existing models
  await query('DELETE FROM ai_models');

  const models = [
    // ─── Live Audio & Voice Dialog Models (Live API) ─────────────
    {
      model_name: 'gemini-3.8-live-extended-thinking',
      display_name: 'Gemini 3.8 Live Extended Thinking',
      model_family: 'audio-dialog',
      sort_order: 1,
      capabilities: { audio: true, live: true, thinking: true, category: 'Live Audio' }
    },
    {
      model_name: 'gemini-3.8-live',
      display_name: 'Gemini 3.8 Live',
      model_family: 'audio-dialog',
      sort_order: 2,
      capabilities: { audio: true, live: true, category: 'Live Audio' }
    },
    {
      model_name: 'gemini-3-flash-live',
      display_name: 'Gemini 3 Flash Live',
      model_family: 'audio-dialog',
      sort_order: 3,
      capabilities: { audio: true, live: true, category: 'Live Audio' }
    },
    {
      model_name: 'gemini-2.5-flash-native-audio-dialog',
      display_name: 'Gemini 2.5 Flash Native Audio Dialog',
      model_family: 'audio-dialog',
      sort_order: 4,
      capabilities: { audio: true, live: true, nativeAudio: true, category: 'Live Audio' }
    },

    // ─── Text & Reasoning Models ───────────────────────────────────
    {
      model_name: 'gemini-3.8-flash',
      display_name: 'Gemini 3.8 Flash',
      model_family: 'text',
      sort_order: 5,
      capabilities: { text: true, reasoning: true, thinking: true, category: 'Text & Reasoning' }
    },
    {
      model_name: 'gemini-3.7-flash',
      display_name: 'Gemini 3.7 Flash',
      model_family: 'text',
      sort_order: 6,
      capabilities: { text: true, reasoning: true, thinking: true, category: 'Text & Reasoning' }
    },
    {
      model_name: 'gemini-3.6-flash',
      display_name: 'Gemini 3.6 Flash',
      model_family: 'text',
      sort_order: 7,
      capabilities: { text: true, category: 'Text & Reasoning' }
    },
    {
      model_name: 'gemini-3.5-flash-lite',
      display_name: 'Gemini 3.5 Flash Lite',
      model_family: 'text',
      sort_order: 8,
      capabilities: { text: true, fast: true, category: 'Text & Reasoning' }
    },
    {
      model_name: 'gemini-3.1-flash-lite',
      display_name: 'Gemini 3.1 Flash Lite',
      model_family: 'text',
      sort_order: 9,
      capabilities: { text: true, ultraFast: true, category: 'Text & Reasoning' }
    },
    {
      model_name: 'nano-banana-2-lite',
      display_name: 'Nano Banana 2 Lite (Gemini 3.1 Flash Lite Image)',
      model_family: 'multimodal-image',
      sort_order: 10,
      capabilities: { vision: true, image: true, category: 'Multimodal' }
    },

    // ─── Gemma 4 Models ───────────────────────────────────────────
    {
      model_name: 'gemma-4-31b',
      display_name: 'Gemma 4 31B',
      model_family: 'text',
      sort_order: 11,
      capabilities: { text: true, openWeights: true, category: 'Gemma 4' }
    },
    {
      model_name: 'gemma-4-26b',
      display_name: 'Gemma 4 26B',
      model_family: 'text',
      sort_order: 12,
      capabilities: { text: true, openWeights: true, category: 'Gemma 4' }
    },
  ];

  for (const m of models) {
    await query(
      `INSERT INTO ai_models (id, provider_id, model_name, display_name, model_family, sort_order, capabilities, is_active)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true)`,
      [providerId, m.model_name, m.display_name, m.model_family, m.sort_order, JSON.stringify(m.capabilities)]
    );
  }

  console.log(`Successfully seeded ${models.length} exact models.`);

  const check = await query('SELECT model_name, display_name, sort_order FROM ai_models ORDER BY sort_order');
  console.log('Active Models in DB:', check.rows);

  process.exit(0);
}

seedExactGoogleModels().catch((e) => {
  console.error(e);
  process.exit(1);
});
