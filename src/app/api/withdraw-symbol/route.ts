import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { itemId, withdrawalType } = await request.json();

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
      .single();

    if (fetchError || !caseOpening) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (caseOpening.is_withdrawn) {
      return NextResponse.json({ error: 'Item already sold' }, { status: 400 });
    }

    // Generate transaction hash for the sale
    const txHash = generateTransactionHash();
    
    // Get current user credits and add the reward value
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('credits')
      .eq('id', caseOpening.user_id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newCredits = (userData.credits || 0) + caseOpening.reward_value;

    // Update user credits
    const { error: creditError } = await supabaseAdmin
      .from('users')
      .update({ credits: newCredits })
      .eq('id', caseOpening.user_id);

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