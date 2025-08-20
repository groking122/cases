import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { withAdminAuth } from '@/lib/adminAuth'

// GET /api/metrics/pity?hours=24
// Returns per-case metrics: spins, RTP, houseEdge, pityRate, avgLossStreakAtPity
export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const hours = Math.max(1, Math.min(168, Number(searchParams.get('hours') || '24')))
    const sinceIso = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabaseAdmin
      .from('case_openings')
      .select('case_id, case_cost, reward_value, is_pity_activated, loss_streak, created_at')
      .gte('created_at', sinceIso)

    if (error) {
      return NextResponse.json({ error: 'Query failed', details: error.message }, { status: 500 })
    }

    const byCase: Record<string, {
      spins: number
      totalCost: number
      totalReward: number
      pity: number
      lossStreakSumAtPity: number
    }> = {}

    for (const row of data || []) {
      const cid = row.case_id as string
      if (!byCase[cid]) byCase[cid] = { spins: 0, totalCost: 0, totalReward: 0, pity: 0, lossStreakSumAtPity: 0 }
      const bucket = byCase[cid]
      bucket.spins += 1
      bucket.totalCost += Number(row.case_cost || 0)
      bucket.totalReward += Number(row.reward_value || 0)
      if (row.is_pity_activated) {
        bucket.pity += 1
        bucket.lossStreakSumAtPity += Number(row.loss_streak || 0)
      }
    }

    const perCase = Object.entries(byCase).map(([caseId, b]) => {
      const rtp = b.totalReward / (b.totalCost || 1)
      const pityRate = b.pity / (b.spins || 1)
      const avgLossStreakAtPity = b.pity > 0 ? (b.lossStreakSumAtPity / b.pity) : null
      return {
        caseId,
        spins: b.spins,
        rtp,
        houseEdge: 1 - rtp,
        pityRate,
        avgLossStreakAtPity,
        totals: { cost: b.totalCost, reward: b.totalReward, pity: b.pity }
      }
    })

    const totals = perCase.reduce((acc, r) => {
      acc.spins += r.spins
      acc.cost += r.totals.cost
      acc.reward += r.totals.reward
      acc.pity += r.totals.pity
      return acc
    }, { spins: 0, cost: 0, reward: 0, pity: 0 })

    const overallRtp = totals.reward / (totals.cost || 1)
    const overall = {
      spins: totals.spins,
      rtp: overallRtp,
      houseEdge: 1 - overallRtp,
      pityRate: totals.spins > 0 ? (totals.pity / totals.spins) : 0
    }

    return NextResponse.json({ windowHours: hours, perCase, overall })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'unknown' }, { status: 500 })
  }
})


