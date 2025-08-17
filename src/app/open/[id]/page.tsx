"use client"

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useWallet } from '@meshsdk/react'
import toast from 'react-hot-toast'
import { EnhancedCaseOpening } from '@/components/EnhancedCaseOpening'
import WalletSelector from '@/components/WalletSelector'
import ThemeToggle from '@/components/ThemeToggle'

export default function OpenCasePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { connected, wallet, connect, connecting } = useWallet()
  const [userCredits, setUserCredits] = useState<number | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const [caseData, setCaseData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  // Fetch selected case data by id
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/cases')
        const data = await res.json()
         if (res.ok && data.success) {
           const found = data.cases.find((c: any) => c.id === params.id)
          if (!found) {
            toast.error('Case not found')
            router.push('/')
            return
          }
          console.log('🎮 Case data loaded:', found)
          console.log('🎯 Case symbols:', found.symbols)
           setCaseData(found)
        } else {
          toast.error('Failed to load case')
          router.push('/')
        }
      } catch (e) {
        console.error(e)
        toast.error('Network error loading case')
        router.push('/')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id, router])

  // Fetch credits when connected or after case opening (refreshTrigger)
  useEffect(() => {
    const fetchCredits = async () => {
      if (!connected || !wallet) return
      try {
        const addresses = await wallet.getUsedAddresses()
        const walletAddress = addresses[0]
        const res = await fetch('/api/get-credits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress })
        })
        const data = await res.json()
        if (res.ok) setUserCredits(data.credits || 0)
      } catch {}
    }
    fetchCredits()
  }, [connected, wallet, refreshTrigger])

  // Fetch user id on connect
  useEffect(() => {
    const fetchUserId = async () => {
      if (!connected || !wallet) return
      try {
        const addresses = await wallet.getUsedAddresses()
        const walletAddress = addresses[0]
        const userRes = await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress, walletType: 'mesh_connected' })
        })
        if (userRes.ok) {
          const ud = await userRes.json()
          setUserId(ud.user.id)
        }
      } catch {}
    }
    fetchUserId()
  }, [connected, wallet])

  const handleOpen = useCallback(async () => {
    if (!connected || !wallet || !caseData) {
      throw new Error('Wallet not connected or case missing')
    }
    // Create/lookup user by wallet
    const addresses = await wallet.getUsedAddresses()
    const walletAddress = addresses[0]
    const userRes = await fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, walletType: 'mesh_connected' })
    })
    if (!userRes.ok) throw new Error('Failed to identify user')
    const userData = await userRes.json()

    // Call open-case-credits
    const res = await fetch('/api/open-case-credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userData.user.id,
        caseId: caseData.id,
        clientSeed: 'user_seed_' + Date.now()
      })
    })

    const data = await res.json()
    if (!res.ok) {
      if (res.status === 400 && data?.error?.toLowerCase().includes('insufficient')) {
        toast.error('Insufficient credits')
        router.push('/credits')
        throw new Error('Insufficient credits')
      }
      throw new Error(data.error || 'Open failed')
    }

    // Return normalized structure expected by SimplifiedCaseOpening
    return {
      id: data.symbol.key,
      name: data.symbol.name,
      rarity: data.symbol.rarity,
      value: data.winnings,
      apiResult: data
    }
  }, [connected, wallet, caseData])

  const handleComplete = useCallback((result: any) => {
    // Refresh balance after case opening - notification handled by component
    setRefreshTrigger(prev => prev + 1)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!caseData) return null

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Header */}
      <motion.header
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        className="border-b border-border bg-card/70 backdrop-blur-md fixed top-0 left-0 right-0 z-50"
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            className="text-sm text-foreground/70 hover:text-foreground"
            onClick={() => router.push('/')}
          >
            ← Back
          </button>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => router.push('/credits')}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-orange-600 to-red-600 text-white border border-orange-500/30"
            >
              Buy Credits
            </button>
          </div>
        </div>
      </motion.header>

      {/* Spacer for fixed header */}
      <div className="h-14" />

      <div className="relative max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-foreground/70">{caseData.name} • {caseData.price} credits{userCredits !== null ? ` • Balance: ${userCredits}` : ''}</div>
        </div>

        {!connected ? (
          <div className="max-w-md mx-auto">
            <div className="bg-card/70 border border-border rounded-2xl p-6 text-center">
              <div className="text-2xl font-bold mb-2">Connect Wallet</div>
              <p className="text-foreground/60 mb-4">Connect your Cardano wallet to open this case.</p>
              <WalletSelector 
                onWalletSelect={(key) => connect(key)} 
                onError={(e) => toast.error(e)} 
                connecting={connecting}
              />
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card/60 rounded-2xl border border-border p-6 md:p-8"
          >
            <EnhancedCaseOpening
                              selectedCase={{ 
                  id: caseData.id, 
                  name: caseData.name, 
                  price: caseData.price, 
                  image_url: caseData.image_url,
                  symbols: caseData.symbols || [] 
                }}
                wallet={wallet}
                connected={connected}
                userId={userId}
                userCredits={userCredits ?? 0}
                onCaseOpened={(reward) => {
                  console.log('🎯 Case opened with reward:', reward)
                  handleComplete(reward as any)
                }}
            />
          </motion.div>
        )}
      </div>
    </div>
  )
}


