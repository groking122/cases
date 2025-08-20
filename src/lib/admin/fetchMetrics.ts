// Small client-side fetcher that attaches the admin JWT.
// It checks localStorage('admin_token') first, then cookie fallback.

export type MetricsResponse =
  | {
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
        integrity: { expiredNonces: number }
      }
      timestamp: string
    }
  | { success: false; error: string; timestamp: string }

function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null
  const ls = window.localStorage?.getItem('admin_token')
  if (ls) return ls
  const m = document.cookie.match(/(?:^|; )admin_token=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : null
}

export async function fetchAdminMetrics(): Promise<MetricsResponse> {
  const token = getAdminToken()
  const res = await fetch('/api/admin/metrics', {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store'
  })
  try {
    return (await res.json()) as MetricsResponse
  } catch {
    return { success: false, error: `Bad response (${res.status})`, timestamp: new Date().toISOString() }
  }
}


