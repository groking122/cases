import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/supabase'

function validateTrue(cost: number, win: number, lose: number) {
  const ev = (2 / 3) * win + (1 / 3) * lose
  const rtp = ev / cost
  if (rtp >= 1) throw new Error(`RTP too high: ${(rtp * 100).toFixed(2)}%`)
  return { ev, rtp }
}

function validateCosmetic(cost: number, win: number, lose: number) {
  const ev = (1 / 3) * win + (2 / 3) * lose
  const rtp = ev / cost
  if (rtp >= 1) throw new Error(`RTP too high: ${(rtp * 100).toFixed(2)}%`)
  return { ev, rtp }
}

export const GET = withAdminAuth(async () => {
  if (!supabaseAdmin) return NextResponse.json({ success: false, error: 'DB config' }, { status: 500 })
  const { data, error } = await supabaseAdmin.from('monty_settings').select('*').limit(1).maybeSingle()
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  const row: any = data || { is_true_monty: true, cost: 100, payout_win: 118, payout_lose: 40 }
  const { ev, rtp } = (row.is_true_monty ? validateTrue : validateCosmetic)(row.cost, row.payout_win, row.payout_lose)
  return NextResponse.json({ success: true, data: row, ev, rtp })
})

export const POST = withAdminAuth(async (request: NextRequest, user) => {
  try {
    if (!supabaseAdmin) return NextResponse.json({ success: false, error: 'DB config' }, { status: 500 })
    const body = await request.json().catch(() => ({}))
    const isTrue = Boolean(body?.is_true_monty)
    const cost = Number(body?.cost ?? 100)
    const win = Number(body?.payout_win ?? 118)
    const lose = Number(body?.payout_lose ?? 40)
    if (!Number.isFinite(cost) || !Number.isFinite(win) || !Number.isFinite(lose) || cost <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid inputs' }, { status: 400 })
    }
    const { ev, rtp } = (isTrue ? validateTrue : validateCosmetic)(cost, win, lose)
    const { error } = await supabaseAdmin.from('monty_settings').upsert({
      id: (body?.id || undefined) as string | undefined,
      is_true_monty: isTrue,
      cost,
      payout_win: win,
      payout_lose: lose,
      updated_by: user.userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, ev, rtp })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'update_failed' }, { status: 500 })
  }
})


