import { query } from './index.js';

async function purgeNonGoogle() {
  console.log('Purging non-Google models, keys, and providers...');

  // 1. Delete non-Google keys
  const resKeys = await query("DELETE FROM ai_api_keys WHERE provider_id != '06f69623-b79b-443f-b1ab-cf1eff5ed63b'");
  console.log(`Deleted non-Google keys: ${resKeys.rowCount}`);

  // 2. Delete non-Google models
  const resModels = await query("DELETE FROM ai_models WHERE provider_id != '06f69623-b79b-443f-b1ab-cf1eff5ed63b'");
  console.log(`Deleted non-Google models: ${resModels.rowCount}`);

  // 3. Delete non-Google providers
  const resProviders = await query("DELETE FROM ai_providers WHERE slug != 'google'");
  console.log(`Deleted non-Google providers: ${resProviders.rowCount}`);

  // 4. Verify remaining
  const providers = await query("SELECT id, name, slug FROM ai_providers");
  console.log('Active Providers:', providers.rows);

  const keys = await query("SELECT id, label, is_active FROM ai_api_keys");
  console.log('Active Google Keys:', keys.rows);

  const models = await query("SELECT id, model_name, display_name, sort_order FROM ai_models ORDER BY sort_order");
  console.log('Active Google Models:', models.rows);

  process.exit(0);
}

purgeNonGoogle().catch((e) => {
  console.error(e);
  process.exit(1);
});
