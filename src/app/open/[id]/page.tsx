"use client"

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useWallet } from '@meshsdk/react'
import toast from 'react-hot-toast'
import { EnhancedCaseOpening } from '@/components/EnhancedCaseOpening'
import WalletSelector from '@/components/WalletSelector'

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white relative overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <button
            className="flex items-center space-x-2 text-orange-400 hover:text-orange-300 transition-colors font-medium"
            onClick={() => router.push('/')}
          >
            <span>←</span>
            <span>Back to Cases</span>
          </button>
          <div className="bg-black/40 backdrop-blur-md rounded-xl px-4 py-2 border border-orange-500/30">
            <div className="text-orange-300 font-medium">{caseData.name}</div>
            <div className="text-sm text-gray-400">
              Cost: {caseData.price} credits
              {userCredits !== null ? ` • Balance: ${userCredits} credits` : ''}
            </div>
          </div>
        </div>

        {!connected ? (
          <div className="max-w-lg mx-auto">
            <div className="bg-black/40 backdrop-blur-md border border-orange-500/30 rounded-2xl p-8 text-center">
              <div className="text-3xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                Connect Wallet
              </div>
              <p className="text-gray-300 mb-6">Connect your Cardano wallet to open this case.</p>
              <WalletSelector 
                onWalletSelect={(key) => connect(key)} 
                onError={(e) => toast.error(e)} 
                connecting={connecting}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-4xl mx-auto"
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
          </div>
        )}
      </div>
    </div>
  )
}


