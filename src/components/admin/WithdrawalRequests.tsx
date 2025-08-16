"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface WithdrawalRequest {
  id: string
  user_wallet: string
  withdrawal_type: string
  payment_method: string
  payment_details: string
  credits_requested: number
  symbol_name: string
  symbol_rarity: string
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'flagged'
  created_at: string
  user_joined_date: string
  case_opened_date: string
  withdrawal_category: 'Bulk Credit Withdrawal' | 'Item-Specific Withdrawal'
  risk_score?: number
  is_suspicious?: boolean
  risk_reasons?: string[]
}

export default function WithdrawalRequests() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'flagged' | 'completed'>('all')
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null)

  useEffect(() => {
    fetchWithdrawalRequests()
  }, [])

  const fetchWithdrawalRequests = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/withdrawal-requests', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      })
      
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('adminToken')
        window.location.href = '/admin/login'
        return
      }
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setRequests(data.data || [])
      } else {
        console.error('Failed to fetch withdrawal requests:', data.error)
      }
    } catch (error) {
      console.error('Error fetching withdrawal requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateRequestStatus = async (requestId: string, status: string, notes?: string) => {
    setProcessing(requestId)
    
    try {
      const response = await fetch('/api/admin/withdrawal-requests', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ requestId, status, notes })
      })

      const data = await response.json()
      
      if (response.ok && data.success) {
        // Update local state
        setRequests(prev => prev.map(req => 
          req.id === requestId 
            ? { ...req, status: status as any }
            : req
        ))
        setSelectedRequest(null)
      } else {
        alert(`❌ Failed to update request: ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating request:', error)
      alert('❌ Failed to update request')
    } finally {
      setProcessing(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-600'
      case 'processing': return 'bg-blue-600'
      case 'completed': return 'bg-green-600'
      case 'cancelled': return 'bg-red-600'
      case 'flagged': return 'bg-red-800'
      default: return 'bg-gray-600'
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-400'
      case 'rare': return 'text-blue-400'
      case 'epic': return 'text-purple-400'
      case 'legendary': return 'text-yellow-400'
      case 'mythic': return 'text-pink-400'
      default: return 'text-gray-400'
    }
  }

  const getRiskBadge = (request: WithdrawalRequest) => {
    if (request.is_suspicious) {
      return <span className="px-2 py-1 text-xs bg-red-900 text-red-200 rounded-full">🚨 Suspicious</span>
    }
    if (request.risk_score && request.risk_score > 50) {
      return <span className="px-2 py-1 text-xs bg-yellow-900 text-yellow-200 rounded-full">⚠️ High Risk</span>
    }
    if (request.risk_score && request.risk_score > 25) {
      return <span className="px-2 py-1 text-xs bg-blue-900 text-blue-200 rounded-full">🔍 Medium Risk</span>
    }
    return <span className="px-2 py-1 text-xs bg-green-900 text-green-200 rounded-full">✅ Low Risk</span>
  }

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true
    if (filter === 'flagged') return request.status === 'flagged' || request.is_suspicious
    return request.status === filter
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">💸 Withdrawal Requests</h2>
        </div>
        <div className="text-center py-12 text-gray-400">Loading withdrawal requests...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">💸 Withdrawal Requests</h2>
        <div className="flex items-center gap-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="all">All Requests</option>
            <option value="pending">Pending</option>
            <option value="flagged">Flagged</option>
            <option value="completed">Completed</option>
          </select>
          <motion.button
            onClick={fetchWithdrawalRequests}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🔄 Refresh
          </motion.button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', count: requests.length, color: 'bg-gray-600' },
          { label: 'Pending', count: requests.filter(r => r.status === 'pending').length, color: 'bg-yellow-600' },
          { label: 'Flagged', count: requests.filter(r => r.status === 'flagged' || r.is_suspicious).length, color: 'bg-red-600' },
          { label: 'Completed', count: requests.filter(r => r.status === 'completed').length, color: 'bg-green-600' }
        ].map((stat) => (
          <div key={stat.label} className={`${stat.color} rounded-xl p-4 text-white`}>
            <div className="text-2xl font-bold">{stat.count}</div>
            <div className="text-sm opacity-90">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No withdrawal requests found for the selected filter
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-colors"
            >
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Request Info */}
                <div className="lg:col-span-2">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)} text-white`}>
                      {request.status.toUpperCase()}
                    </span>
                    {getRiskBadge(request)}
                    <span className="text-gray-400 text-sm">
                      #{request.id.slice(0, 8)}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">User:</span>
                      <span className="text-white font-mono">{request.user_wallet?.slice(0, 20)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Amount:</span>
                      <span className="text-white font-bold">{request.credits_requested} credits</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Type:</span>
                      <span className="text-white">{request.withdrawal_category}</span>
                    </div>
                    {request.symbol_name !== 'Bulk Credit Withdrawal' && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Item:</span>
                        <span className={getRarityColor(request.symbol_rarity)}>{request.symbol_name}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Method:</span>
                      <span className="text-white">{request.payment_method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Requested:</span>
                      <span className="text-white">{new Date(request.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div>
                  <h4 className="font-semibold mb-2 text-white">Payment Details</h4>
                  <div className="bg-gray-700 p-3 rounded-lg text-sm">
                    <div className="text-gray-300 whitespace-pre-wrap break-all">
                      {request.payment_details}
                    </div>
                  </div>
                  
                  {request.risk_reasons && request.risk_reasons.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-xs font-semibold text-red-400 mb-1">Risk Factors:</h5>
                      <ul className="text-xs text-red-300 space-y-1">
                        {request.risk_reasons.map((reason, index) => (
                          <li key={index}>• {reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <motion.button
                    onClick={() => setSelectedRequest(request)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    🔍 View Details
                  </motion.button>
                  
                  {request.status === 'pending' && (
                    <>
                      <motion.button
                        onClick={() => updateRequestStatus(request.id, 'processing')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                        disabled={processing === request.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {processing === request.id ? '⚙️ Processing...' : '🔄 Process'}
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          const notes = prompt('Add cancellation reason:')
                          if (notes) updateRequestStatus(request.id, 'cancelled', notes)
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                        disabled={processing === request.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        ❌ Cancel
                      </motion.button>
                    </>
                  )}
                  
                  {request.status === 'processing' && (
                    <>
                      <motion.button
                        onClick={() => {
                          const txHash = prompt('Enter transaction hash or payment confirmation:')
                          if (txHash) {
                            updateRequestStatus(request.id, 'completed', `Payment sent: ${txHash}`)
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                        disabled={processing === request.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {processing === request.id ? '⚙️ Completing...' : '✅ Complete'}
                      </motion.button>
                      <motion.button
                        onClick={() => updateRequestStatus(request.id, 'pending')}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                        disabled={processing === request.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        ⏪ Back to Pending
                      </motion.button>
                    </>
                  )}
                  
                  {request.status === 'flagged' && (
                    <>
                      <motion.button
                        onClick={() => {
                          const notes = prompt('Add approval notes:')
                          updateRequestStatus(request.id, 'pending', notes || 'Manually approved after review')
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                        disabled={processing === request.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        ✅ Approve
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          const notes = prompt('Add rejection reason:')
                          if (notes) updateRequestStatus(request.id, 'cancelled', notes)
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                        disabled={processing === request.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        ❌ Reject
                      </motion.button>
                    </>
                  )}
                  
                  {(request.status === 'completed' || request.status === 'cancelled') && (
                    <div className="text-sm text-gray-400 text-center py-2">
                      {request.status === 'completed' ? '✅ Completed' : '❌ Cancelled'}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Request Details Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Withdrawal Request Details</h3>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-400">Request ID:</span>
                    <div className="text-white font-mono">{selectedRequest.id}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Status:</span>
                    <div className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusColor(selectedRequest.status)} text-white ml-2`}>
                      {selectedRequest.status.toUpperCase()}
                    </div>
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-400">User Wallet:</span>
                  <div className="text-white font-mono break-all">{selectedRequest.user_wallet}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-400">Credits Requested:</span>
                    <div className="text-white font-bold">{selectedRequest.credits_requested}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">USD Value:</span>
                    <div className="text-white">${(selectedRequest.credits_requested * 0.01).toFixed(2)}</div>
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-400">Payment Method:</span>
                  <div className="text-white">{selectedRequest.payment_method}</div>
                </div>
                
                <div>
                  <span className="text-gray-400">Payment Details:</span>
                  <div className="bg-gray-700 p-3 rounded text-white whitespace-pre-wrap break-all">
                    {selectedRequest.payment_details}
                  </div>
                </div>
                
                {selectedRequest.risk_score !== undefined && (
                  <div>
                    <span className="text-gray-400">Risk Assessment:</span>
                    <div className="text-white">Score: {selectedRequest.risk_score}/100</div>
                    {selectedRequest.risk_reasons && selectedRequest.risk_reasons.length > 0 && (
                      <ul className="text-red-300 mt-2 space-y-1">
                        {selectedRequest.risk_reasons.map((reason, index) => (
                          <li key={index}>• {reason}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-400">Created:</span>
                    <div className="text-white">{new Date(selectedRequest.created_at).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Category:</span>
                    <div className="text-white">{selectedRequest.withdrawal_category}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
