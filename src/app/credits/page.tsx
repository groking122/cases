"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useWallet } from '@meshsdk/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import WalletBalance from "@/components/WalletBalance"
import CreditPacks from "@/components/CreditPacks"
import WalletSelector from "@/components/WalletSelector"
import ThemeToggle from "@/components/ThemeToggle"

interface UserCredits {
  credits: number
  loading: boolean
}



export default function CreditsPage() {
  const { connected, wallet, connect, connecting } = useWallet()
  const router = useRouter()
  const [userCredits, setUserCredits] = useState<UserCredits>({ credits: 0, loading: false })
  const [adaBalance, setAdaBalance] = useState<number>(0)
  const [walletAddress, setWalletAddress] = useState<string>("")

  // Fetch user credits and ADA balance
  const fetchUserCredits = async () => {
    if (!connected || !wallet) return

    setUserCredits(prev => ({ ...prev, loading: true }))
    
    try {
      const addresses = await wallet.getUsedAddresses()
      const walletAddress = addresses[0]
      setWalletAddress(walletAddress)
      
      // Fetch credits (JWT auth) - uses cookie fallback via server
      const token = typeof window !== 'undefined' ? localStorage.getItem('userToken') : null
      if (!token) {
        setUserCredits(prev => ({ ...prev, loading: false }))
        return
      }
      const response = await fetch('/api/get-credits', { method: 'POST' })
      
      if (response.ok) {
        const data = await response.json()
        if (typeof data.credits === 'number') {
          setUserCredits({ credits: data.credits, loading: false })
        } else {
          setUserCredits(prev => ({ ...prev, loading: false }))
        }
      } else {
        setUserCredits(prev => ({ ...prev, loading: false }))
      }

      // Fetch ADA balance directly
      try {
        console.log('💰 Fetching ADA balance in credits page...')
        const balanceValue = await wallet.getBalance()
        console.log('💰 Credits page balance response:', balanceValue)
        
        if (Array.isArray(balanceValue)) {
          const adaAsset = balanceValue.find(asset => asset.unit === 'lovelace')
          if (adaAsset) {
            const newAdaBalance = parseInt(adaAsset.quantity) / 1000000
            setAdaBalance(newAdaBalance)
            console.log('💰 ADA balance set in credits page:', newAdaBalance)
          }
        }
      } catch (adaError) {
        console.error('❌ Failed to fetch ADA balance in credits page:', adaError)
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
    console.log('💰 Credit purchase success callback:', credits, 'previous:', userCredits.credits)
    // Let the fetchUserCredits handle the update to avoid display bugs
    toast.success(`Successfully purchased ${credits} credits!`)
    
    // Refresh credits from API to get accurate total
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
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Solid Background */}
      <div className="absolute inset-0 bg-background"></div>
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-64 h-64 bg-gradient-to-r from-red-600/10 to-orange-600/10 rounded-full blur-3xl"
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
            
            <div className="flex items-center gap-3 min-w-[380px] justify-end">
              <ThemeToggle />
              <WalletBalance 
                connected={connected}
                credits={userCredits.credits}
                cardanoBalance={adaBalance}
                onCreditsChange={handleCreditsUpdate}
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
            <p className="text-foreground/70 text-lg max-w-2xl mx-auto">
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
            <div className="bg-card/80 backdrop-blur-md rounded-3xl p-12 border border-border max-w-md mx-auto">
              <div className="text-4xl mb-6 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent font-bold">WALLET</div>
              <h2 className="text-2xl font-bold mb-4 text-foreground">Connect Your Wallet</h2>
              <p className="text-foreground/70 mb-8">
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
                <h3 className="text-lg font-medium text-foreground/80 mb-2">Your Current Balance</h3>
                <div className="text-3xl font-bold text-yellow-400 mb-2">
                  {userCredits.loading ? (
                    <div className="mx-auto w-40 h-6 rounded bg-foreground/10 animate-pulse" aria-hidden="true" />
                  ) : (
                    `${userCredits.credits.toLocaleString()} Credits`
                  )}
                </div>
                <p className="text-foreground/60 text-sm">
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
                walletAddress={walletAddress}
                onPurchaseSuccess={handleCreditPurchaseSuccess}
                onError={(error) => toast.error(error)}
                onCreditsUpdated={handleCreditsUpdate}
                selectedWallet={wallet}
              />
            </motion.div>

            {/* Features - Minimal Design */}
            <motion.div
              className="flex flex-col md:flex-row items-center justify-center gap-8 mb-12 max-w-4xl mx-auto"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <motion.div 
                className="flex items-center gap-3 group"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 flex items-center justify-center group-hover:from-orange-500/30 group-hover:to-red-500/30 transition-all duration-300">
                  <span className="text-orange-400 text-lg">⚡</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Instant Delivery</h3>
                  <p className="text-gray-400 text-xs">Credits added immediately</p>
                </div>
              </motion.div>
              
              <div className="hidden md:block w-px h-8 bg-gradient-to-b from-transparent via-orange-500/30 to-transparent"></div>
              
              <motion.div 
                className="flex items-center gap-3 group"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 flex items-center justify-center group-hover:from-orange-500/30 group-hover:to-red-500/30 transition-all duration-300">
                  <span className="text-orange-400 text-lg">🔒</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Secure Payments</h3>
                  <p className="text-gray-400 text-xs">Cardano blockchain</p>
                </div>
              </motion.div>
              
              <div className="hidden md:block w-px h-8 bg-gradient-to-b from-transparent via-orange-500/30 to-transparent"></div>
              
              <motion.div 
                className="flex items-center gap-3 group"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 flex items-center justify-center group-hover:from-orange-500/30 group-hover:to-red-500/30 transition-all duration-300">
                  <span className="text-orange-400 text-lg">💎</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Best Value</h3>
                  <p className="text-gray-400 text-xs">Bulk discounts available</p>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </div>


    </div>
  )
}