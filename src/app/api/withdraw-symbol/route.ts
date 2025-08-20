import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getBearerToken, verifyUserToken } from '@/lib/userAuth'
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { itemId, withdrawalType } = await request.json();

    // Require user auth and derive identity from JWT
    const token = getBearerToken(request.headers.get('authorization'))
    const payload = token ? verifyUserToken(token) : null
    const userId = payload?.userId
    if (!userId) {
      return NextResponse.json({ error: 'Missing or invalid token' }, { status: 401 })
    }

    if (!itemId || !withdrawalType) {
      return NextResponse.json({ 
        error: 'Missing required fields: itemId, withdrawalType' 
      }, { status: 400 });
    }

    if (withdrawalType !== 'credits') {
      return NextResponse.json({ 
        error: 'Invalid withdrawal type. Only "credits" is supported.' 
      }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Get the case opening item
    const { data: caseOpening, error: fetchError } = await supabaseAdmin
      .from('case_openings')
      .select(`
        id,
        user_id,
        symbol_id,
        symbol_name,
        symbol_rarity,
        reward_value,
        is_withdrawn,
        users(wallet_address)
      `)
      .eq('id', itemId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !caseOpening) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (caseOpening.is_withdrawn) {
      return NextResponse.json({ error: 'Item already sold' }, { status: 400 });
    }

    // Generate transaction hash for the sale
    const txHash = generateTransactionHash();
    
    // Idempotently credit reward to balances via RPC
    // Ensure balance row exists
    await supabaseAdmin.from('balances').upsert({ user_id: caseOpening.user_id, amount: 0 })

    const saleKey = `withdraw:symbol:${itemId}`
    const { error: eventErr } = await supabaseAdmin
      .from('credit_events')
      .insert({ user_id: caseOpening.user_id, delta: caseOpening.reward_value, reason: 'symbol_sale', key: saleKey })
    if (eventErr && (eventErr as any).code !== '23505') {
      console.error('Error recording credit event:', eventErr)
      return NextResponse.json({ error: 'Failed to record credit event' }, { status: 500 })
    }
    if (!eventErr) {
      const { error: rpcErr } = await supabaseAdmin
        .rpc('apply_credit_delta_guarded', { p_user_id: caseOpening.user_id, p_delta: caseOpening.reward_value })
      if (rpcErr) {
        console.error('Error adding credits (rpc):', rpcErr)
        return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 })
      }
    }

    if (creditError) {
      console.error('Error adding credits:', creditError);
      return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 });
    }

    // Mark item as sold
    const { error: updateError } = await supabaseAdmin
      .from('case_openings')
      .update({
        is_withdrawn: true,
        withdrawal_type: 'credits',
        withdrawal_tx_hash: txHash,
        withdrawal_timestamp: new Date().toISOString(),
        withdrawal_data: {
          credits_added: caseOpening.reward_value,
          conversion_rate: 1.0 // 1:1 conversion rate
        }
      })
      .eq('id', itemId);

    if (updateError) {
      console.error('Error updating sale status:', updateError);
      return NextResponse.json({ error: 'Failed to process sale' }, { status: 500 });
    }

    // Log the sale for audit purposes
    console.log(`✅ Item sold for credits:`, {
      itemId,
      userId: caseOpening.user_id,
      symbolName: caseOpening.symbol_name,
      creditsAdded: caseOpening.reward_value,
      txHash,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      withdrawalType: 'credits',
      txHash,
      message: `${caseOpening.reward_value} credits added to your balance.`,
      credits_added: caseOpening.reward_value,
      conversion_rate: 1.0
    });

  } catch (error) {
    console.error('Sale error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Generate a transaction hash for the credit sale
function generateTransactionHash(): string {
  return crypto.randomBytes(32).toString('hex');
} 