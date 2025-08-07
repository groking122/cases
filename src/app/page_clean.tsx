"use client"
// @ts-nocheck

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import toast from 'react-hot-toast'
import WalletBalance from "@/components/WalletBalance"
import CreditPacks from "@/components/CreditPacks"
import WalletSelector from "@/components/WalletSelector"
import PlayerInventory from "@/components/PlayerInventory"
import { CaseSelector } from "@/components/CaseSelector"
import PaymentRecovery from "@/components/PaymentRecovery"
import { SimplifiedCaseOpening } from "@/components/SimplifiedCaseOpening"
import { EnhancedCaseOpening } from "@/components/EnhancedCaseOpening"
// WebGL removed - using standard version only
import { PrizeRevealModal } from "@/components/PrizeRevealModal"
import { useWallet } from '@meshsdk/react'
import { useDeviceCapabilities } from "@/hooks/useDeviceCapabilities"
import { AnimationPool } from "@/lib/AnimationPool"
import { SYMBOL_CONFIG } from "@/lib/symbols"
import type { CaseOpening } from "@/types/database"


interface Skin {
  id: string
  name: string
  rarity: string
  value: number
  image_url: string
  description: string
  collection?: string
}

interface CaseOpeningResult {
  skin: Skin
  caseOpening: CaseOpening
  serverSeed: string
  clientSeed: string
  nonce: number
  randomValue: number
}

interface UserCredits {
  credits: number
  loading: boolean
}

