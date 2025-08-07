import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { userCreationLimiter } from '@/lib/rate-limit.js'

export async function POST(request: NextRequest) {
  try {
    // Check rate limit for user creation
    try {
      await userCreationLimiter.check(request);
    } catch (rateLimitError: any) {
      console.warn('⚠️ User creation rate limit exceeded');
      return NextResponse.json(
        { error: rateLimitError?.message || 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Check if Supabase is configured
    if (!supabaseAdmin) {
      console.error('❌ Supabase not configured - missing environment variables')
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    const { walletAddress, walletType, username } = await request.json()

    // Validate wallet address
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 })
    }

    // Check if user exists by wallet address
    let { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!user) {
      // Create new user with wallet address
      const newUsername = username || `Gamer_${walletAddress.slice(-6)}`
      
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          wallet_address: walletAddress,
          wallet_type: walletType || 'unknown',
          username: newUsername,
          credits: 0, // No starting credits, bonus will be given on first purchase
          wallet_connected_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('User creation error:', createError)
        return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 })
      }

      user = newUser
    } else {
      // Update existing user's wallet type and last connection
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          wallet_type: walletType || user.wallet_type,
          wallet_connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress)

      if (updateError) {
        console.error('User update error:', updateError)
      }
    }

    return NextResponse.json({ 
      success: true,
      user: user,
      isNewUser: !user.wallet_connected_at || user.wallet_connected_at === user.created_at
    })

  } catch (error) {
    console.error('User management error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const walletAddress = searchParams.get('wallet')
  const userId = searchParams.get('id')

  if (!walletAddress && !userId) {
    return NextResponse.json({ error: 'Wallet address or user ID required' }, { status: 400 })
  }

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 })
    }

    let query = supabaseAdmin.from('users').select('*')
    
    if (walletAddress) {
      query = query.eq('wallet_address', walletAddress)
    } else {
      query = query.eq('id', userId)
    }

    const { data: user, error } = await query.single()

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })

  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 