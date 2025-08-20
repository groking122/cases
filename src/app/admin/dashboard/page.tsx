'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAdminMetrics, type MetricsResponse } from '@/lib/admin/fetchMetrics'

const toPretty = (s: string) => {
  try {
    return BigInt(s).toLocaleString()
  } catch {
    return s
  }
}

export default function AdminDashboard() {
  const [data, setData] = useState<MetricsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ts, setTs] = useState<string>('')

  async function load() {
    setLoading(true)
    const res = await fetchAdminMetrics()
    if (!res.success) {
      setError(res.error)
      setData(null)
    } else {
      setError(null)
      setData(res)
      setTs(res.timestamp)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [])

  const credits = (data && 'success' in data && data.success) ? data.data.credits24h : null
  const wd = (data && 'success' in data && data.success) ? data.data.withdrawals : null
  const integrity = (data && 'success' in data && data.success) ? data.data.integrity : null

  const winners = useMemo(() => credits?.topWinners?.slice(0, 5) ?? [], [credits])
  const losers = useMemo(() => credits?.topLosers?.slice(0, 5) ?? [], [credits])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Metrics</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="px-3 py-1.5 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <span className="text-xs text-gray-500">as of {ts ? new Date(ts).toLocaleTimeString() : '—'}</span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error} — Are you logged in as admin? (Token might be missing/expired.)
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Net (24h)" value={credits ? toPretty(credits.net) : '—'} />
        <KpiCard label="Inflow (24h)" value={credits ? toPretty(credits.inflow) : '—'} />
        <KpiCard label="Outflow (24h)" value={credits ? toPretty(credits.outflow) : '—'} />
        <KpiCard label="Expired nonces" value={integrity ? String(integrity.expiredNonces) : '—'} />
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SmallStat label="Bets (24h)" value={credits ? toPretty(credits.breakdown.bets) : '—'} />
        <SmallStat label="Wins (24h)" value={credits ? toPretty(credits.breakdown.wins) : '—'} />
        <SmallStat label="Deposits (24h)" value={credits ? toPretty(credits.breakdown.deposits) : '—'} />
        <SmallStat label="Withdrawals (24h)" value={credits ? toPretty(credits.breakdown.withdrawals) : '—'} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 rounded-2xl border p-4 shadow-sm">
          <div className="mb-3 text-sm font-medium">Pending withdrawals</div>
          <div className="flex items-end gap-6">
            <div>
              <div className="text-3xl font-semibold">{wd ? wd.pendingCount : '—'}</div>
              <div className="text-xs text-gray-500">count</div>
            </div>
            <div>
              <div className="text-3xl font-semibold">{wd ? wd.pendingSum.toLocaleString() : '—'}</div>
              <div className="text-xs text-gray-500">sum (credits)</div>
            </div>
          </div>
          {wd?.oldest && (
            <div className="mt-4 text-xs text-gray-600">
              Oldest: <span className="font-mono">{wd.oldest.id}</span> • {new Date(wd.oldest.created_at).toLocaleString()}
            </div>
          )}
        </div>

        <div className="rounded-2xl border p-4 shadow-sm">
          <div className="mb-3 text-sm font-medium">Top winners (24h)</div>
          <MoverList rows={winners} />
        </div>
        <div className="rounded-2xl border p-4 shadow-sm">
          <div className="mb-3 text-sm font-medium">Top losers (24h)</div>
          <MoverList rows={losers} negative />
        </div>
      </section>
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold">{value}</div>
    </div>
  )
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  )
}

function MoverList({ rows, negative = false }: { rows: { user_id: string; net: string }[]; negative?: boolean }) {
  if (!rows?.length) return <div className="text-sm text-gray-500">No data</div>
  return (
    <div className="divide-y">
      {rows.map((r) => (
        <div key={r.user_id} className="py-2 flex items-center justify-between">
          <div className="font-mono text-xs truncate mr-2">{r.user_id}</div>
          <div className={`text-sm font-medium ${negative ? 'text-red-600' : 'text-emerald-600'}`}>
            {(() => {
              try {
                return BigInt(r.net).toLocaleString()
              } catch {
                return r.net
              }
            })()}
          </div>
        </div>
      ))}
    </div>
  )
}


