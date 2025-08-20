import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getBearerToken, verifyUserToken } from '@/lib/userAuth'

export async function POST(request: NextRequest) {
  try {
    const { caseOpeningId, withdrawalType } = await request.json()

    const token = getBearerToken(request.headers.get('authorization'))
    const payload = token ? verifyUserToken(token) : null
    const userId = payload?.userId

    if (!userId || !caseOpeningId || !withdrawalType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get case opening data
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 })
    }

    const { data: caseOpening, error: openingError } = await supabaseAdmin
      .from('case_openings')
      .select('*, skins(*)')
      .eq('id', caseOpeningId)
      .eq('user_id', userId)
      .single()

    if (openingError || !caseOpening) {
      return NextResponse.json({ error: 'Case opening not found' }, { status: 404 })
    }

    if (caseOpening.is_withdrawn) {
      return NextResponse.json({ error: 'Already withdrawn' }, { status: 400 })
    }

    let responseData: any = { success: true, withdrawalType }

    if (withdrawalType === 'credits') {
      // Add credits to user balance via guarded RPC (idempotent)
      await supabaseAdmin.from('balances').upsert({ user_id: userId, amount: 0 })
      const idemKey = `withdraw:legacy:${caseOpeningId}`
      const { error: eventErr } = await supabaseAdmin
        .from('credit_events')
        .insert({ user_id: userId, delta: caseOpening.credits_won, reason: 'legacy_withdrawal_credit', key: idemKey })
      if (!eventErr) {
        await supabaseAdmin
          .rpc('apply_credit_delta_guarded', { p_user_id: userId, p_delta: caseOpening.credits_won })
      }
      // Maintain total_won stat
      // Increment total_won from users table
      const { data: userStats } = await supabaseAdmin
        .from('users')
        .select('total_won')
        .eq('id', userId)
        .single()
      await supabaseAdmin
        .from('users')
        .update({ total_won: (userStats?.total_won || 0) + (caseOpening.credits_won || 0) })
        .eq('id', userId)

      responseData.creditsAdded = caseOpening.credits_won

    } else if (withdrawalType === 'nft') {
      // Simulate NFT minting
      const tokenId = Date.now().toString()
      const contractAddress = '0x1234567890123456789012345678901234567890'
      const openseaUrl = `https://opensea.io/assets/ethereum/${contractAddress}/${tokenId}`

      // Add to user inventory
      await supabaseAdmin
        .from('user_inventory')
        .insert({
          user_id: userId,
          skin_id: caseOpening.skin_id,
          case_opening_id: caseOpeningId,
          is_nft: true,
          nft_token_id: tokenId,
          nft_contract_address: contractAddress,
          opensea_url: openseaUrl
        })

      responseData.nft = {
        tokenId,
        contractAddress,
        openseaUrl
      }
    }

    // Mark as withdrawn
    await supabaseAdmin
      .from('case_openings')
      .update({
        is_withdrawn: true,
        withdrawal_type: withdrawalType,
        nft_token_id: withdrawalType === 'nft' ? responseData.nft?.tokenId : null
      })
      .eq('id', caseOpeningId)

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Withdrawal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 