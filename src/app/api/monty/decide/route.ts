import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { withUserAuth } from '@/lib/mw/withUserAuth'
import { MONTY } from '@/config/games'
import { applyCredit } from '@/lib/credits/applyCredit'

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

    let payout = finalDoor === s.winning_door ? MONTY.payouts.car : MONTY.payouts.goat
    const isPity = false

    await applyCredit(s.user_id, BigInt(payout), 'win:monty', undefined)

    const { error: e2 } = await supabaseAdmin
      .from('monty_sessions')
      .update({
        did_switch: !!doSwitch,
        final_door: finalDoor,
        payout,
        is_settled: true,
        settled_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

    return NextResponse.json({
      finalDoor,
      payout,
      isWin: payout >= MONTY.cost,
      isPityActivated: isPity,
      serverSeed: s.server_seed,
      serverSeedHash: s.server_seed_hash,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'decide_failed' }, { status: 500 })
  }
}

export const POST = withUserAuth(handler as any)


