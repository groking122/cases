"use client"

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CSGOCaseModel } from './CSGOCaseModel'
import { CSGOItemCarousel } from './CSGOItemCarousel'
import { CSGOItemInspector } from './CSGOItemInspector'
// Removed hardcoded symbols - using database data instead
import SymbolRenderer from './SymbolRenderer'
import { DebugPanel } from './DebugPanel'
import { SimpleCarousel } from './SimpleCarousel'
import { OptimizedCarousel } from './OptimizedCarousel'

interface Skin {
  id: string
  name: string
  rarity: string
  value: number
  image_url: string
  description: string
  collection?: string
}

interface CSGOCaseOpeningProps {
  isOpening: boolean
  onComplete: (skin: Skin) => void
  wonSkin: Skin | null
  apiResult?: any
}

type OpeningStage = 'closed' | 'opening' | 'spinning' | 'revealing' | 'inspecting' | 'complete'

export function CSGOCaseOpening({ isOpening, onComplete, wonSkin, apiResult }: CSGOCaseOpeningProps) {
  const [stage, setStage] = useState<OpeningStage>('closed')
  const [carouselItems, setCarouselItems] = useState<any[]>([])
  const [showInspector, setShowInspector] = useState(false)
  const [progress, setProgress] = useState(0)
  const [carouselMode, setCarouselMode] = useState<'optimized' | 'simple' | 'complex'>('optimized')

  // Generate random items for carousel
  const generateCarouselItems = () => {
    // Use empty array instead of hardcoded symbols
    const symbols = []
    const items = Array.from({ length: 50 }, (_, i) => {
      const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)]
      return {
        id: `carousel-${i}`,
        symbol: randomSymbol,
        rarity: randomSymbol.rarity,
        isWinning: false
      }
    })

    // Insert winning item at strategic position
    if (wonSkin) {
      const wonSymbol = getSymbolByKey(wonSkin.id)
      if (wonSymbol) {
        const winningIndex = 30 // Better position for landing
        items[winningIndex] = {
          id: `winning-${wonSkin.id}`, // Unique ID to ensure it's found
          symbol: wonSymbol,
          rarity: wonSkin.rarity,
          isWinning: true
        }
      }
    }

    return items
  }

  // Simplified case opening sequence
  useEffect(() => {
    if (!isOpening) {
      setStage('closed')
      setProgress(0)
      setCarouselItems([])
      setShowInspector(false)
      return
    }

    let timeoutId: NodeJS.Timeout

    const runSequence = async () => {
      console.log('🎮 Starting simplified case opening sequence')

      // Stage 1: Case opening (1.5s)
      setStage('opening')
      setProgress(25)
      
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Stage 2: Generate items and start spinning
      setStage('spinning')
      setProgress(50)
      
      const items = generateCarouselItems()
      console.log('📦 Generated', items.length, 'carousel items')
      setCarouselItems(items)
      
      // Progress gradually increases while carousel spins
      const progressTimer = setInterval(() => {
        setProgress(prev => prev < 85 ? prev + 2 : prev)
      }, 200)
      
      // Cleanup after carousel completes (handled by carousel onComplete)
      timeoutId = setTimeout(() => {
        clearInterval(progressTimer)
      }, 5000)
    }

    runSequence()

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [isOpening, wonSkin])

  const handleCarouselComplete = useCallback(() => {
    console.log('🎪 Carousel animation completed!')
    setStage('revealing')
    setProgress(90)
    
    // Quick reveal sequence
    setTimeout(() => {
      setStage('complete')
      setProgress(100)
      
      // Auto-complete after brief pause
      setTimeout(() => {
        if (onComplete && wonSkin) {
          onComplete(wonSkin)
        }
      }, 1500)
    }, 500)
  }, [onComplete, wonSkin])

  const handleInspectItem = () => {
    if (wonSkin) {
      const wonSymbol = getSymbolByKey(wonSkin.id)
      setShowInspector(true)
    }
  }

  const getStageTitle = () => {
    switch (stage) {
      case 'closed': return '🎁 Mystery Case'
      case 'opening': return '🔓 Opening Case...'
      case 'spinning': return '🎰 Spinning Items...'
      case 'revealing': return '✨ Revealing Prize!'
      case 'complete': return '🏆 Congratulations!'
      default: return '🎮 CS:GO Case Opening'
    }
  }

  const getStageDescription = () => {
    switch (stage) {
      case 'closed': return 'Click to open your mystery case'
      case 'opening': return 'Unlocking your case with precision...'
      case 'spinning': return 'Items are spinning... destiny awaits!'
      case 'revealing': return 'Your reward is materializing!'
      case 'complete': return 'Enjoy your new item!'
      default: return 'Professional case opening experience'
    }
  }

  if (!isOpening) return null

  const wonSymbol = wonSkin ? getSymbolByKey(wonSkin.id) : null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(147, 51, 234, 0.15) 0%, rgba(0, 0, 0, 0.95) 70%)'
        }}
      >
        {/* Header */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center pt-8 pb-6"
        >
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-4">
            {getStageTitle()}
          </h1>
          <motion.p
            key={stage}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl text-gray-300 max-w-2xl mx-auto"
          >
            {getStageDescription()}
          </motion.p>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          className="max-w-4xl mx-auto px-4 mb-8"
        >
          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden border border-gray-600">
            <motion.div
              className="h-3 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 rounded-full shadow-lg"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-400 mt-2">
            <span>Opening</span>
            <span className="font-bold">{progress}%</span>
            <span>Complete</span>
          </div>
        </motion.div>

        {/* Main Content Area */}
        <div className="max-w-6xl mx-auto px-4">
          <AnimatePresence mode="wait">
            {/* Stage 1: Case Model */}
            {(stage === 'closed' || stage === 'opening') && (
              <motion.div
                key="case-model"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex flex-col items-center"
              >
                <CSGOCaseModel
                  isOpening={stage === 'opening'}
                  rarity={wonSkin?.rarity || 'common'}
                  onClick={() => {/* Already opening */}}
                />
                
                {/* Pity timer indicator */}
                {apiResult?.caseOpening?.isPityActivated && (
                  <motion.div
                    initial={{ scale: 0, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="mt-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-6 py-3 rounded-full font-bold shadow-lg"
                  >
                    🛡️ GUARDIAN PROTECTION ACTIVATED
                  </motion.div>
                )}
              </motion.div>
            )}

                        {/* Stage 2: Carousel */}
            {(stage === 'spinning' || stage === 'revealing') && carouselItems.length > 0 && (
              <motion.div
                key="carousel"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                className="space-y-6"
              >
                {carouselMode === 'optimized' ? (
                  <OptimizedCarousel
                    isSpinning={stage === 'spinning'}
                    items={carouselItems}
                    winningItem={carouselItems.find(item => item.isWinning) || null}
                    onComplete={handleCarouselComplete}
                  />
                ) : carouselMode === 'simple' ? (
                  <SimpleCarousel
                    isSpinning={stage === 'spinning'}
                    items={carouselItems}
                    winningItem={carouselItems.find(item => item.isWinning) || null}
                    onComplete={handleCarouselComplete}
                  />
                ) : (
                  <CSGOItemCarousel
                    isSpinning={stage === 'spinning'}
                    items={carouselItems}
                    winningItem={carouselItems.find(item => item.isWinning) || null}
                    onComplete={handleCarouselComplete}
                    speed={1.5}
                  />
                )}
              </motion.div>
            )}

            {/* Stage 3: Final Result */}
            {stage === 'complete' && wonSkin && wonSymbol && (
              <motion.div
                key="result"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="text-center space-y-6"
              >
                {/* Winner Display */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="relative max-w-md mx-auto"
                >
                  <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 border-2 border-yellow-400 shadow-2xl">
                    {/* Winner label */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: "spring" }}
                      className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-6 py-2 rounded-full font-bold text-sm"
                    >
                      🏆 WINNER
                    </motion.div>

                    <div className="mb-4">
                      <SymbolRenderer
                        symbol={{
                          id: wonSymbol.key,
                          name: wonSymbol.name,
                          emoji: wonSymbol.emoji,
                          imageUrl: wonSymbol.imageUrl || null,
                          rarity: wonSkin.rarity
                        }}
                        size={200}
                        revealAnimation={true}
                      />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-white mb-3">{wonSymbol.name}</h3>
                    
                    <div className="space-y-3">
                      <div className="text-yellow-300 font-bold text-xl">
                        💰 +{wonSkin.value} Credits
                      </div>
                      
                      {apiResult?.netResult !== undefined && (
                        <div className={`text-lg font-semibold ${
                          apiResult.netResult > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {apiResult.netResult > 0 ? '+' : ''}{apiResult.netResult} net
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="flex gap-4 justify-center"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleInspectItem}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-lg transition-all"
                  >
                    🔍 Inspect Item
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onComplete(wonSkin)}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-6 rounded-lg transition-all"
                  >
                    ✅ Continue
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CS:GO-Style Item Inspector */}
        {showInspector && wonSkin && wonSymbol && (
          <CSGOItemInspector
            item={{
              id: wonSkin.id,
              name: wonSymbol.name,
              rarity: wonSkin.rarity,
              value: wonSkin.value,
              emoji: wonSymbol.emoji,
              description: wonSymbol.description || `A ${wonSkin.rarity} item with unique properties.`,
              collection: 'Mystery Collection'
            }}
            isVisible={showInspector}
            onClose={() => setShowInspector(false)}
          />
        )}

        {/* Control Buttons */}
        {(stage === 'spinning' || stage === 'opening') && (
          <div className="fixed bottom-8 right-8 space-y-2">
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              onClick={handleCarouselComplete}
              className="block w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-all"
            >
              ⏭️ Skip Animation
            </motion.button>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5 }}
              onClick={() => {
                const modes: Array<'optimized' | 'simple' | 'complex'> = ['optimized', 'simple', 'complex']
                const currentIndex = modes.indexOf(carouselMode)
                const nextMode = modes[(currentIndex + 1) % modes.length]
                setCarouselMode(nextMode)
              }}
              className={`block w-full px-4 py-2 rounded-lg text-sm transition-all ${
                carouselMode === 'optimized' 
                  ? 'bg-green-700 hover:bg-green-600 text-white' 
                  : carouselMode === 'simple'
                  ? 'bg-blue-700 hover:bg-blue-600 text-white'
                  : 'bg-purple-700 hover:bg-purple-600 text-white'
              }`}
            >
              {carouselMode === 'optimized' ? '⚡ Optimized' : carouselMode === 'simple' ? '🔧 Simple' : '🎮 Complex'}
            </motion.button>
          </div>
        )}

        {/* Debug Panel */}
        <DebugPanel
          stage={stage}
          progress={progress}
          carouselItems={carouselItems}
          wonSkin={wonSkin}
          isOpening={isOpening}
          extraInfo={{
            carouselMode: carouselMode,
            carouselType: carouselMode === 'optimized' ? '⚡ Optimized' : carouselMode === 'simple' ? '🔧 Simple' : '🎮 Complex'
          }}
        />
      </motion.div>
    </AnimatePresence>
  )
} 