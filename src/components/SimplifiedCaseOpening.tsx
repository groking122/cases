"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SYMBOL_CONFIG, getSymbolByKey, RARITY_CONFIG } from '@/lib/symbols'
import SymbolRenderer from './SymbolRenderer'
import confetti from 'canvas-confetti'

interface SimplifiedCaseOpeningProps {
  isOpen: boolean
  onOpen: () => Promise<any>
  onComplete: (result: any) => void
  onError: (error: string) => void
}

type AnimationStage = 'idle' | 'opening' | 'spinning' | 'revealing' | 'complete'

export function SimplifiedCaseOpening({ 
  isOpen, 
  onOpen, 
  onComplete, 
  onError 
}: SimplifiedCaseOpeningProps) {
  const [stage, setStage] = useState<AnimationStage>('idle')
  const [result, setResult] = useState<any>(null)
  const [carouselItems, setCarouselItems] = useState<any[]>([])
  const [progress, setProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  // Generate carousel items for smooth spinning animation
  const generateCarouselItems = useCallback((winningSymbol?: any) => {
    const symbolKeys = Object.keys(SYMBOL_CONFIG)
    const items = []
    
    // Create 20 items for smooth carousel
    for (let i = 0; i < 20; i++) {
      if (i === 15 && winningSymbol) {
        // Place winning item at position 15 (center)
        items.push({
          id: `win-${i}`,
          symbol: winningSymbol,
          isWinning: true
        })
      } else {
        // Random other symbols
        const randomKey = symbolKeys[Math.floor(Math.random() * symbolKeys.length)]
        const symbol = SYMBOL_CONFIG[randomKey as keyof typeof SYMBOL_CONFIG]
        items.push({
          id: `item-${i}`,
          symbol: { ...symbol, key: randomKey },
          isWinning: false
        })
      }
    }
    
    return items
  }, [])

  // Handle case opening with simplified flow
  const handleCaseOpen = useCallback(async () => {
    if (isProcessing || stage !== 'idle') return

    console.log('🎰 Starting simplified case opening')
    setIsProcessing(true)
    setStage('opening')
    setProgress(10)

    try {
      // Stage 1: Opening animation (1s)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Stage 2: Start API call and spinning (2s)
      setStage('spinning')
      setProgress(30)
      
      // Generate initial carousel
      setCarouselItems(generateCarouselItems())
      
      // Start API call
      console.log('🔄 Making API call...')
      const apiResult = await onOpen()
      console.log('✅ API result received:', apiResult)
      
      // Handle the transformed result from realCasinoAPI
      // The realCasinoAPI returns { id, name, rarity, value, apiResult }
      // where apiResult contains the original API response
      let symbol, winnings, originalResult
      
      if (apiResult.apiResult) {
        // This is the transformed result from realCasinoAPI
        symbol = apiResult.apiResult.symbol
        winnings = apiResult.apiResult.winnings
        originalResult = apiResult.apiResult
        console.log('📦 Using transformed API result structure')
      } else if (apiResult.symbol) {
        // This is a direct API response
        symbol = apiResult.symbol
        winnings = apiResult.winnings
        originalResult = apiResult
        console.log('📦 Using direct API response structure')
      } else {
        throw new Error('Invalid API response: no symbol data found')
      }
      
      // Validate symbol data
      if (!symbol || !symbol.key || !symbol.name || !symbol.rarity) {
        console.error('Invalid symbol data:', symbol)
        throw new Error('Invalid symbol data: missing required fields')
      }
      
      // Stage 3: Got result, show winning carousel (2s)
      setProgress(70)
      const winningSymbol = {
        key: symbol.key,
        name: symbol.name,
        rarity: symbol.rarity,
        multiplier: symbol.multiplier || 1,
        color: symbol.color || '#999999',
        emoji: symbol.image || '🎁'
      }
      
      console.log('🎯 Winning symbol:', winningSymbol)
      
      // Update carousel with winning item
      setCarouselItems(generateCarouselItems(winningSymbol))
      
      // Wait for carousel animation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Stage 4: Reveal result (1s)
      setStage('revealing')
      setProgress(90)
      setResult({ 
        ...originalResult, 
        winningSymbol,
        winnings: winnings || 0
      })
      
      // Trigger effects based on rarity
      if (winningSymbol.rarity === 'legendary') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        })
      } else if (winningSymbol.rarity === 'epic') {
        confetti({
          particleCount: 50,
          spread: 50,
          origin: { y: 0.6 }
        })
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Stage 5: Complete
      setStage('complete')
      setProgress(100)
      
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Finish
      onComplete(originalResult)
      
    } catch (error: any) {
      console.error('❌ Case opening error:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        apiCall: 'onOpen()'
      })
      onError(error.message || 'Case opening failed')
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing, stage, onOpen, onComplete, onError, generateCarouselItems])

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setStage('idle')
      setResult(null)
      setCarouselItems([])
      setProgress(0)
      setIsProcessing(false)
    }
  }, [isOpen])

  // Auto-start when opened
  useEffect(() => {
    if (isOpen && stage === 'idle') {
      handleCaseOpen()
    }
  }, [isOpen, stage, handleCaseOpen])

  if (!isOpen) return null

  const rarityConfig = result?.winningSymbol ? RARITY_CONFIG[result.winningSymbol.rarity as keyof typeof RARITY_CONFIG] : null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(147, 51, 234, 0.15) 0%, rgba(0, 0, 0, 0.95) 70%)'
        }}
      >
        <div className="max-w-4xl w-full">
          {/* Progress Bar */}
          <div className="w-full bg-gray-800 rounded-full h-2 mb-8">
            <motion.div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Stage Display */}
          <motion.div 
            className="text-center mb-8"
            key={stage}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold mb-2">
              {stage === 'opening' && '🎁 Opening Mystery Box'}
              {stage === 'spinning' && '🎰 Drawing Your Prize'}
              {stage === 'revealing' && '✨ Prize Revealed!'}
              {stage === 'complete' && '🎉 Congratulations!'}
            </h1>
            <p className="text-gray-300">
              {stage === 'opening' && 'Preparing your surprise...'}
              {stage === 'spinning' && 'Fate is deciding...'}
              {stage === 'revealing' && 'Your reward awaits!'}
              {stage === 'complete' && 'Enjoy your prize!'}
            </p>
          </motion.div>

          {/* Animation Area */}
          <div className="relative h-80 mb-8 overflow-hidden">
            
            {/* Opening Stage - Simple Box Animation */}
            {stage === 'opening' && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <motion.div
                  className="w-32 h-32 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl shadow-2xl"
                  animate={{ 
                    rotateY: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    🎁
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Spinning Stage - Carousel */}
            {stage === 'spinning' && carouselItems.length > 0 && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="relative w-full h-32 overflow-hidden">
                  <motion.div
                    className="flex items-center h-full"
                    animate={{ 
                      x: [-200, -1600] // Move items across screen
                    }}
                    transition={{ 
                      duration: 3,
                      ease: [0.22, 1, 0.36, 1] // Smooth easing
                    }}
                    style={{ width: carouselItems.length * 100 }}
                  >
                    {carouselItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex-shrink-0 w-24 h-24 mx-2 flex items-center justify-center"
                      >
                        <div className={`w-20 h-20 rounded-xl flex items-center justify-center text-2xl 
                          ${item.isWinning ? 'bg-yellow-500/20 border-2 border-yellow-500' : 'bg-gray-700/50'}
                        `}>
                          {item.symbol.emoji || '🎁'}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                  
                  {/* Center indicator */}
                  <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 bg-white/50 z-10" />
                </div>
              </motion.div>
            )}

            {/* Revealing Stage - Show Result */}
            {stage === 'revealing' && result?.winningSymbol && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 15, stiffness: 300 }}
              >
                <motion.div
                  className={`relative p-8 rounded-3xl ${rarityConfig?.gradient || 'bg-gray-700'} 
                    border-4 ${rarityConfig?.border || 'border-gray-500'} shadow-2xl`}
                  animate={{
                    scale: [1, 1.05, 1],
                    boxShadow: [`0 0 30px ${rarityConfig?.glow || '#999'}40`, 
                               `0 0 60px ${rarityConfig?.glow || '#999'}60`, 
                               `0 0 30px ${rarityConfig?.glow || '#999'}40`]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                      {result.winningSymbol.imageUrl ? (
                        <img 
                          src={result.winningSymbol.imageUrl} 
                          alt={result.winningSymbol.name}
                          className="w-full h-full object-contain rounded-lg"
                        />
                      ) : (
                        <div className="text-6xl">{result.winningSymbol.emoji}</div>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-white mb-1">{result.winningSymbol.name}</h2>
                    <p className="text-2xl font-bold text-green-400">
                      +{result.winnings}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Complete Stage - Celebration */}
            {stage === 'complete' && result?.winningSymbol && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ scale: 1 }}
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ duration: 0.5, repeat: 2 }}
              >
                <div className="text-center">
                  <div className="text-8xl mb-4">🎉</div>
                  <h2 className="text-3xl font-bold text-yellow-400 mb-2">Amazing!</h2>
                  <p className="text-xl text-white">
                    You won {result.winnings} credits!
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Skip Button (only during spinning) */}
          {stage === 'spinning' && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              onClick={() => {
                // Force complete the animation
                setStage('revealing')
                setProgress(90)
              }}
              className="absolute bottom-8 right-8 bg-gray-700/90 hover:bg-gray-600/90 text-white px-4 py-2 rounded-lg transition-all"
            >
              ⏭️ Skip Animation
            </motion.button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
} 