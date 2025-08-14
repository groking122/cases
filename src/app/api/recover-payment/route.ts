import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    const { txHash, walletAddress, credits } = await request.json()

    console.log('🔄 Payment recovery request:', {
      txHash: txHash?.substring(0, 16) + '...',
      walletAddress: walletAddress?.substring(0, 20) + '...',
      credits
    })

    // Validate inputs
    if (!txHash || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: txHash and walletAddress' },
        { status: 400 }
      )
    }

    // SECURITY: Validate transaction hash format
    if (!txHash.match(/^[a-fA-F0-9]{64}$/)) {
      console.error('❌ Invalid transaction hash format:', txHash)
      return NextResponse.json(
        { error: 'Invalid transaction hash format' },
        { status: 400 }
      )
    }

    // Check if this transaction has already been processed
    console.log('🔍 Checking if transaction was already processed...')
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
      console.log('✅ Transaction was already processed:', {
        transactionId: existingCredit.id,
        creditsAdded: existingCredit.credits_purchased,
        processedAt: existingCredit.created_at
      })
      
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        details: {
          creditsAdded: existingCredit.credits_purchased,
          processedAt: existingCredit.created_at,
          message: 'This transaction was already processed successfully'
        }
      })
    }

    console.log('⚠️ Transaction not found in database - attempting manual recovery...')

    // Try to verify with Blockfrost if possible (but don't fail if it doesn't work)
    let blockfrostVerification = null
    try {
      const verificationResponse = await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/api/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash,
          expectedAmount: credits ? (credits * 10000).toString() : '9990000', // Default to ~10 ADA
          expectedAddress: process.env.NEXT_PUBLIC_PAYMENT_ADDRESS
        })
      })

      if (verificationResponse.ok) {
        blockfrostVerification = await verificationResponse.json()
        console.log('✅ Blockfrost verification successful')
      } else {
        const error = await verificationResponse.json()
        console.log('⚠️ Blockfrost verification failed:', error.error)
        blockfrostVerification = { error: error.error }
      }
    } catch (verifyError: any) {
      console.log('⚠️ Could not verify with Blockfrost:', verifyError.message)
      blockfrostVerification = { error: verifyError.message }
    }

    // Get or create user
    console.log('👤 Finding or creating user...')
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('id, credits, wallet_address, username')
      .eq('wallet_address', walletAddress)
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
          wallet_address: walletAddress,
          username: walletAddress.substring(0, 12) + '...',
          credits: 0
        }])
        .select()
        .single()

      if (createError) {
        console.error('❌ User creation failed:', createError)
        return NextResponse.json(
          { error: 'Failed to create user account' },
          { status: 500 }
        )
      }

      user = newUser
      console.log('✅ New user created:', newUser?.id || 'unknown')
    }

    // Ensure user exists at this point
    if (!user) {
      console.error('❌ Failed to create or find user')
      return NextResponse.json(
        { error: 'Failed to create or find user account' },
        { status: 500 }
      )
    }

    // Determine credits to add
    const creditsToAdd = credits || 1000 // Default to 1000 if not specified

    // Record the transaction (even if Blockfrost failed)
    console.log('📝 Recording manual credit transaction...')
    const { data: creditRecord, error: insertError } = await supabase
      .from('credit_transactions')
      .insert([{
        user_id: user.id,
        tx_hash: txHash,
        credits_purchased: creditsToAdd,
        wallet_address: walletAddress,
        payment_status: blockfrostVerification?.success ? 'verified' : 'manual_recovery',
        verification_details: blockfrostVerification
      }])
      .select()
      .single()

    if (insertError) {
      console.error('❌ Transaction record failed:', insertError)
      return NextResponse.json(
        { error: 'Failed to record transaction' },
        { status: 500 }
      )
    }

    // Add credits to user balance
    console.log('💎 Adding credits to user balance...')
    const newBalance = user.credits + creditsToAdd

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ credits: newBalance })
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Failed to update user balance:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user balance' },
        { status: 500 }
      )
    }

    console.log('✅ Payment recovery completed successfully!')

    return NextResponse.json({
      success: true,
      recovered: true,
      details: {
        txHash: txHash.substring(0, 16) + '...',
        creditsAdded: creditsToAdd,
        newBalance: newBalance,
        blockfrostVerification: blockfrostVerification?.success ? 'verified' : 'failed',
        message: `Successfully recovered ${creditsToAdd} credits for transaction ${txHash.substring(0, 16)}...`
      }
    })

  } catch (error: any) {
    console.error('❌ Payment recovery error:', error)
    return NextResponse.json(
      { 
        error: 'Payment recovery failed',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
} 