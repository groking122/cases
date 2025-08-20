"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import WalletBalance from "@/components/WalletBalance"
import CreditPacks from "@/components/CreditPacks"
import WalletSelector from "@/components/WalletSelector"
import { UnboxingAnimation } from "@/components/UnboxingAnimation"
import { PrizeRevealModal } from "@/components/PrizeRevealModal"
import { useWallet } from '@meshsdk/react'
import PlayerInventory from "@/components/PlayerInventory"
import { AssetPreloader, AssetPreloaderDebug } from "@/components/AssetPreloader"

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
  serverSeed: string
  clientSeed: string
  nonce: number
  randomValue: number
}

interface UserCredits {
  credits: number
  loading: boolean
}

// Fallback UI skins for animation
const fallbackSkins: Skin[] = [
  { 
    id: "1", 
    name: "Forest Guardian", 
    rarity: "common", 
    value: 15, 
    image_url: "🌲", 
    description: "A camouflaged skin for stealth operations",
    collection: "Nature Series"
  },
  { 
    id: "2", 
    name: "Blue Steel", 
    rarity: "rare", 
    value: 75, 
    image_url: "🔷", 
    description: "Cold steel with a pristine blue finish",
    collection: "Metal Collection"
  },
  { 
    id: "3", 
    name: "Dragon Slayer", 
    rarity: "epic", 
    value: 200, 
    image_url: "🐉", 
    description: "Forged from dragon scales and ancient magic",
    collection: "Mythical Armory"
  },
  { 
    id: "4", 
    name: "Golden Emperor", 
    rarity: "legendary", 
    value: 500, 
    image_url: "👑", 
    description: "Once worn by the greatest rulers of gaming",
    collection: "Royal Heritage"
  },
  { 
    id: "5", 
    name: "Cosmic Nebula", 
    rarity: "mythic", 
    value: 1500, 
    image_url: "🌌", 
    description: "Infused with the power of distant galaxies",
    collection: "Celestial Edition"
  }
]

