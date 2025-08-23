"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { authFetch } from '@/lib/authFetch'
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
  const hasFetchedInitial = useRef<boolean>(false)
  const currentAddressRef = useRef<string | null>(null)

  // Hydrate from cached last known credits per-address once address is known
  const hydrateFromCacheForAddress = useCallback((addr: string) => {
    try {
      const cached = window.localStorage.getItem(`lastKnownCredits:${addr}`)
      const cachedNum = cached != null ? Number(cached) : NaN
      if (!Number.isNaN(cachedNum) && cachedNum >= 0) {
        previousCredits.current = cachedNum
        setBalance(prev => ({ ...prev, credits: cachedNum }))
      }
    } catch {}
  }, [])

  // Smooth credit animation when credits change
  const animateCreditsChange = (newCredits: number, oldCredits: number) => {
    const change = newCredits - oldCredits
    if (change !== 0) {
      setCreditChange({amount: change, show: true})
      setTimeout(() => setCreditChange({amount: 0, show: false}), 3000)
    }
  }

  // Enhanced credit fetching with instant updates
  // Silent reverify to recover from expired/missing token
  const silentReverify = useCallback(async (): Promise<boolean> => {
    try {
      let wa = externalWalletAddress
      if (!wa && wallet) {
        const walletAddresses = await wallet.getUsedAddresses()
        wa = Array.isArray(walletAddresses) ? walletAddresses[0] : walletAddresses
      }
      if (!wa) return false
      const nres = await fetch('/api/auth/wallet/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: wa })
      })
      const ndata = await nres.json().catch(() => null)
      if (!nres.ok || !ndata?.nonce) return false
      const vres = await fetch('/api/auth/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: wa, signature: ndata.nonce })
      })
      const vdata = await vres.json().catch(() => null)
      if (!vres.ok || !vdata?.token) return false
      try {
        // Store token scoped to address and also set as current global
        localStorage.setItem(`userToken:${wa}`, vdata.token)
        localStorage.setItem('userToken', vdata.token)
        window.dispatchEvent(new Event('user-token-set'))
      } catch {}
      return true
    } catch {
      return false
    }
  }, [externalWalletAddress, wallet])

  const fetchCredits = useCallback(async (showAnimation = false) => {
    if (!connected) return 0

    try {
      // Resolve wallet address first
      let walletAddressInner = externalWalletAddress
      
      // If no external wallet address provided, get it from the wallet
      if (!walletAddressInner && wallet) {
        const walletAddresses = await wallet.getUsedAddresses()
        walletAddressInner = Array.isArray(walletAddresses) ? walletAddresses[0] : walletAddresses
      }
      
      if (!walletAddressInner) {
        console.error('❌ No wallet address available for credit fetch')
        return 0
      }
      
      // Ensure JWT exists before calling protected endpoint (prefer address-scoped token)
      const waTokenKey = walletAddressInner ? `userToken:${walletAddressInner}` : null
      const token = typeof window !== 'undefined'
        ? (waTokenKey ? (localStorage.getItem(waTokenKey) || localStorage.getItem('userToken')) : localStorage.getItem('userToken'))
        : null
      if (!token) {
        return previousCredits.current || 0
      }
      
      let response = await authFetch('/api/get-credits', { method: 'POST' })
      if (response.status === 401) {
        // Attempt silent reverify once, then retry
        const reauthed = await silentReverify()
        if (reauthed) {
          response = await authFetch('/api/get-credits', { method: 'POST' })
        }
      }
      
      if (response.ok) {
        const data = await response.json()
        const newCredits = data.credits || 0
        
        if (showAnimation && previousCredits.current !== newCredits) {
          animateCreditsChange(newCredits, previousCredits.current)
        }
        
        previousCredits.current = newCredits
        try { if (walletAddressInner) localStorage.setItem(`lastKnownCredits:${walletAddressInner}`, String(newCredits)) } catch {}
        return newCredits
      }
    } catch (error) {
      console.error('Failed to fetch credits:', error)
    }
    // Do not clobber a known balance with 0 on failures
    return previousCredits.current || 0
  }, [connected, externalWalletAddress, silentReverify]) // Removed wallet dependency to prevent recreation

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
      try { if (currentAddressRef.current) localStorage.setItem(`lastKnownCredits:${currentAddressRef.current}`, String(expectedCredits)) } catch {}
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
      try { if (currentAddressRef.current) localStorage.setItem(`lastKnownCredits:${currentAddressRef.current}`, String(actualCredits)) } catch {}
      
      if (onCreditsChange) {
        onCreditsChange(actualCredits)
      }
    }
  }

  // Simplified ADA balance fetcher  
  const fetchAdaBalance = useCallback(async () => {
    if (!connected || !wallet) return 0

    try {
      console.log('💰 Fetching ADA balance...')
      const balanceValue = await wallet.getBalance()
      console.log('💰 Raw wallet balance:', balanceValue)

      if (Array.isArray(balanceValue)) {
        const adaAsset = balanceValue.find(asset => asset.unit === 'lovelace')
        if (adaAsset) {
          const adaBalance = parseInt(adaAsset.quantity) / 1000000
          console.log('💰 ADA balance found:', adaBalance)
          return adaBalance
        }
      }
      
      console.log('💰 No ADA balance found in response')
      return 0
    } catch (error) {
      console.error('❌ Error fetching ADA balance:', error)
      return 0
    }
  }, [connected, wallet])

  // Enhanced balance fetcher with smooth updates
  const fetchBalance = useCallback(async (showCreditAnimation = true) => {
    if (!connected) return

    setBalance(prev => ({ ...prev, loading: true }))

    try {
      let adaBalance = 0
      
      // Fetch ADA balance if no external balance provided
      if (cardanoBalance === undefined) {
        adaBalance = await fetchAdaBalance()
      } else {
        adaBalance = cardanoBalance
      }

      // Get credits with animation
      const fetchedCredits = showCredits ? await fetchCredits(showCreditAnimation) : 0
      const credits = fetchedCredits === 0 && previousCredits.current > 0 ? previousCredits.current : fetchedCredits

      console.log('💰 Final balances - ADA:', adaBalance, 'Credits:', credits)

      // Only update if values actually changed to prevent unnecessary re-renders
      setBalance(prev => {
        const hasChanges = 
          prev.ada !== adaBalance || 
          prev.credits !== credits || 
          prev.loading !== false
        
        if (!hasChanges) {
          return prev // Return the same object to prevent re-render
        }
        
        const nextState = {
          ada: (adaBalance === 0 && prev.ada > 0) ? prev.ada : adaBalance,
          token: 0,
          credits,
          loading: false,
          lastUpdate: Date.now()
        }
        try { if (currentAddressRef.current) localStorage.setItem(`lastKnownCredits:${currentAddressRef.current}`, String(credits)) } catch {}
        return nextState
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
  }, [connected, cardanoBalance, showCredits, fetchCredits, fetchAdaBalance]) // Removed onCreditsChange to prevent recreation

  // Detect active address changes and reset caches/state
  useEffect(() => {
    let cancelled = false
    const checkAddress = async () => {
      if (!connected || !wallet) return
      try {
        const addrs = await wallet.getUsedAddresses()
        const wa = Array.isArray(addrs) ? addrs[0] : addrs
        if (wa && wa !== currentAddressRef.current) {
          currentAddressRef.current = wa
          previousCredits.current = 0
          hasFetchedInitial.current = false
          // Replace global token with scoped one if available; otherwise clear to force reverify
          try {
            const scoped = localStorage.getItem(`userToken:${wa}`)
            if (scoped) localStorage.setItem('userToken', scoped)
            else localStorage.removeItem('userToken')
          } catch {}
          // Hydrate from per-address cache and fetch fresh balances
          hydrateFromCacheForAddress(wa)
          fetchBalance(false)
        }
      } catch {}
    }
    checkAddress()
    const interval = setInterval(checkAddress, 5000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [connected, wallet, fetchBalance, hydrateFromCacheForAddress])

  // Use external credits if provided, otherwise fetch them ONCE
  useEffect(() => {
    if (externalCredits !== undefined) {
      console.log('💰 WalletBalance: Using external credits:', externalCredits)
      setBalance(prev => {
        // Only update if credits actually changed to prevent unnecessary re-renders
        if (prev.credits !== externalCredits) {
          return { 
            ...prev, 
            credits: externalCredits,
            lastUpdate: Date.now()
          }
        }
        return prev
      })
      if (onCreditsChange && externalCredits !== balance.credits) {
        onCreditsChange(externalCredits)
      }
    } else if (connected && wallet && !hasFetchedInitial.current) {
      console.log('💰 WalletBalance: Initial fetch for connected wallet')
      hasFetchedInitial.current = true
      
      // Direct fetch without complex timing
      fetchBalance(false)
    }
    
    // Reset fetch flag when wallet disconnects
    if (!connected) {
      hasFetchedInitial.current = false
    }
  }, [connected, wallet, externalCredits]) // Removed fetchBalance from dependencies
  
  // Update ADA balance when external cardanoBalance is provided
  useEffect(() => {
    if (cardanoBalance !== undefined) {
      console.log('💰 WalletBalance: Using external ADA balance:', cardanoBalance)
      setBalance(prev => {
        // Only update if ADA balance actually changed
        if (prev.ada !== cardanoBalance) {
          return { ...prev, ada: cardanoBalance }
        }
        return prev
      })
    }
  }, [cardanoBalance])

  // Force refresh when external trigger changes
  useEffect(() => {
    if (forceRefresh && connected) {
      updateCreditsInstantly(undefined)
    }
  }, [forceRefresh, connected])

  // Auto-refresh credits every 60 seconds if connected (without animation to prevent shaking)
  useEffect(() => {
    if (!connected || !showCredits) return

    const interval = setInterval(() => fetchBalance(false), 60000)
    return () => clearInterval(interval)
  }, [connected, showCredits]) // Removed fetchBalance dependency to prevent recreating interval

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
      // Listen for token being set to trigger a refresh without animation
      const onTokenSet = () => {
        if (connected) {
          fetchBalance(false)
        }
      }
      try {
        window.addEventListener('user-token-set', onTokenSet)
      } catch {}
      return () => {
        try { window.removeEventListener('user-token-set', onTokenSet) } catch {}
      }
    }
  }, [updateCreditsInstantly])

  // Refresh on focus/visibility/online to recover after sleep/tab-idle
  useEffect(() => {
    if (!connected) return
    const onFocusVisible = () => {
      if (document.visibilityState === 'visible') fetchBalance(false)
    }
    const onOnline = () => fetchBalance(false)
    try {
      window.addEventListener('focus', onFocusVisible)
      document.addEventListener('visibilitychange', onFocusVisible)
      window.addEventListener('online', onOnline)
    } catch {}
    return () => {
      try {
        window.removeEventListener('focus', onFocusVisible)
        document.removeEventListener('visibilitychange', onFocusVisible)
        window.removeEventListener('online', onOnline)
      } catch {}
    }
  }, [connected, fetchBalance])

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
      className="bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-md border border-orange-500/30 rounded-2xl p-3 shadow-2xl relative overflow-hidden will-change-transform"
      style={{ 
        backfaceVisibility: 'hidden',
        perspective: 1000,
        transform: 'translate3d(0, 0, 0)',
        minWidth: '280px',
        height: '88px',
        maxWidth: '320px'
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
        <div className="relative z-10 h-full flex flex-col justify-between">
          {/* Header */}
          <div className="text-center border-b border-gray-700/50 pb-1">
            <h3 className="text-sm font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
              Wallet Balance
            </h3>
          </div>

          {/* Loading state with horizontal layout */}
          <div className="flex items-center justify-between gap-4 py-1 flex-1">
            {/* ADA Loading */}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold font-jetbrains">₳</span>
              </div>
              <div>
                <div className="text-orange-400 font-bold text-xs font-jetbrains">ADA</div>
                <div className="text-orange-400 font-bold text-sm animate-pulse">--</div>
              </div>
            </div>

            {/* Separator */}
            <div className="w-px h-8 bg-gray-600/50"></div>

            {/* Credits Loading */}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center">
                <span className="text-black text-xs font-bold font-jetbrains">C</span>
              </div>
              <div>
                <div className="text-yellow-400 font-bold text-xs font-jetbrains">CREDITS</div>
                <div className="text-yellow-400 font-bold text-sm animate-pulse">--</div>
              </div>
            </div>

            {/* Loading refresh button */}
            <div className="px-3 py-2 rounded-lg border border-gray-600 flex items-center justify-center flex-shrink-0" style={{ minWidth: '32px', height: '32px' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-3 h-3 border border-orange-400 border-t-transparent rounded-full"
              />
            </div>
          </div>
        </div>
      ) : balance.error ? (
        <div className="relative z-10 h-full flex flex-col justify-between">
          {/* Header */}
          <div className="text-center border-b border-gray-700/50 pb-1">
            <h3 className="text-sm font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
              Wallet Balance
            </h3>
          </div>
          <div className="flex items-center justify-center flex-1">
            <div className="text-red-400 text-sm text-center">
              {balance.error}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative z-10 h-full flex flex-col justify-between">
          {/* Header */}
          <div className="text-center border-b border-gray-700/50 pb-1">
            <h3 className="text-sm font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
              Wallet Balance
            </h3>
          </div>

          {/* Horizontal layout for ADA and Credits */}
          <div className="flex items-center justify-between gap-4 py-1 flex-1">
            {/* ADA Balance */}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold font-jetbrains">₳</span>
              </div>
              <div>
                <div className="text-orange-400 font-bold text-xs font-jetbrains">ADA</div>
                <span 
                  className="text-orange-400 font-bold text-sm"
                  style={{ display: 'inline-block', minWidth: '2.5rem', textAlign: 'left' }}
                >
                  {balance.ada.toFixed(2)}
                </span>
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
                  <span 
                    className="text-yellow-400 font-bold text-sm"
                    style={{ display: 'inline-block', minWidth: '3rem', textAlign: 'left' }}
                  >
                    {balance.credits.toLocaleString()}
                  </span>

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

            {/* Refresh button - more visible */}
            <button
              onClick={() => fetchBalance(true)}
              disabled={balance.loading}
              className="px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-orange-400 hover:bg-gray-700/50 transition-all duration-200 font-jetbrains border border-gray-600 hover:border-orange-400/50 flex items-center justify-center flex-shrink-0"
              style={{ minWidth: '32px', height: '32px' }}
              title="Refresh Balance"
            >
              {balance.loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-3 h-3 border border-orange-400 border-t-transparent rounded-full"
                />
              ) : (
                <span className="text-sm">🔄</span>
              )}
            </button>
          </div>


        </div>
      )}
    </motion.div>
  )
} 