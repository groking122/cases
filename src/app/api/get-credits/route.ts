import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withUserAuth } from '@/lib/mw/withUserAuth'

// Basic validation for wallet addresses - just check it's not empty or demo data
const isValidWalletAddress = (address: string) => {
    return address && 
           address.length > 10 && 
           address !== 'demo-user' && 
           !address.includes('demo');
};

async function handler(request: Request) {
  if (!supabaseAdmin) {
    console.error('❌ Database connection is not configured.');
    return NextResponse.json({ error: 'The server is not configured correctly.' }, { status: 500 });
  }

  try {
    const userId = (request as any)?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Missing or invalid token' }, { status: 401 })
    }

    // Initialize balance row only if it doesn't exist; NEVER overwrite existing amount
    const { error: initErr } = await supabaseAdmin
      .from('balances')
      .insert({ user_id: userId, amount: 0 })
    if (initErr && (initErr as any).code !== '23505') {
      console.error('❌ Failed to init balance:', initErr)
      return NextResponse.json({ error: 'Failed to initialize balance' }, { status: 500 })
    }

    const { data: bal, error: balErr } = await supabaseAdmin
      .from('balances')
      .select('amount')
      .eq('user_id', userId)
      .single()
    if (balErr) {
      console.error('❌ Error fetching balance:', balErr)
      return NextResponse.json({ error: 'Could not fetch your credits.' }, { status: 500 })
    }

    return NextResponse.json({ credits: bal?.amount ?? 0 })
  } catch (error: any) {
    console.error('❌ UNHANDLED ERROR in get-credits:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

export const POST = withUserAuth(handler)
