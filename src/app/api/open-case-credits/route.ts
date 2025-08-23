import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withRateLimit, caseOpeningLimiter } from '@/lib/rate-limit.js';
import { getSecureRandomForCaseOpening, generateServerSeed } from '@/lib/entropy.js';
import { getBearerToken, verifyUserToken } from '@/lib/userAuth'
import { withUserAuth } from '@/lib/mw/withUserAuth'
import { getPityConfigForCase } from '@/config/pity';
import { applyCredit } from '@/lib/credits/applyCredit'
import { amountToJSON } from '@/lib/credits/format'
// Removed hardcoded symbols - using database case_symbols instead

async function caseOpeningHandler(request: NextRequest) {
  try {
    // Check if supabase is available
    if (!supabaseAdmin) {
      console.error('❌ Database connection not available')
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    if (process.env.DISABLE_WRITES === 'true') {
      return NextResponse.json({ error: 'Temporarily unavailable' }, { status: 503 })
    }

    const { caseId, clientSeed } = await request.json();

    // Derive user identity from auth wrapper (header or cookie)
    const userId = (request as any)?.user?.id

    console.log('🎰 Case opening request:', {
      userId,
      caseId,
      clientSeed: clientSeed?.substring(0, 10) + '...'
    })

    // Validate input
    if (!userId || !caseId) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, caseId' 
      }, { status: 400 });
    }

    // Apply rate limiting
    await caseOpeningLimiter.check(request);

    // Get user data with security checks
    console.log('👤 Fetching user data...')
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('❌ User not found:', { userId, error: userError })
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Extra safety: ensure JWT wallet matches the DB user record
    try {
      const tokenWallet = (request as any)?.user?.wallet
      if (tokenWallet && user.wallet_address && user.wallet_address !== tokenWallet) {
        console.error('❌ Wallet mismatch between token and user record', { tokenWallet, userWallet: user.wallet_address })
        return NextResponse.json({ error: 'wallet_mismatch' }, { status: 409 })
      }
    } catch {}

    console.log('👤 User found:', {
      id: user.id,
      username: user.username,
      credits: user.credits,
      casesOpened: user.cases_opened
    })

    // Security: Check if user is active and not flagged
    if (user.is_active === false) {
      console.log('❌ User account suspended:', userId)
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
    }

    // Get case data
    console.log('🎁 Fetching case data...')
    const { data: caseData, error: caseError } = await supabaseAdmin
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      console.error('❌ Case not found:', { caseId, error: caseError })
      return NextResponse.json({ error: 'Case not found or inactive' }, { status: 404 });
    }

    console.log('🎁 Case found:', {
      id: caseData.id,
      name: caseData.name,
      price: caseData.price
    })

    // Load current balance from balances table
    const { data: balanceRow } = await supabaseAdmin
      .from('balances')
      .select('amount')
      .eq('user_id', userId)
      .single()

    let currentBalance = BigInt(String(balanceRow?.amount ?? 0))

    // Check if user has enough credits using balances table (fast-fail)
    if (currentBalance < BigInt(caseData.price)) {
      console.log('❌ Insufficient credits:', {
        userCredits: currentBalance.toString(),
        casePrice: caseData.price,
        deficit: (BigInt(caseData.price) - currentBalance).toString()
      })
      
      return NextResponse.json({ 
        error: 'Insufficient credits',
        userCredits: amountToJSON(currentBalance),
        casePrice: caseData.price
      }, { status: 400 });
    }

    // Generate server seed
    const serverSeed = generateServerSeed();
    const nonce = user.cases_opened + 1;

    console.log('🎲 Generating random result...', {
      serverSeed: serverSeed.substring(0, 10) + '...',
      nonce
    })

    // Get secure random value
    const entropyResult = await getSecureRandomForCaseOpening(
      clientSeed || null,
      serverSeed,
      nonce
    );
    const randomValue = typeof entropyResult === 'object' ? entropyResult.randomValue : entropyResult;

    // Implement pity timer (force rare item after consecutive losses)
    let selectedSymbol;
    let isPityActivated = false;

    // Get symbols for this case through case_symbols relationship
    console.log('🔍 Fetching case symbols from database...')
    const { data: caseSymbols, error: symbolsError } = await supabaseAdmin
      .from('case_symbols')
      .select(`
        weight,
        symbol_id,
        symbols!inner (
          id,
          name,
          description,
          image_url,
          rarity,
          value,
          is_active,
          withdrawable,
          metadata
        )
      `)
      .eq('case_id', caseId)
      .eq('symbols.is_active', true)

    if (symbolsError) {
      console.error('❌ Failed to fetch case symbols:', symbolsError)
      return NextResponse.json({ error: 'Failed to fetch case symbols' }, { status: 500 })
    }

    if (!caseSymbols || caseSymbols.length === 0) {
      console.error('❌ No symbols configured for this case')
      return NextResponse.json({ error: 'No symbols available for this case' }, { status: 400 })
    }

    console.log('✅ Case symbols found:', caseSymbols.length, 'symbols configured')
    const getRelSymbol = (cs: any) => Array.isArray(cs.symbols) ? cs.symbols[0] : cs.symbols
    console.log('🎰 Available symbols:', caseSymbols.map(cs => { const sym = getRelSymbol(cs); return ({ name: sym.name, weight: cs.weight }) }))

    // Check recent openings for pity timer and cooldown
    const { data: recentOpenings, error: openingsError } = await supabaseAdmin
      .from('case_openings')
      .select('symbol_key, reward_value, case_cost, created_at, is_pity_activated')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    let lossStreak = 0;
    let pityOnCooldown = false;
    let spinsSinceLastPity = Number.POSITIVE_INFINITY;
    if (!openingsError && recentOpenings && Array.isArray(recentOpenings)) {
      // Calculate loss streak using strict loss: reward_value < case_cost
      const recentForStreak = recentOpenings.slice(0, 20);
      lossStreak = calculateLossStreak(recentForStreak);

      // Cooldown: max 1 pity per 50 spins
      pityOnCooldown = recentOpenings.some((o: any) => o.is_pity_activated === true);
      const idx = recentOpenings.findIndex((o: any) => o.is_pity_activated === true);
      if (idx >= 0) {
        spinsSinceLastPity = idx; // because list is ordered desc, idx counts spins since last pity
      }

      console.log('🎯 Loss streak analysis:', {
        recentOpenings: recentOpenings.length,
        lossStreak,
        pityOnCooldown,
        spinsSinceLastPity
      })
    }

    // Always perform normal weighted selection first (using database symbols)
    // We'll potentially override with pity afterwards, only if the normal roll would be a loss
    {
      let cumulative = 0;
      const randomChoice = randomValue * 100; // Convert to percentage [0,100)
      for (const caseSymbol of caseSymbols) {
        cumulative += caseSymbol.weight;
        if (randomChoice <= cumulative) {
          const sym = getRelSymbol(caseSymbol);
          selectedSymbol = {
            ...sym,
            key: sym.metadata?.key || sym.name.toLowerCase().replace(/\s+/g, '_'),
            multiplier: sym.value / caseData.price
          };
          break;
        }
      }
      // Fallback to first symbol if something went wrong
      if (!selectedSymbol) {
        const firstSymbol = getRelSymbol(caseSymbols[0]);
        selectedSymbol = {
          ...firstSymbol,
          key: firstSymbol.metadata?.key || firstSymbol.name.toLowerCase().replace(/\s+/g, '_'),
          multiplier: firstSymbol.value / caseData.price
        };
      }
    }

    // Pity eligibility: strict loss streak (>= threshold) AND not in cooldown AND current roll would be a loss
    const pityConfig = getPityConfigForCase(caseId);
    const PITY_THRESHOLD = pityConfig.threshold; // threshold per UX/economy spec
    const PITY_SPIN_COOLDOWN = pityConfig.cooldownSpins; // informational; enforced by checking last N spins above
    const PITY_MIN_SINCE_LAST = pityConfig.minSinceLast; // require at least X spins since last pity
    const wouldLose = (selectedSymbol.value || 0) < caseData.price;
    const pityEligible = lossStreak >= PITY_THRESHOLD && !pityOnCooldown && (spinsSinceLastPity >= PITY_MIN_SINCE_LAST) && wouldLose;

    if (pityEligible) {
      const { table: pityTable, ev: evPity } = getPityTableAndEv(pityConfig);
      const pityPayout = sampleFromProbabilityTable(pityTable, randomValue);
      const pitySymbol = findClosestSymbolForPayout(caseSymbols, pityPayout);
      if (pitySymbol) {
        selectedSymbol = {
          ...pitySymbol,
          key: pitySymbol.metadata?.key || pitySymbol.name.toLowerCase().replace(/\s+/g, '_'),
          multiplier: pitySymbol.value / caseData.price
        };
        isPityActivated = true;
        console.log('🎰 Pity activated (EV-bounded)', {
          lossStreak,
          pityPayout,
          evPity,
          symbol: selectedSymbol.name
        })
      }
    }

    console.log('🎲 Selected symbol:', {
      key: selectedSymbol.key,
      name: selectedSymbol.name,
      rarity: selectedSymbol.rarity,
      multiplier: selectedSymbol.multiplier,
      randomValue: randomValue,
      isPity: isPityActivated
    });

    // Calculate winnings based on symbol value
    const winnings = selectedSymbol.value || Math.floor(selectedSymbol.multiplier * caseData.price);
    const netResult = winnings - caseData.price;
    const isProfit = netResult > 0;

    // Disable withdrawable items: always credit winnings to balance
    const isBigReward = selectedSymbol.multiplier >= 5.0;
    const credited = true;

    // Restore stats calculations
    const newTotalSpent = user.total_spent + caseData.price;
    const newTotalWon = user.total_won + winnings;
    const newCasesOpened = user.cases_opened + 1;

    // Apply atomic, idempotent credit changes via single DB function
    const roundId = `${nonce}`
    // 1) Deduct case price
    currentBalance = await applyCredit(userId, -BigInt(caseData.price), `bet:case:${caseId}`, `bet:${roundId}`)

    // 2) Optionally credit winnings
    if (credited && winnings > 0) {
      currentBalance = await applyCredit(userId, BigInt(winnings), `win:case:${caseId}`, `win:${roundId}`)
    }

    // Update user record (stats only; credits managed in balances table)
    console.log('📝 Updating user record stats...')
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        total_spent: newTotalSpent,
        total_won: newTotalWon,
        cases_opened: newCasesOpened,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ User update error:', updateError);
      return NextResponse.json({ error: 'Failed to update user balance' }, { status: 500 });
    }

    console.log('✅ User record updated successfully')

    // Symbol is already from database, so we have the ID
    console.log('🔍 Using symbol from database:', selectedSymbol.id)
    const symbolData = { id: selectedSymbol.id }

    // Record case opening (inventory)
    const { data: caseOpening, error: openingError } = await supabaseAdmin
      .from('case_openings')
      .insert({
        user_id: userId,
        case_id: caseId,
        symbol_id: symbolData.id,
        symbol_key: selectedSymbol.key,
        symbol_name: selectedSymbol.name,
        symbol_rarity: selectedSymbol.rarity,
        case_cost: caseData.price,
        reward_value: winnings,
        net_result: netResult,
        server_seed: serverSeed,
        client_seed: clientSeed || null,
        nonce: nonce,
        random_value: randomValue,
        is_pity_activated: isPityActivated,
        user_balance_before: Number(balanceRow?.amount ?? 0),
        user_balance_after: Number(currentBalance),
        is_withdrawn: credited ? true : false, // only mark withdrawn for credited path
        withdrawal_type: credited ? 'credits' : null,
        withdrawal_tx_hash: credited ? 'instant_credit' : null,
        withdrawal_timestamp: credited ? new Date().toISOString() : null,
        withdrawal_data: credited ? { auto: true } : null
      })
      .select()
      .single();

    if (openingError) {
      console.error('❌ Case opening insert error:', openingError);
      
      // Try to rollback user credits if case opening failed
      console.log('🔄 Rolling back user credits...')
      await supabaseAdmin
        .from('users')
        .update({
          credits: user.credits, // Restore original credits
          total_spent: user.total_spent,
          total_won: user.total_won,
          cases_opened: user.cases_opened
        })
        .eq('id', userId);
        
      return NextResponse.json({ error: 'Failed to record case opening' }, { status: 500 });
    }

    console.log('✅ Case opening recorded successfully:', {
      id: caseOpening.id,
      symbol: selectedSymbol.name,
      winnings: winnings,
      newBalance: currentBalance
    });

    // Check for achievements/milestones
    const achievements = checkAchievements(user, selectedSymbol, newCasesOpened);

    // Calculate streak bonus
    const streakInfo = calculateStreakBonus(recentOpenings || [], isProfit);

    console.log('🎉 Case opening completed successfully!', {
      caseOpeningId: caseOpening.id,
      achievements: achievements.length,
      streakInfo
    })

    // Return result
    return NextResponse.json({
      success: true,
      symbol: {
        key: selectedSymbol.key,
        name: selectedSymbol.name,
        rarity: selectedSymbol.rarity,
        multiplier: selectedSymbol.multiplier,
        value: selectedSymbol.value,
        image_url: selectedSymbol.image_url,
        image: selectedSymbol.image_url || selectedSymbol.emoji || '❓'
      },
      winnings,
      netResult,
      isProfit,
      newBalance: amountToJSON(currentBalance),
      credited,
      isBigReward,
      caseOpening: {
        id: caseOpening.id,
        serverSeed,
        clientSeed: clientSeed || null,
        nonce,
        randomValue,
        isPityActivated
      },
      userStats: {
        totalSpent: newTotalSpent,
        totalWon: newTotalWon,
        casesOpened: newCasesOpened,
        profitLoss: newTotalWon - newTotalSpent
      },
      achievements,
      streakInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Case opening error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Helper function to calculate loss streak for pity timer
function calculateLossStreak(recentOpenings: any[]): number {
  let streak = 0;
  
  for (const opening of recentOpenings) {
    // Strict loss: reward_value < case_cost
    if ((opening?.reward_value ?? 0) < (opening?.case_cost ?? 0)) {
      streak++;
    } else {
      break; // Streak broken by a win
    }
  }
  
  return streak;
}

// Get pity table and compute EV with validations
function getPityTableAndEv(cfg?: { table: { payout: number; p: number }[]; evCap?: number }): { table: { payout: number; p: number }[]; ev: number } {
  // Default lower-EV pity table (EV ≈ 116.9 for 100-cost case)
  const table = (cfg?.table && cfg.table.length)
    ? cfg.table
    : [
        { payout: 60,   p: 0.35 },
        { payout: 100,  p: 0.47 },
        { payout: 150,  p: 0.16 },
        { payout: 800,  p: 0.019 },
        { payout: 6000, p: 0.001 }
      ];
  const sumP = table.reduce((a, s) => a + s.p, 0);
  if (Math.abs(sumP - 1) > 1e-6) {
    throw new Error('Pity table probabilities must sum to 1');
  }
  const ev = table.reduce((a, s) => a + s.p * s.payout, 0);
  const cap = cfg?.evCap ?? 126;
  if (ev > cap) {
    throw new Error('Pity EV exceeds safety cap');
  }
  return { table, ev };
}

function sampleFromProbabilityTable(table: { payout: number; p: number }[], r: number): number {
  let t = 0;
  for (const row of table) {
    t += row.p;
    if (r <= t) return row.payout;
  }
  return table[table.length - 1].payout;
}

// Map the target payout to the closest available symbol in this case
function findClosestSymbolForPayout(caseSymbols: any[], target: number): any | null {
  if (!caseSymbols || caseSymbols.length === 0) return null;
  const getRelSymbol = (cs: any) => Array.isArray(cs.symbols) ? cs.symbols[0] : cs.symbols;
  let best: any = null;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const cs of caseSymbols) {
    const sym = getRelSymbol(cs);
    const value = Number(sym?.value ?? 0);
    const diff = Math.abs(value - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = sym;
    } else if (diff === bestDiff && best) {
      // Tie-breaker: prefer the symbol with value closer but not exceeding target, else higher value
      const bestVal = Number(best.value ?? 0);
      if ((value <= target && bestVal > target) || (value > bestVal)) {
        best = sym;
      }
    }
  }
  return best;
}

// Helper function to check for achievements
function checkAchievements(user: any, symbol: any, newCasesOpened: number): string[] {
  const achievements = [];
  
  // First time achievements
  if (newCasesOpened === 1) {
    achievements.push('First Case Opened!');
  }
  
  // Milestone achievements
  if ([10, 50, 100, 500, 1000].includes(newCasesOpened)) {
    achievements.push(`${newCasesOpened} Cases Opened!`);
  }
  
  // Rarity achievements
  if (symbol.rarity === 'legendary') {
    achievements.push('Legendary Drop!');
  } else if (symbol.rarity === 'epic') {
    achievements.push('Epic Drop!');
  }
  
  // Special symbol achievements
  if (['bitcoin', 'dogecoin'].includes(symbol.key)) {
    achievements.push('Crypto Legend!');
  }
  
  return achievements;
}

// Helper function to calculate streak bonus
function calculateStreakBonus(recentOpenings: any[], currentIsProfit: boolean): any {
  if (!recentOpenings || recentOpenings.length === 0) {
    return { streakCount: currentIsProfit ? 1 : 0, streakType: currentIsProfit ? 'win' : 'loss', bonus: 0 };
  }
  
  let streakCount = currentIsProfit ? 1 : 0;
  let streakType = currentIsProfit ? 'win' : 'loss';
  
  // Count consecutive wins/losses
  for (const opening of recentOpenings) {
    const wasProfit = opening.reward_value > opening.case_cost;
    
    if (wasProfit === currentIsProfit) {
      streakCount++;
    } else {
      break;
    }
  }
  
  // Calculate bonus for win streaks
  let bonus = 0;
  if (currentIsProfit && streakCount >= 3) {
    bonus = Math.min(streakCount * 10, 100); // Max 100 credit bonus
  }
  
  return { streakCount, streakType, bonus };
}

// Export the handler wrapped with rate limiting
export const POST = withRateLimit(caseOpeningLimiter, withUserAuth(caseOpeningHandler as any) as any);