"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import SymbolRenderer from './SymbolRenderer'

interface SimpleCarouselProps {
  isSpinning: boolean
  items: any[]
  winningItem: any | null
  onComplete: () => void
}

export function SimpleCarousel({ isSpinning, items, winningItem, onComplete }: SimpleCarouselProps) {
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'stopping' | 'complete'>('idle')

  useEffect(() => {
    if (!isSpinning) {
      setPhase('idle')
      return
    }

    if (items.length === 0) {
      return
    }

    // Simple 3-phase animation
    setPhase('spinning')
    
    // Spin for 2 seconds
    const spinTimer = setTimeout(() => {
      setPhase('stopping')
      
      // Stop after another 1 second
      const stopTimer = setTimeout(() => {
        setPhase('complete')
        onComplete()
      }, 1000)
      
      return () => clearTimeout(stopTimer)
    }, 2000)

    return () => clearTimeout(spinTimer)
  }, [isSpinning, items.length, onComplete])

  if (!isSpinning || items.length === 0) {
    return null
  }

  return (
    <div className="relative h-48 overflow-hidden bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-xl border-2 border-gray-600">
      {/* Center line */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-yellow-400 to-orange-500 z-20" />
      
      {/* Simple spinning animation */}
      <motion.div
        className="flex items-center h-full py-4"
        animate={{
          x: phase === 'spinning' ? [-160, -160 * items.length] : 
             phase === 'stopping' ? -160 * Math.floor(items.length / 2) : 
             -160 * Math.floor(items.length / 2)
        }}
        transition={{
          duration: phase === 'spinning' ? 2 : phase === 'stopping' ? 1 : 0,
          ease: phase === 'spinning' ? 'linear' : 'easeOut',
          repeat: phase === 'spinning' ? Infinity : 0
        }}
      >
        {items.slice(0, 10).map((item, index) => (
          <div
            key={`simple-${item.id}-${index}`}
            className="flex-shrink-0 w-36 h-36 mx-2 rounded-xl bg-gradient-to-br from-gray-600 to-gray-700 border-2 border-gray-500 flex flex-col items-center justify-center"
          >
            <SymbolRenderer
              symbol={{
                id: item.symbol?.key || item.id,
                name: item.symbol?.name || 'Unknown',
                emoji: item.symbol?.emoji || '❓',
                imageUrl: item.symbol?.imageUrl || null,
                rarity: item.rarity
              }}
              size={80}
            />
          </div>
        ))}
      </motion.div>

      {/* Winning item highlight */}
      {phase === 'complete' && winningItem && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        >
          <div className="w-40 h-40 border-4 border-yellow-400 rounded-xl bg-yellow-400/20" />
        </motion.div>
      )}
    </div>
  )
} 