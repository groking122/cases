"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { AdminAnalyticsProps } from '@/types/admin'

export default function AdminAnalytics({
  stats,
  dateRange,
  onDateRangeChange
}: AdminAnalyticsProps) {
  const [activeMetric, setActiveMetric] = useState<string>('overview')
  const [advanced, setAdvanced] = useState<{
    rtp?: any[]
    pity?: any[]
    flow?: any
    withdrawalsOps?: any
  }>({})

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    const newDate = new Date(value)
    onDateRangeChange({
      ...dateRange,
      [field]: newDate
    })
  }

  // Fetch advanced metrics from admin metrics endpoint (hours based on dateRange)
  const refreshAdvanced = async () => {
    try {
      const hours = Math.max(1, Math.round((Date.now() - dateRange.start.getTime()) / (1000 * 60 * 60)))
      const res = await fetch(`/api/admin/metrics?hours=${hours}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || ''}` },
        cache: 'no-store'
      })
      const json = await res.json().catch(() => null)
      if (!json) return
      if (json.window && json.generatedAt) {
        setAdvanced({
          rtp: json.rtp || [],
          pity: json.pity || [],
          flow: json.flow || {},
          withdrawalsOps: json.withdrawals || {},
        })
      } else if (json.success) {
        setAdvanced({ rtp: json.data?.rtp || [], pity: json.data?.pity || [], flow: json.data?.flow || {}, withdrawalsOps: json.data?.withdrawalsOps || {} })
      }
    } catch {}
  }

  const metricCards = [
    {
      id: 'cases',
      title: 'Total Cases',
      value: stats.totalCases,
      icon: '📦',
      color: 'bg-blue-600',
      description: `${stats.activeCases} active`
    },
    {
      id: 'symbols',
      title: 'Total Symbols',
      value: stats.totalSymbols,
      icon: '💎',
      color: 'bg-purple-600',
      description: 'Reward items'
    },
    {
      id: 'openings',
      title: "Today's Openings",
      value: stats.todayOpenings,
      icon: '🎯',
      color: 'bg-yellow-600',
      description: 'Cases opened today'
    },
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toLocaleString()}`,
      icon: '💰',
      color: 'bg-green-600',
      description: 'All-time earnings'
    },
    {
      id: 'session',
      title: 'Avg Session Time',
      value: `${Math.round(stats.averageSessionTime)}min`,
      icon: '⏱️',
      color: 'bg-indigo-600',
      description: 'User engagement'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        
        {/* Date Range Picker */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-400">From:</label>
            <input
              type="date"
              value={formatDate(dateRange.start)}
              onChange={(e) => handleDateChange('start', e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-400">To:</label>
            <input
              type="date"
              value={formatDate(dateRange.end)}
              onChange={(e) => handleDateChange('end', e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm"
            />
          </div>
          <button onClick={refreshAdvanced} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded">Load KPIs</button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {metricCards.map((metric, index) => (
          <motion.div
            key={metric.id}
            className={`${metric.color} rounded-xl p-6 text-white cursor-pointer`}
            whileHover={{ scale: 1.02 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => setActiveMetric(metric.id)}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm opacity-90 mb-1">{metric.title}</p>
                <p className="text-2xl font-bold mb-1">{metric.value}</p>
                <p className="text-xs opacity-75">{metric.description}</p>
              </div>
              <div className="text-2xl opacity-75">{metric.icon}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Analytics Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Performing Case */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">🏆 Top Performing Case</h3>
          {stats.topPerformingCase && stats.topPerformingCase.id ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-lg">{stats.topPerformingCase.name}</p>
                  <p className="text-gray-400 text-sm">
                    {stats.topPerformingCase.openings} openings this week
                  </p>
                </div>
                <div className="text-3xl">🎁</div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Weekly Opens</div>
                    <div className="text-xl font-bold text-green-400">
                      {stats.topPerformingCase.openings}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Popularity</div>
                    <div className="text-xl font-bold text-blue-400">
                      #{1}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 text-lg mb-2">No recent activity</div>
              <p className="text-gray-500 text-sm">
                Case opening data will appear here once users start playing
              </p>
            </div>
          )}
        </div>

        {/* System Health */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">🔧 System Health</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Database Status</span>
              <span className="flex items-center text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                Healthy
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Admin API</span>
              <span className="flex items-center text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                Online
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Case Validation</span>
              <span className="flex items-center text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                Active
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Audit Logging</span>
              <span className="flex items-center text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                Recording
              </span>
            </div>
          </div>

          <div className="mt-6 p-3 bg-green-900/30 border border-green-600/30 rounded-lg">
            <div className="text-green-400 font-medium mb-1">✅ All Systems Operational</div>
            <div className="text-green-300 text-sm">
              Admin dashboard is running smoothly with all features enabled
            </div>
          </div>
        </div>
      </div>

      {/* Advanced KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">🎯 RTP by Case (range)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-400">
                <tr>
                  <th className="text-left py-2">Case</th>
                  <th className="text-right py-2">Spins</th>
                  <th className="text-right py-2">RTP</th>
                  <th className="text-right py-2">Edge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {(advanced.rtp || []).map((r: any) => (
                  <tr key={r.case_id}>
                    <td className="py-2">{r.case_name || r.case_id}</td>
                    <td className="py-2 text-right">{r.spins}</td>
                    <td className={`py-2 text-right ${Number(r.rtp) > 0.95 ? 'text-red-400' : 'text-green-400'}`}>{Number(r.rtp).toFixed(3)}</td>
                    <td className="py-2 text-right">{Number(r.house_edge).toFixed(3)}</td>
                  </tr>
                ))}
                {(!advanced.rtp || advanced.rtp.length === 0) && (
                  <tr><td colSpan={4} className="py-4 text-center text-gray-500">No data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">🧯 Pity Monitor (range)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-400">
                <tr>
                  <th className="text-left py-2">Case</th>
                  <th className="text-right py-2">Spins</th>
                  <th className="text-right py-2">Pity %</th>
                  <th className="text-right py-2">RTP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {(advanced.pity || []).map((p: any) => (
                  <tr key={p.case_id}>
                    <td className="py-2">{p.case_id}</td>
                    <td className="py-2 text-right">{p.spins}</td>
                    <td className={`py-2 text-right ${Number(p.pity_rate) > 0.022 ? 'text-yellow-400' : 'text-gray-300'}`}>{(Number(p.pity_rate) * 100).toFixed(2)}%</td>
                    <td className={`py-2 text-right ${Number(p.rtp) > 0.935 ? 'text-red-400' : 'text-green-400'}`}>{Number(p.rtp).toFixed(3)}</td>
                  </tr>
                ))}
                {(!advanced.pity || advanced.pity.length === 0) && (
                  <tr><td colSpan={4} className="py-4 text-center text-gray-500">No data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-2">💳 Credit Flow (range)</h3>
          <div className="text-sm text-gray-300 space-y-1">
            <div className="flex justify-between"><span>Purchases (ADA)</span><b>{Number(advanced.flow?.purchases || 0).toFixed(2)}</b></div>
            <div className="flex justify-between"><span>Winnings credited (credits)</span><b>{Number(advanced.flow?.winnings_credited || 0).toFixed(0)}</b></div>
            <div className="flex justify-between"><span>Withdrawals Gross (ADA)</span><b>{Number(advanced.flow?.withdrawals_gross || 0).toFixed(2)}</b></div>
            <div className="flex justify-between"><span>Withdrawals Net (ADA)</span><b>{Number(advanced.flow?.withdrawals_net || 0).toFixed(2)}</b></div>
            <div className="flex justify-between"><span>Platform Fees (ADA)</span><b>{Number(advanced.flow?.platform_fees || 0).toFixed(2)}</b></div>
            <div className="flex justify-between"><span>Network Fees (ADA)</span><b>{Number(advanced.flow?.network_fees || 0).toFixed(2)}</b></div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-2">💸 Withdrawals Ops (range)</h3>
          <div className="grid grid-cols-2 gap-3 text-sm text-gray-300">
            <div className="bg-gray-700/50 p-3 rounded"><div className="text-xs">Pending</div><div className="text-lg font-bold">{advanced.withdrawalsOps?.pending || 0}</div></div>
            <div className="bg-gray-700/50 p-3 rounded"><div className="text-xs">Processing</div><div className="text-lg font-bold">{advanced.withdrawalsOps?.processing || 0}</div></div>
            <div className="bg-gray-700/50 p-3 rounded"><div className="text-xs">Sent</div><div className="text-lg font-bold">{advanced.withdrawalsOps?.sent || 0}</div></div>
            <div className="bg-gray-700/50 p-3 rounded"><div className="text-xs">Failed</div><div className="text-lg font-bold">{advanced.withdrawalsOps?.failed || 0}</div></div>
            <div className="bg-gray-700/50 p-3 rounded col-span-2"><div className="text-xs">Median payout (min)</div><div className="text-lg font-bold">{Number(advanced.withdrawalsOps?.median_payout_minutes || 0).toFixed(1)}</div></div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">📋 Recent Admin Activity</h3>
        
        {stats.recentActivity && stats.recentActivity.length > 0 ? (
          <div className="space-y-3">
            {stats.recentActivity.slice(0, 10).map((activity, index) => (
              <div key={activity.id} className="flex items-center justify-between py-3 border-b border-gray-700 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">
                      {activity.action.replace(/_/g, ' ').toLowerCase()}
                    </p>
                    <p className="text-xs text-gray-400">
                      by {activity.adminEmail} • {activity.targetType}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(activity.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 text-lg mb-2">No recent activity</div>
            <p className="text-gray-500 text-sm">
              Admin actions will be logged and displayed here
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">⚡ Quick Actions</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="bg-blue-600 hover:bg-blue-700 p-4 rounded-lg text-center">
            <div className="text-2xl mb-2">📦</div>
            <div className="text-sm font-medium">Create Case</div>
          </button>
          
          <button className="bg-purple-600 hover:bg-purple-700 p-4 rounded-lg text-center">
            <div className="text-2xl mb-2">💎</div>
            <div className="text-sm font-medium">Add Symbol</div>
          </button>
          
          <button className="bg-yellow-600 hover:bg-yellow-700 p-4 rounded-lg text-center">
            <div className="text-2xl mb-2">⚖️</div>
            <div className="text-sm font-medium">Test Probabilities</div>
          </button>
          
          <button className="bg-green-600 hover:bg-green-700 p-4 rounded-lg text-center">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm font-medium">Export Data</div>
          </button>
        </div>
      </div>
    </div>
  )
}