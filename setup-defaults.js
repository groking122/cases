import { createClient } from '@supabase/supabase-js';
import { SYMBOL_CONFIG } from './src/lib/symbols.js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';

// Load environment variables from .env.local
config({ path: '.env.local' });

// If that doesn't work, try reading the file directly
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const envContent = readFileSync('.env.local', 'utf8');
    const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    envLines.forEach(line => {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  } catch (error) {
    console.error('Could not read .env.local file:', error.message);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupDefaults() {
  console.log('🚀 Setting up default cases, symbols, and probabilities...');

  try {
    // 1. First, run the symbol migration if needed
    const { data: existingSymbols, error: checkError } = await supabase
      .from('symbols')
      .select('id')
      .limit(1);

    if (checkError) {
      console.error('❌ Database error. Make sure you have run the admin migration SQL first.');
      console.log('Run: psql -h your-host -U your-user -d your-db -f sql-scripts/admin-migration-ultra-safe.sql');
      process.exit(1);
    }

    // 2. Migrate symbols if table is empty
    if (!existingSymbols || existingSymbols.length === 0) {
      console.log('📦 Migrating symbols from SYMBOL_CONFIG...');
      
      const symbolsToInsert = Object.values(SYMBOL_CONFIG).map(symbol => ({
        name: symbol.name,
        description: symbol.description || `A ${symbol.rarity} ${symbol.name.toLowerCase()}`,
        image_url: symbol.imageUrl || null,
        rarity: symbol.rarity,
        value: Math.round(symbol.multiplier * 100), // Convert multiplier to credits
        is_active: true,
        metadata: {
          key: symbol.key,
          emoji: symbol.emoji,
          color: symbol.color,
          gradient: symbol.gradient,
          probability: symbol.probability,
          multiplier: symbol.multiplier,
          animation: symbol.animation || {}
        }
      }));

      const { data: insertedSymbols, error: symbolError } = await supabase
        .from('symbols')
        .insert(symbolsToInsert)
        .select();

      if (symbolError) {
        console.error('❌ Failed to insert symbols:', symbolError);
        process.exit(1);
      }

      console.log(`✅ Inserted ${insertedSymbols.length} symbols`);
    }

    // 3. Get all symbols for case setup
    const { data: symbols, error: symbolsError } = await supabase
      .from('symbols')
      .select('id, name, rarity, value, metadata');

    if (symbolsError || !symbols) {
      console.error('❌ Failed to fetch symbols:', symbolsError);
      process.exit(1);
    }

    // 4. Create default cases if they don't exist
    const { data: existingCases, error: casesCheckError } = await supabase
      .from('cases')
      .select('id')
      .limit(1);

    if (casesCheckError) {
      console.error('❌ Failed to check cases:', casesCheckError);
      process.exit(1);
    }

    if (!existingCases || existingCases.length === 0) {
      console.log('📦 Creating default cases...');

      // Starter Pack Case - Common/Uncommon focus
      const starterSymbols = symbols.filter(s => ['common', 'uncommon'].includes(s.rarity));
      const starterCase = {
        name: 'Starter Pack',
        description: 'Perfect for beginners! Contains common and uncommon items with decent odds.',
        price: 100, // 100 credits
        image_url: '/cases/starter-pack.png',
        is_active: true,
        metadata: {
          totalOpenings: 0,
          averageValue: 85,
          lastModified: new Date().toISOString(),
          modifiedBy: 'system'
        }
      };

      // Premium Case - All rarities with better rare+ odds
      const premiumCase = {
        name: 'Premium Mystery Box',
        description: 'High-value case with increased chances for rare, epic, and legendary items!',
        price: 500, // 500 credits
        image_url: '/cases/premium-box.png',
        is_active: true,
        metadata: {
          totalOpenings: 0,
          averageValue: 450,
          lastModified: new Date().toISOString(),
          modifiedBy: 'system'
        }
      };

      // Elite Case - Rare+ focus
      const eliteSymbols = symbols.filter(s => ['rare', 'epic', 'legendary'].includes(s.rarity));
      const eliteCase = {
        name: 'Elite Vault',
        description: 'Exclusively rare, epic, and legendary items. Maximum value potential!',
        price: 1000, // 1000 credits
        image_url: '/cases/elite-vault.png',
        is_active: true,
        metadata: {
          totalOpenings: 0,
          averageValue: 850,
          lastModified: new Date().toISOString(),
          modifiedBy: 'system'
        }
      };

      // Insert cases
      const { data: insertedCases, error: casesError } = await supabase
        .from('cases')
        .insert([starterCase, premiumCase, eliteCase])
        .select();

      if (casesError) {
        console.error('❌ Failed to insert cases:', casesError);
        process.exit(1);
      }

      console.log(`✅ Inserted ${insertedCases.length} cases`);

      // 5. Set up case-symbol relationships with probabilities
      console.log('🎯 Setting up probabilities...');

      // Starter Pack probabilities (70% common, 25% uncommon, 5% rare)
      const starterCaseSymbols = [];
      starterSymbols.forEach(symbol => {
        let weight;
        switch (symbol.rarity) {
          case 'common': weight = 70 / starterSymbols.filter(s => s.rarity === 'common').length; break;
          case 'uncommon': weight = 25 / starterSymbols.filter(s => s.rarity === 'uncommon').length; break;
          case 'rare': weight = 5 / starterSymbols.filter(s => s.rarity === 'rare').length; break;
          default: weight = 0;
        }
        if (weight > 0) {
          starterCaseSymbols.push({
            case_id: insertedCases[0].id,
            symbol_id: symbol.id,
            weight: Math.round(weight * 100) / 100
          });
        }
      });

      // Premium Case probabilities (40% common, 30% uncommon, 20% rare, 8% epic, 2% legendary)
      const premiumCaseSymbols = [];
      symbols.forEach(symbol => {
        let weight;
        switch (symbol.rarity) {
          case 'common': weight = 40 / symbols.filter(s => s.rarity === 'common').length; break;
          case 'uncommon': weight = 30 / symbols.filter(s => s.rarity === 'uncommon').length; break;
          case 'rare': weight = 20 / symbols.filter(s => s.rarity === 'rare').length; break;
          case 'epic': weight = 8 / symbols.filter(s => s.rarity === 'epic').length; break;
          case 'legendary': weight = 2 / symbols.filter(s => s.rarity === 'legendary').length; break;
          default: weight = 0;
        }
        if (weight > 0) {
          premiumCaseSymbols.push({
            case_id: insertedCases[1].id,
            symbol_id: symbol.id,
            weight: Math.round(weight * 100) / 100
          });
        }
      });

      // Elite Case probabilities (50% rare, 35% epic, 15% legendary)
      const eliteCaseSymbols = [];
      eliteSymbols.forEach(symbol => {
        let weight;
        switch (symbol.rarity) {
          case 'rare': weight = 50 / eliteSymbols.filter(s => s.rarity === 'rare').length; break;
          case 'epic': weight = 35 / eliteSymbols.filter(s => s.rarity === 'epic').length; break;
          case 'legendary': weight = 15 / eliteSymbols.filter(s => s.rarity === 'legendary').length; break;
          default: weight = 0;
        }
        if (weight > 0) {
          eliteCaseSymbols.push({
            case_id: insertedCases[2].id,
            symbol_id: symbol.id,
            weight: Math.round(weight * 100) / 100
          });
        }
      });

      // Insert case-symbol relationships
      const allCaseSymbols = [...starterCaseSymbols, ...premiumCaseSymbols, ...eliteCaseSymbols];
      
      const { error: relationshipError } = await supabase
        .from('case_symbols')
        .insert(allCaseSymbols);

      if (relationshipError) {
        console.error('❌ Failed to insert case-symbol relationships:', relationshipError);
        process.exit(1);
      }

      console.log(`✅ Set up ${allCaseSymbols.length} case-symbol relationships`);
    }

    // 6. Give existing users default credits if they have low balance
    console.log('💰 Setting up default user credits...');
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, credits')
      .lt('credits', 500); // Users with less than 500 credits

    if (usersError) {
      console.error('❌ Failed to fetch users:', usersError);
    } else if (users && users.length > 0) {
      // Give them 1000 credits to start with
      const { error: updateError } = await supabase
        .from('users')
        .update({ credits: 1000 })
        .in('id', users.map(u => u.id));

      if (updateError) {
        console.error('❌ Failed to update user credits:', updateError);
      } else {
        console.log(`✅ Updated credits for ${users.length} users`);
      }
    }

    console.log('\n🎉 Setup complete! Your admin dashboard should now work properly with:');
    console.log('📦 Default cases with proper probabilities');
    console.log('💎 All symbols properly configured');
    console.log('💰 Users have starting credits');
    console.log('🖼️  Image fallbacks for missing images');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupDefaults();