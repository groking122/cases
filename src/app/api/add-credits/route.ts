import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { applyCredit } from '@/lib/credits/applyCredit'
import { amountToJSON } from '@/lib/credits/format'

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
    if (process.env.DISABLE_WRITES === 'true') {
      return NextResponse.json({ error: 'Temporarily unavailable' }, { status: 503 })
    }
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

      // Log environment snapshot for fast diagnosis
      console.log('verify-payment snapshot', {
        net: process.env.CARDANO_NETWORK,
        hasKey: !!process.env.BLOCKFROST_API_KEY,
        expectedAddress: paymentAddress?.substring(0, 30) + '...',
        txHash: txHash.substring(0, 16) + '...'
      })

      // Server-side retry/backoff (handles indexer lag)
      let attempt = 0
      const maxAttempts = 5
      let verifiedOk = false
      let lastStatus = 0
      let lastBody: any = null

        while (attempt < maxAttempts) {
          const res = await fetch(`${origin}/api/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              txHash,
              expectedAmount: paymentAmount,
              expectedAddress: paymentAddress
            })
          })
          lastStatus = res.status
          try { lastBody = await res.json() } catch { lastBody = null }

          if (res.ok && lastBody?.success && lastBody?.verified) {
            verifiedOk = true
            break
          }

          // Pending or not found → backoff and retry
          if (res.status === 202 || res.status === 404 || (lastBody && (lastBody.status === 'pending'))) {
            const delayMs = Math.min(Math.pow(2, attempt) * 1000, 16000)
            console.log(`⏳ Waiting ${delayMs}ms before re-verify (attempt ${attempt + 1}/${maxAttempts})`)
            await new Promise(r => setTimeout(r, delayMs))
            attempt++
            continue
          }

          // Hard error (auth, misconfig, etc.)
          break
        }

        if (!verifiedOk) {
          // Still pending or failed after retries → signal client to poll
          console.warn('⚠️ Verification pending/failed after retries', { lastStatus, lastBody })
          return NextResponse.json({ status: 'pending', retryAfter: 5 }, { status: 202 })
        }

        console.log('✅ Transaction verified on blockchain')
      
    } catch (verificationError: any) {
      console.error('❌ Transaction verification error:', verificationError)
      return NextResponse.json(
        { error: 'Failed to verify transaction on blockchain', code: 'VERIFY_FAILED', details: verificationError?.message || String(verificationError) },
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

    // Compute bonus eligibility and apply credits via single DB function with idempotency
    // Read starting balance for bonus logic
    const { data: balBefore } = await supabase
      .from('balances')
      .select('amount')
      .eq('user_id', user.id)
      .single()
    const oldBalance = BigInt(String(balBefore?.amount ?? 0))
    const base = BigInt(credits)
    const bonus = (!user.welcome_bonus_claimed && oldBalance === 0n) ? 100n : 0n

    const idemKey = `purchase:${txHash}`
    let newBalance: bigint
    try {
      newBalance = await applyCredit(user.id, base + bonus, 'credit_purchase', idemKey)
    } catch (rpcError: any) {
      console.error('❌ credit_apply_and_log RPC error:', rpcError)
      return NextResponse.json(
        { error: 'Database RPC failed', code: 'RPC_FAILED', details: rpcError?.message || String(rpcError) },
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
      
      // Try to rollback the credit via idempotent reversal event
      const rollbackKey = `${idemKey}:rollback`
      const rollbackDelta = -(base + bonus)
      await applyCredit(user.id, rollbackDelta, 'purchase_rollback', rollbackKey)
        
      return NextResponse.json(
        { error: 'Failed to record transaction. Credits have been rolled back.', code: 'TX_INSERT_FAILED', details: transactionError?.message || String(transactionError) },
        { status: 500 }
      )
    }

    console.log('✅ Credits added successfully:', {
      userId: user.id,
      transactionId: transactionRecord.id,
      creditsAdded: Number(base),
      newBalance: newBalance.toString(),
      txHash: txHash.substring(0, 16) + '...'
    })

    // Update aggregate withdraw buckets (best-effort; skip if table missing). No cooldown/turnover.
    try {
      // Ensure balances row exists
      const { data: ub } = await supabase
        .from('balances')
        .select('purchased_credits')
        .eq('user_id', user.id)
        .single()
      if (!ub) {
        await supabase
          .from('balances')
          .insert({
            user_id: user.id,
            purchased_credits: credits,
            winnings_credits: 0,
            bonus_credits: 0,
            last_purchase_at: null
          })
      } else {
        await supabase
          .from('balances')
          .update({
            purchased_credits: (ub.purchased_credits || 0) + credits
          })
          .eq('user_id', user.id)
      }
      // Optional audit: credit_purchases
      const adaAmount = Number((credits / 100).toFixed(2))
      const unitPrice = Number((adaAmount / credits).toFixed(6))
      await supabase.from('credit_purchases').insert({
        user_id: user.id,
        credits,
        ada_amount: adaAmount,
        unit_price: unitPrice
      })
    } catch (e) {
      console.warn('⚠️ Skipped user_balances/credit_purchases update:', e)
    }

    return NextResponse.json({
      success: true,
      newBalance: amountToJSON(newBalance),
      creditsAdded: Number(base),
      oldBalance: amountToJSON(oldBalance),
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