export default function Home() {
  const { connected, wallet, connect, connecting } = useWallet()
  const [isOpening, setIsOpening] = useState(false)
  const [openedSkin, setOpenedSkin] = useState<Skin | null>(null)
  const [showPrizeModal, setShowPrizeModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gameStats, setGameStats] = useState({
    casesOpened: 0,
    totalWon: 0,
    totalSpent: 0,
    legendaryCount: 0,
    epicCount: 0
  })
  const casePrice = 100;
  
  // Professional casino-grade device detection
  const {
    capabilities: deviceCapabilities,
    performanceSettings,
    isLowEnd,
    isMobile,
    canUseComplexEffects,
    maxParticles,
    targetFPS
  } = useDeviceCapabilities()
  
  // Calculate particle count outside JSX to avoid parsing issues
  const particleCount = Math.min(100, Math.floor(maxParticles / 5))
  
  // Case Result and Credits with API sync
  const [caseResult, setCaseResult] = useState<CaseOpeningResult | null>(null)
  const [apiResult, setApiResult] = useState<any>(null)
  // Remove creditsClaimed state since credits are automatically added by API
  
  // Credit System
  const [userCredits, setUserCredits] = useState<UserCredits>({ credits: 0, loading: false })
  const [showCreditStore, setShowCreditStore] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  // Inventory System
  const [showInventory, setShowInventory] = useState(false)
  
  // Payment Recovery System
  const [showPaymentRecovery, setShowPaymentRecovery] = useState(false)
  
  // Professional Mystery Box State
  const [showEnhancedBox, setShowEnhancedBox] = useState(false)
  
  const [userId, setUserId] = useState<string | null>(null);
  
  // Dynamic case management
  const [availableCases, setAvailableCases] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [casesLoading, setCasesLoading] = useState(true);

  // Real API call for professional mystery box (replaces mockCasinoAPI)
  const realCasinoAPI = useCallback(async (): Promise<any> => {
    console.log('🎯 Starting real API call for case opening')
    
    if (!connected || !wallet) {
      throw new Error('Wallet not connected')
    }

    try {
      // Get wallet address to get/create user
      const addresses = await wallet.getUsedAddresses()
      const walletAddress = addresses[0]
      
      // First get or create user to get userId
      const userResponse = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          walletType: 'mesh_connected'
        })
      })

      if (!userResponse.ok) {
        throw new Error('Failed to get user information')
      }

      const userData = await userResponse.json()
      const userId = userData.user.id
      
      console.log('🎯 Calling real case opening API')
      
      // Check if a case is selected
      if (!selectedCase) {
        throw new Error('No case selected')
      }
      
      // Call backend API to open case with credits
      const response = await fetch('/api/open-case-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          caseId: selectedCase.id,
          clientSeed: 'user_seed_' + Date.now()
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to open case')
      }

      console.log('🎯 Real API completed successfully:', data)
      
      // Return result in the format expected by EnhancedMysteryBox
      return {
        id: data.symbol.key,
        name: data.symbol.name,
        rarity: data.symbol.rarity,
        value: data.winnings,
        timestamp: Date.now(),
        apiResult: data // Include full API result
      }

    } catch (error: any) {
      console.error('❌ Real API error:', error)
      throw error
    }
  }, [connected, wallet])

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
        console.log('💰 Credits fetched:', newCredits)
        return newCredits
      }
    } catch (error) {
      console.error('Failed to fetch credits:', error)
    }
    
    setUserCredits(prev => ({ ...prev, loading: false }))
    return 0
  }

  // Instant credit update function
  const updateCreditsInstantly = (newCredits: number) => {
    console.log('⚡ Instant credit update:', newCredits)
    setUserCredits({ credits: newCredits, loading: false })
    setRefreshTrigger(prev => prev + 1)
    
    if (typeof window !== 'undefined' && (window as any).updateWalletCredits) {
      (window as any).updateWalletCredits(newCredits)
    }
  }

  // Handle successful credit purchase
  const handleCreditPurchaseSuccess = (credits: number, txHash: string) => {
    setUserCredits(prev => ({ 
      ...prev, 
      credits: prev.credits + credits 
    }))
    setError(null)
    setShowCreditStore(false)
    
    setTimeout(() => {
      fetchUserCredits()
    }, 1000)
  }

  // Handle opening a case
  const handleOpenCase = async (caseItem: any) => {
    if (!connected || !wallet) {
      toast.error('Please connect your wallet first')
      return
    }

    if (userCredits.credits < caseItem.price) {
      toast.error(`You need ${caseItem.price} credits to open this case`)
      return
    }

    setSelectedCase(caseItem)
    await handleProfessionalCaseOpen()
  }

  // Professional case opening with credit deduction
  const handleProfessionalCaseOpen = async () => {
    if (!connected || !wallet) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!selectedCase) {
      toast.error('Please select a case to open')
      return
    }

    if (userCredits.credits < selectedCase.price) {
      toast.error(`You need ${selectedCase.price} credits to open this case`)
      return
    }

    console.log('🎰 Starting professional casino-grade case opening')
    console.log('📊 Device capabilities:', {
      tier: deviceCapabilities.performanceTier,
      mobile: isMobile,
      particles: maxParticles,
      effects: canUseComplexEffects,
      fps: targetFPS
    })

    // Optimistic credit deduction
    const expectedCreditsAfterSpend = userCredits.credits - selectedCase.price
    updateCreditsInstantly(expectedCreditsAfterSpend)
    
    setIsOpening(true)
    setShowEnhancedBox(true)
    setError(null)
  }

  // Handle professional mystery box completion
  const handleBoxComplete = useCallback((result: any) => {
    console.log('🏆 Professional mystery box completed:', result)
    
    // If we have real API result, use the actual new balance from the API
    if (result.apiResult && result.apiResult.newBalance !== undefined) {
      console.log('💰 Updating credits from real API result:', result.apiResult.newBalance)
      updateCreditsInstantly(result.apiResult.newBalance)
      
      // Update stats with real values from API
      setGameStats(prev => ({
        casesOpened: result.apiResult.userStats?.casesOpened || prev.casesOpened + 1,
        totalWon: result.apiResult.userStats?.totalWon || prev.totalWon + (result.value || 0),
        totalSpent: result.apiResult.userStats?.totalSpent || prev.totalSpent + casePrice,
        legendaryCount: prev.legendaryCount + (result.rarity === 'legendary' ? 1 : 0),
        epicCount: prev.epicCount + (result.rarity === 'epic' ? 1 : 0)
      }))
    } else {
      // Fallback for mock results (shouldn't happen now)
      setGameStats(prev => ({
        casesOpened: prev.casesOpened + 1,
        totalWon: prev.totalWon + (result.value || 0),
        totalSpent: prev.totalSpent + casePrice,
        legendaryCount: prev.legendaryCount + (result.rarity === 'legendary' ? 1 : 0),
        epicCount: prev.epicCount + (result.rarity === 'epic' ? 1 : 0)
      }))
      
      // For mock results, add winnings to credits
      const newCredits = userCredits.credits + result.value
      updateCreditsInstantly(newCredits)
    }
    
    // Create skin object for compatibility
    const skin: Skin = {
      id: result.id,
      name: result.name || 'Unknown',
      rarity: result.rarity,
      value: result.value,
      image_url: SYMBOL_CONFIG[result.id as keyof typeof SYMBOL_CONFIG]?.emoji || '❓',
      description: `A ${result.rarity} symbol with great value`,
      collection: 'Mystery Collection'
    }
    
    setOpenedSkin(skin)
    setShowEnhancedBox(false)
    setIsOpening(false)
    setShowPrizeModal(true)
    
    // Show success notification
    const rarityEmoji = result.rarity === 'legendary' ? '🏆' : result.rarity === 'mythic' ? '💎' : '🎉'
    toast.success(`${rarityEmoji} Won ${result.name}! (+${result.value} credits)`)
    
  }, [userCredits.credits, updateCreditsInstantly])

  // Handle professional mystery box error
  const handleBoxError = useCallback((error: string) => {
    console.error('❌ Professional box error:', error)
    toast.error(error)
    setShowEnhancedBox(false)
    setIsOpening(false)
    
    // Revert optimistic credit update
    fetchUserCredits()
  }, [])

  // Handle wallet selection
  const handleWalletSelect = async (walletKey: string) => {
    try {
      await connect(walletKey)
      toast.success('Wallet connected successfully!')
    } catch (error: any) {
      toast.error(`Wallet connection failed: ${error.message || 'Unknown error'}`)
    }
  }

  // Fetch credits when wallet connects
  useEffect(() => {
    if (connected) {
      fetchUserCredits()
    } else {
      setUserCredits({ credits: 0, loading: false })
    }
  }, [connected])

  // Fetch userId after wallet connection
  useEffect(() => {
    const fetchUserId = async () => {
      if (!connected || !wallet) return;
      const addresses = await wallet.getUsedAddresses();
      const walletAddress = addresses[0];
      const userResponse = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, walletType: 'mesh_connected' })
      });
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserId(userData.user.id);
      }
    };
    fetchUserId();
  }, [connected, wallet]);

  // Fetch available cases on component mount
  useEffect(() => {
    const fetchCases = async () => {
      try {
        setCasesLoading(true);
        console.log('📦 Fetching available cases...');
        
        const response = await fetch('/api/cases');
        const data = await response.json();
        
        if (response.ok && data.success) {
          setAvailableCases(data.cases);
          // Auto-select the first case if available
          if (data.cases.length > 0) {
            setSelectedCase(data.cases[0]);
            console.log('✅ Auto-selected case:', data.cases[0].name);
          }
        } else {
          console.error('❌ Failed to fetch cases:', data.error);
          toast.error('Failed to load cases. Please refresh the page.');
        }
      } catch (error) {
        console.error('❌ Error fetching cases:', error);
        toast.error('Failed to load cases. Please check your connection.');
      } finally {
        setCasesLoading(false);
      }
    };

    fetchCases();
  }, []);

  // Enhanced reset with performance cleanup
  const resetGame = () => {
    setOpenedSkin(null)
    setShowPrizeModal(false)
    setCaseResult(null)
    setApiResult(null)
    // Remove creditsClaimed state since credits are automatically added by API
    setError(null)
    setIsOpening(false)
    setShowEnhancedBox(false)
    
    // Professional cleanup
    AnimationPool.forceGarbageCollection()
    
    fetchUserCredits()
    setRefreshTrigger(prev => prev + 1)
  }

  // handleClaimCredits removed - credits are automatically added by the case opening API

  const handleInventoryCreditsUpdated = () => {
    console.log('🔄 Inventory updated, refreshing credits')
    fetchUserCredits()
    setRefreshTrigger(prev => prev + 1)
  }

  // Show wallet connection screen if not connected
  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="minimal-card text-center">
            <h1 className="text-3xl font-bold text-white mb-4">
              🎮 Case Opening
            </h1>
            <p className="text-gray-400 mb-6">
              Connect wallet to start
            </p>

            <WalletSelector
              onWalletSelect={handleWalletSelect}
              onError={(error) => toast.error(error)}
              connecting={connecting}
            />
          </div>
        </div>
      </div>
    )
  }

  // Main professional casino interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900 text-white relative overflow-hidden">
      
      {/* Header Navigation */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 z-40 glass-panel m-4 rounded-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center font-bold text-black">
              🎮
            </div>
            <span className="text-xl font-bold">CaseOpening</span>
          </div>
          
          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Cases</a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Inventory</a>
            <a href="#" className="text-gray-300 hover:text-white transition-colors">Leaderboard</a>
          </nav>
          
          {/* Menu Button (Mobile) */}
          <button className="md:hidden p-2">
            <div className="w-6 h-0.5 bg-white mb-1"></div>
            <div className="w-6 h-0.5 bg-white mb-1"></div>
            <div className="w-6 h-0.5 bg-white"></div>
          </button>
        </div>
      </motion.header>
      {/* Professional Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-radial from-purple-900/20 via-gray-900 to-black"></div>
        
        {/* Enhanced particle system - Casino grade */}
        {canUseComplexEffects && Array.from({ length: particleCount }).map((_, i) => (
          <motion.div
            key={`bg-particle-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full opacity-20"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
            }}
            animate={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
            }}
            transition={{
              duration: Math.random() * 20 + 30,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />
        ))}
      </div>

      {/* Credit Info Button - Top Left */}
      <motion.button 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => setShowCreditStore(true)}
        className="fixed top-20 left-4 z-50 glass-panel p-4 hover:border-blue-400/50 transition-all cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl">💳</div>
          <div>
            <div className="text-white font-bold">Credits</div>
            <div className="text-blue-400 text-lg font-bold">{userCredits.credits.toLocaleString()}</div>
          </div>
        </div>
      </motion.button>

      {/* Top-Right Controls */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-3">

        {/* Payment Recovery Button - For Lost Payments */}
        <motion.button
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => setShowPaymentRecovery(true)}
          className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 
                     text-white font-bold py-2 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all 
                     duration-200 transform hover:scale-105 flex items-center gap-2 border border-orange-500/30"
          title="Recover payments that didn't credit properly"
        >
          <span className="text-lg">🔄</span>
          <span className="text-sm">Recover Payment</span>
        </motion.button>

        {/* Enhanced Wallet Balance */}
        <WalletBalance 
          showCredits={true}
          forceRefresh={refreshTrigger}
          onCreditsChange={(credits) => setUserCredits({ credits, loading: false })}
        />
      </div>

      {/* Hero Section */}
      <div className="relative z-10 min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold text-white mb-6"
          >
            CASE OPENING
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-300 mb-8"
          >
            Professional Casino Platform - Optimized for Peak Performance
          </motion.p>
          
          {/* Hero CTA Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <button className="btn-primary text-lg px-8 py-4">
              START PLAYING
            </button>
          </motion.div>
        </div>
      </div>

      {/* Cases Section */}
      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Choose Your Case</h2>
          <p className="text-gray-300">Select from our premium collection of mystery boxes</p>
        </div>

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6 max-w-md mx-auto"
            >
              <div className="text-red-400">⚠️ {error}</div>
              <Button
                onClick={() => setError(null)}
                variant="outline"
                size="sm"
                className="mt-2 border-red-500/30 text-red-300 hover:bg-red-900/20"
              >
                Dismiss
              </Button>
            </motion.div>
          )}

        {/* Case Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {availableCases.map((caseItem, index) => (
            <motion.div
              key={caseItem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`glass-panel p-6 cursor-pointer transition-all hover:border-blue-400/50 ${
                selectedCase?.id === caseItem.id ? 'border-blue-400 bg-blue-500/10' : ''
              }`}
              onClick={() => setSelectedCase(caseItem)}
            >
              <div className="aspect-square bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg mb-4 flex items-center justify-center">
                <div className="text-4xl">📦</div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{caseItem.name}</h3>
              <p className="text-gray-400 text-sm mb-4 line-clamp-2">{caseItem.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-blue-400">{caseItem.price} Credits</span>
                <button 
                  className="btn-primary px-4 py-2 text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenCase(caseItem);
                  }}
                  disabled={userCredits.credits < caseItem.price}
                >
                  OPEN
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {casesLoading && (
          <div className="text-center py-12">
            <div className="text-gray-400">Loading cases...</div>
          </div>
        )}

        {selectedCase && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-6 mt-8 max-w-2xl mx-auto"
          >
            <h2 className="text-2xl font-bold text-white mb-2">
              {selectedCase.name}
            </h2>
            <p className="text-white/70 mb-4">
              {selectedCase.description || 'Premium case opening experience'}
            </p>
            <div className="flex items-center justify-between mb-6">
              <span className="text-yellow-400 text-xl font-bold">
                {selectedCase.price} Credits
              </span>
              <span className="text-white/60">
                Available rewards
              </span>
            </div>
          </motion.div>
        )}

        {/* Enhanced Professional Case Opening */}
        <div className="max-w-2xl mx-auto mb-6 sm:mb-8 px-4 sm:px-0">
          <EnhancedCaseOpening
            selectedCase={selectedCase}
            wallet={wallet}
            connected={connected}
            userId={userId}
            userCredits={userCredits.credits}
            onCaseOpened={(reward) => {
              // Convert Reward to Skin format
              const skin: Skin = {
                id: reward.id,
                name: reward.name,
                rarity: reward.rarity,
                value: reward.value,
                image_url: reward.image_url || 'https://example.com/default-skin.png',
                description: reward.description || '',
                collection: 'Premium Collection'
              };
              setOpenedSkin(skin);
              setShowPrizeModal(true);
              // Update credits and stats
              setUserCredits(prev => ({ ...prev, credits: prev.credits + reward.value }));
              setGameStats(prev => ({
                ...prev,
                casesOpened: prev.casesOpened + 1,
                totalWon: prev.totalWon + reward.value,
                ...(reward.rarity === 'legendary' && { legendaryCount: prev.legendaryCount + 1 })
              }));
            }}
          />
        </div>

        {/* Credit Store Section */}
        {showCreditStore && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto mb-8 border border-blue-500/30"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">💳 Buy Credits</h3>
              <Button
                onClick={() => setShowCreditStore(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 text-sm"
              >
                ✕
              </Button>
            </div>
            <CreditPacks
              walletAddress={connected && wallet ? 'connected' : ''}
              onCreditsUpdated={(credits) => setUserCredits({ credits, loading: false })}
              selectedWallet={wallet}
              onPurchaseSuccess={handleCreditPurchaseSuccess}
              onError={(error) => toast.error(error)}
            />
          </motion.div>
        )}

        {/* Buy Credits Button (displayed when credits are insufficient) */}
        {!showCreditStore && selectedCase && userCredits.credits < selectedCase.price && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
              <p className="text-red-300 text-sm mb-2">
                Need {selectedCase.price - userCredits.credits} more credits
              </p>
              <Button
                onClick={() => setShowCreditStore(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-6 py-2"
              >
                💳 Buy Credits
              </Button>
            </div>
          </motion.div>
        )}

        {/* Professional Features Info */}
          {!isOpening && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8"
            >
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-600">
                <h3 className="text-lg font-bold text-blue-400 mb-2">🚀 Performance</h3>
                <ul className="text-sm text-gray-300 text-left space-y-1">
                  <li>• Device tier: <span className="text-white">{deviceCapabilities.performanceTier}</span></li>
                  <li>• Max particles: <span className="text-white">{maxParticles}</span></li>
                  <li>• Target FPS: <span className="text-white">{targetFPS}</span></li>
                  <li>• Complex effects: <span className="text-white">{canUseComplexEffects ? 'ON' : 'OFF'}</span></li>
                </ul>
              </div>
              
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-600">
                <h3 className="text-lg font-bold text-purple-400 mb-2">🎭 Animation</h3>
                <ul className="text-sm text-gray-300 text-left space-y-1">
                  <li>• Casino anticipation building</li>
                  <li>• Rarity-based effects</li>
                  <li>• Screen shake & particles</li>
                  <li>• Cinematic sequences</li>
                </ul>
              </div>
              
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-600">
                <h3 className="text-lg font-bold text-green-400 mb-2">🔧 Professional</h3>
                <ul className="text-sm text-gray-300 text-left space-y-1">
                  <li>• Memory management</li>
                  <li>• Thermal protection</li>
                  <li>• Animation pooling</li>
                  <li>• Performance monitoring</li>
                </ul>
              </div>
            </motion.div>
          )}
        </div>

        {/* Professional Prize Reveal Modal */}
        <PrizeRevealModal
          isOpen={showPrizeModal}
          wonSkin={openedSkin}
          onClose={resetGame}
        />

        <PlayerInventory
          isOpen={showInventory}
          onClose={() => setShowInventory(false)}
          onCreditsUpdated={handleInventoryCreditsUpdated}
        />


        <AnimatePresence>
          {showPaymentRecovery && (
            <PaymentRecovery
              onClose={() => setShowPaymentRecovery(false)}
              userWalletAddress="connected_wallet"
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
