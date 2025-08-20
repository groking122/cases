"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import type { AdminDashboardStats, CaseConfig, Symbol } from '@/types/admin'
import CaseConfigurator from '@/components/admin/CaseConfigurator'
import ProbabilityMatrix from '@/components/admin/ProbabilityMatrix'
import SymbolLibrary from '@/components/admin/SymbolLibrary'
import SymbolCreator from '@/components/admin/SymbolCreator'
import SymbolEditor from '@/components/admin/SymbolEditor'
import AdminAnalytics from '@/components/admin/AdminAnalytics'
import WithdrawalRequests from '@/components/admin/WithdrawalRequests'

interface AdminDashboardProps {
  initialStats: AdminDashboardStats
}

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cases' | 'symbols' | 'analytics' | 'withdrawals' | 'account'>('dashboard')
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [cases, setCases] = useState<CaseConfig[]>([])
  const [symbols, setSymbols] = useState<Symbol[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCase, setSelectedCase] = useState<CaseConfig | null>(null)
  const [showCreateSymbol, setShowCreateSymbol] = useState(false)
  const [editingSymbol, setEditingSymbol] = useState<Symbol | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // DEVELOPMENT BYPASS - Set a fake admin token for development
      if (process.env.NODE_ENV === 'development' && !localStorage.getItem('adminToken')) {
        console.log('🔓 Development mode: Setting fake admin token')
        localStorage.setItem('adminToken', 'dev-admin-token')
      }
      
      // Load stats with better error handling
      const statsResponse = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      })
      if (statsResponse.status === 401 || statsResponse.status === 403) {
        localStorage.removeItem('adminToken')
        router.push('/admin/login')
        return
      }
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        console.log('✅ Stats loaded:', statsData)
        setStats(statsData.data || {})
      } else {
        console.error('❌ Failed to load stats:', statsResponse.status, statsResponse.statusText)
        const errorText = await statsResponse.text()
        console.error('Stats error details:', errorText)
      }

      // Load cases with cache busting
      const casesResponse = await fetch(`/api/admin/cases?_=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Cache-Control': 'no-cache'
        }
      })
      if (casesResponse.status === 401 || casesResponse.status === 403) {
        localStorage.removeItem('adminToken')
        router.push('/admin/login')
        return
      }
      if (casesResponse.ok) {
        const casesData = await casesResponse.json()
        setCases(casesData.data.items)
      } else {
        console.error('Failed to load cases:', casesResponse.status, casesResponse.statusText)
      }

      // Load symbols with cache busting
      const symbolsResponse = await fetch(`/api/admin/symbols?_=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Cache-Control': 'no-cache'
        }
      })
      if (symbolsResponse.status === 401 || symbolsResponse.status === 403) {
        localStorage.removeItem('adminToken')
        router.push('/admin/login')
        return
      }
      if (symbolsResponse.ok) {
        const symbolsData = await symbolsResponse.json()
        setSymbols(symbolsData.data.items)
      } else {
        console.error('Failed to load symbols:', symbolsResponse.status, symbolsResponse.statusText)
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'cases', label: 'Cases', icon: '📦' },
    { id: 'symbols', label: 'Symbols', icon: '💎' },
    { id: 'withdrawals', label: 'Withdrawals', icon: '💸' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'account', label: 'Account', icon: '🔐' }
  ] as const

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading admin dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">🎰 Case Opening Admin</h1>
          <div className="flex items-center space-x-4">
            <span className="text-foreground/70">Welcome, Admin</span>
            <button 
              onClick={() => {
                localStorage.removeItem('adminToken')
                window.location.href = '/admin/login'
              }}
              className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 px-4 py-2 rounded-lg text-sm text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-card border-b border-border px-6">
        <div className="flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-2 border-b-2 transition-colors duration-200 ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-foreground/60 hover:text-foreground hover:border-border'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'dashboard' && (
            <DashboardOverview stats={stats} onRefresh={loadDashboardData} />
          )}

          {activeTab === 'cases' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Case Management</h2>
                <button
                  onClick={() => setSelectedCase({} as CaseConfig)}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
                >
                  + Create New Case
                </button>
              </div>

              {selectedCase ? (
                <CaseConfigurator
                  existingCase={selectedCase.id ? selectedCase : undefined}
                  symbols={symbols}
                  onSave={async (data) => {
                    try {
                      const isUpdate = selectedCase?.id
                      const url = isUpdate 
                        ? `/api/admin/cases/${selectedCase.id}`
                        : '/api/admin/cases'
                      const method = isUpdate ? 'PATCH' : 'POST'
                      
                      console.log(`🔧 ${isUpdate ? 'Updating' : 'Creating'} case:`, data)
                      console.log('🔧 Selected case object:', selectedCase)
                      console.log('🔧 Request URL:', url)
                      console.log('🔧 Request method:', method)
                      console.log('🔧 Symbols in data:', data.symbols)
                      console.log('🔧 Symbols length:', data.symbols?.length || 0)
                      
                      const response = await fetch(url, {
                        method,
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                        },
                        body: JSON.stringify(data)
                      })
                      
                      const result = await response.json()
                      
                      if (!response.ok || !result.success) {
                        throw new Error(result.error || `Failed to ${isUpdate ? 'update' : 'create'} case`)
                      }
                      
                      console.log(`✅ Case ${isUpdate ? 'updated' : 'created'} successfully`)
                      console.log('🔄 Refreshing dashboard data...')
                      setSelectedCase(null)
                      await loadDashboardData()
                      console.log('✅ Dashboard data refreshed')
                      
                    } catch (error: any) {
                      console.error('Failed to save case:', error)
                      alert(`Failed to save case: ${error.message}`)
                    }
                  }}
                  onCancel={() => setSelectedCase(null)}
                />
              ) : (
                <CasesList 
                  cases={cases} 
                  onEditCase={setSelectedCase}
                  onDeleteCase={async (caseId) => {
                    if (!confirm('Are you sure you want to delete this case?')) return
                    try {
                      const response = await fetch(`/api/admin/cases/${caseId}`, {
                        method: 'DELETE',
                        headers: {
                          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                        }
                      })
                      if (response.status === 401 || response.status === 403) {
                        localStorage.removeItem('adminToken')
                        router.push('/admin/login')
                        return
                      }
                      if (!response.ok) {
                        const err = await response.json().catch(() => ({}))
                        alert(`Failed to delete case: ${err.error || response.statusText}`)
                        return
                      }
                      await loadDashboardData()
                      alert('Case deleted successfully')
                    } catch (e) {
                      console.error('Delete case error:', e)
                      alert('Error deleting case')
                    }
                  }}
                />
              )}
            </div>
          )}

          {activeTab === 'symbols' && (
            <SymbolLibrary
              symbols={symbols}
              onEdit={(symbol) => setEditingSymbol(symbol)}
              onCreate={() => setShowCreateSymbol(true)}
              onDelete={async (symbolId) => {
                if (!confirm('Are you sure you want to delete this symbol?')) return
                
                try {
                  const response = await fetch(`/api/admin/symbols/${symbolId}`, {
                    method: 'DELETE',
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                    }
                  })
                  
                  if (response.ok) {
                    await loadDashboardData()
                    alert('Symbol deleted successfully')
                  } else {
                    alert('Failed to delete symbol')
                  }
                } catch (error) {
                  console.error('Delete error:', error)
                  alert('Error deleting symbol')
                }
              }}
              onToggleActive={async (symbolId, isActive) => {
                try {
                  const response = await fetch(`/api/admin/symbols/${symbolId}`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                    },
                    body: JSON.stringify({ is_active: isActive })
                  })
                  
                  if (response.ok) {
                    await loadDashboardData()
                    alert(`Symbol ${isActive ? 'activated' : 'deactivated'} successfully`)
                  } else {
                    alert('Failed to toggle symbol status')
                  }
                } catch (error) {
                  console.error('Toggle error:', error)
                  alert('Error toggling symbol status')
                }
              }}
            />
          )}

          {activeTab === 'withdrawals' && (
            <WithdrawalRequests />
          )}

          {activeTab === 'analytics' && stats && (
            <AdminAnalytics
              stats={stats}
              dateRange={{
                start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                end: new Date()
              }}
              onDateRangeChange={(range) => console.log('Date range changed:', range)}
            />
          )}

          {activeTab === 'account' && (
            <AccountSecurity />
          )}
        </motion.div>
      </main>

      {/* Symbol Creator Modal */}
      {showCreateSymbol && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <SymbolCreator
            onSave={async (data) => {
              try {
                const response = await fetch('/api/admin/symbols', {
                  method: 'POST', 
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                  },
                  body: JSON.stringify(data)
                })
                
                if (response.ok) {
                  setShowCreateSymbol(false)
                  await loadDashboardData()
                  alert('Symbol created successfully!')
                } else {
                  const error = await response.json()
                  alert(`Failed to create symbol: ${error.error}`)
                }
              } catch (error) {
                console.error('Create symbol error:', error)
                alert('Error creating symbol')
              }
            }}
            onCancel={() => setShowCreateSymbol(false)}
          />
        </div>
      )}

      {/* Symbol Editor Modal */}
      {editingSymbol && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <SymbolEditor
            symbol={editingSymbol}
            onSave={async (data) => {
              try {
                const response = await fetch(`/api/admin/symbols/${editingSymbol.id}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                  },
                  body: JSON.stringify(data)
                })
                
                const result = await response.json()
                
                if (response.ok && result.success) {
                  console.log('✅ Symbol updated successfully:', result.data)
                  setEditingSymbol(null)
                  await loadDashboardData() // This should refresh the symbols list
                  alert('Symbol updated successfully!')
                } else {
                  console.error('❌ Symbol update failed:', result)
                  alert(`Failed to update symbol: ${result.error || 'Unknown error'}`)
                }
              } catch (error) {
                console.error('Update symbol error:', error)
                alert('Error updating symbol')
              }
            }}
            onCancel={() => setEditingSymbol(null)}
          />
        </div>
      )}
    </div>
  )
}

// Dashboard Overview Component
function DashboardOverview({ stats, onRefresh }: { stats: AdminDashboardStats | null; onRefresh: () => void }) {
  if (!stats) return <div>Loading stats...</div>

  const statCards = [
    { label: 'Total Cases', value: stats.totalCases, icon: '📦', color: 'bg-blue-600' },
    { label: 'Active Cases', value: stats.activeCases, icon: '✅', color: 'bg-green-600' },
    { label: 'Total Symbols', value: stats.totalSymbols, icon: '💎', color: 'bg-purple-600' },
    { label: 'Today\'s Openings', value: stats.todayOpenings, icon: '🎯', color: 'bg-yellow-600' },
    { label: 'Total Revenue', value: `$${stats.totalRevenue.toLocaleString()}`, icon: '💰', color: 'bg-emerald-600' },
    { label: 'Avg Session Time', value: `${Math.round(stats.averageSessionTime)}min`, icon: '⏱️', color: 'bg-indigo-600' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard Overview</h2>
        <button onClick={onRefresh} className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white px-4 py-2 rounded-lg">Refresh</button>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`${stat.color} rounded-xl p-6 text-white`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <div className="text-3xl opacity-75">{stat.icon}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Top Performing Case */}
      {stats.topPerformingCase && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">🏆 Top Performing Case</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{stats.topPerformingCase.name}</p>
              <p className="text-gray-400 text-sm">{stats.topPerformingCase.openings} openings this week</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">📋 Recent Activity</h3>
        <div className="space-y-3">
          {stats.recentActivity.map((activity, index) => (
            <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0">
              <div>
                <p className="text-sm">{activity.action.replace(/_/g, ' ')}</p>
                <p className="text-xs text-gray-400">{activity.adminEmail}</p>
              </div>
              <p className="text-xs text-gray-500">
                {new Date(activity.timestamp).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Cases List Component
function CasesList({ 
  cases, 
  onEditCase, 
  onDeleteCase 
}: { 
  cases: CaseConfig[]
  onEditCase: (caseItem: CaseConfig) => void
  onDeleteCase: (caseId: string) => void
}) {
  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Case</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Symbols</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {cases.map((caseItem) => (
              <tr key={caseItem.id} className="hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {caseItem.imageUrl ? (
                  <img className="h-10 w-10 rounded-lg object-cover" src={caseItem.imageUrl} alt={caseItem.name} />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-gray-700 border border-gray-600 flex items-center justify-center">
                    <span className="text-gray-400 text-xs">📦</span>
                  </div>
                )}
                    <div className="ml-4">
                      <div className="text-sm font-medium text-white">{caseItem.name}</div>
                      <div className="text-sm text-gray-400">{caseItem.description}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  ${caseItem.price}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    caseItem.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {caseItem.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  {caseItem.symbols.length} symbols
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={async () => {
                      console.log('🔧 Editing case:', caseItem)
                      console.log('🔧 Case symbols (cached):', caseItem.symbols)
                      
                      // Fetch fresh case data before editing
                      try {
                        const freshResponse = await fetch(`/api/admin/cases?_=${Date.now()}`, {
                          headers: {
                            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                            'Cache-Control': 'no-cache'
                          }
                        })
                        
                        if (freshResponse.ok) {
                          const freshData = await freshResponse.json()
                          const freshCase = freshData.data.items.find((c: CaseConfig) => c.id === caseItem.id)
                          
                          if (freshCase) {
                            console.log('🔧 Fresh case symbols:', freshCase.symbols)
                            console.log('🔧 Using fresh data for editing')
                            onEditCase(freshCase)
                          } else {
                            console.log('⚠️ Case not found in fresh data, using cached')
                            onEditCase(caseItem)
                          }
                        } else {
                          console.log('⚠️ Failed to fetch fresh data, using cached')
                          onEditCase(caseItem)
                        }
                      } catch (error) {
                        console.error('Error fetching fresh case data:', error)
                        onEditCase(caseItem)
                      }
                    }}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm('Delete this case?')) return
                      const confirmed = prompt('Type DELETE to confirm:') === 'DELETE'
                      if (!confirmed) return
                      onDeleteCase(caseItem.id)
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Account security settings
function AccountSecurity() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfa, setMfa] = useState(false)

  const save = async () => {
    const res = await fetch('/api/admin/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
      body: JSON.stringify({ email: email || undefined, password: password || undefined, mfaEnabled: mfa })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.success) {
      alert(data.error || 'Failed to update account')
    } else {
      alert('Account updated')
      setPassword('')
    }
  }

  return (
    <div className="max-w-md bg-card border border-border rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">Account Security</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1">New Email</label>
          <input className="w-full bg-background border border-border rounded-lg px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@domain.com" />
        </div>
        <div>
          <label className="block text-sm mb-1">New Password</label>
          <input type="password" className="w-full bg-background border border-border rounded-lg px-3 py-2" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={mfa} onChange={e=>setMfa(e.target.checked)} /> Enable MFA (TOTP)
        </label>
        <button onClick={save} className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white px-4 py-2 rounded-lg">Save</button>
      </div>
    </div>
  )
}