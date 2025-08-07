"use client"

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@meshsdk/react'

interface WalletBalanceProps {
  tokenPolicyId?: string
  tokenName?: string
  showCredits?: boolean
  onCreditsChange?: (credits: number) => void
  forceRefresh?: number // Add this to trigger external updates
  // Allow external credit override for main page display
  cardanoBalance?: number
  credits?: number
  // External connection state to override internal wallet state
  connected?: boolean
  walletAddress?: string
}

interface Balance {
  ada: number
  token: number
  credits: number
  loading: boolean
  error?: string
  lastUpdate?: number
}

export default function WalletBalance({ 
  tokenPolicyId, 
  tokenName = "Token",
  showCredits = true,
  onCreditsChange,
  forceRefresh,
  cardanoBalance,
  credits: externalCredits,
  connected: externalConnected,
  walletAddress: externalWalletAddress
}: WalletBalanceProps) {
  const { connected: meshConnected, wallet } = useWallet()
  
  // Use external connection state if provided, otherwise use Mesh wallet state
  const connected = externalConnected !== undefined ? externalConnected : meshConnected
  const [balance, setBalance] = useState<Balance>({
    ada: 0,
    token: 0,
    credits: 0,
    loading: false
  })
  const [creditChange, setCreditChange] = useState<{amount: number, show: boolean}>({amount: 0, show: false})
  const previousCredits = useRef<number>(0)
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Smooth credit animation when credits change
  const animateCreditsChange = (newCredits: number, oldCredits: number) => {
    const change = newCredits - oldCredits
    if (change !== 0) {
      setCreditChange({amount: change, show: true})
      setTimeout(() => setCreditChange({amount: 0, show: false}), 3000)
    }
  }

  // Enhanced credit fetching with instant updates
  const fetchCredits = async (showAnimation = false) => {
    if (!connected) return 0

    try {
      let walletAddress = externalWalletAddress
      
      // If no external wallet address provided, get it from the wallet
      if (!walletAddress && wallet) {
        const walletAddresses = await wallet.getUsedAddresses()
        walletAddress = Array.isArray(walletAddresses) ? walletAddresses[0] : walletAddresses
      }
      
      if (!walletAddress) {
        console.error('❌ No wallet address available for credit fetch')
        return 0
      }
      
      const response = await fetch('/api/get-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      })
      
      if (response.ok) {
        const data = await response.json()
        const newCredits = data.credits || 0
        
        if (showAnimation && previousCredits.current !== newCredits) {
          animateCreditsChange(newCredits, previousCredits.current)
        }
        
        previousCredits.current = newCredits
        return newCredits
      }
    } catch (error) {
      console.error('Failed to fetch credits:', error)
    }
    return 0
  }

  // Instant credit update (called externally)
  const updateCreditsInstantly = async (expectedCredits: number | undefined = undefined) => {
    if (!connected) return

    const oldCredits = balance.credits
    
    // Optimistic update if we have expected credits
    if (expectedCredits !== undefined) {
      setBalance(prev => ({ 
        ...prev, 
        credits: expectedCredits,
        lastUpdate: Date.now()
      }))
      animateCreditsChange(expectedCredits, oldCredits)
      
      if (onCreditsChange) {
        onCreditsChange(expectedCredits)
      }
    }

    // Then verify with API
    const actualCredits = await fetchCredits(false)
    if (actualCredits !== expectedCredits) {
      setBalance(prev => ({ 
        ...prev, 
        credits: actualCredits,
        lastUpdate: Date.now()
      }))
      
      if (onCreditsChange) {
        onCreditsChange(actualCredits)
      }
    }
  }

  // Enhanced balance fetcher with smooth updates
  const fetchBalance = async (showCreditAnimation = true) => {
    if (!connected) return

    setBalance(prev => ({ ...prev, loading: true }))

    try {
      let adaBalance = 0
      
      // Only fetch ADA balance if we have a wallet connection and no external balance
      if (wallet && cardanoBalance === undefined) {
        const balanceValue = await wallet.getBalance()

        if (Array.isArray(balanceValue)) {
          const adaAsset = balanceValue.find(asset => asset.unit === 'lovelace')
          if (adaAsset) {
            adaBalance = parseInt(adaAsset.quantity) / 1000000
          }
        }
      } else if (cardanoBalance !== undefined) {
        adaBalance = cardanoBalance
      }

      // Get credits with animation
      const credits = showCredits ? await fetchCredits(showCreditAnimation) : 0

      setBalance({
        ada: adaBalance,
        token: 0,
        credits,
        loading: false,
        lastUpdate: Date.now()
      })

      // Notify parent of credit changes
      if (onCreditsChange && showCredits) {
        onCreditsChange(credits)
      }

    } catch (error) {
      console.error('Balance fetch error:', error)
      setBalance(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Failed to fetch balance' 
      }))
    }
  }

  // Use external credits if provided, otherwise fetch them
  useEffect(() => {
    if (externalCredits !== undefined) {
      console.log('💰 WalletBalance: Using external credits:', externalCredits)
      setBalance(prev => ({ 
        ...prev, 
        credits: externalCredits,
        lastUpdate: Date.now()
      }))
      if (onCreditsChange) {
        onCreditsChange(externalCredits)
      }
    } else if (connected) {
      console.log('💰 WalletBalance: Fetching own credits')
      fetchBalance(false) // Don't show animation on first load
    }
  }, [connected, externalCredits])
  
  // Update ADA balance when external cardanoBalance is provided
  useEffect(() => {
    if (cardanoBalance !== undefined) {
      console.log('💰 WalletBalance: Using external ADA balance:', cardanoBalance)
      setBalance(prev => ({ ...prev, ada: cardanoBalance }))
    }
  }, [cardanoBalance])

  // Force refresh when external trigger changes
  useEffect(() => {
    if (forceRefresh && connected) {
      updateCreditsInstantly(undefined)
    }
  }, [forceRefresh, connected])

  // Auto-refresh credits every 15 seconds if connected
  useEffect(() => {
    if (!connected || !showCredits) return

    const interval = setInterval(() => fetchBalance(true), 15000)
    return () => clearInterval(interval)
  }, [connected, showCredits])

  // Debug function to troubleshoot issues
  const debugWallet = async () => {
    if (!connected || !wallet) {
      console.log('❌ Wallet not connected for debug')
      return
    }

    try {
      const walletAddresses = await wallet.getUsedAddresses()
      const walletAddress = Array.isArray(walletAddresses) ? walletAddresses[0] : walletAddresses
      
      console.log('🔧 Starting wallet debug...')
      
      const response = await fetch('/api/debug-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress,
          action: 'full_debug'
        })
      })
      
      if (response.ok) {
        const debugData = await response.json()
        console.log('🔧 Debug results:', debugData)
        
        // Create a downloadable debug report
        const debugReport = JSON.stringify(debugData, null, 2)
        const blob = new Blob([debugReport], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `wallet-debug-${Date.now()}.json`
        a.click()
        URL.revokeObjectURL(url)
        
        alert('Debug report downloaded! Check console for details.')
      } else {
        console.error('❌ Debug request failed')
      }
    } catch (error) {
      console.error('❌ Debug error:', error)
    }
  }

  // Expose update function globally for external calls
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).updateWalletCredits = updateCreditsInstantly
    }
  }, [updateCreditsInstantly])

  if (!connected) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-800/90 backdrop-blur-sm border border-gray-600/50 rounded-xl p-4 text-center shadow-lg"
      >
        <div className="text-gray-400 text-sm flex items-center justify-center gap-2">
          <span className="text-lg">🔒</span>
          Connect wallet to view balance
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-md border border-orange-500/30 rounded-2xl p-4 shadow-2xl relative overflow-hidden min-w-[280px] min-h-[100px] will-change-transform"
      style={{ 
        backfaceVisibility: 'hidden',
        perspective: 1000,
        transform: 'translate3d(0, 0, 0)'
      }}
    >
      {/* Subtle update indicator */}
      <AnimatePresence>
        {balance.lastUpdate && Date.now() - balance.lastUpdate < 500 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.05 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-2xl"
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      {balance.loading ? (
        <div className="space-y-3 relative z-10">
          {/* Header */}
          <div className="text-center border-b border-gray-700/50 pb-2">
            <h3 className="text-sm font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
              Wallet Balance
            </h3>
          </div>

          {/* Loading state with same layout */}
          <div className="grid grid-cols-2 gap-4">
            {/* ADA Loading */}
            <div className="text-center">
              <div className="flex flex-col items-center gap-1">
                <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs font-bold font-jetbrains">₳</span>
                </div>
                <div className="text-orange-400 font-bold text-xs font-jetbrains">ADA</div>
                <div className="text-orange-400 font-bold text-lg animate-pulse">--</div>
              </div>
            </div>

            {/* Credits Loading */}
            <div className="text-center">
              <div className="flex flex-col items-center gap-1">
                <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                  <span className="text-black text-xs font-bold font-jetbrains">C</span>
                </div>
                <div className="text-yellow-400 font-bold text-xs font-jetbrains">CREDITS</div>
                <div className="text-yellow-400 font-bold text-lg animate-pulse">--</div>
              </div>
            </div>
          </div>

          {/* Loading refresh button */}
          <div className="flex justify-center items-center pt-2 border-t border-gray-700/50">
            <motion.div
              className="px-3 py-1 rounded-lg text-xs text-gray-400 font-jetbrains border border-gray-600"
            >
              <div className="flex items-center gap-1">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-2 h-2 border border-orange-400 border-t-transparent rounded-full"
                />
                UPDATING
              </div>
            </motion.div>
          </div>
        </div>
      ) : balance.error ? (
        <div className="space-y-3 relative z-10">
          {/* Header */}
          <div className="text-center border-b border-gray-700/50 pb-2">
            <h3 className="text-sm font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
              Wallet Balance
            </h3>
          </div>
          <div className="text-red-400 text-sm text-center">
            {balance.error}
          </div>
        </div>
      ) : (
        <div className="space-y-3 relative z-10">
          {/* Header */}
          <div className="text-center border-b border-gray-700/50 pb-2">
            <h3 className="text-sm font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
              Wallet Balance
            </h3>
          </div>

          {/* Horizontal layout for ADA and Credits */}
          <div className="flex items-center justify-between gap-6 py-1">
            {/* ADA Balance */}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold font-jetbrains">₳</span>
              </div>
              <div>
                <div className="text-orange-400 font-bold text-xs font-jetbrains">ADA</div>
                <motion.span 
                  className="text-orange-400 font-bold text-sm"
                  key={`ada-${balance.ada}-${balance.lastUpdate || 0}`}
                  initial={{ scale: 1 }}
                  animate={{ scale: 1 }}
                  style={{ display: 'inline-block', minWidth: '2.5rem', textAlign: 'left' }}
                >
                  {balance.ada.toFixed(2)}
                </motion.span>
              </div>
            </div>

            {/* Separator */}
            <div className="w-px h-8 bg-gray-600/50"></div>

            {/* Credits Balance */}
            {showCredits && (
              <div className="flex items-center gap-2 relative">
                <div className="w-5 h-5 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                  <span className="text-black text-xs font-bold font-jetbrains">C</span>
                </div>
                <div>
                  <div className="text-yellow-400 font-bold text-xs font-jetbrains">CREDITS</div>
                  <motion.span 
                    className="text-yellow-400 font-bold text-sm"
                    key={`credits-${balance.credits}-${balance.lastUpdate || 0}`}
                    initial={{ scale: 1, color: "#FBBF24" }}
                    animate={{ scale: 1, color: "#FBBF24" }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'inline-block', minWidth: '3rem', textAlign: 'left' }}
                  >
                    {balance.credits.toLocaleString()}
                  </motion.span>

                  {/* Credit change indicator */}
                  <AnimatePresence>
                    {creditChange.show && (
                      <motion.div
                        initial={{ opacity: 0, x: 5, scale: 0.8 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -5, scale: 0.8 }}
                        className={`absolute top-0 -right-8 font-bold text-xs ${
                          creditChange.amount > 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {creditChange.amount > 0 ? '+' : ''}{creditChange.amount}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Refresh button - inline */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => fetchBalance(true)}
              disabled={balance.loading}
              className="px-2 py-1 rounded-lg text-xs text-gray-400 hover:text-orange-400 transition-all duration-200 font-jetbrains border border-gray-600 hover:border-orange-400/50"
            >
              {balance.loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-3 h-3 border border-orange-400 border-t-transparent rounded-full"
                />
              ) : (
                <span className="text-xs">🔄</span>
              )}
            </motion.button>
          </div>


        </div>
      )}
    </motion.div>
  )
} 