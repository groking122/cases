import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getBearerToken, verifyUserToken } from '@/lib/userAuth'

// Basic validation for wallet addresses - just check it's not empty or demo data
const isValidWalletAddress = (address: string) => {
    return address && 
           address.length > 10 && 
           address !== 'demo-user' && 
           !address.includes('demo');
};

export async function POST(request: NextRequest) {
    if (!supabaseAdmin) {
        console.error('❌ Database connection is not configured.');
        return NextResponse.json({ error: 'The server is not configured correctly.' }, { status: 500 });
    }

    try {
        // Require JWT identity (player must be authenticated)
        const authHeader = request.headers.get('authorization')
        const token = getBearerToken(authHeader)
        const payload = token ? verifyUserToken(token) : null
        if (!payload?.userId) {
            return NextResponse.json({ error: 'Missing or invalid token' }, { status: 401 })
        }
        const userId = payload.userId

        // Ensure balance row exists
        const { error: upsertErr } = await supabaseAdmin
            .from('balances')
            .upsert({ user_id: userId, amount: 0 })
        if (upsertErr && (upsertErr as any).code !== '23505') {
            console.error('❌ Failed to init balance:', upsertErr)
            return NextResponse.json({ error: 'Failed to initialize balance' }, { status: 500 })
        }

        // Read current balance
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
