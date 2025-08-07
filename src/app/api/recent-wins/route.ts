import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withRateLimit, userRateLimiter } from '@/lib/rate-limit.js';

async function recentWinsHandler(request: NextRequest) {
  try {
    // Check if supabase is available
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Max 50
    const minValue = parseInt(searchParams.get('minValue') || '0');

    // Fetch recent wins with user info
    const query = supabaseAdmin
      .from('case_openings')
      .select(`
        id,
        user_id,
        symbol_id,
        symbol_name,
        symbol_rarity,
        reward_value,
        case_cost,
        net_result,
        created_at,
        cases!inner(name),
        users!inner(username, wallet_address),
        symbols!inner(symbol)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by minimum value if specified
    if (minValue > 0) {
      query.gte('reward_value', minValue);
    }

    // Only show profitable wins for better social proof
    query.gt('net_result', 0);

    const { data: recentOpenings, error } = await query;

    if (error) {
      console.error('Recent wins query error:', error);
      return NextResponse.json({ error: 'Failed to fetch recent wins' }, { status: 500 });
    }

    // Transform data for frontend
    const recentWins = (recentOpenings || []).map((opening: any) => {
      // Calculate multiplier from the data
      const multiplier = opening.case_cost > 0 ? 
        Math.round((opening.reward_value / opening.case_cost) * 100) / 100 : 0;

      return {
        id: opening.id,
        user_id: opening.user_id,
        username: opening.users.username || `Player_${opening.users.wallet_address?.slice(-8) || 'Unknown'}`,
        symbol_key: opening.symbols.symbol,
        symbol_name: opening.symbol_name,
        symbol_rarity: opening.symbol_rarity,
        reward_value: opening.reward_value,
        multiplier: multiplier,
        created_at: opening.created_at,
        case_name: opening.cases.name,
        net_result: opening.net_result
      };
    });

    // Add cache headers for better performance
    const response = NextResponse.json(recentWins);
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    
    return response;

  } catch (error) {
    console.error('Recent wins API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Export with rate limiting
export const GET = withRateLimit(userRateLimiter, recentWinsHandler); 