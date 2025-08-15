"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface WithdrawalRequest {
  id: string
  user_wallet: string
  withdrawal_type: string
  payment_method: string
  payment_details: string
  amount: number
  symbol_name: string
  symbol_rarity: string
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  created_at: string
  user_joined_date: string
  case_opened_date: string
}

export default function WithdrawalRequestsPage() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    fetchWithdrawalRequests()
  }, [])

  const fetchWithdrawalRequests = async () => {
    try {
      const response = await fetch('/api/admin/withdrawal-requests')
      const data = await response.json()
      
      if (response.ok) {
        setRequests(data.requests || [])
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status, notes })
      })

      const data = await response.json()
      
      if (response.ok) {
        // Update local state
        setRequests(prev => prev.map(req => 
          req.id === requestId 
            ? { ...req, status: status as any }
            : req
        ))
        alert(`✅ Request ${status} successfully`)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">💸 Withdrawal Requests</h1>
          <div className="text-center py-12">Loading withdrawal requests...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">💸 Withdrawal Requests</h1>
          <Button onClick={fetchWithdrawalRequests} className="bg-blue-600 hover:bg-blue-700">
            🔄 Refresh
          </Button>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No withdrawal requests found
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Request Info */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(request.status)} text-white`}>
                        {request.status.toUpperCase()}
                      </span>
                      <span className="text-gray-400 text-sm">
                        #{request.id.slice(0, 8)}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div><strong>User:</strong> {request.user_wallet?.slice(0, 20)}...</div>
                      <div><strong>Amount:</strong> {request.amount} credits</div>
                      <div><strong>Item:</strong> <span className={getRarityColor(request.symbol_rarity)}>{request.symbol_name}</span></div>
                      <div><strong>Method:</strong> {request.payment_method}</div>
                      <div><strong>Requested:</strong> {new Date(request.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div>
                    <h4 className="font-semibold mb-2">Payment Details</h4>
                    <div className="bg-gray-700 p-3 rounded text-sm">
                      <div className="text-gray-300 whitespace-pre-wrap">
                        {request.payment_details}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {request.status === 'pending' && (
                      <>
                        <Button
                          onClick={() => updateRequestStatus(request.id, 'processing')}
                          className="bg-blue-600 hover:bg-blue-700 text-sm"
                          disabled={processing === request.id}
                        >
                          {processing === request.id ? '⚙️ Processing...' : '🔄 Mark Processing'}
                        </Button>
                        <Button
                          onClick={() => {
                            const notes = prompt('Add any notes (optional):')
                            updateRequestStatus(request.id, 'cancelled', notes || undefined)
                          }}
                          className="bg-red-600 hover:bg-red-700 text-sm"
                          disabled={processing === request.id}
                        >
                          ❌ Cancel
                        </Button>
                      </>
                    )}
                    
                    {request.status === 'processing' && (
                      <>
                        <Button
                          onClick={() => {
                            const txHash = prompt('Enter transaction hash or payment confirmation:')
                            if (txHash) {
                              updateRequestStatus(request.id, 'completed', `Payment sent: ${txHash}`)
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700 text-sm"
                          disabled={processing === request.id}
                        >
                          {processing === request.id ? '⚙️ Completing...' : '✅ Mark Completed'}
                        </Button>
                        <Button
                          onClick={() => updateRequestStatus(request.id, 'pending')}
                          className="bg-yellow-600 hover:bg-yellow-700 text-sm"
                          disabled={processing === request.id}
                        >
                          ⏪ Back to Pending
                        </Button>
                      </>
                    )}
                    
                    {(request.status === 'completed' || request.status === 'cancelled') && (
                      <div className="text-sm text-gray-400 text-center py-2">
                        {request.status === 'completed' ? '✅ Completed' : '❌ Cancelled'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
