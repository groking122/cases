import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

let cachedConfig = null;
let lastFetch = 0;
const CACHE_TTL = 300000; // 5 minutes

export async function loadConfig() {
  if (cachedConfig && Date.now() - lastFetch < CACHE_TTL) {
    return cachedConfig;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase
    .from('reward_config')
    .select('*')
    .eq('is_active', true);

  if (error) throw new Error('Configuration load failed: ' + error.message);

  // Validate probabilities sum to 1
  const totalProbability = data.reduce((sum, item) => sum + Number(item.probability), 0);
  if (Math.abs(totalProbability - 1) > 0.001) {
    throw new Error('Invalid configuration: Probabilities must sum to 1');
  }

  const configMap = {};
  data.forEach(item => { configMap[item.key] = item; });

  const configString = JSON.stringify(data);
  const configHash = crypto.createHash('sha256').update(configString).digest('hex');

  cachedConfig = { data: configMap, hash: configHash, raw: data, timestamp: new Date() };
  lastFetch = Date.now();
  return cachedConfig;
} 