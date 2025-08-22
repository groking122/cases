import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/adminAuth'

type MetricsPayload = {
  window: string
  rtp: Array<{ caseId: string; caseName?: string; spins: number; totalCost: number; totalReward: number; rtp: number; houseEdge: number }>
  pity: Array<{ caseId: string; spins: number; pityRate: number; rtp: number }>
  flow: { purchases: number; winnings_credited: number; withdrawals_gross: number; withdrawals_net: number; platform_fees: number; network_fees: number }
  withdrawals: { pending: number; processing: number; sent: number; failed: number; median_payout_minutes: number; avg_payout_minutes: number }
  generatedAt: string
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminToken(request, ['view_analytics'])
    if (!auth.success) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
    }
    if (!supabase) {
      return NextResponse.json({ error: 'Database configuration error' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const hours = Math.max(1, Math.min(24 * 30, Number(searchParams.get('hours') || 24)))
    const startIso = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    const endIso = new Date().toISOString()

    let rtp: MetricsPayload['rtp'] = []
    let pity: MetricsPayload['pity'] = []
    let flow: MetricsPayload['flow'] = {
      purchases: 0,
      winnings_credited: 0,
      withdrawals_gross: 0,
      withdrawals_net: 0,
      platform_fees: 0,
      network_fees: 0,
    }
    let withdrawals: MetricsPayload['withdrawals'] = {
      pending: 0,
      processing: 0,
      sent: 0,
      failed: 0,
      median_payout_minutes: 0,
      avg_payout_minutes: 0,
    }

    try {
      const res = await supabase.rpc('kpi_rtp', { start_ts: startIso, end_ts: endIso })
      const rows = Array.isArray(res.data) ? res.data : []
      rtp = rows.map((r: any) => ({
        caseId: String(r.case_id ?? r.caseId ?? ''),
        caseName: r.case_name ?? r.caseName ?? undefined,
        spins: Number(r.spins ?? 0),
        totalCost: Number(r.total_cost ?? r.totalCost ?? 0),
        totalReward: Number(r.total_reward ?? r.totalReward ?? 0),
        rtp: Number(r.rtp ?? 0),
        houseEdge: Number(r.house_edge ?? r.houseEdge ?? 0),
      }))
    } catch (e) {
      console.error('kpi_rtp error:', e)
    }

    try {
      const res = await supabase.rpc('kpi_pity', { start_ts: startIso, end_ts: endIso })
      const rows = Array.isArray(res.data) ? res.data : []
      pity = rows.map((p: any) => ({
        caseId: String(p.case_id ?? p.caseId ?? ''),
        spins: Number(p.spins ?? 0),
        pityRate: Number(p.pity_rate ?? p.pityRate ?? 0),
        rtp: Number(p.rtp ?? 0),
      }))
    } catch (e) {
      console.error('kpi_pity error:', e)
    }

    try {
      const res = await supabase.rpc('kpi_credit_flow', { start_ts: startIso, end_ts: endIso })
      const obj = res.data && Array.isArray(res.data) ? res.data[0] : res.data
      if (obj) {
        flow = {
          purchases: Number(obj.purchases ?? 0),
          winnings_credited: Number(obj.winnings_credited ?? 0),
          withdrawals_gross: Number(obj.withdrawals_gross ?? 0),
          withdrawals_net: Number(obj.withdrawals_net ?? 0),
          platform_fees: Number(obj.platform_fees ?? 0),
          network_fees: Number(obj.network_fees ?? 0),
        }
      }
    } catch (e) {
      console.error('kpi_credit_flow error:', e)
    }

    try {
      const res = await supabase.rpc('kpi_withdrawals', { start_ts: startIso, end_ts: endIso })
      const obj = res.data && Array.isArray(res.data) ? res.data[0] : res.data
      if (obj) {
        withdrawals = {
          pending: Number(obj.pending ?? 0),
          processing: Number(obj.processing ?? 0),
          sent: Number(obj.sent ?? 0),
          failed: Number(obj.failed ?? 0),
          median_payout_minutes: Number(obj.median_payout_minutes ?? 0),
          avg_payout_minutes: Number(obj.avg_payout_minutes ?? 0),
        }
      }
    } catch (e) {
      console.error('kpi_withdrawals error:', e)
    }

    const payload: MetricsPayload = {
      window: `last_${hours}h`,
      rtp,
      pity,
      flow,
      withdrawals,
      generatedAt: new Date().toISOString(),
    }

    return NextResponse.json(payload)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}

