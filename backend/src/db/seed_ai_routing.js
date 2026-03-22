/**
 * Seed Script - Multi-Model AI Routing System
 * 
 * Creates tables, inserts providers, API keys, and ALL models
 * directly into the database. Run once to initialize.
 * 
 * Usage: node src/db/seed_ai_routing.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const query = async (text, params) => {
  const res = await pool.query(text, params);
  return res;
};

// ─── Step 1: Create Tables ──────────────────────────────────────────────────
const createTables = async () => {
  console.log('\n📦 Creating tables...');
  const migrationPath = path.join(__dirname, 'migration_ai_routing.sql');
  const sql = await fs.readFile(migrationPath, 'utf-8');
  
  const cleaned = sql
    .split('\n')
    .map(line => line.trim().startsWith('--') ? '' : line)
    .join('\n');
  
  const statements = cleaned.split(';').map(s => s.trim()).filter(s => s.length > 0);
  
  for (const stmt of statements) {
    try {
      await query(stmt);
    } catch (error) {
      if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
        console.warn(`  ⚠️  ${error.message.substring(0, 100)}`);
      }
    }
  }
  console.log('  ✅ Tables created');
};

// ─── Step 2: Insert Providers ───────────────────────────────────────────────
const insertProviders = async () => {
  console.log('\n🏢 Inserting providers...');
  
  const providers = [
    { name: 'Google AI Studio', slug: 'google', baseUrl: 'https://generativelanguage.googleapis.com' },
    { name: 'NVIDIA AI', slug: 'nvidia', baseUrl: 'https://integrate.api.nvidia.com/v1' },
  ];

  for (const p of providers) {
    await query(
      `INSERT INTO ai_providers (name, slug, base_url)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, base_url = EXCLUDED.base_url`,
      [p.name, p.slug, p.baseUrl]
    );
    console.log(`  ✅ ${p.name} (${p.slug})`);
  }
};

// ─── Step 3: Insert API Keys ────────────────────────────────────────────────
const insertApiKeys = async () => {
  console.log('\n🔑 Inserting API keys...');

  // Get provider IDs
  const providerRows = await query('SELECT id, slug FROM ai_providers');
  const providerMap = Object.fromEntries(providerRows.rows.map(r => [r.slug, r.id]));

  // ── Google Gemini keys from .env ──
  const googleId = providerMap['google'];
  if (googleId) {
    // Clear old keys first to avoid duplicates
    await query('DELETE FROM ai_api_keys WHERE provider_id = $1', [googleId]);
    
    const envKeys = process.env.GEMINI_API_KEYS
      ? process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(Boolean)
      : process.env.GEMINI_API_KEY
        ? [process.env.GEMINI_API_KEY]
        : [];

    for (let i = 0; i < envKeys.length; i++) {
      await query(
        `INSERT INTO ai_api_keys (provider_id, encrypted_key, label, is_active)
         VALUES ($1, $2, $3, TRUE)`,
        [googleId, envKeys[i], `gemini-key-${i + 1}`]
      );
    }
    console.log(`  ✅ Google: ${envKeys.length} key(s)`);
  }

  // ── NVIDIA API key ──
  const nvidiaId = providerMap['nvidia'];
  if (nvidiaId) {
    await query('DELETE FROM ai_api_keys WHERE provider_id = $1', [nvidiaId]);
    
    const nvidiaKey = process.env.NVIDIA_API_KEY;
    if (nvidiaKey) {
      await query(
        `INSERT INTO ai_api_keys (provider_id, encrypted_key, label, is_active)
         VALUES ($1, $2, $3, TRUE)`,
        [nvidiaId, nvidiaKey, 'nvidia-primary']
      );
      console.log(`  ✅ NVIDIA: 1 key`);
    } else {
      console.log(`  ⚠️  NVIDIA: No key found in .env (NVIDIA_API_KEY)`);
    }
  }
};

// ─── Step 4: Insert ALL Models ──────────────────────────────────────────────
const insertModels = async () => {
  console.log('\n🤖 Inserting models...');

  const providerRows = await query('SELECT id, slug FROM ai_providers');
  const providerMap = Object.fromEntries(providerRows.rows.map(r => [r.slug, r.id]));

  // Clear existing models to avoid conflicts
  await query('DELETE FROM ai_models WHERE provider_id = $1', [providerMap['google']]);
  await query('DELETE FROM ai_models WHERE provider_id = $1', [providerMap['nvidia']]);

  // ══════════════════════════════════════════════════════════════════════════
  // GOOGLE AI STUDIO MODELS
  // ══════════════════════════════════════════════════════════════════════════
  const googleModels = [
    { modelName: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', order: 1 },
    { modelName: 'gemini-3-flash-preview', displayName: 'Gemini 3 Flash', order: 2 },
    { modelName: 'gemini-2.5-flash-lite', displayName: 'Gemini 2.5 Flash Lite', order: 3 },
    { modelName: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash', order: 4 },
    { modelName: 'gemma-3-1b-it', displayName: 'Gemma 3 1B', order: 5 },
    { modelName: 'gemma-3-4b-it', displayName: 'Gemma 3 4B', order: 6 },
    { modelName: 'gemma-3-12b-it', displayName: 'Gemma 3 12B', order: 7 },
    { modelName: 'gemma-3-27b-it', displayName: 'Gemma 3 27B', order: 8 },
  ];

  let googleCount = 0;
  for (const m of googleModels) {
    await query(
      `INSERT INTO ai_models (provider_id, model_name, display_name, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (provider_id, model_name) DO UPDATE SET display_name = EXCLUDED.display_name, sort_order = EXCLUDED.sort_order`,
      [providerMap['google'], m.modelName, m.displayName, m.order]
    );
    googleCount++;
  }
  console.log(`  ✅ Google: ${googleCount} models`);

  // ══════════════════════════════════════════════════════════════════════════
  // NVIDIA AI ENDPOINT MODELS (ALL from nvidia.com/nim catalog)
  // ══════════════════════════════════════════════════════════════════════════
  const nvidiaModels = [
    // ── Top-tier / Flagship ──
    { modelName: 'qwen/qwen3.5-122b-a10b', displayName: 'Qwen 3.5 122B', order: 100 },
    { modelName: 'qwen/qwen3.5-397b-a17b', displayName: 'Qwen 3.5 397B', order: 101 },
    { modelName: 'qwen/qwen3-next-80b-a3b-instruct', displayName: 'Qwen 3 Next 80B Instruct', order: 102 },
    { modelName: 'qwen/qwen3-next-80b-a3b-thinking', displayName: 'Qwen 3 Next 80B Thinking', order: 103 },
    { modelName: 'qwen/qwen3-coder-480b-a35b-instruct', displayName: 'Qwen 3 Coder 480B', order: 104 },
    { modelName: 'qwen/qwen2.5-7b-instruct', displayName: 'Qwen 2.5 7B', order: 105 },
    { modelName: 'qwen/qwen2.5-coder-32b-instruct', displayName: 'Qwen 2.5 Coder 32B', order: 106 },
    { modelName: 'qwen/qwen2.5-coder-7b-instruct', displayName: 'Qwen 2.5 Coder 7B', order: 107 },

    // ── NVIDIA Native ──
    { modelName: 'nvidia/nemotron-3-super-120b-a12b', displayName: 'Nemotron 3 Super 120B', order: 110 },
    { modelName: 'nvidia/nemotron-3-nano-30b-a3b', displayName: 'Nemotron 3 Nano 30B', order: 111 },
    { modelName: 'nvidia/nemotron-nano-12b-v2-vl', displayName: 'Nemotron Nano 12B v2 VL', order: 112 },
    { modelName: 'nvidia/nvidia-nemotron-nano-9b-v2', displayName: 'Nemotron Nano 9B v2', order: 113 },
    { modelName: 'nvidia/llama-3.3-nemotron-super-49b-v1.5', displayName: 'Llama 3.3 Nemotron Super 49B', order: 114 },
    { modelName: 'nvidia/llama-3.1-nemotron-ultra-253b-v1', displayName: 'Llama 3.1 Nemotron Ultra 253B', order: 115 },
    { modelName: 'nvidia/llama-3.1-nemotron-nano-vl-8b-v1', displayName: 'Llama 3.1 Nemotron Nano VL 8B', order: 116 },
    { modelName: 'nvidia/llama-3.1-nemotron-nano-4b-v1.1', displayName: 'Llama 3.1 Nemotron Nano 4B', order: 117 },
    { modelName: 'nvidia/llama3-chatqa-1.5-8b', displayName: 'Llama 3 ChatQA 1.5 8B', order: 118 },
    { modelName: 'nvidia/usdcode', displayName: 'NVIDIA USDCode', order: 119 },

    // ── DeepSeek ──
    { modelName: 'deepseek-ai/deepseek-v3.2', displayName: 'DeepSeek V3.2', order: 120 },
    { modelName: 'deepseek-ai/deepseek-v3.1', displayName: 'DeepSeek V3.1', order: 121 },
    { modelName: 'deepseek-ai/deepseek-v3.1-terminus', displayName: 'DeepSeek V3.1 Terminus', order: 122 },
    { modelName: 'deepseek-ai/deepseek-r1-distill-llama-8b', displayName: 'DeepSeek R1 Distill Llama 8B', order: 123 },
    { modelName: 'deepseek-ai/deepseek-r1-distill-qwen-32b', displayName: 'DeepSeek R1 Distill Qwen 32B', order: 124 },
    { modelName: 'deepseek-ai/deepseek-r1-distill-qwen-14b', displayName: 'DeepSeek R1 Distill Qwen 14B', order: 125 },
    { modelName: 'deepseek-ai/deepseek-r1-distill-qwen-7b', displayName: 'DeepSeek R1 Distill Qwen 7B', order: 126 },

    // ── Mistral ──
    { modelName: 'mistralai/mistral-small-4-119b-2603', displayName: 'Mistral Small 4 119B', order: 130 },
    { modelName: 'mistralai/devstral-2-123b-instruct-2512', displayName: 'Devstral 2 123B', order: 131 },
    { modelName: 'mistralai/mistral-large-3-675b-instruct-2512', displayName: 'Mistral Large 3 675B', order: 132 },
    { modelName: 'mistralai/ministral-14b-instruct-2512', displayName: 'Ministral 14B', order: 133 },
    { modelName: 'mistralai/magistral-small-2506', displayName: 'Magistral Small', order: 134 },
    { modelName: 'mistralai/mistral-nemotron', displayName: 'Mistral Nemotron', order: 135 },
    { modelName: 'mistralai/mistral-small-3.1-24b-instruct-2503', displayName: 'Mistral Small 3.1 24B', order: 136 },
    { modelName: 'mistralai/mistral-medium-3-instruct', displayName: 'Mistral Medium 3', order: 137 },
    { modelName: 'mistralai/mistral-small-24b-instruct', displayName: 'Mistral Small 24B', order: 138 },
    { modelName: 'mistralai/mistral-7b-instruct-v0.3', displayName: 'Mistral 7B v0.3', order: 139 },
    { modelName: 'mistralai/mistral-7b-instruct-v0.2', displayName: 'Mistral 7B v0.2', order: 140 },
    { modelName: 'mistralai/mixtral-8x22b-instruct-v0.1', displayName: 'Mixtral 8x22B', order: 141 },
    { modelName: 'mistralai/mixtral-8x7b-instruct-v0.1', displayName: 'Mixtral 8x7B', order: 142 },

    // ── MiniMax ──
    { modelName: 'minimaxai/minimax-m2.5', displayName: 'MiniMax M2.5', order: 150 },
    { modelName: 'minimaxai/minimax-m2.1', displayName: 'MiniMax M2.1', order: 151 },

    // ── GLM / Z-AI ──
    { modelName: 'z-ai/glm-5', displayName: 'GLM-5', order: 160 },
    { modelName: 'z-ai/glm-4.7', displayName: 'GLM-4.7', order: 161 },

    // ── StepFun ──
    { modelName: 'stepfun-ai/step-3.5-flash', displayName: 'Step 3.5 Flash', order: 170 },

    // ── Moonshot / Kimi ──
    { modelName: 'moonshotai/kimi-k2.5', displayName: 'Kimi K2.5', order: 180 },
    { modelName: 'moonshotai/kimi-k2-thinking', displayName: 'Kimi K2 Thinking', order: 181 },
    { modelName: 'moonshotai/kimi-k2-instruct-0905', displayName: 'Kimi K2 Instruct 0905', order: 182 },
    { modelName: 'moonshotai/kimi-k2-instruct', displayName: 'Kimi K2 Instruct', order: 183 },

    // ── StockMark ──
    { modelName: 'stockmark/stockmark-2-100b-instruct', displayName: 'StockMark 2 100B', order: 190 },

    // ── ByteDance ──
    { modelName: 'bytedance/seed-oss-36b-instruct', displayName: 'Seed OSS 36B', order: 195 },

    // ── OpenAI (via NVIDIA) ──
    { modelName: 'openai/gpt-oss-20b', displayName: 'GPT OSS 20B', order: 200 },
    { modelName: 'openai/gpt-oss-120b', displayName: 'GPT OSS 120B', order: 201 },

    // ── OpenGPT-X ──
    { modelName: 'opengpt-x/teuken-7b-instruct-commercial-v0.4', displayName: 'Teuken 7B', order: 205 },

    // ── SpeakLeash ──
    { modelName: 'speakleash/bielik-11b-v2.6-instruct', displayName: 'Bielik 11B v2.6', order: 210 },

    // ── Sarvam AI ──
    { modelName: 'sarvamai/sarvam-m', displayName: 'Sarvam M', order: 215 },

    // ── Microsoft Phi ──
    { modelName: 'microsoft/phi-4-mini-flash-reasoning', displayName: 'Phi 4 Mini Flash Reasoning', order: 220 },
    { modelName: 'microsoft/phi-4-mini-instruct', displayName: 'Phi 4 Mini Instruct', order: 221 },
    { modelName: 'microsoft/phi-4-multimodal-instruct', displayName: 'Phi 4 Multimodal', order: 222 },
    { modelName: 'microsoft/phi-3-small-8k-instruct', displayName: 'Phi 3 Small 8K', order: 223 },
    { modelName: 'microsoft/phi-3-small-128k-instruct', displayName: 'Phi 3 Small 128K', order: 224 },
    { modelName: 'microsoft/phi-3-medium-4k-instruct', displayName: 'Phi 3 Medium 4K', order: 225 },
    { modelName: 'microsoft/phi-3-mini-4k-instruct', displayName: 'Phi 3 Mini 4K', order: 226 },
    { modelName: 'microsoft/phi-3-mini-128k-instruct', displayName: 'Phi 3 Mini 128K', order: 227 },

    // ── Google (via NVIDIA) ──
    { modelName: 'google/gemma-3n-e4b-it', displayName: 'Gemma 3N E4B', order: 230 },
    { modelName: 'google/gemma-3n-e2b-it', displayName: 'Gemma 3N E2B', order: 231 },
    { modelName: 'google/gemma-3-27b-it', displayName: 'Gemma 3 27B (NVIDIA)', order: 232 },
    { modelName: 'google/gemma-3-1b-it', displayName: 'Gemma 3 1B (NVIDIA)', order: 233 },
    { modelName: 'google/gemma-2-27b-it', displayName: 'Gemma 2 27B', order: 234 },
    { modelName: 'google/gemma-2-9b-it', displayName: 'Gemma 2 9B', order: 235 },
    { modelName: 'google/gemma-7b', displayName: 'Gemma 7B', order: 236 },

    // ── Marin ──
    { modelName: 'marin/marin-8b-instruct', displayName: 'Marin 8B', order: 240 },

    // ── IBM ──
    { modelName: 'ibm/granite-3.3-8b-instruct', displayName: 'Granite 3.3 8B', order: 245 },

    // ── Utter Project ──
    { modelName: 'utter-project/eurollm-9b-instruct', displayName: 'EuroLLM 9B', order: 250 },

    // ── GoTo Company ──
    { modelName: 'gotocompany/gemma-2-9b-cpt-sahabatai-instruct', displayName: 'Gemma 2 SahabatAI 9B', order: 255 },

    // ── iGenius ──
    { modelName: 'igenius/colosseum_355b_instruct_16k', displayName: 'Colosseum 355B', order: 260 },
    { modelName: 'igenius/italia_10b_instruct_16k', displayName: 'Italia 10B', order: 261 },

    // ── Tiiuae ──
    { modelName: 'tiiuae/falcon3-7b-instruct', displayName: 'Falcon 3 7B', order: 265 },

    // ── Meta ──
    { modelName: 'meta/llama3-70b-instruct', displayName: 'Llama 3 70B', order: 270 },
    { modelName: 'meta/llama3-8b-instruct', displayName: 'Llama 3 8B', order: 271 },

    // ── MediaTek ──
    { modelName: 'mediatek/breeze-7b-instruct', displayName: 'Breeze 7B', order: 275 },
  ];

  let nvidiaCount = 0;
  for (const m of nvidiaModels) {
    await query(
      `INSERT INTO ai_models (provider_id, model_name, display_name, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (provider_id, model_name) DO UPDATE SET display_name = EXCLUDED.display_name, sort_order = EXCLUDED.sort_order`,
      [providerMap['nvidia'], m.modelName, m.displayName, m.order]
    );
    nvidiaCount++;
  }
  console.log(`  ✅ NVIDIA: ${nvidiaCount} models`);
};

// ─── Step 5: Verify ─────────────────────────────────────────────────────────
const verify = async () => {
  console.log('\n📊 Verification...');
  
  const providers = await query('SELECT slug, name, is_active FROM ai_providers ORDER BY name');
  console.log('\n  Providers:');
  for (const p of providers.rows) {
    console.log(`    ${p.is_active ? '✅' : '❌'} ${p.name} (${p.slug})`);
  }

  const modelCounts = await query(`
    SELECT p.slug, p.name, COUNT(m.id) as model_count
    FROM ai_providers p
    LEFT JOIN ai_models m ON m.provider_id = p.id AND m.is_active = TRUE
    GROUP BY p.slug, p.name
    ORDER BY p.name
  `);
  console.log('\n  Model Counts:');
  for (const r of modelCounts.rows) {
    console.log(`    ${r.name}: ${r.model_count} active models`);
  }

  const keyCounts = await query(`
    SELECT p.slug, p.name, COUNT(k.id) as key_count
    FROM ai_providers p
    LEFT JOIN ai_api_keys k ON k.provider_id = p.id AND k.is_active = TRUE
    GROUP BY p.slug, p.name
    ORDER BY p.name
  `);
  console.log('\n  API Keys:');
  for (const r of keyCounts.rows) {
    console.log(`    ${r.name}: ${r.key_count} active key(s)`);
  }

  const totalModels = await query('SELECT COUNT(*) as count FROM ai_models WHERE is_active = TRUE');
  console.log(`\n  🎯 Total active models: ${totalModels.rows[0].count}`);
};

// ─── Main ───────────────────────────────────────────────────────────────────
const main = async () => {
  console.log('═══════════════════════════════════════════');
  console.log('  DeepDocAI - AI Routing System Seed');
  console.log('═══════════════════════════════════════════');

  try {
    await createTables();
    await insertProviders();
    await insertApiKeys();
    await insertModels();
    await verify();
    console.log('\n✅ Seed completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Seed failed:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
};

main();
