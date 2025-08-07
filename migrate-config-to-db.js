import { createClient } from '@supabase/supabase-js';
import { SYMBOL_CONFIG } from './src/lib/symbols.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateConfig() {
  // Check if symbols table exists and is empty
  const { data: existingSymbols, error: checkError } = await supabase
    .from('symbols')
    .select('id')
    .limit(1);

  if (checkError) {
    console.error('Error checking symbols table:', checkError);
    console.log('Make sure to run the admin migration SQL first to create the symbols table');
    process.exit(1);
  }

  if (existingSymbols && existingSymbols.length > 0) {
    console.log('Symbols table already has data. Skipping migration.');
    process.exit(0);
  }

  const configs = Object.values(SYMBOL_CONFIG).map(symbol => ({
    name: symbol.name,
    description: symbol.description || '',
    image_url: symbol.imageUrl || null,
    rarity: symbol.rarity,
    value: symbol.multiplier * 100, // Convert multiplier to credits
    is_active: true,
    metadata: {
      key: symbol.key,
      emoji: symbol.emoji,
      color: symbol.color,
      gradient: symbol.gradient,
      probability: symbol.probability,
      multiplier: symbol.multiplier
    }
  }));

  const { data, error } = await supabase
    .from('symbols')
    .insert(configs);

  if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  console.log(`Successfully migrated ${data ? data.length : configs.length} config items`);
  process.exit(0);
}

migrateConfig();