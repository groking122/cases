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
        let walletFromToken: string | null = null
        if (token) {
            const payload = verifyUserToken(token)
            if (payload) walletFromToken = payload.walletAddress
        }
        if (!walletFromToken) {
            return NextResponse.json({ error: 'Missing or invalid token' }, { status: 401 })
        }
        const walletAddress = walletFromToken

        console.log('🔍 Received wallet address:', { 
            address: walletAddress, 
            length: walletAddress?.length, 
            preview: walletAddress?.substring(0, 20) + '...' 
        });

        // 1. Validate the wallet address format before any database operations
        if (!isValidWalletAddress(walletAddress)) {
            console.error('❌ Invalid wallet address format received:', {
                address: walletAddress,
                length: walletAddress?.length,
                reason: !walletAddress ? 'empty' : 
                       walletAddress.length <= 10 ? 'too short' :
                       walletAddress === 'demo-user' ? 'demo user' :
                       walletAddress.includes('demo') ? 'contains demo' : 'unknown'
            });
            return NextResponse.json({ error: 'Invalid wallet address format.' }, { status: 400 });
        }

        console.log('💰 Fetching credits for wallet:', walletAddress.substring(0, 10));

        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('credits')
            .eq('wallet_address', walletAddress)
            .single();

        if (userError && userError.code === 'PGRST116') {
            console.log('👤 User not found, creating new user with 0 credits...');
            const { data: newUser, error: createError } = await supabaseAdmin
                .from('users')
                .insert({
                    wallet_address: walletAddress,
                    username: `user_${walletAddress.substring(0, 8)}`,
                    credits: 0,
                })
                .select('credits')
                .single();

            if (createError) {
                console.error('❌ Failed to create new user:', createError);
                
                // TEMPORARY WORKAROUND: If it's a constraint error, return demo credits
                if (createError.message && createError.message.includes('users_wallet_address_check')) {
                    console.log('🚧 TEMPORARY WORKAROUND: Database constraint error, returning demo credits');
                    console.log('🚧 Please fix your database constraint using the SQL commands provided');
                    return NextResponse.json({ 
                        credits: 100, // Give 100 demo credits
                        warning: 'Using demo credits due to database constraint. Please fix your database.'
                    });
                }
                
                return NextResponse.json({ error: `Failed to create user: ${createError.message}` }, { status: 500 });
            }
            
            console.log('👤 New user created successfully.');
            return NextResponse.json({ credits: newUser?.credits ?? 0 });
        }
        
        if (userError) {
            console.error('❌ Error fetching user credits:', userError);
            return NextResponse.json({ error: 'Could not fetch your credits.' }, { status: 500 });
        }
        
        console.log(`✅ Found user with ${user.credits} credits.`);
        return NextResponse.json({ credits: user.credits });

    } catch (error: any) {
        console.error('❌ UNHANDLED ERROR in get-credits:', error);
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
}
