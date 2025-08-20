import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/adminAuth'

type MetricsResponse = {
  success: true
  data: {
    credits24h: {
      net: string
      inflow: string
      outflow: string
      breakdown: { bets: string; wins: string; deposits: string; withdrawals: string }
      topWinners: { user_id: string; net: string }[]
      topLosers: { user_id: string; net: string }[]
    }
    withdrawals: {
      pendingCount: number
      pendingSum: number
      oldest?: { id: string; user_id: string; credits_requested: number; created_at: string }
    }
    integrity: {
      expiredNonces: number
    }
  }
  timestamp: string
} | { success: false; error: string; timestamp: string }

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminToken(request, ['view_analytics'])
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized', timestamp: new Date().toISOString() }, { status: 401 })
    }
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database configuration error', timestamp: new Date().toISOString() }, { status: 500 })
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Fetch last 24h credit_events (bounded volume)
    const { data: ce, error: ceErr } = await supabase
      .from('credit_events')
      .select('user_id, delta, reason, created_at')
      .gte('created_at', since)
    if (ceErr) throw ceErr

    let bets = 0n,
      wins = 0n,
      deposits = 0n,
      withdrawals = 0n,
      inflow = 0n,
      outflow = 0n
    const byUser = new Map<string, bigint>()

    for (const row of ce || []) {
      const delta = BigInt(String((row as any).delta ?? 0))
      const reason = String((row as any).reason ?? '')
      if (reason.startsWith('bet:')) bets += delta
      else if (reason.startsWith('win:')) wins += delta
      else if (reason.startsWith('purchase:') || reason.startsWith('recover:') || reason.startsWith('sell:')) deposits += delta
      else if (reason.startsWith('withdraw:')) withdrawals += delta

      if (delta >= 0n) inflow += delta
      else outflow += delta

      const uid = String((row as any).user_id)
      byUser.set(uid, (byUser.get(uid) || 0n) + delta)
    }

    const movers = Array.from(byUser.entries()).map(([user_id, net]) => ({ user_id, net }))
    const topWinners = movers.sort((a, b) => (b.net > a.net ? 1 : -1)).slice(0, 10).map(m => ({ user_id: m.user_id, net: m.net.toString() }))
    const topLosers = movers.sort((a, b) => (a.net > b.net ? 1 : -1)).slice(0, 10).map(m => ({ user_id: m.user_id, net: m.net.toString() }))

    // Withdrawals (pending)
    const { data: pendingRows } = await supabase
      .from('withdrawal_requests')
      .select('id, user_id, credits_requested, status, created_at')
      .eq('status', 'pending')

    const pendingCount = pendingRows?.length || 0
    const pendingSum = (pendingRows || []).reduce((a, r: any) => a + (r.credits_requested || 0), 0)
    let oldest: any = undefined
    if (pendingRows && pendingRows.length > 0) {
      pendingRows.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      const r = pendingRows[0]
      oldest = { id: r.id, user_id: r.user_id, credits_requested: r.credits_requested, created_at: r.created_at }
    }

    // Integrity: expired nonces (cleanup signal)
    const { data: nonceRows } = await supabase
      .from('wallet_nonces')
      .select('expires_at')
      .lt('expires_at', new Date().toISOString())
    const expiredNonces = nonceRows?.length || 0

    const body: MetricsResponse = {
      success: true,
      data: {
        credits24h: {
          net: (inflow + outflow).toString(),
          inflow: inflow.toString(),
          outflow: outflow.toString(),
          breakdown: {
            bets: bets.toString(),
            wins: wins.toString(),
            deposits: deposits.toString(),
            withdrawals: withdrawals.toString(),
          },
          topWinners,
          topLosers,
        },
        withdrawals: {
          pendingCount,
          pendingSum,
          oldest,
        },
        integrity: {
          expiredNonces,
        },
      },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(body)
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Internal error', timestamp: new Date().toISOString() }, { status: 500 })
  }
}


