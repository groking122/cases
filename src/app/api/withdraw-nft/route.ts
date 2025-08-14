import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { userRateLimiter } from '@/lib/rate-limit.js'
import { mintSkinNFT } from '@/lib/mintNft'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'DB not available' }, { status: 500 })

    // We'll check with the real user id after parsing the body

    const idempKey = request.headers.get('Idempotency-Key')
    if (!idempKey) return NextResponse.json({ error: 'Missing Idempotency-Key' }, { status: 400 })

    const { caseOpeningId, userId } = await request.json()
    if (!caseOpeningId || !userId) {
      return NextResponse.json({ error: 'Missing caseOpeningId or userId' }, { status: 400 })
    }

    await userRateLimiter.checkUser(userId, 'withdrawal')

    // Load opening (no joins to avoid schema FK requirements)
    const { data: opening, error: openingErr } = await supabaseAdmin
      .from('case_openings')
      .select('id, user_id, symbol_id, symbol_name, symbol_rarity, reward_value, is_withdrawn, nft_entitled')
      .eq('id', caseOpeningId)
      .eq('user_id', userId)
      .single()

    if (openingErr || !opening) return NextResponse.json({ error: 'Opening not found' }, { status: 404 })
    if (opening.is_withdrawn) return NextResponse.json({ error: 'Already withdrawn' }, { status: 400 })

    // Load user wallet address
    const { data: userRow, error: userErr } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', userId)
      .single()
    if (userErr || !userRow?.wallet_address) return NextResponse.json({ error: 'User wallet missing' }, { status: 400 })
    const toAddress = userRow.wallet_address as string

    // Load symbol eligibility and image
    const { data: symbolRow, error: symbolErr } = await supabaseAdmin
      .from('symbols')
      .select('id, image_url, withdrawable')
      .eq('id', opening.symbol_id)
      .single()
    if (symbolErr || !symbolRow) return NextResponse.json({ error: 'Symbol not found' }, { status: 400 })
    const imageUrl = symbolRow.image_url as string | null
    if (!imageUrl) return NextResponse.json({ error: 'Item has no image to mint' }, { status: 400 })
    const eligible = (symbolRow.withdrawable === true) || (opening.nft_entitled === true) || ((opening.reward_value || 0) >= 500)
    if (!eligible) {
      return NextResponse.json({ error: 'Item not eligible for NFT withdrawal' }, { status: 400 })
    }

    // Create withdrawal row (unique on case_opening_id prevents duplicates)
    const { data: withdrawRow, error: wErr } = await supabaseAdmin
      .from('withdrawals')
      .insert({
        case_opening_id: opening.id,
        user_id: opening.user_id,
        type: 'nft',
        status: 'processing'
      })
      .select()
      .single()

    if (wErr) {
      // if duplicate (already exists), fetch its status
      const { data: existing } = await supabaseAdmin
        .from('withdrawals')
        .select('*')
        .eq('case_opening_id', opening.id)
        .single()
      if (existing) {
        return NextResponse.json({ success: true, request: existing })
      }
      return NextResponse.json({ error: 'Failed to create withdrawal' }, { status: 500 })
    }

    // Perform mint (blocking for now; can be moved to background worker)
    const { txHash, assetUnit, policyId } = await mintSkinNFT({
      toAddress,
      name: opening.symbol_name,
      image: imageUrl,
      rarity: opening.symbol_rarity,
      value: opening.reward_value,
      caseOpeningId: opening.id
    })

    // Mark opening withdrawn and finalize withdrawal
    await supabaseAdmin.from('case_openings')
      .update({
        is_withdrawn: true,
        withdrawal_type: 'nft',
        withdrawal_tx_hash: txHash,
        withdrawal_timestamp: new Date().toISOString(),
        withdrawal_data: { policyId, assetUnit }
      })
      .eq('id', opening.id)

    const { data: updated } = await supabaseAdmin
      .from('withdrawals')
      .update({ status: 'complete', tx_hash: txHash, asset_unit: assetUnit, updated_at: new Date().toISOString() })
      .eq('id', withdrawRow.id)
      .select()
      .single()

    return NextResponse.json({ success: true, request: updated, txHash, assetUnit })
  } catch (e: any) {
    console.error('withdraw-nft error', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}


