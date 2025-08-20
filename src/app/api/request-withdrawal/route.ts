import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getBearerToken, verifyUserToken } from '@/lib/userAuth'
import { withRateLimit, userRateLimiter } from '@/lib/rate-limit.js'

async function handler(request: NextRequest) {
  try {
    // Derive identity from JWT only
    const token = getBearerToken(request.headers.get('authorization'))
    const payload = token ? verifyUserToken(token) : null
    const userId = payload?.userId

    const { 
      caseOpeningId, 
      withdrawalType, 
      paymentMethod, 
      paymentDetails,
      walletAddress,
      creditsRequested
    } = await request.json()

    if (!userId || !withdrawalType) {
      return NextResponse.json({ error: 'Missing required fields: token and withdrawalType are required' }, { status: 400 })
    }

    // For bulk credit withdrawals, creditsRequested is required when caseOpeningId is null
    if (!caseOpeningId && !creditsRequested) {
      return NextResponse.json({ error: 'Missing required fields: creditsRequested is required for bulk credit withdrawals' }, { status: 400 })
    }

    // Get case opening data (if this is for a specific case opening)
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 })
    }

    let caseOpening = null
    if (caseOpeningId) {
      const { data: openingData, error: openingError } = await supabaseAdmin
        .from('case_openings')
        .select('*')
        .eq('id', caseOpeningId)
        .eq('user_id', userId)
        .single()

      if (openingError || !openingData) {
        return NextResponse.json({ error: 'Case opening not found' }, { status: 404 })
      }

      if (openingData.is_withdrawn || openingData.withdrawal_requested) {
        return NextResponse.json({ error: 'Already withdrawn or withdrawal already requested' }, { status: 400 })
      }

      caseOpening = openingData
    }

    // Get user data with credit history
    const { data: user } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        total_credits_purchased,
        total_credits_withdrawn
      `)
      .eq('id', userId)
      .single()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's lifetime credit purchase and withdrawal totals
    const { data: purchaseTotal } = await supabaseAdmin
      .from('credit_transactions')
      .select('credits_purchased')
      .eq('user_id', userId)
      .eq('transaction_type', 'purchase')

    const { data: withdrawalTotal } = await supabaseAdmin
      .from('withdrawal_requests')
      .select('credits_requested')
      .eq('user_id', userId)
      .eq('status', 'completed')

    const lifetimePurchased = purchaseTotal?.reduce((sum, t) => sum + (t.credits_purchased || 0), 0) || 0
    const lifetimeWithdrawn = withdrawalTotal?.reduce((sum, w) => sum + (w.credits_requested || 0), 0) || 0
    
    // Determine credits to be requested
    const creditsToRequest = caseOpening ? caseOpening.reward_value : creditsRequested

    // Check if user has enough credits to deduct
    if (user.credits < creditsToRequest) {
      return NextResponse.json({ 
        error: `Insufficient credits. You have ${user.credits} credits but need ${creditsToRequest} credits to withdraw this item.` 
      }, { status: 400 })
    }

    // ⚡ FRAUD DETECTION: Calculate risk score
    const { data: riskData } = await supabaseAdmin
      .rpc('calculate_risk_score', {
        p_user_id: userId,
        p_credits_requested: creditsToRequest,
        p_user_lifetime_purchased: lifetimePurchased,
        p_user_lifetime_withdrawn: lifetimeWithdrawn
      })

    const riskScore = riskData?.[0]?.risk_score || 0
    const riskReasons = riskData?.[0]?.risk_reasons || []
    const isSuspicious = riskData?.[0]?.is_suspicious || false

    // 🔐 SECURITY: Auto-reject highly suspicious requests
    if (riskScore >= 100) {
      return NextResponse.json({ 
        error: 'Withdrawal request blocked for security review. Please contact support.',
        riskReasons 
      }, { status: 403 })
    }

    // 💰 DEDUCT CREDITS IMMEDIATELY when request is made via guarded RPC + event
    const withdrawIdemKey = `withdraw:req:${userId}:${caseOpeningId || 'bulk'}:${creditsToRequest}`
    // Record idempotency event (ignore duplicate)
    const { error: withdrawEventErr } = await supabaseAdmin
      .from('credit_events')
      .insert({ user_id: userId, delta: -creditsToRequest, reason: 'withdrawal_request', key: withdrawIdemKey })
    if (withdrawEventErr && (withdrawEventErr as any).code !== '23505') {
      console.error('Error recording withdrawal event:', withdrawEventErr)
      return NextResponse.json({ error: 'Failed to record withdrawal event' }, { status: 500 })
    }

    let newCreditBalance = user.credits
    if (!withdrawEventErr) {
      const { data: rpcRes, error: rpcErr } = await supabaseAdmin
        .rpc('apply_credit_delta_guarded', { p_user_id: userId, p_delta: -creditsToRequest })
      if (rpcErr) {
        if (String(rpcErr.message || '').toLowerCase().includes('insufficient')) {
          return NextResponse.json({ error: 'Insufficient credits' }, { status: 400 })
        }
        console.error('Error deducting credits (rpc):', rpcErr)
        return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 500 })
      }
      newCreditBalance = rpcRes?.new_amount ?? rpcRes?.amount ?? (user.credits - creditsToRequest)
    } else {
      // Duplicate idempotency: read current balance
      const { data: balNow } = await supabaseAdmin
        .from('balances')
        .select('amount')
        .eq('user_id', userId)
        .single()
      newCreditBalance = balNow?.amount ?? user.credits
    }

    // Create withdrawal request record with fraud detection data
    const { data: withdrawalRequest, error: insertError } = await supabaseAdmin
      .from('withdrawal_requests')
      .insert({
        user_id: userId,
        case_opening_id: caseOpeningId,
        withdrawal_type: withdrawalType,
        payment_method: paymentMethod || 'manual',
        payment_details: paymentDetails || '',
        wallet_address: walletAddress || user?.wallet_address,
        credits_requested: creditsToRequest,
        symbol_key: caseOpening?.symbol_key || null,
        symbol_name: caseOpening?.symbol_name || 'Bulk Credit Withdrawal',
        symbol_rarity: caseOpening?.symbol_rarity || null,
        user_lifetime_purchased_credits: lifetimePurchased,
        user_lifetime_withdrawn_credits: lifetimeWithdrawn,
        risk_score: riskScore,
        risk_reasons: riskReasons,
        is_suspicious: isSuspicious,
        status: isSuspicious ? 'flagged' : 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating withdrawal request:', insertError)
      
      // Rollback credit deduction on error
      // If creating the withdrawal request failed, attempt to refund credits idempotently
      const refundKey = `${withdrawIdemKey}:refund`
      const { error: refundEventErr } = await supabaseAdmin
        .from('credit_events')
        .insert({ user_id: userId, delta: creditsToRequest, reason: 'withdrawal_request_refund', key: refundKey })
      if (!refundEventErr) {
        await supabaseAdmin.rpc('apply_credit_delta_guarded', { p_user_id: userId, p_delta: creditsToRequest })
      }
        
      return NextResponse.json({ error: 'Failed to create withdrawal request' }, { status: 500 })
    }

    // 📊 Record credit flow for audit trail
    await supabaseAdmin
      .from('credit_flow_tracking')
      .insert({
        user_id: userId,
        transaction_type: 'withdrawal_request',
        credits_change: -creditsToRequest,
        credits_before: user.credits,
        credits_after: newCreditBalance,
        withdrawal_request_id: withdrawalRequest.id,
        case_opening_id: caseOpeningId,
        description: caseOpening 
          ? `Withdrawal requested for ${caseOpening.symbol_name} (${caseOpening.symbol_rarity})`
          : `Bulk credit withdrawal requested (${creditsToRequest} credits)`,
        metadata: {
          payment_method: paymentMethod,
          risk_score: riskScore,
          is_suspicious: isSuspicious
        }
      })

    // Mark case opening as withdrawal requested (only if there's a specific case opening)
    if (caseOpeningId && caseOpening) {
      await supabaseAdmin
        .from('case_openings')
        .update({
          withdrawal_requested: true,
          withdrawal_request_id: withdrawalRequest.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', caseOpeningId)
    }

    // Send email notification (you can implement this with your preferred email service)
    await sendWithdrawalNotification({
      requestId: withdrawalRequest.id,
      userWallet: walletAddress || user?.wallet_address,
      withdrawalType,
      amount: caseOpening?.credits_won || creditsToRequest,
      symbolName: caseOpening?.symbol_name || 'Bulk Credit Withdrawal',
      symbolRarity: caseOpening?.symbol_rarity || 'N/A',
      paymentMethod,
      paymentDetails
    })

    // Enhanced email notification with security details
    await sendWithdrawalNotification({
      requestId: withdrawalRequest.id,
      userWallet: walletAddress || user?.wallet_address,
      withdrawalType,
      creditsRequested: creditsToRequest,
      creditsValueUSD: (creditsToRequest * 0.01).toFixed(2),
      symbolName: caseOpening?.symbol_name || 'Bulk Credit Withdrawal',
      symbolRarity: caseOpening?.symbol_rarity || 'N/A',
      paymentMethod,
      paymentDetails,
      riskScore,
      riskReasons,
      isSuspicious,
      lifetimePurchased,
      lifetimeWithdrawn,
      userCreditsAfter: newCreditBalance
    })

    return NextResponse.json({
      success: true,
      message: isSuspicious 
        ? 'Withdrawal request submitted and flagged for security review. You will be contacted within 24-48 hours.'
        : 'Withdrawal request submitted successfully! Credits have been deducted and you will receive confirmation shortly.',
      requestId: withdrawalRequest.id,
      creditsDeducted: creditsToRequest,
      newCreditBalance: newCreditBalance,
      status: withdrawalRequest.status,
      estimatedProcessingTime: isSuspicious ? '24-72 hours (security review)' : '24-48 hours',
      securityInfo: {
        riskScore,
        isSuspicious,
        ...(riskReasons.length > 0 && { riskReasons })
      }
    })

  } catch (error) {
    console.error('Withdrawal request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Apply a simple wrapper limiter (3 req / 3s IP window via caseOpeningLimiter style is fine)
export const POST = withRateLimit({
  check: async (req: NextRequest) => {
    // Lightweight IP-based limiter using UserRateLimiter in a generic way
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown'
    await userRateLimiter.checkUser(ip, 'withdrawal')
  }
} as any, handler)

// Enhanced email notification function with security details
async function sendWithdrawalNotification(details: any) {
  const alertLevel = details.isSuspicious ? '🚨 SUSPICIOUS' : 
                     details.riskScore >= 50 ? '⚠️ HIGH RISK' :
                     details.riskScore >= 25 ? '⚡ MEDIUM RISK' : '✅ LOW RISK'
  
  console.log('📧 ENHANCED WITHDRAWAL NOTIFICATION:')
  console.log('=' .repeat(50))
  console.log(`🆔 Request ID: ${details.requestId}`)
  console.log(`👤 User: ${details.userWallet?.slice(0, 20)}...`)
  console.log(`💰 Amount: ${details.creditsRequested} credits ($${details.creditsValueUSD})`)
  console.log(`🎯 Item: ${details.symbolName} (${details.symbolRarity})`)
  console.log(`💳 Payment: ${details.paymentMethod}`)
  console.log(`📝 Details: ${details.paymentDetails}`)
  console.log('')
  console.log('🔐 SECURITY ANALYSIS:')
  console.log(`${alertLevel} - Risk Score: ${details.riskScore}/100`)
  console.log(`📊 Lifetime Purchased: ${details.lifetimePurchased} credits`)
  console.log(`📤 Lifetime Withdrawn: ${details.lifetimeWithdrawn} credits`)
  console.log(`💳 User Credits After: ${details.userCreditsAfter} credits`)
  if (details.riskReasons?.length > 0) {
    console.log('⚠️ Risk Factors:')
    details.riskReasons.forEach((reason: string) => console.log(`   • ${reason}`))
  }
  console.log('=' .repeat(50))
  
  // Send actual email here
  // Example with fetch to email service:
  /*
  try {
    await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: process.env.ADMIN_EMAIL }],
          subject: `🎰 New Withdrawal Request #${details.requestId}`
        }],
        from: { email: process.env.FROM_EMAIL },
        content: [{
          type: 'text/html',
          value: `
            <h2>New Withdrawal Request</h2>
            <p><strong>Request ID:</strong> ${details.requestId}</p>
            <p><strong>User:</strong> ${details.userWallet}</p>
            <p><strong>Type:</strong> ${details.withdrawalType}</p>
            <p><strong>Amount:</strong> ${details.amount} credits</p>
            <p><strong>Item:</strong> ${details.symbolName} (${details.symbolRarity})</p>
            <p><strong>Payment Method:</strong> ${details.paymentMethod}</p>
            <p><strong>Payment Details:</strong> ${details.paymentDetails}</p>
            
            <p>Please process this withdrawal within 24-48 hours.</p>
          `
        }]
      })
    })
  } catch (error) {
    console.error('Email sending failed:', error)
  }
  */
}