export default function Home() {
  const { connected, wallet, connect, connecting } = useWallet()
  const [isOpening, setIsOpening] = useState(false)
  const [openedSkin, setOpenedSkin] = useState<Skin | null>(null)
  const [showPrizeModal, setShowPrizeModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gameStats, setGameStats] = useState({
    casesOpened: 0,
    totalWon: 0,
    totalSpent: 0
  })
  
  // Asset preloading state
  const [assetsLoaded, setAssetsLoaded] = useState(false)
  const [assetProgress, setAssetProgress] = useState(0)
  
  // Case Result and Credits with API sync
  const [caseResult, setCaseResult] = useState<CaseOpeningResult | null>(null)
  const [apiResult, setApiResult] = useState<any>(null) // New: Store complete API response
  const [creditsClaimed, setCreditsClaimed] = useState(false)
  
  // Credit System
  const [userCredits, setUserCredits] = useState<UserCredits>({ credits: 0, loading: false })
  const [showCreditStore, setShowCreditStore] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string>("")
  
  // Inventory System
  const [showInventory, setShowInventory] = useState(false)
  
  const casePrice = 100 // Price in Credits (100 credits per case)
  
  // Dynamic case management
  const [availableCases, setAvailableCases] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [casesLoading, setCasesLoading] = useState(true);

  // Fetch user credits from API
  const fetchUserCredits = async () => {
    if (!wallet) return
    
    try {
      setUserCredits(prev => ({ ...prev, loading: true }))
      const addresses = await wallet.getUsedAddresses()
      const currentWalletAddress = addresses?.[0]
      
      if (!currentWalletAddress) return
      
      setWalletAddress(currentWalletAddress)
      // Guard fetch until token exists
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
    } catch (error) {
      console.error('Error fetching credits:', error)
      setUserCredits(prev => ({ ...prev, loading: false }))
    }
  }

  // Load credits when wallet connects
  useEffect(() => {
    if (connected && wallet) {
      fetchUserCredits()
    }
  }, [connected, wallet])

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
          setError('Failed to load cases. Please refresh the page.');
        }
      } catch (error) {
        console.error('❌ Error fetching cases:', error);
        setError('Failed to load cases. Please check your connection.');
      } finally {
        setCasesLoading(false);
      }
    };

    fetchCases();
  }, []);

  const handleCaseOpenWithCredits = async () => {
    if (!connected || !wallet) {
      setError('Please connect your wallet first')
      return
    }

    if (userCredits.credits < casePrice) {
      setError(`Insufficient credits. You need ${casePrice} credits.`)
      return
    }

    setIsOpening(true)
    setError(null)
    setCaseResult(null)
    setApiResult(null) // Reset API result
    
    // Record animation start time for synchronization
    const animationStartTime = Date.now()
    
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
      
      console.log('🎯 Starting API call for case opening')
      
      // Check if a case is selected
      if (!selectedCase) {
        throw new Error('No case selected')
      }
      
      // Call backend API to open case with credits (with timing tracking)
      const response = await fetch('/api/open-case-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken') || ''}` },
        body: JSON.stringify({
          userId,
          caseId: selectedCase.id,
          clientSeed: 'user_seed_' + Date.now() // Client seed for provably fair
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to open case')
      }

      console.log('🎯 API completed, setting result data')
      
      // Create result in the old format for compatibility
      const result: CaseOpeningResult = {
        skin: {
          id: data.symbol.key,
          name: data.symbol.name,
          rarity: data.symbol.rarity,
          value: data.winnings,
          image_url: data.symbol.emoji, // Use emoji instead of non-existent image
          description: `A ${data.symbol.rarity} symbol with ${data.symbol.multiplier}x multiplier`,
          collection: 'Mystery Collection'
        },
        serverSeed: data.caseOpening.serverSeed,
        clientSeed: data.caseOpening.clientSeed,
        nonce: data.caseOpening.nonce,
        randomValue: data.caseOpening.randomValue
      }
      
      // Store both result formats for animation synchronization
      setOpenedSkin(result.skin)
      setCaseResult(result)
      setApiResult(data) // Complete API response for animation timing
      
      // Update game stats with actual values from API
      setGameStats(prev => ({
        casesOpened: prev.casesOpened + 1,
        totalWon: prev.totalWon + data.winnings,
        totalSpent: prev.totalSpent + casePrice
      }))
      
      // Update credits with actual balance from API
      setUserCredits({ credits: data.newBalance, loading: false })

      console.log('✅ Case opening data prepared for animation sync')

    } catch (error: any) {
      console.error('❌ Case opening error:', error)
      setError(error.message || 'Failed to open case')
      setIsOpening(false) // Stop animation on error
    }
    // Note: Don't set isOpening to false here - let animation complete naturally
  }

  const handleUnboxingComplete = (skin: Skin) => {
    console.log('🎊 Animation completed, showing prize modal')
    setIsOpening(false) // Animation is now complete
    setShowPrizeModal(true)
    setCreditsClaimed(false)
  }

  const resetGame = () => {
    setOpenedSkin(null)
    setShowPrizeModal(false)
    setCaseResult(null)
    setApiResult(null) // Reset API result
    setCreditsClaimed(false)
    setError(null)
    setIsOpening(false)
  }

  const handleClaimCredits = () => {
    if (openedSkin) {
      // Credits were already added during case opening
      // This just marks them as claimed in the UI
      setCreditsClaimed(true)
      
      // Refresh credits to show updated balance
      fetchUserCredits()
      
      console.log(`Credits claimed: ${openedSkin.value}`)
    }
  }

  const handleCreditPurchaseSuccess = (credits: number, txHash: string) => {
    console.log(`✅ Purchased ${credits} credits with transaction: ${txHash}`)
    fetchUserCredits() // Refresh credits
    setShowCreditStore(false)
  }

  const handlePaymentError = (error: string) => {
    setError(error)
  }

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-gray-900 to-black"></div>
      
      {/* Asset Preloader */}
      <AssetPreloader 
        onProgress={setAssetProgress}
        onComplete={() => setAssetsLoaded(true)}
      />
      
      {/* Debug info for development */}
      <AssetPreloaderDebug />

      {/* Asset Loading Screen */}
      {!assetsLoaded && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
              ⚙️ Preparing Experience
            </div>
            <div className="text-gray-400 mb-6">
              Loading assets for smooth animations...
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden mb-2">
              <motion.div
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${assetProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="text-sm text-gray-500">
              {assetProgress}% complete
            </div>
          </div>
        </div>
      )}

      {/* Main Content - only show when assets are loaded */}
      {assetsLoaded && (
        <div className="relative z-10">
          <div className="container mx-auto px-4 py-8">
            
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                🎁 Mystery Box Casino
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Open mystery boxes and win rare digital collectibles! Connect your Cardano wallet to get started.
              </p>
            </motion.div>

            {/* Wallet Connection */}
            {!connected ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md mx-auto"
              >
                <WalletSelector
                  onWalletSelect={() => {}}
                  onError={handlePaymentError}
                  connecting={connecting}
                />
              </motion.div>
            ) : (
              <div className="space-y-8">
                
                {/* Wallet Balance */}
                <WalletBalance />

                {/* Game Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto border border-purple-500/30"
                >
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-400 mb-4">Game Statistics</div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400">Cases Opened</div>
                        <div className="text-white font-bold">{gameStats.casesOpened}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Total Won</div>
                        <div className="text-green-400 font-bold">{gameStats.totalWon}⭐</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Total Spent</div>
                        <div className="text-red-400 font-bold">{gameStats.totalSpent}</div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Main Game Interface */}
                {!isOpening && !showPrizeModal && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto mb-8 border border-purple-500/30"
                  >
                    <div className="text-2xl font-bold text-purple-400 mb-4">
                      🎁 Mystery Box
                    </div>
                    <div className="text-gray-400 mb-6">
                      Use {casePrice} credit{casePrice > 1 ? 's' : ''} to open a mystery box and win rare NFTs!
                    </div>
                    
                    {showCreditStore ? (
                      <div>
                        <Button
                          onClick={() => setShowCreditStore(false)}
                          className="mb-4 bg-gray-600 hover:bg-gray-700"
                        >
                          ← Back to Game
                        </Button>
                        <CreditPacks
                          walletAddress={walletAddress}
                          onCreditsUpdated={fetchUserCredits}
                          onPurchaseSuccess={handleCreditPurchaseSuccess}
                          onError={handlePaymentError}
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-lg text-green-400 mb-2">
                            Your Credits: {userCredits.loading ? '...' : userCredits.credits}
                          </div>
                        </div>
                        
                        <Button
                          onClick={handleCaseOpenWithCredits}
                          disabled={isOpening || userCredits.credits < casePrice}
                          className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-semibold"
                        >
                          {isOpening ? (
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin">⚙️</div>
                              <span>Opening Case...</span>
                            </div>
                          ) : userCredits.credits < casePrice ? (
                            `Need ${casePrice} Credit${casePrice > 1 ? 's' : ''}`
                          ) : (
                            `Open Mystery Box (${casePrice} Credit${casePrice > 1 ? 's' : ''})`
                          )}
                        </Button>

                        {userCredits.credits < casePrice && (
                          <Button
                            onClick={() => setShowCreditStore(true)}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                          >
                            💰 Buy More Credits
                          </Button>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Error Display */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 max-w-md mx-auto"
                  >
                    <div className="text-red-400 text-center">
                      ⚠️ {error}
                    </div>
                    <Button
                      onClick={() => setError(null)}
                      className="w-full mt-3 bg-red-600 hover:bg-red-700"
                    >
                      Try Again
                    </Button>
                  </motion.div>
                )}
              </div>
            )}

            {/* Enhanced Unboxing Animation with API synchronization */}
            <UnboxingAnimation
              isOpening={isOpening}
              onComplete={handleUnboxingComplete}
              skins={fallbackSkins}
              wonSkin={openedSkin}
              apiResult={apiResult} // Pass complete API result for timing sync
            />

            <PrizeRevealModal
              isOpen={showPrizeModal}
              wonSkin={openedSkin}
              onClose={resetGame}
            />

              {/* Player Inventory */}
              <PlayerInventory
                isOpen={showInventory}
                onClose={() => setShowInventory(false)}
                onCreditsUpdated={fetchUserCredits}
              />
          </div>
        </div>
      )}
    </div>
  )
} 