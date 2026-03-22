import { query } from '../db/index.js';
import logger from '../utils/logger.js';

/**
 * AI Model Service
 * Handles CRUD operations for AI models and providers from the database.
 */

// ─── Cache ──────────────────────────────────────────────────────────────────
let modelsCache = null;
let modelsCacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const invalidateCache = () => {
  modelsCache = null;
  modelsCacheExpiry = 0;
};

// ─── Providers ──────────────────────────────────────────────────────────────

export const getActiveProviders = async () => {
  const result = await query(
    `SELECT id, name, slug, base_url
     FROM ai_providers
     WHERE is_active = TRUE
     ORDER BY name`
  );
  return result.rows;
};

export const getProviderBySlug = async (slug) => {
  const result = await query(
    `SELECT id, name, slug, base_url
     FROM ai_providers
     WHERE slug = $1 AND is_active = TRUE`,
    [slug]
  );
  return result.rows[0] || null;
};

// ─── Models ─────────────────────────────────────────────────────────────────

export const getActiveModels = async () => {
  const now = Date.now();
  if (modelsCache && now < modelsCacheExpiry) {
    return modelsCache;
  }

  const result = await query(
    `SELECT
       m.id,
       m.model_name    AS "modelName",
       m.display_name  AS "displayName",
       m.model_family  AS "modelFamily",
       m.sort_order    AS "sortOrder",
       m.capabilities,
       p.id            AS "providerId",
       p.name          AS "providerName",
       p.slug          AS "providerSlug",
       p.base_url      AS "providerBaseUrl"
     FROM ai_models m
     JOIN ai_providers p ON p.id = m.provider_id
     WHERE m.is_active = TRUE AND p.is_active = TRUE
     ORDER BY m.sort_order, m.display_name`
  );

  const models = result.rows;
  modelsCache = models;
  modelsCacheExpiry = now + CACHE_TTL_MS;

  logger.info('AI_MODELS', 'Active models loaded from DB', { count: models.length });
  return models;
};

export const getModelById = async (modelId) => {
  const result = await query(
    `SELECT
       m.id,
       m.model_name    AS "modelName",
       m.display_name  AS "displayName",
       m.model_family  AS "modelFamily",
       m.sort_order    AS "sortOrder",
       m.capabilities,
       p.id            AS "providerId",
       p.name          AS "providerName",
       p.slug          AS "providerSlug",
       p.base_url      AS "providerBaseUrl"
     FROM ai_models m
     JOIN ai_providers p ON p.id = m.provider_id
     WHERE m.id = $1`,
    [modelId]
  );
  return result.rows[0] || null;
};

export const getModelByName = async (modelName) => {
  const result = await query(
    `SELECT
       m.id,
       m.model_name    AS "modelName",
       m.display_name  AS "displayName",
       m.model_family  AS "modelFamily",
       p.id            AS "providerId",
       p.name          AS "providerName",
       p.slug          AS "providerSlug",
       p.base_url      AS "providerBaseUrl"
     FROM ai_models m
     JOIN ai_providers p ON p.id = m.provider_id
     WHERE m.model_name = $1 AND m.is_active = TRUE AND p.is_active = TRUE`,
    [modelName]
  );
  return result.rows[0] || null;
};

/**
 * Resolve a model from either a UUID, model_name, or legacy short id.
 * Returns the full model record with provider info, or null.
 */
export const resolveModel = async (modelIdentifier) => {
  if (!modelIdentifier) return null;

  // Try UUID first
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (UUID_RE.test(modelIdentifier)) {
    return getModelById(modelIdentifier);
  }

  // Try model_name
  const byName = await getModelByName(modelIdentifier);
  if (byName) return byName;

  // Fallback: search by display_name or partial match
  const models = await getActiveModels();
  return models.find(
    (m) => m.modelName === modelIdentifier || m.displayName === modelIdentifier
  ) || null;
};

// ─── API Keys ───────────────────────────────────────────────────────────────

/**
 * Get the next active API key for a provider using round-robin.
 * Updates usage_count and last_used_at.
 */
export const getApiKeyForProvider = async (providerId) => {
  const result = await query(
    `SELECT id, encrypted_key, label
     FROM ai_api_keys
     WHERE provider_id = $1 AND is_active = TRUE
     ORDER BY usage_count ASC, last_used_at ASC NULLS FIRST
     LIMIT 1`,
    [providerId]
  );

  if (!result.rows.length) {
    return null;
  }

  const keyRow = result.rows[0];

  // Update usage stats
  await query(
    `UPDATE ai_api_keys SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [keyRow.id]
  );

  logger.info('API_KEY', 'API key selected for provider', {
    event: 'API_KEY_SELECTED',
    providerId,
    keyId: keyRow.id.substring(0, 8) + '...',
    label: keyRow.label,
  });

  return keyRow;
};

// ─── Startup Verification ───────────────────────────────────────────────────

/**
 * Verify that models and API keys exist in the database.
 * All data is loaded from DB only — run `node src/db/seed_ai_routing.js` to seed.
 */
export const seedProvidersAndModels = async () => {
  try {
    const modelCount = await query('SELECT COUNT(*) as count FROM ai_models WHERE is_active = TRUE');
    const keyCount = await query('SELECT COUNT(*) as count FROM ai_api_keys WHERE is_active = TRUE');
    const providerCount = await query('SELECT COUNT(*) as count FROM ai_providers WHERE is_active = TRUE');

    const models = parseInt(modelCount.rows[0].count);
    const keys = parseInt(keyCount.rows[0].count);
    const providers = parseInt(providerCount.rows[0].count);

    if (models === 0 || keys === 0) {
      logger.warn('AI_STARTUP', 'No models or API keys found in database. Run: node src/db/seed_ai_routing.js', {
        event: 'DB_EMPTY_WARNING',
        modelCount: models,
        keyCount: keys,
        providerCount: providers,
      });
    } else {
      logger.info('AI_STARTUP', 'AI routing data loaded from database', {
        event: 'DB_VERIFIED',
        providerCount: providers,
        modelCount: models,
        keyCount: keys,
      });
    }

    invalidateCache();
  } catch (error) {
    // Tables might not exist yet — that's okay, they'll be created by migration
    if (error.message.includes('does not exist')) {
      logger.warn('AI_STARTUP', 'AI routing tables not found. Run migration first.', {
        error: error.message,
      });
    } else {
      throw error;
    }
  }
};

export default {
  getActiveProviders,
  getProviderBySlug,
  getActiveModels,
  getModelById,
  getModelByName,
  resolveModel,
  getApiKeyForProvider,
  seedProvidersAndModels,
};
