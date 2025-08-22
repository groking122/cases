"use client"

import { useEffect, useMemo, useState } from 'react'

type MetricsPayload = {
  window: string
  rtp: Array<{ caseId: string; caseName?: string; spins: number; totalCost: number; totalReward: number; rtp: number; houseEdge: number }>
  pity: Array<{ caseId: string; spins: number; pityRate: number; rtp: number }>
  flow: { purchases: number; winnings_credited: number; withdrawals_gross: number; withdrawals_net: number; platform_fees: number; network_fees: number }
  withdrawals: { pending: number; processing: number; sent: number; failed: number; median_payout_minutes: number; avg_payout_minutes: number }
  generatedAt: string
}

function fmtAda(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtPct(x: number) {
  return `${(x * 100).toFixed(2)}%`
}

export default function AdminMetrics() {
  const [hours, setHours] = useState<number>(24)
  const [data, setData] = useState<MetricsPayload | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async (h: number) => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/admin/metrics?hours=${h}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || ''}` },
        cache: 'no-store',
      })
      if (res.status === 401) {
        // In dev, ADMIN_DEV_BYPASS can allow server-side; still handle denied
        setError('Unauthorized')
        setData(null)
        return
      }
      const json: any = await res.json().catch(() => null)
      if (!json) {
        setError('Invalid response')
        setData(null)
        return
      }
      // Accept either the new payload or a legacy envelope
      const payload: MetricsPayload | null = json.window && json.generatedAt
        ? json as MetricsPayload
        : (json.success && json.data
          ? {
              window: `last_${h}h`,
              rtp: Array.isArray(json.data.rtp) ? json.data.rtp.map((r: any) => ({
                caseId: String(r.case_id ?? r.caseId ?? ''),
                caseName: r.case_name ?? r.caseName ?? undefined,
                spins: Number(r.spins ?? 0),
                totalCost: Number(r.total_cost ?? r.totalCost ?? 0),
                totalReward: Number(r.total_reward ?? r.totalReward ?? 0),
                rtp: Number(r.rtp ?? 0),
                houseEdge: Number(r.house_edge ?? r.houseEdge ?? 0),
              })) : [],
              pity: Array.isArray(json.data.pity) ? json.data.pity.map((p: any) => ({
                caseId: String(p.case_id ?? p.caseId ?? ''),
                spins: Number(p.spins ?? 0),
                pityRate: Number(p.pity_rate ?? p.pityRate ?? 0),
                rtp: Number(p.rtp ?? 0),
              })) : [],
              flow: json.data.flow || { purchases: 0, winnings_credited: 0, withdrawals_gross: 0, withdrawals_net: 0, platform_fees: 0, network_fees: 0 },
              withdrawals: json.data.withdrawalsOps || { pending: 0, processing: 0, sent: 0, failed: 0, median_payout_minutes: 0, avg_payout_minutes: 0 },
              generatedAt: new Date().toISOString(),
            }
          : null)

      if (!payload) {
        setError('Unexpected response shape')
        setData(null)
        return
      }
      setData(payload)
    } catch (e: any) {
      setError(e?.message || 'Failed to load metrics')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(hours)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours])

  const rtpRows = useMemo(() => {
    const rows = data?.rtp || []
    return [...rows].sort((a, b) => b.spins - a.spins)
  }, [data])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Metrics</h2>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-foreground/70">Window:</label>
          <select
            className="bg-card border border-border rounded px-3 py-1 text-sm"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
          >
            <option value={6}>Last 6h</option>
            <option value={24}>Last 24h</option>
            <option value={168}>Last 7d</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-foreground/70">Loading metrics…</div>
      )}
      {error && (
        <div className="text-sm text-red-400">{error}</div>
      )}

      {/* Cases RTP */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Cases RTP</h3>
          <div className="text-xs text-foreground/60">Highlight when RTP &gt; 95%</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-foreground/70">
              <tr>
                <th className="text-left py-2">Case</th>
                <th className="text-right py-2">Spins</th>
                <th className="text-right py-2">RTP%</th>
                <th className="text-right py-2">Edge%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rtpRows.map((r) => (
                <tr key={r.caseId} className={r.rtp > 0.95 ? 'bg-red-950/20' : ''}>
                  <td className="py-2">{r.caseName || r.caseId}</td>
                  <td className="py-2 text-right">{r.spins.toLocaleString()}</td>
                  <td className={`py-2 text-right ${r.rtp > 0.95 ? 'text-red-400' : ''}`}>{fmtPct(r.rtp)}</td>
                  <td className="py-2 text-right">{fmtPct(r.houseEdge)}</td>
                </tr>
              ))}
              {(!data || data.rtp.length === 0) && !loading && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-foreground/60">No data for this window</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pity monitor */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Pity monitor</h3>
          <div className="text-xs text-foreground/60">Highlight when Pity &gt; 2.2%</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-foreground/70">
              <tr>
                <th className="text-left py-2">Case</th>
                <th className="text-right py-2">Spins</th>
                <th className="text-right py-2">Pity%</th>
                <th className="text-right py-2">RTP%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data?.pity || []).map((p) => (
                <tr key={p.caseId} className={p.pityRate > 0.022 ? 'bg-orange-900/20' : ''}>
                  <td className="py-2">{p.caseId}</td>
                  <td className="py-2 text-right">{p.spins.toLocaleString()}</td>
                  <td className={`py-2 text-right ${p.pityRate > 0.022 ? 'text-orange-400' : ''}`}>{fmtPct(p.pityRate)}</td>
                  <td className={`py-2 text-right ${p.rtp > 0.95 ? 'text-red-400' : ''}`}>{fmtPct(p.rtp)}</td>
                </tr>
              ))}
              {(!data || data.pity.length === 0) && !loading && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-foreground/60">No data for this window</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Credit flow */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-lg font-semibold mb-2">Credit flow</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <div className="bg-muted/30 border border-border rounded p-3">
            <div className="text-xs text-foreground/70">Purchases (ADA)</div>
            <div className="text-lg font-semibold">{fmtAda(data?.flow.purchases || 0)}</div>
          </div>
          <div className="bg-muted/30 border border-border rounded p-3">
            <div className="text-xs text-foreground/70">Withdrawals Net (ADA)</div>
            <div className="text-lg font-semibold">{fmtAda(data?.flow.withdrawals_net || 0)}</div>
          </div>
          <div className="bg-muted/30 border border-border rounded p-3">
            <div className="text-xs text-foreground/70">Platform Fees (ADA)</div>
            <div className="text-lg font-semibold">{fmtAda(data?.flow.platform_fees || 0)}</div>
          </div>
        </div>
        {!data && !loading && (
          <div className="text-sm text-foreground/60 mt-3">No data for this window</div>
        )}
      </div>

      {/* Withdraw ops */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-lg font-semibold mb-2">Withdraw operations</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="bg-muted/30 border border-border rounded p-3"><div className="text-xs">Pending</div><div className="text-lg font-bold">{data?.withdrawals.pending ?? 0}</div></div>
          <div className="bg-muted/30 border border-border rounded p-3"><div className="text-xs">Processing</div><div className="text-lg font-bold">{data?.withdrawals.processing ?? 0}</div></div>
          <div className="bg-muted/30 border border-border rounded p-3"><div className="text-xs">Sent</div><div className="text-lg font-bold">{data?.withdrawals.sent ?? 0}</div></div>
          <div className="bg-muted/30 border border-border rounded p-3"><div className="text-xs">Failed</div><div className="text-lg font-bold">{data?.withdrawals.failed ?? 0}</div></div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm mt-3">
          <div className="bg-muted/30 border border-border rounded p-3"><div className="text-xs">Median payout (min)</div><div className="text-lg font-bold">{(data?.withdrawals.median_payout_minutes ?? 0).toFixed ? (data?.withdrawals.median_payout_minutes as any).toFixed(1) : Number(data?.withdrawals.median_payout_minutes || 0).toFixed(1)}</div></div>
          <div className="bg-muted/30 border border-border rounded p-3"><div className="text-xs">Average payout (min)</div><div className="text-lg font-bold">{(data?.withdrawals.avg_payout_minutes ?? 0).toFixed ? (data?.withdrawals.avg_payout_minutes as any).toFixed(1) : Number(data?.withdrawals.avg_payout_minutes || 0).toFixed(1)}</div></div>
        </div>
      </div>
    </div>
  )
}


