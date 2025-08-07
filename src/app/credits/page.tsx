"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useWallet } from '@meshsdk/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import WalletBalance from "@/components/WalletBalance"
import CreditPacks from "@/components/CreditPacks"
import WalletSelector from "@/components/WalletSelector"

interface UserCredits {
  credits: number
  loading: boolean
}



export default function CreditsPage() {
  const { connected, wallet, connect, connecting } = useWallet()
  const router = useRouter()
  const [userCredits, setUserCredits] = useState<UserCredits>({ credits: 0, loading: false })

  // Fetch user credits
  const fetchUserCredits = async () => {
    if (!connected || !wallet) return

    setUserCredits(prev => ({ ...prev, loading: true }))
    
    try {
      const addresses = await wallet.getUsedAddresses()
      const walletAddress = addresses[0]
      
      const response = await fetch('/api/get-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress })
      })
      
      if (response.ok) {
        const data = await response.json()
        const newCredits = data.credits || 0
        setUserCredits({ credits: newCredits, loading: false })
        return newCredits
      }
    } catch (error) {
      console.error('Failed to fetch credits:', error)
      toast.error('Failed to fetch credits')
    }
    
    setUserCredits(prev => ({ ...prev, loading: false }))
    return 0
  }

  // Handle successful credit purchase
  const handleCreditPurchaseSuccess = (credits: number, txHash: string) => {
    setUserCredits(prev => ({ 
      ...prev, 
      credits: prev.credits + credits 
    }))
    setPurchasing(null)
    toast.success(`Successfully purchased ${credits} credits!`)
    
    setTimeout(() => {
      fetchUserCredits()
    }, 1000)
  }

  const handleCreditsUpdate = (newCredits: number) => {
    setUserCredits(prev => ({ ...prev, credits: newCredits, loading: false }))
  }



  // Fetch credits when wallet connects
  useEffect(() => {
    if (connected && wallet) {
      fetchUserCredits()
    }
  }, [connected, wallet])

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Solid Black Background */}
      <div className="absolute inset-0 bg-black"></div>
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-64 h-64 bg-gradient-to-r from-red-600/5 to-orange-600/5 rounded-full blur-3xl"
            style={{
              left: `${20 + i * 30}%`,
              top: `${20 + i * 20}%`,
            }}
            animate={{
              x: [0, 50, 0],
              y: [0, -50, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 15 + i * 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      
      {/* Header */}
      <div className="relative z-10 pt-8 pb-4">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div
            className="flex items-center justify-between mb-8 w-full"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <Button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 min-w-[140px] bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white border-0"
            >
              ← Back to Cases
            </Button>
            
            <div className="min-w-[380px]">
              <WalletBalance 
                externalCredits={userCredits.credits}
                onCreditsUpdate={handleCreditsUpdate}
              />
            </div>
          </motion.div>

          <motion.div
            className="text-center mb-12"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
              Purchase Credits
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Buy credits to open cases and discover amazing rewards. All payments are secure and processed on the blockchain.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 pb-20 w-full">
        {!connected ? (
          <motion.div
            className="text-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-black/80 backdrop-blur-md rounded-3xl p-12 border border-gray-700 max-w-md mx-auto">
              <div className="text-4xl mb-6 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent font-bold">WALLET</div>
              <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
              <p className="text-gray-400 mb-8">
                Connect your Cardano wallet to purchase credits and start opening cases.
              </p>
              <WalletSelector
                onWalletSelect={(walletKey) => connect(walletKey)}
                onError={(error) => toast.error(error)}
                connecting={connecting}
              />
            </div>
          </motion.div>
        ) : (
          <>
            {/* Current Credits Display */}
            <motion.div
              className="bg-gradient-to-r from-red-600/20 to-orange-600/20 rounded-2xl p-6 mb-12 border border-orange-500/30"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-300 mb-2">Your Current Balance</h3>
                <div className="text-3xl font-bold text-yellow-400 mb-2">
                  {userCredits.loading ? (
                    <div className="animate-pulse">Loading...</div>
                  ) : (
                    `${userCredits.credits.toLocaleString()} Credits`
                  )}
                </div>
                <p className="text-gray-400 text-sm">
                  Each case opening costs 88-100 credits
                </p>
              </div>
            </motion.div>

            {/* Credit Packs - Using CreditPacks Component */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-12"
            >
              <CreditPacks
                walletAddress="" 
                onPurchaseSuccess={handleCreditPurchaseSuccess}
                onError={(error) => toast.error(error)}
                onCreditsUpdated={handleCreditsUpdate}
                selectedWallet={wallet}
              />
            </motion.div>

            {/* Features */}
            <motion.div
              className="grid md:grid-cols-3 gap-6 mb-12"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="bg-black/50 rounded-xl p-6 text-center border border-gray-700">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="font-bold mb-2">Instant Delivery</h3>
                <p className="text-gray-400 text-sm">Credits are added to your account immediately after payment confirmation</p>
              </div>
              
              <div className="bg-black/50 rounded-xl p-6 text-center border border-gray-700">
                <div className="text-3xl mb-3">🔒</div>
                <h3 className="font-bold mb-2">Secure Payments</h3>
                <p className="text-gray-400 text-sm">All transactions are processed securely on the Cardano blockchain</p>
              </div>
              
              <div className="bg-black/50 rounded-xl p-6 text-center border border-gray-700">
                <div className="text-3xl mb-3">💎</div>
                <h3 className="font-bold mb-2">Best Value</h3>
                <p className="text-gray-400 text-sm">Larger packs offer better value with automatic discounts applied</p>
              </div>
            </motion.div>
          </>
        )}
      </div>


    </div>
  )
}