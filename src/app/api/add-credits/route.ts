import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Check environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not configured')
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not configured')
}

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

export async function POST(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!supabase) {
      console.error('❌ Supabase not configured - missing environment variables')
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    const { txHash, credits, walletAddress, expectedAmount, expectedAddress } = await request.json()

    console.log('💎 Add credits request:', {
      txHash: txHash?.substring(0, 16) + '...',
      credits,
      walletAddress: Array.isArray(walletAddress) ? walletAddress[0]?.substring(0, 20) + '...' : walletAddress?.substring(0, 20) + '...',
      expectedAmount,
      expectedAddress: expectedAddress?.substring(0, 20) + '...' || 'Not provided'
    })

    if (!txHash || !credits || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: txHash, credits, walletAddress' },
        { status: 400 }
      )
    }

    // Validate inputs
    if (typeof credits !== 'number' || credits <= 0) {
      return NextResponse.json(
        { error: 'Invalid credits amount' },
        { status: 400 }
      )
    }

    // Extract the main wallet address (first one if array)
    const userWalletAddress = Array.isArray(walletAddress) ? walletAddress[0] : walletAddress

    if (!userWalletAddress || userWalletAddress.length < 50) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    // SECURITY: Validate transaction hash format and reject test hashes
    if (!txHash.match(/^[a-fA-F0-9]{64}$/)) {
      console.error('❌ Invalid transaction hash format:', txHash)
      return NextResponse.json(
        { error: 'Invalid transaction hash format' },
        { status: 400 }
      )
    }

    // SECURITY: Reject test transactions in production
    if (txHash.startsWith('test_')) {
      console.error('❌ Test transactions not allowed for credit purchases')
      return NextResponse.json(
        { error: 'Test transactions are not allowed' },
        { status: 400 }
      )
    }

    // SECURITY: Verify the transaction on blockchain before adding credits
    console.log('🔐 Verifying transaction on blockchain...')
    try {
      // Use the exact expected amount and address from the frontend
      // This ensures we verify against the same values used to create the transaction
      const paymentAddress = expectedAddress || process.env.NEXT_PUBLIC_PAYMENT_ADDRESS
      const paymentAmount = expectedAmount || Math.floor((credits / 100) * 1000000).toString()
      
      console.log('💰 Payment verification details:', {
        txHash: txHash.substring(0, 16) + '...',
        expectedAmount: paymentAmount,
        expectedAddress: paymentAddress?.substring(0, 20) + '...'
      })
      
      // Use the current request origin to call the local verification endpoint reliably
      const origin = request.nextUrl.origin
      const verificationResponse = await fetch(`${origin}/api/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash,
          expectedAmount: paymentAmount,
          expectedAddress: paymentAddress
        })
      })

      if (!verificationResponse.ok) {
        const verificationError = await verificationResponse.json()
        console.error('❌ Transaction verification failed:', verificationError)
        return NextResponse.json(
          { error: `Payment verification failed: ${verificationError.error}` },
          { status: 400 }
        )
      }

      const verificationResult = await verificationResponse.json()
      if (!verificationResult.success || !verificationResult.verified) {
        console.error('❌ Transaction not verified:', verificationResult)
        return NextResponse.json(
          { error: 'Transaction could not be verified on blockchain' },
          { status: 400 }
        )
      }

      console.log('✅ Transaction verified on blockchain')
      
    } catch (verificationError: any) {
      console.error('❌ Transaction verification error:', verificationError)
      return NextResponse.json(
        { error: 'Failed to verify transaction on blockchain' },
        { status: 500 }
      )
    }

    // Check if this transaction has already been processed
    console.log('🔍 Checking for existing transaction...')
    const { data: existingCredit, error: checkError } = await supabase
      .from('credit_transactions')
      .select('id, credits_purchased, created_at')
      .eq('tx_hash', txHash)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing transaction:', checkError)
      return NextResponse.json(
        { error: 'Database error while checking transaction' },
        { status: 500 }
      )
    }

    if (existingCredit) {
      console.log('⚠️ Transaction already processed:', {
        transactionId: existingCredit.id,
        creditsAdded: existingCredit.credits_purchased,
        processedAt: existingCredit.created_at
      })
      
      return NextResponse.json(
        { 
          error: 'Transaction already processed',
          details: {
            creditsAdded: existingCredit.credits_purchased,
            processedAt: existingCredit.created_at
          }
        },
        { status: 400 }
      )
    }

    // Get or create user
    console.log('👤 Finding or creating user...')
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('id, credits, wallet_address, username, welcome_bonus_claimed')
      .eq('wallet_address', userWalletAddress)
      .single()

    if (userError && userError.code !== 'PGRST116') {
      console.error('❌ User lookup error:', userError)
      return NextResponse.json(
        { error: 'Failed to lookup user' },
        { status: 500 }
      )
    }

    // Create user if doesn't exist
    if (!user) {
      console.log('🆕 Creating new user...')
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          wallet_address: userWalletAddress,
          username: `User${userWalletAddress.slice(-8)}`,
          credits: 1000, // Starting credits (10 free cases)
          wallet_type: 'cardano',
          is_active: true,
          wallet_connected_at: new Date().toISOString()
        }])
        .select('id, credits, wallet_address, username, welcome_bonus_claimed')
        .single()

      if (createError) {
        console.error('❌ User creation error:', createError)
        return NextResponse.json(
          { error: 'Failed to create user account' },
          { status: 500 }
        )
      }
      
      user = newUser
      console.log('✅ New user created:', {
        id: user.id,
        username: user.username,
        startingCredits: user.credits
      })
    }

    // Add credits to user account
    const oldBalance = user.credits || 0
    let bonus = 0;
    // Give welcome bonus if this is the user's first purchase and they haven't claimed it yet
    if (!user.welcome_bonus_claimed && oldBalance === 0) {
      bonus = 100;
    }
    const newCreditBalance = oldBalance + credits + bonus;

    console.log('💰 Updating user balance:', {
      userId: user.id,
      oldBalance,
      creditsToAdd: credits,
      bonus,
      newBalance: newCreditBalance
    })

    // Update user credits and mark bonus as claimed if given
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        credits: newCreditBalance,
        updated_at: new Date().toISOString(),
        ...(bonus > 0 ? { welcome_bonus_claimed: true } : {})
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('❌ Credit update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user credits' },
        { status: 500 }
      )
    }

    // Record the credit transaction
    console.log('📝 Recording transaction...')
    const { data: transactionRecord, error: transactionError } = await supabase
      .from('credit_transactions')
      .insert([{
        user_id: user.id,
        tx_hash: txHash,
        credits_purchased: credits,
        ada_spent: credits / 100, // Approximate ADA spent (1 ADA per 100 credits roughly)
        transaction_type: 'purchase',
        wallet_address: userWalletAddress
      }])
      .select('id')
      .single()

    if (transactionError) {
      console.error('❌ Transaction record error:', transactionError)
      
      // Try to rollback the credit update
      await supabase
        .from('users')
        .update({ credits: oldBalance })
        .eq('id', user.id)
        
      return NextResponse.json(
        { error: 'Failed to record transaction. Credits have been rolled back.' },
        { status: 500 }
      )
    }

    console.log('✅ Credits added successfully:', {
      userId: user.id,
      transactionId: transactionRecord.id,
      creditsAdded: credits,
      newBalance: newCreditBalance,
      txHash: txHash.substring(0, 16) + '...'
    })

    return NextResponse.json({
      success: true,
      newBalance: newCreditBalance,
      creditsAdded: credits,
      oldBalance: oldBalance,
      transactionId: transactionRecord.id,
      message: `${credits} credits added successfully!`
    })

  } catch (error) {
    console.error('❌ Add credits error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 