"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"

import toast from 'react-hot-toast'
import WalletBalance from "@/components/WalletBalance"
import { WalletErrorHandler } from "@/components/WalletErrorHandler"

import WalletSelector from "@/components/WalletSelector"
import PlayerInventory from "@/components/PlayerInventory"
import { PrizeRevealModal } from "@/components/PrizeRevealModal"
import { useWallet } from '@meshsdk/react'
import { useRouter } from 'next/navigation'
import { useDeviceCapabilities } from "@/hooks/useDeviceCapabilities"
import type { CaseOpening } from "@/types/database"
import { SYMBOL_CONFIG } from "@/lib/symbols"
import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'


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
  const router = useRouter()
  const [isOpening, setIsOpening] = useState(false)
  const [openedSkin, setOpenedSkin] = useState<Skin | null>(null)
  const [showPrizeModal, setShowPrizeModal] = useState(false)


  const casePrice = 100;
  
  // Professional casino-grade device detection
  const {
    capabilities: deviceCapabilities,
    isMobile,
    canUseComplexEffects,
    maxParticles,
    targetFPS
  } = useDeviceCapabilities()
  
  // Case Result and Credits with API sync (stats only for UI)
  const [gameStats, setGameStats] = useState({
    casesOpened: 0,
    totalWon: 0,
    totalSpent: 0,
    legendaryCount: 0,
    epicCount: 0
  })
  
  // Credit System
  const [userCredits, setUserCredits] = useState<UserCredits>({ credits: 0, loading: false })
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [adaBalance, setAdaBalance] = useState<number>(0)
  
  // Inventory System
  const [showInventory, setShowInventory] = useState(false)
  
  // Payment Recovery System (removed unused state)
  // Professional Mystery Box State (removed unused state)
  
  const [userId, setUserId] = useState<string | null>(null);
  
  // Dynamic case management
  const [availableCases, setAvailableCases] = useState<any[]>([])
  const [selectedCase, setSelectedCase] = useState<any | null>(null)
  const [casesLoading, setCasesLoading] = useState(true)

  // Credits popup state
  const [showCreditsPopup, setShowCreditsPopup] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  


  // Handle case opening - navigate to dedicated open page
  const handleOpenCase = useCallback(() => {
    if (!selectedCase) {
      toast.error('Please select a case to open')
      return
    }
    router.push(`/open/${selectedCase.id}`)
  }, [selectedCase, router])

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

  // Fetch user credits and ADA balance
  const fetchUserCredits = async () => {
    if (!connected || !wallet) return

    setUserCredits(prev => ({ ...prev, loading: true }))
    
    try {
      const addresses = await wallet.getUsedAddresses()
      const walletAddress = addresses[0]
      
      // Fetch credits
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
      }

      // Fetch ADA balance directly
      try {
        console.log('💰 Fetching ADA balance in main page...')
        const balanceValue = await wallet.getBalance()
        console.log('💰 Main page balance response:', balanceValue)
        
        if (Array.isArray(balanceValue)) {
          const adaAsset = balanceValue.find(asset => asset.unit === 'lovelace')
          if (adaAsset) {
            const newAdaBalance = parseInt(adaAsset.quantity) / 1000000
            setAdaBalance(newAdaBalance)
            console.log('💰 ADA balance set in main page:', newAdaBalance)
          }
        }
      } catch (adaError) {
        console.error('❌ Failed to fetch ADA balance in main page:', adaError)
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
    // setShowEnhancedBox(true) // Removed unused state
    // setError(null) // Removed unused state
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
      image_url: SYMBOL_CONFIG[result.id as keyof typeof SYMBOL_CONFIG]?.icon || '❓',
      description: `A ${result.rarity} symbol with great value`,
      collection: 'Mystery Collection'
    }
    
    setOpenedSkin(skin)
    // setShowEnhancedBox(false) // Removed unused state
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
    // setShowEnhancedBox(false) // Removed unused state
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
    setIsOpening(false)
    
    // Professional cleanup
    // AnimationPool.forceGarbageCollection() // Removed unused AnimationPool
    
    fetchUserCredits()
    setRefreshTrigger(prev => prev + 1)
  }

  // handleClaimCredits removed - credits are automatically added by the case opening API

  const handleInventoryCreditsUpdated = () => {
    console.log('🔄 Inventory updated, refreshing credits')
    fetchUserCredits()
    setRefreshTrigger(prev => prev + 1)
  }

  // Handle credit purchase success
  const handleCreditPurchaseSuccess = (credits: number, txHash: string) => {
    console.log('💰 Credits purchased successfully:', credits, txHash)
    fetchUserCredits() // Refresh user credits
    toast.success(`Successfully purchased ${credits} credits!`)
  }

  // Handle instant purchase open
  const handleInstantPurchaseOpen = () => {
    router.push('/credits')
  }

  // Show wallet connection screen if not connected
  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white flex items-center justify-center p-4">
        <WalletErrorHandler />
        <div className="max-w-lg w-full">
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-8 border border-gray-700 shadow-2xl">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                FudCoin
              </h1>
              <p className="text-gray-300 text-lg">
                Connect your Cardano wallet to start opening cases
              </p>
            </div>

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

  // Main casino interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white">
      <WalletErrorHandler />
      {/* Navigation Header */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="border-b border-gray-800/50 bg-black/70 backdrop-blur-md fixed top-0 left-0 right-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between relative">
          {/* Logo */}
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-600">
              <img 
                src="/logo.jpg"
                alt="FudCoin Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">FudCoin</span>
          </motion.div>

          {/* Navigation Links - Centered (desktop) */}
          <nav className="hidden md:flex items-center gap-8 flex-1 justify-center">
            <motion.a 
              href="#cases" 
              className="text-gray-300 hover:text-white transition-colors"
              whileHover={{ scale: 1.1 }}
            >
              Cases
            </motion.a>
            <Link href="/inventory" className="text-gray-300 hover:text-white transition-colors">
              <motion.span whileHover={{ scale: 1.1 }}>Stash</motion.span>
            </Link>
            <motion.a 
              href="#rules" 
              className="text-gray-300 hover:text-white transition-colors"
              whileHover={{ scale: 1.1 }}
            >
              Rules
            </motion.a>
          </nav>

          {/* Right side - Add Credits, Connected Status, Wallet Balance (desktop) */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <motion.button
              onClick={handleInstantPurchaseOpen}
              className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-2 rounded-xl font-medium hover:from-orange-500 hover:to-red-500 transition-all shadow-lg border border-orange-500/30 backdrop-blur-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ x: 100 }}
              animate={{ x: 0 }}
              transition={{ delay: 0.04 }}
            >
              💳 Add Credits
            </motion.button>
            
            {connected && (
              <motion.div
                className="bg-gradient-to-r from-gray-900/90 to-black/90 text-green-400 px-3 py-2 rounded-xl text-sm backdrop-blur-sm border border-green-500/30 shadow-lg"
                initial={{ x: 100 }}
                animate={{ x: 0 }}
                transition={{ delay: 0.06 }}
              >
                🟢 Connected
              </motion.div>
            )}
            
            <motion.div
              initial={{ x: 100 }}
              animate={{ x: 0 }}
              transition={{ delay: 0.08 }}
            >
              <WalletBalance
                connected={connected}
                credits={userCredits.credits}
                cardanoBalance={adaBalance}
                forceRefresh={refreshTrigger}
                onCreditsChange={(credits) => setUserCredits(prev => ({ ...prev, credits }))}
              />
            </motion.div>
          </div>

          {/* Mobile actions */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            {connected && (
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-400" aria-label="Connected" />
            )}
            <button
              onClick={handleInstantPurchaseOpen}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-gradient-to-r from-orange-600 to-red-600 text-white border border-orange-500/30"
            >
              Buy
            </button>
            <button
              onClick={() => setMobileMenuOpen(v => !v)}
              aria-label="Menu"
              className="p-2 rounded-lg border border-gray-700 text-gray-200"
            >
              ☰
            </button>
            {mobileMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 border border-gray-800 rounded-xl p-3 shadow-2xl">
                <div className="flex flex-col gap-2">
                  <a href="#cases" className="px-2 py-2 rounded-md text-sm text-gray-200 hover:bg-white/5">Cases</a>
                  <Link href="/inventory" className="px-2 py-2 rounded-md text-sm text-gray-200 hover:bg-white/5">Stash</Link>
                  <a href="#rules" className="px-2 py-2 rounded-md text-sm text-gray-200 hover:bg-white/5">Rules</a>
                  <div className="border-t border-gray-800 my-2" />
                  <div className="px-1">
                    <WalletBalance
                      connected={connected}
                      credits={userCredits.credits}
                      cardanoBalance={adaBalance}
                      forceRefresh={refreshTrigger}
                      onCreditsChange={(credits) => setUserCredits(prev => ({ ...prev, credits }))}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.header>

      {/* Spacer to offset fixed header height */}
      <div className="h-14 sm:h-16" />

      {/* Hero Section with Graffiti Case */}
      <motion.section 
        className="relative py-20 overflow-hidden bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {/* Dark Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800"></div>
        <div className="absolute inset-0">
          {canUseComplexEffects && Array.from({ length: 15 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-red-500 rounded-full opacity-20"
              initial={{
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
                y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
              }}
              animate={{
                y: [null, Math.random() * -100],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: Math.random() * 4 + 3,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            />
          ))}
        </div>

        <div className="relative max-w-7xl mx-auto px-4 text-center">

          
          <motion.div 
            className="mb-12"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="relative max-w-4xl mx-auto">
              <div className="bg-black border-4 border-gray-700 rounded-3xl p-8 shadow-2xl">
                <img 
                  src="/werwrw.png"
                  alt="Graffiti Mystery Case"
                  className="w-full h-auto rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-500"
                  style={{
                    filter: 'drop-shadow(0 0 20px rgba(220, 38, 38, 0.5))',
                    maxWidth: '100%',
                    height: 'auto'
                  }}
                  onError={(e) => {
                    console.error('Image failed to load:', e);
                    e.currentTarget.style.display = 'none';
                  }}
                  onLoad={() => console.log('Image loaded successfully')}
                />
              </div>
              <motion.div
                className="absolute -inset-8 bg-gradient-to-r from-red-600/20 to-orange-600/20 rounded-3xl blur-xl"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
              />
            </div>
          </motion.div>
          
          <motion.button
            onClick={() => {
              const casesSection = document.getElementById('cases');
              casesSection?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white px-12 py-4 rounded-xl font-bold text-xl shadow-2xl transform transition-all duration-300"
            whileHover={{ scale: 1.1, y: -5 }}
            whileTap={{ scale: 0.95 }}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Start Opening Cases
          </motion.button>
        </div>
      </motion.section>

      {/* Available Cases Section */}
      <section id="cases" className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black"></div>
        <div className="relative max-w-7xl mx-auto px-4">
          <motion.h2 
            className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent"
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
          >
                            Available Cases
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {availableCases.map((caseItem, index) => (
              <motion.div
                key={caseItem.id}
                className="bg-black/40 backdrop-blur-md rounded-2xl overflow-hidden border border-gray-700 hover:border-orange-500/50 transition-all duration-300 group cursor-pointer shadow-xl hover:shadow-2xl"
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -5 }}
                onClick={() => router.push(`/open/${caseItem.id}`)}
              >
                <div className="h-56 bg-gradient-to-br from-orange-900/40 to-red-900/40 flex items-center justify-center relative overflow-hidden">
                  {caseItem.image_url ? (
                    <motion.img
                      src={caseItem.image_url}
                      alt={caseItem.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800 text-gray-400">
                      <motion.div
                        className="text-4xl mb-3"
                        animate={{ 
                          rotateY: [0, 360],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ 
                          duration: 4, 
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        📦
                      </motion.div>
                      <div className="text-xs font-medium opacity-70">Case Preview</div>
                    </div>
                  )}
                  {/* Overlay with case price */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20"></div>
                  <div className="absolute top-3 right-3 bg-orange-500/90 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {caseItem.price} Credits
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">
                    {caseItem.name}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{caseItem.description}</p>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-yellow-400">
                      {caseItem.price} Credits
                    </span>
                    <motion.button
                      className="bg-gradient-to-r from-orange-600 to-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:from-orange-500 hover:to-orange-400 transition-all"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => { e.stopPropagation(); router.push(`/open/${caseItem.id}`) }}
                    >
                      Open Case
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Case Opening Animation Section removed - opening happens on dedicated page */}

      {/* Credits Popup */}
      <AnimatePresence>
        {showCreditsPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreditsPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <h3 className="text-xl font-bold text-black mb-4">Credits</h3>
                <div className="bg-gray-100 rounded-lg p-4 mb-6">
                  <div className="text-2xl font-bold text-black mb-2">{userCredits.credits}</div>
                  <div className="text-gray-600">Available Credits</div>
                </div>
                <button
                  onClick={() => {
                    setShowCreditsPopup(false)
                    router.push('/credits')
                  }}
                  className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors w-full mb-3"
                >
                  Add Credits
                </button>
                <button
                  onClick={() => setShowCreditsPopup(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Essential Modals */}
      <AnimatePresence>
        {showPrizeModal && openedSkin && (
          <PrizeRevealModal
            isOpen={showPrizeModal}
            wonSkin={openedSkin}
            onClose={() => {
              setShowPrizeModal(false);
              setOpenedSkin(null);
            }}
          />
        )}

        {showInventory && (
          <PlayerInventory
            isOpen={showInventory}
            onClose={() => setShowInventory(false)}
            onCreditsUpdated={handleInventoryCreditsUpdated}
          />
        )}
      </AnimatePresence>


    </div>
  )
}
