"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import SymbolRenderer from './SymbolRenderer'

interface OptimizedCarouselProps {
  isSpinning: boolean
  items: any[]
  winningItem: any | null
  onComplete: () => void
}

export function OptimizedCarousel({ isSpinning, items, winningItem, onComplete }: OptimizedCarouselProps) {
  const [animationState, setAnimationState] = useState<'idle' | 'spinning' | 'stopping' | 'complete'>('idle')
  const hasCompletedRef = useRef(false)
  const itemWidth = 140
  const visibleItems = 7
  
  // Create extended items array for seamless scrolling - but memoized properly
  const extendedItems = useRef<any[]>([])
  
  // Update extended items only when items change
  useEffect(() => {
    if (items.length > 0) {
      // Create exactly 3 copies for seamless loop
      extendedItems.current = [...items, ...items, ...items]
    }
  }, [items])

  // Find winning item position
  const getWinningPosition = useCallback(() => {
    if (!winningItem || extendedItems.current.length === 0) {
      return extendedItems.current.length / 2 // Middle position as fallback
    }
    
    // Look for winning item in the second copy (middle section)
    const startIndex = items.length
    const endIndex = items.length * 2
    
    for (let i = startIndex; i < endIndex; i++) {
      const item = extendedItems.current[i]
      if (item && (item.id === winningItem.id || item.isWinning)) {
        return i
      }
    }
    
    // Fallback to middle
    return Math.floor(extendedItems.current.length / 2)
  }, [winningItem, items.length])

  // Handle animation sequence
  useEffect(() => {
    if (!isSpinning || items.length === 0) {
      setAnimationState('idle')
      hasCompletedRef.current = false
      return
    }

    if (hasCompletedRef.current) return

    console.log('🎠 Starting optimized carousel animation')
    setAnimationState('spinning')

    // Phase 1: Spin for 2 seconds
    const spinTimer = setTimeout(() => {
      if (!hasCompletedRef.current) {
        setAnimationState('stopping')
        
        // Phase 2: Stop and complete after 1.5 seconds
        const stopTimer = setTimeout(() => {
          if (!hasCompletedRef.current) {
            setAnimationState('complete')
            hasCompletedRef.current = true
            
            // Small delay for UI to update, then callback
            setTimeout(onComplete, 200)
          }
        }, 1500)

        return () => clearTimeout(stopTimer)
      }
    }, 2000)

    return () => {
      clearTimeout(spinTimer)
    }
  }, [isSpinning, items.length, onComplete])

  // Calculate target position for winning item
  const winningPosition = getWinningPosition()
  const targetTransform = -(winningPosition * itemWidth) + (itemWidth * Math.floor(visibleItems / 2))

  if (!isSpinning || items.length === 0 || extendedItems.current.length === 0) {
    return null
  }

  return (
    <div className="relative h-48 overflow-hidden bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 rounded-xl border-2 border-yellow-400/50">
      {/* Center line indicator */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-yellow-400 via-orange-500 to-red-500 z-20 shadow-lg" />
      
      {/* Center highlight zone */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-36 h-40 border-2 border-yellow-400/30 rounded-lg z-10 pointer-events-none" />

      {/* Carousel container */}
      <motion.div
        className="flex items-center h-full py-4"
        initial={{ x: 0 }}
        animate={{
          x: animationState === 'spinning' 
            ? [0, -itemWidth * 20] // Spin through many items
            : animationState === 'stopping'
            ? targetTransform // Land on winning item
            : targetTransform // Stay on winning item
        }}
        transition={{
          duration: animationState === 'spinning' 
            ? 2 // 2 seconds of spinning
            : animationState === 'stopping'
            ? 1.5 // 1.5 seconds to stop
            : 0, // Instant for complete
          ease: animationState === 'spinning'
            ? 'linear' // Constant speed during spin
            : animationState === 'stopping' 
            ? [0.25, 0.46, 0.45, 0.94] // Smooth deceleration
            : 'easeOut', // Final settle
          repeat: animationState === 'spinning' ? Infinity : 0
        }}
      >
        {extendedItems.current.map((item, index) => {
          const isWinningPosition = Math.abs(index - winningPosition) < 0.5
          const isInCenter = animationState === 'complete' && isWinningPosition
          
          return (
            <motion.div
              key={`carousel-${index}-${item?.id || index}`}
              className={`flex-shrink-0 mx-2 rounded-xl flex flex-col items-center justify-center transition-all duration-300 ${
                isInCenter 
                  ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-400 shadow-2xl shadow-yellow-400/50' 
                  : 'bg-gradient-to-br from-gray-600 to-gray-700 border-2 border-gray-500'
              }`}
              style={{ 
                width: itemWidth - 16, 
                height: 160,
                filter: isInCenter ? 'brightness(1.2) saturate(1.3)' : 'brightness(0.8)'
              }}
              animate={{
                scale: isInCenter ? 1.1 : 1,
                y: isInCenter ? -5 : 0
              }}
              transition={{ duration: 0.3 }}
            >
              {item?.symbol && (
                <div className="flex flex-col items-center justify-center h-full p-2">
                  <SymbolRenderer
                    symbol={{
                      id: item.symbol.key,
                      name: item.symbol.name,
                      icon: item.symbol.icon,
                      imageUrl: item.symbol.imageUrl || null,
                      rarity: item.rarity
                    }}
                    size={60}
                  />
                  
                  {/* Rarity indicator */}
                  <div className={`mt-2 px-2 py-1 rounded text-xs font-bold ${
                    item.rarity === 'legendary' ? 'bg-yellow-500 text-black' :
                    item.rarity === 'epic' ? 'bg-purple-500 text-white' :
                    item.rarity === 'rare' ? 'bg-blue-500 text-white' :
                    item.rarity === 'uncommon' ? 'bg-green-500 text-white' :
                    'bg-gray-500 text-white'
                  }`}>
                    {item.rarity?.toUpperCase() || 'COMMON'}
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </motion.div>

      {/* Progress indicator */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
        <div className="flex space-x-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-yellow-400"
              animate={{
                opacity: animationState === 'spinning' && i === (Date.now() % 3) ? 1 : 0.3,
                scale: animationState === 'complete' ? 1.5 : 1
              }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      </div>

      {/* Winning item announcement */}
      {animationState === 'complete' && winningItem && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black px-4 py-1 rounded-full text-sm font-bold z-30"
        >
          🎉 {winningItem.symbol?.name || 'Winner'}!
        </motion.div>
      )}
    </div>
  )
} 