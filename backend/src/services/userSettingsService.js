import { query } from '../db/index.js';
import logger from '../utils/logger.js';

/**
 * User Settings Service
 * Persists and retrieves the user's selected model so it survives page refreshes.
 */

/**
 * Get the user's selected model (with full provider info).
 * Returns null if no selection stored.
 */
export const getSelectedModel = async (userId) => {
  const result = await query(
    `SELECT
       us.selected_model_id AS "selectedModelId",
       m.model_name         AS "modelName",
       m.display_name       AS "displayName",
       m.model_family       AS "modelFamily",
       p.slug               AS "providerSlug",
       p.name               AS "providerName"
     FROM user_settings us
     LEFT JOIN ai_models    m ON m.id = us.selected_model_id
     LEFT JOIN ai_providers p ON p.id = m.provider_id
     WHERE us.user_id = $1`,
    [userId]
  );

  const row = result.rows[0];
  if (!row || !row.selectedModelId) {
    logger.debug('USER_SETTINGS', 'No model selection found for user', {
      event: 'USER_MODEL_NOT_SET',
      userId,
    });
    return null;
  }

  logger.info('USER_SETTINGS', 'User model selection loaded', {
    event: 'USER_MODEL_LOADED',
    userId,
    modelId: row.selectedModelId,
    modelName: row.modelName,
    provider: row.providerSlug,
  });

  return {
    modelId: row.selectedModelId,
    modelName: row.modelName,
    displayName: row.displayName,
    modelFamily: row.modelFamily,
    providerSlug: row.providerSlug,
    providerName: row.providerName,
  };
};

/**
 * Save the user's model selection.
 * Uses UPSERT – creates or updates the row.
 */
export const saveSelectedModel = async (userId, modelId) => {
  await query(
    `INSERT INTO user_settings (user_id, selected_model_id, updated_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id) DO UPDATE SET
       selected_model_id = EXCLUDED.selected_model_id,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, modelId]
  );

  logger.info('USER_SETTINGS', 'User model selection saved', {
    event: 'USER_MODEL_SAVED',
    userId,
    modelId,
    timestamp: new Date().toISOString(),
  });

  return { success: true, modelId };
};

/**
 * Clear the user's model selection (reset to default).
 */
export const clearSelectedModel = async (userId) => {
  await query(
    `UPDATE user_settings SET selected_model_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
    [userId]
  );

  logger.info('USER_SETTINGS', 'User model selection cleared', {
    event: 'USER_MODEL_CLEARED',
    userId,
  });
};

export default {
  getSelectedModel,
  saveSelectedModel,
  clearSelectedModel,
};
