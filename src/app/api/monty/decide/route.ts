import { NextResponse } from 'next/server'
import { withUserAuth } from '@/lib/mw/withUserAuth'
// Defaults in case DB settings are unavailable
const DEFAULT_COST = 100
const DEFAULT_WIN = 118
const DEFAULT_LOSE = 40
import { applyCredit } from '@/lib/credits/applyCredit'
import { supabaseAdmin } from '@/lib/supabase'
import { randomUUID } from 'crypto'

// Pity disabled per request

async function handler(request: any) {
  try {
    const userId = (request as any)?.user?.id
    const { sessionId, switch: doSwitch } = await request.json()
    if (!sessionId || typeof doSwitch !== 'boolean') return NextResponse.json({ error: 'bad_request' }, { status: 400 })
    if (!supabaseAdmin) return NextResponse.json({ error: 'Database configuration error' }, { status: 500 })
    const sb = supabaseAdmin

    const { data: s, error } = await sb
      .from('monty_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
    if (error || !s) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (s.user_id !== userId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    if (s.is_settled) return NextResponse.json({ error: 'session_settled' }, { status: 400 })
    if (s.first_pick == null || s.reveal_door == null) return NextResponse.json({ error: 'no_first_pick' }, { status: 400 })

    const unopened = [0, 1, 2].filter((d) => d !== s.first_pick && d !== s.reveal_door)
    const switchedDoor = unopened[0]
    const finalDoor = doSwitch ? switchedDoor : s.first_pick

    // Load settings (fallback to defaults)
    let cost = DEFAULT_COST
    let win = DEFAULT_WIN
    let lose = DEFAULT_LOSE
    try {
      if (supabaseAdmin) {
        const { data } = await supabaseAdmin.from('monty_settings').select('cost,payout_win,payout_lose').limit(1).maybeSingle()
        if (data) {
          if (typeof data.cost === 'number' && data.cost > 0) cost = data.cost
          if (typeof data.payout_win === 'number') win = data.payout_win
          if (typeof data.payout_lose === 'number') lose = data.payout_lose
        }
      }
    } catch {}

    let payout = finalDoor === s.winning_door ? win : lose
    const isPity = false

    // Credit + settle atomically
    const winKey = request.headers?.get?.('idempotency-key') || `monty:${sessionId}` || randomUUID()
    const { error: settleErr } = await supabaseAdmin.rpc('monty_settle_atomic', {
      p_session_id: sessionId,
      p_user_id: s.user_id,
      p_payout: payout,
      p_idem_key: winKey,
    })
    if (settleErr) return NextResponse.json({ error: settleErr.message }, { status: 500 })

    return NextResponse.json({
      finalDoor,
      payout,
      isWin: payout >= cost,
      isPityActivated: isPity,
      serverSeed: s.server_seed,
      serverSeedHash: s.server_seed_hash,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'decide_failed' }, { status: 500 })
  }
}

export const POST = withUserAuth(handler as any)


