"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { SYMBOL_CONFIG, RARITY_CONFIG, getSymbolByKey } from '@/lib/symbols'
import { useWallet } from '@meshsdk/react'

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
  const [filter, setFilter] = useState<'all' | 'available' | 'sold'>('all')
  const [rarityFilter, setRarityFilter] = useState<string>('all')
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [selling, setSelling] = useState<string | null>(null)
  const [minting, setMinting] = useState<string | null>(null)
  const [justSold, setJustSold] = useState<string | null>(null)
  const [showWithdrawalForm, setShowWithdrawalForm] = useState<InventoryItem | null>(null)
  const [withdrawalSubmitting, setWithdrawalSubmitting] = useState(false)

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

  // Request manual withdrawal
  const handleWithdrawalRequest = async (item: InventoryItem, paymentMethod: string, paymentDetails: string) => {
    if (withdrawalSubmitting || item.is_withdrawn) return
    setWithdrawalSubmitting(true)

    try {
      const userId = await resolveUserId()
      if (!userId) {
        alert('Unable to verify user. Please reconnect your wallet and try again.')
        setWithdrawalSubmitting(false)
        return
      }

      const response = await fetch('/api/request-withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          caseOpeningId: item.id,
          withdrawalType: 'cash',
          paymentMethod,
          paymentDetails,
          walletAddress: wallet ? (await wallet.getUsedAddresses())[0] : undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Failed to submit withdrawal request')
        setWithdrawalSubmitting(false)
        return
      }

      // Mark as withdrawal requested (not withdrawn yet)
      setInventory(prev => prev.map(invItem =>
        invItem.id === item.id
          ? { ...invItem, withdrawal_requested: true }
          : invItem
      ))

      setShowWithdrawalForm(null)
      setSelectedItem(null)
      alert(`✅ Withdrawal request submitted! Request ID: ${data.requestId}\n\nYou'll receive email confirmation shortly. Processing time: ${data.estimatedProcessingTime}`)
      
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
    }
  }, [isOpen, connected])

  // Filter inventory items
  const filteredInventory = inventory.filter(item => {
    const passesStatusFilter = 
      filter === 'all' || 
      (filter === 'available' && !item.is_withdrawn) ||
      (filter === 'sold' && item.is_withdrawn)

    const passesRarityFilter = 
      rarityFilter === 'all' || item.symbol_rarity === rarityFilter

    return passesStatusFilter && passesRarityFilter
  })

  // Group items by symbol for better display
  const groupedInventory = filteredInventory.reduce((groups, item) => {
    const key = item.symbol_key
    if (!groups[key]) {
      groups[key] = {
        symbol: getSymbolByKey(key),
        items: [],
        totalValue: 0,
        count: 0
      }
    }
    groups[key].items.push(item)
    groups[key].totalValue += item.reward_value
    groups[key].count++
    return groups
  }, {} as Record<string, any>)

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
        
        // Show just sold animation
        setJustSold(item.id)
        setTimeout(() => setJustSold(null), 3000)
        
        // Close item detail modal
        setSelectedItem(null)
        
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

  const rarities = ['all', 'common', 'uncommon', 'rare', 'epic', 'legendary']
  const totalValue = inventory.reduce((sum, item) => sum + item.reward_value, 0)
  const availableValue = inventory.filter(item => !item.is_withdrawn).reduce((sum, item) => sum + item.reward_value, 0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-900 border border-gray-700 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Symbol Collection</h2>
              <div className="flex gap-6 text-sm text-gray-300">
                <span>Total Items: {inventory.length}</span>
                <span>Available: {inventory.filter(item => !item.is_withdrawn).length}</span>
                <span>Total Value: {totalValue} credits</span>
                <span>Available Value: {availableValue} credits</span>
              </div>
            </div>
            <Button onClick={onClose} variant="outline" className="border-gray-600">
              ✕ Close
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-700 bg-gray-800/50">
          <div className="flex flex-wrap gap-4">
            {/* Status Filter */}
            <div className="flex gap-2">
              <Button
                onClick={() => setFilter('all')}
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                className={filter === 'all' ? 'bg-purple-600' : 'border-gray-600'}
              >
                All
              </Button>
              <Button
                onClick={() => setFilter('available')}
                variant={filter === 'available' ? 'default' : 'outline'}
                size="sm"
                className={filter === 'available' ? 'bg-green-600' : 'border-gray-600'}
              >
                Available
              </Button>
              <Button
                onClick={() => setFilter('sold')}
                variant={filter === 'sold' ? 'default' : 'outline'}
                size="sm"
                className={filter === 'sold' ? 'bg-red-600' : 'border-gray-600'}
              >
                Sold
              </Button>
            </div>

            {/* Rarity Filter */}
            <div className="flex gap-2">
              {rarities.map(rarity => (
                <Button
                  key={rarity}
                  onClick={() => setRarityFilter(rarity)}
                  variant={rarityFilter === rarity ? 'default' : 'outline'}
                  size="sm"
                  className={`${
                    rarityFilter === rarity 
                      ? rarity === 'all' ? 'bg-gray-600' : `bg-${rarity === 'legendary' ? 'yellow' : rarity === 'epic' ? 'purple' : rarity === 'rare' ? 'blue' : rarity === 'uncommon' ? 'green' : 'gray'}-600`
                      : 'border-gray-600'
                  } capitalize`}
                >
                  {rarity}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {loading ? (
            <div className="text-center text-gray-400 py-8">
              <div className="animate-spin text-2xl mb-2">⚙️</div>
              Loading inventory...
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <div className="text-4xl mb-4">📦</div>
              <div className="text-lg">No items found</div>
              <div className="text-sm">Open some cases to build your collection!</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(groupedInventory).map(([symbolKey, group]) => {
                const symbol = group.symbol
                const rarity = RARITY_CONFIG[symbol?.rarity as keyof typeof RARITY_CONFIG]
                const hasJustSold = group.items.some((item: InventoryItem) => justSold === item.id)
                
                return (
                  <motion.div
                    key={symbolKey}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      scale: hasJustSold ? [1, 1.05, 1] : 1
                    }}
                    transition={{ 
                      duration: hasJustSold ? 0.6 : 0.3,
                      repeat: hasJustSold ? 2 : 0
                    }}
                    className={`relative border-2 ${rarity?.border} rounded-xl p-4 ${rarity?.gradient} bg-opacity-10 hover:bg-opacity-20 transition-all cursor-pointer group ${
                      hasJustSold ? 'ring-4 ring-green-400 ring-opacity-50' : ''
                    }`}
                  >
                    {/* Just Sold Effect */}
                    {hasJustSold && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        className="absolute inset-0 bg-green-500/20 rounded-xl flex items-center justify-center z-10"
                      >
                        <div className="text-green-400 font-bold text-lg">SOLD! 💰</div>
                      </motion.div>
                    )}

                    {/* Symbol Display */}
                    <div className="text-center mb-4">
                      <div className="text-4xl mb-2">{symbol?.emoji || '❓'}</div>
                      <h3 className="font-bold text-white text-sm mb-1">{symbol?.name}</h3>
                      <div className={`text-xs px-2 py-1 rounded-full ${rarity?.gradient} text-white`}>
                        {symbol?.rarity}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="space-y-2 text-xs text-gray-300 mb-4">
                      <div className="flex justify-between">
                        <span>Count:</span>
                        <span className="text-white font-semibold">×{group.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Value:</span>
                        <span className="text-yellow-400 font-semibold">{group.totalValue}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Available:</span>
                        <span className="text-green-400 font-semibold">
                          ×{group.items.filter((item: InventoryItem) => !item.is_withdrawn).length}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 space-y-2">
                      <Button
                        onClick={() => setSelectedItem(group.items[0])}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                        size="sm"
                        disabled={hasJustSold}
                      >
                        View Details
                      </Button>
                      
                      {group.items.some((item: InventoryItem) => !item.is_withdrawn) && (
                        <Button
                          onClick={() => {
                            const availableItem = group.items.find((item: InventoryItem) => !item.is_withdrawn)
                            if (availableItem && !selling) {
                              handleSellForCredits(availableItem)
                            }
                          }}
                          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                          size="sm"
                          disabled={!!selling || hasJustSold || !group.items.some((item: InventoryItem) => !item.is_withdrawn)}
                        >
                          {selling ? '⚙️ Selling...' : hasJustSold ? '✅ Sold!' : '💰 Sell for Credits'}
                        </Button>
                      )}
                    </div>

                    {/* Sold indicator */}
                    {group.items.every((item: InventoryItem) => item.is_withdrawn) && !hasJustSold && (
                      <div className="absolute top-2 right-2 bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
                        Sold
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-60 flex items-center justify-center p-4"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-800 border border-gray-600 rounded-xl p-6 max-w-md w-full"
            >
              {(() => {
                const symbol = getSymbolByKey(selectedItem.symbol_key)
                const rarity = RARITY_CONFIG[symbol?.rarity as keyof typeof RARITY_CONFIG]
                
                return (
                  <>
                    <div className="text-center mb-6">
                      <div className="text-6xl mb-3">{symbol?.emoji || '❓'}</div>
                      <h3 className="text-xl font-bold text-white mb-2">{symbol?.name}</h3>
                      <div className={`inline-block px-3 py-1 rounded-full ${rarity?.gradient} text-white text-sm`}>
                        {symbol?.rarity}
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Value:</span>
                        <span className="text-yellow-400 font-semibold">{selectedItem.reward_value} credits</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Obtained:</span>
                        <span className="text-gray-300">{new Date(selectedItem.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <span className={selectedItem.is_withdrawn ? "text-red-400" : "text-green-400"}>
                          {selectedItem.is_withdrawn ? 'Sold' : 'Available'}
                        </span>
                      </div>
                    </div>

                    {!selectedItem.is_withdrawn && (
                      <div className="space-y-3">
                        <h4 className="text-white font-semibold">Sell or Withdraw:</h4>
                        <Button
                          onClick={() => {
                            if (!selling && !selectedItem.is_withdrawn) {
                              handleSellForCredits(selectedItem)
                            }
                          }}
                          className="w-full bg-yellow-600 hover:bg-yellow-700"
                          disabled={!!selling || selectedItem.is_withdrawn}
                        >
                          {selling === selectedItem.id ? '⚙️ Selling...' : 
                           selectedItem.is_withdrawn ? '✅ Already Sold' :
                           `💰 Sell for ${selectedItem.reward_value} Credits`}
                        </Button>
                        <Button
                          onClick={() => setShowWithdrawalForm(selectedItem)}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          disabled={selectedItem.is_withdrawn}
                        >
                          💸 Request Cash Withdrawal
                        </Button>
                        <p className="text-xs text-gray-500 text-center">
                          {selectedItem.is_withdrawn
                            ? 'This item has already been withdrawn.'
                            : 'Sell for credits instantly, or request cash withdrawal (manual processing 24-48h).'}
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={() => setSelectedItem(null)}
                      variant="outline"
                      className="w-full mt-4 border-gray-600"
                    >
                      Close
                    </Button>
                  </>
                )
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Withdrawal Request Form */}
      <AnimatePresence>
        {showWithdrawalForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-70 flex items-center justify-center p-4"
            onClick={() => setShowWithdrawalForm(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-800 border border-gray-600 rounded-xl p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-bold text-white mb-4">💸 Request Cash Withdrawal</h3>
              
              <div className="mb-4 p-4 bg-gray-700 rounded-lg">
                <div className="text-center">
                  <div className="text-3xl mb-2">{getSymbolByKey(showWithdrawalForm.symbol_key)?.icon || '❓'}</div>
                  <div className="font-semibold text-white">{showWithdrawalForm.symbol_name}</div>
                  <div className="text-yellow-400 font-bold">{showWithdrawalForm.reward_value} credits</div>
                </div>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.target as HTMLFormElement)
                const paymentMethod = formData.get('paymentMethod') as string
                const paymentDetails = formData.get('paymentDetails') as string
                
                if (!paymentMethod || !paymentDetails) {
                  alert('Please fill in all fields')
                  return
                }
                
                handleWithdrawalRequest(showWithdrawalForm, paymentMethod, paymentDetails)
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Payment Method
                    </label>
                    <select 
                      name="paymentMethod"
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      required
                    >
                      <option value="">Select payment method</option>
                      <option value="paypal">PayPal</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="crypto">Cryptocurrency</option>
                      <option value="venmo">Venmo</option>
                      <option value="cashapp">Cash App</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Payment Details
                    </label>
                    <textarea
                      name="paymentDetails"
                      placeholder="Enter your PayPal email, bank account details, crypto address, etc."
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white h-20 resize-none"
                      required
                    />
                  </div>
                  
                  <div className="bg-blue-900/30 border border-blue-600/30 rounded-lg p-3">
                    <div className="text-sm text-blue-300">
                      <strong>📋 Processing Info:</strong>
                      <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
                        <li>Manual review within 24-48 hours</li>
                        <li>You'll receive email confirmation</li>
                        <li>Minimum processing fee may apply</li>
                        <li>Funds sent within 1-3 business days</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <Button
                    type="button"
                    onClick={() => setShowWithdrawalForm(null)}
                    variant="outline"
                    className="flex-1 border-gray-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={withdrawalSubmitting}
                  >
                    {withdrawalSubmitting ? '⚙️ Submitting...' : '📤 Submit Request'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 