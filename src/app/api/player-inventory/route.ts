import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Get user ID from wallet address
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (userError || !user) {
      return NextResponse.json({ 
        inventory: [], 
        message: 'User not found or no items' 
      });
    }

    // Get all case openings for this user with symbol info
    // Try join via symbol_id -> symbols. If FK not present in schema cache, fall back to separate fetch
    let caseOpenings: any[] | null = null
    let openingsError: any = null
    const joinAttempt = await supabaseAdmin
      .from('case_openings')
      .select(`*`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!joinAttempt.error) {
      caseOpenings = joinAttempt.data
    } else {
      openingsError = joinAttempt.error
    }

    if (openingsError) {
      console.error('Error fetching case openings:', openingsError);
      return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
    }

    console.log('📦 Case openings found:', caseOpenings?.length || 0);

    // Import symbols config for mapping
    const { SYMBOL_CONFIG } = await import('@/lib/symbols');

    // Transform the data for frontend consumption
    // fetch symbol withdrawable map (fallback) if needed
    let symbolWithdrawMap = new Map<string, boolean>()
    if (caseOpenings && caseOpenings.length > 0) {
      const ids = Array.from(new Set(caseOpenings.map((o: any) => o.symbol_id).filter(Boolean)))
      if (ids.length > 0) {
        const { data: syms } = await supabaseAdmin
          .from('symbols')
          .select('id, withdrawable')
          .in('id', ids)
        syms?.forEach((s: any) => symbolWithdrawMap.set(s.id, !!s.withdrawable))
      }
    }

    const inventory = (caseOpenings || []).map(opening => {
      // First, try to get the symbol key from the API response structure
      let symbolKey = opening.symbol_key || 'coin'; // Use stored key or fallback
      let symbolName = opening.symbol_name || 'Unknown Symbol';
      let symbolRarity = opening.symbol_rarity || 'common';

      // If we have symbol info from the case opening API, find the matching symbol config
      if (opening.symbol_name) {
        // Try to find symbol by name first
        const symbolEntry = Object.entries(SYMBOL_CONFIG).find(([key, symbol]) => 
          symbol.name === opening.symbol_name ||
          symbol.name.toLowerCase() === opening.symbol_name.toLowerCase()
        );
        
        if (symbolEntry) {
          symbolKey = symbolEntry[0];
          symbolName = symbolEntry[1].name;
          symbolRarity = symbolEntry[1].rarity;
        } else if (opening.symbol_rarity) {
          // If no exact name match, try to find by rarity and value
          const matchingSymbols = Object.entries(SYMBOL_CONFIG).filter(([key, symbol]) => 
            symbol.rarity === opening.symbol_rarity
          );
          
          if (matchingSymbols.length > 0) {
            // Pick the best matching symbol by value if possible
            const rewardValue = opening.reward_value || opening.winnings || 0;
            const closestMatch = matchingSymbols.reduce((closest, current) => {
              const [currentKey, currentSymbol] = current;
              const [closestKey, closestSymbol] = closest;
              
              const currentMultiplierValue = currentSymbol.multiplier * 100; // Assuming 100 credit base
              const closestMultiplierValue = closestSymbol.multiplier * 100;
              
              const currentDiff = Math.abs(currentMultiplierValue - rewardValue);
              const closestDiff = Math.abs(closestMultiplierValue - rewardValue);
              
              return currentDiff < closestDiff ? current : closest;
            });
            
            symbolKey = matchingSymbols[0][0]; // Use first match as fallback
            symbolName = matchingSymbols[0][1].name;
            symbolRarity = matchingSymbols[0][1].rarity;
          }
        }
      }

      console.log(`📦 Mapping item: ${opening.symbol_name || 'Unknown'} -> ${symbolKey} (${symbolName})`);

      const withdrawable = symbolWithdrawMap.get(opening.symbol_id) === true
      return {
        id: opening.id,
        symbol_key: symbolKey,
        symbol_name: symbolName,
        symbol_rarity: symbolRarity,
        reward_value: opening.reward_value || opening.winnings || 0,
        created_at: opening.created_at,
        is_withdrawn: opening.is_withdrawn || false,
        withdrawal_type: opening.withdrawal_type,
        withdrawal_tx_hash: opening.withdrawal_tx_hash,
        eligible_for_nft: withdrawable || (opening.reward_value || 0) >= 500
      };
    });

    // Calculate inventory statistics
    const stats = {
      totalItems: inventory.length,
      totalValue: inventory.reduce((sum, item) => sum + item.reward_value, 0),
      availableItems: inventory.filter(item => !item.is_withdrawn).length,
      availableValue: inventory.filter(item => !item.is_withdrawn).reduce((sum, item) => sum + item.reward_value, 0),
      byRarity: inventory.reduce((acc, item) => {
        acc[item.symbol_rarity] = (acc[item.symbol_rarity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    console.log('📊 Inventory stats:', stats);

    return NextResponse.json({
      success: true,
      inventory,
      stats
    });

  } catch (error) {
    console.error('Player inventory error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 