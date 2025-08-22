"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useWallet } from '@meshsdk/react'
import { authFetch } from '@/lib/authFetch'

interface InventoryItem {
  id: string
  symbol_key: string
  symbol_name: string
  symbol_rarity: string
  reward_value: number
  created_at: string
  is_withdrawn: boolean
  withdrawal_type?: 'credits' | 'nft'
  withdrawal_tx_hash?: string
  eligible_for_nft?: boolean
  withdrawal_requested?: boolean
}

interface PlayerInventoryProps {
  isOpen: boolean
  onClose: () => void
  onCreditsUpdated?: () => void
}

export default function PlayerInventory({ isOpen, onClose, onCreditsUpdated }: PlayerInventoryProps) {
  const { connected, wallet } = useWallet()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [userCredits, setUserCredits] = useState(0)
  const [filter, setFilter] = useState<'all' | 'available' | 'sold'>('all')
  const [selling, setSelling] = useState<string | null>(null)
  const [withdrawalSubmitting, setWithdrawalSubmitting] = useState(false)
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false)
  const [withdrawalAmount, setWithdrawalAmount] = useState(1000)
  const [showConfirmation, setShowConfirmation] = useState(false)

  // Fetch user credits
  const fetchUserCredits = async () => {
    if (!connected || !wallet) return

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('userToken') : null
      if (!token) return
      const response = await authFetch('/api/get-credits', { method: 'POST' })

      if (response.ok) {
        const data = await response.json()
        if (typeof data.credits === 'number') {
          setUserCredits(data.credits)
        }
      }
    } catch (error) {
      console.error('Failed to fetch credits:', error)
    }
  }

  // Fetch player inventory
  const fetchInventory = async () => {
    if (!connected || !wallet) return

    setLoading(true)
    try {
      const addresses = await wallet.getUsedAddresses()
      const walletAddress = addresses[0]

      const response = await fetch('/api/player-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      })

      if (response.ok) {
        const data = await response.json()
        setInventory(data.inventory || [])
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  // Resolve userId from connected wallet
  const resolveUserId = async (): Promise<string | null> => {
    try {
      if (!connected || !wallet) return null
      const addresses = await wallet.getUsedAddresses()
      const walletAddress = addresses[0]
      const userRes = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, walletType: 'mesh_connected' })
      })
      if (!userRes.ok) return null
      const data = await userRes.json()
      return data.user?.id || null
    } catch {
      return null
    }
  }

  // Request ADA withdrawal for custom amount
  const handleCreditWithdrawalRequest = async (amount: number) => {
    if (withdrawalSubmitting || !connected || !wallet) return
    setWithdrawalSubmitting(true)

    try {
      const addresses = await wallet.getUsedAddresses()
      const walletAddress = addresses[0]
      
      if (!walletAddress) {
        alert('Unable to get wallet address. Please try again.')
        setWithdrawalSubmitting(false)
        return
      }

      // Check if user has enough credits
      if (userCredits < amount) {
        alert(`Insufficient credits. You have ${userCredits} credits but need ${amount} credits.`)
        setWithdrawalSubmitting(false)
        return
      }

      const response = await fetch('/api/request-withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken') || ''}` },
        body: JSON.stringify({
          caseOpeningId: null, // No specific case opening for bulk credit withdrawal
          withdrawalType: 'ada',
          paymentMethod: 'ada_transfer',
          paymentDetails: `ADA transfer to wallet: ${walletAddress}`,
          walletAddress: walletAddress,
          creditsRequested: amount
        })
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Failed to submit withdrawal request')
        setWithdrawalSubmitting(false)
        return
      }

      // Update user credits optimistically
      setUserCredits(prev => prev - amount)
      
      // Close modals
      setShowConfirmation(false)
      setShowWithdrawalForm(false)

      alert(`✅ ADA Withdrawal request submitted!\n\nRequest ID: ${data.requestId}\nAmount: ${amount} credits (${(amount * 0.01).toFixed(2)} ADA)\nDestination: ${walletAddress}\n\nProcessing time: 24-48 hours`)
      
      // Refresh credits to get actual balance
      setTimeout(() => fetchUserCredits(), 1000)
      
    } catch (error) {
      console.error('Withdrawal request error:', error)
      alert('Failed to submit withdrawal request. Please try again later.')
    } finally {
      setWithdrawalSubmitting(false)
    }
  }

  useEffect(() => {
    if (isOpen && connected) {
      fetchInventory()
      fetchUserCredits()
    }
  }, [isOpen, connected])

  // Filter inventory items
  const filteredInventory = inventory.filter(item => {
    const passesStatusFilter = 
      filter === 'all' || 
      (filter === 'available' && !item.is_withdrawn && !item.withdrawal_requested) ||
      (filter === 'sold' && (item.is_withdrawn || item.withdrawal_requested))

    return passesStatusFilter
  })

  // Show items as individual credit entries (no symbol grouping)
  const creditEntries = filteredInventory.map((item, index) => ({
    id: item.id,
    creditAmount: item.reward_value,
    adaAmount: (item.reward_value * 0.01).toFixed(2),
    dateWon: new Date(item.created_at).toLocaleDateString(),
    isWithdrawn: item.is_withdrawn,
    withdrawalRequested: item.withdrawal_requested,
    item: item
  }))

  // Handle selling for credits with race condition protection
  const handleSellForCredits = async (item: InventoryItem) => {
    // Immediate checks to prevent race conditions
    if (selling || item.is_withdrawn) {
      console.log('⚠️ Sale attempt blocked - already selling or item already sold')
      return
    }

    console.log('💰 Starting sale for item:', item.id)
    setSelling(item.id)
    
    // Immediately mark as withdrawn in local state to prevent double sales
    setInventory(prev => prev.map(invItem => 
      invItem.id === item.id 
        ? { ...invItem, is_withdrawn: true, withdrawal_type: 'credits' }
        : invItem
    ))

    try {
      const response = await fetch('/api/withdraw-symbol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          withdrawalType: 'credits'
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Item sold successfully:', data)
        
        // Update inventory with full sale data (already marked as withdrawn above)
        setInventory(prev => prev.map(invItem => 
          invItem.id === item.id 
            ? { ...invItem, is_withdrawn: true, withdrawal_type: 'credits', withdrawal_tx_hash: data.txHash }
            : invItem
        ))
        
        // Success feedback handled by UI update
        
        // Trigger credits update in parent component
        if (onCreditsUpdated) {
          onCreditsUpdated()
        }
        
        // Show success feedback
        console.log(`💰 Successfully sold ${item.symbol_name} for ${item.reward_value} credits!`)
        
      } else {
        const error = await response.json()
        console.error('❌ Sale failed:', error)
        
        // IMPORTANT: Rollback the optimistic update if sale failed
        setInventory(prev => prev.map(invItem => 
          invItem.id === item.id 
            ? { ...invItem, is_withdrawn: false, withdrawal_type: undefined }
            : invItem
        ))
        
        alert(`Sale failed: ${error.error}`)
      }
    } catch (error: any) {
      console.error('❌ Sale error:', error)
      
      // IMPORTANT: Rollback the optimistic update if sale failed
      setInventory(prev => prev.map(invItem => 
        invItem.id === item.id 
          ? { ...invItem, is_withdrawn: false, withdrawal_type: undefined }
          : invItem
      ))
      
      alert('Sale failed. Please try again.')
    } finally {
      setSelling(null)
    }
  }

  const totalValue = inventory.reduce((sum, item) => sum + item.reward_value, 0)
  const availableValue = inventory.filter(item => !item.is_withdrawn && !item.withdrawal_requested).reduce((sum, item) => sum + item.reward_value, 0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-background/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-card border border-border rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600/15 to-red-600/15 p-5 border-b border-border">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">💎 Stash</h2>
              <div className="text-sm text-foreground/70 mb-3">Balance: <span className="font-semibold text-orange-400">{userCredits.toLocaleString()} credits</span> • ≈ {(userCredits * 0.01).toFixed(2)} ADA</div>
              <div className="text-xs text-foreground/60 mb-3">
                Cash-out uses a market spread and includes a 1% service fee. Network fees apply.
              </div>
              <Button onClick={() => setShowWithdrawalForm(true)} disabled={userCredits < 1000} className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white text-sm px-4 py-2" size="sm">
                {userCredits < 1000 ? '🔒 Need 1,000+' : '🏦 Withdraw'}
              </Button>
            </div>
            <Button onClick={onClose} variant="outline" className="border-border">
              ✕ Close
            </Button>
          </div>
        </div>

        {/* Minimal header only; removed old filters and lists */}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {loading ? (
            <div className="text-center text-foreground/60 py-8">
              <div className="animate-spin text-2xl mb-2">⚙️</div>
              Loading chest...
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💎</div>
              <div className="text-2xl font-bold text-foreground mb-4">
                {userCredits.toLocaleString()} Credits Available
              </div>
              <div className="text-lg text-foreground/70 mb-6">
                ≈ {(userCredits * 0.01).toFixed(2)} ADA
              </div>
              
              {userCredits >= 1000 ? (
                <div className="space-y-4">
                  <div className="text-foreground/70">
                    Withdraw 1,000–20,000 credits as ADA to your connected wallet.
                  </div>
                  <Button
                    onClick={() => setShowWithdrawalForm(true)}
                    className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white px-8 py-3 text-lg"
                  >
                    🏦 Withdraw ADA
                  </Button>
                </div>
              ) : (
                <div className="text-foreground/60">
                  <div className="text-lg mb-2">🔒 Withdrawals require minimum 1,000 credits</div>
                  <div className="text-sm">Open more cases to reach the minimum!</div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Withdrawal Amount Form */}
      <AnimatePresence>
        {showWithdrawalForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 z-60 flex items-center justify-center p-4"
            onClick={() => setShowWithdrawalForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-bold text-foreground mb-4 text-center">🏦 Withdraw Credits as ADA</h3>
              
              <div className="mb-6">
                <div className="bg-background/50 rounded-lg p-4 mb-4 border border-border">
                  <div className="text-center">
                    <div className="text-sm text-foreground/60 mb-1">Available Credits</div>
                    <div className="text-2xl font-bold text-orange-400 mb-1">
                      {userCredits.toLocaleString()}
                    </div>
                    <div className="text-foreground/70 text-sm">
                      ≈ {(userCredits * 0.01).toFixed(2)} ADA
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Withdrawal Amount (Credits)
                    </label>
                    <input
                      type="range"
                      min="1000"
                      max={Math.min(userCredits, 20000)}
                      step="100"
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(parseInt(e.target.value))}
                      className="w-full h-2 bg-foreground/20 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-foreground/60 mt-1">
                      <span>1,000</span>
                      <span>{Math.min(userCredits, 20000).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="bg-orange-600/10 border border-orange-500/30 rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-foreground mb-1">
                        {withdrawalAmount.toLocaleString()} credits
                      </div>
                      <div className="text-foreground/70">
                        ≈ {(withdrawalAmount * 0.01).toFixed(2)} ADA
                      </div>
                      <div className="text-xs text-foreground/60 mt-2">
                        Will be sent to your connected wallet
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1000"
                      max={Math.min(userCredits, 20000)}
                      step="100"
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(Math.max(1000, Math.min(parseInt(e.target.value) || 1000, Math.min(userCredits, 20000))))}
                      className="flex-1 p-3 bg-background border border-border rounded-lg text-foreground text-center"
                      placeholder="Enter amount"
                    />
                    <Button
                      onClick={() => setWithdrawalAmount(Math.min(userCredits, 20000))}
                      variant="outline"
                      className="border-border text-foreground/80"
                    >
                      Max
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={() => setShowWithdrawalForm(false)}
                  variant="outline"
                  className="flex-1 border-border"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setShowConfirmation(true)}
                  className="flex-1 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
                  disabled={withdrawalAmount < 1000 || withdrawalAmount > userCredits || withdrawalAmount > 20000}
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 z-70 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-card border border-red-500/40 rounded-2xl p-6 max-w-sm w-full"
            >
              <div className="text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-xl font-bold text-foreground mb-4">Confirm Withdrawal</h3>
                
                <div className="bg-red-600/10 border border-red-500/30 rounded-lg p-4 mb-6">
                  <div className="text-lg font-bold text-foreground mb-1">
                    {withdrawalAmount.toLocaleString()} credits
                  </div>
                  <div className="text-foreground/70 mb-2">
                    ≈ {(withdrawalAmount * 0.01).toFixed(2)} ADA
                  </div>
                  <div className="text-xs text-foreground/60">
                    This action cannot be undone
                  </div>
                </div>
                
                <div className="text-sm text-foreground/80 mb-6">
                  Are you sure you want to withdraw {withdrawalAmount.toLocaleString()} credits as ADA to your connected wallet?
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={() => setShowConfirmation(false)}
                  variant="outline"
                  className="flex-1 border-border"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleCreditWithdrawalRequest(withdrawalAmount)}
                  className="flex-1 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400"
                  disabled={withdrawalSubmitting}
                >
                  {withdrawalSubmitting ? '⚙️ Processing...' : 'Confirm Withdrawal'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
} 