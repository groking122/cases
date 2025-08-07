"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SYMBOL_CONFIG, RARITY_CONFIG, getSymbolByKey } from '@/lib/symbols'
import SymbolRenderer from './SymbolRenderer'

interface CarouselItem {
  id: string
  symbol: any
  rarity: string
  isWinning?: boolean
}

interface CSGOItemCarouselProps {
  isSpinning: boolean
  items: CarouselItem[]
  winningItem: CarouselItem | null
  onComplete: () => void
  speed?: number
}

export function CSGOItemCarousel({ 
  isSpinning, 
  items, 
  winningItem, 
  onComplete,
  speed = 1 
}: CSGOItemCarouselProps) {
  const [currentOffset, setCurrentOffset] = useState(0)
  const [isSlowingDown, setIsSlowingDown] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const itemWidth = 128 // Assuming item width is 128px
  const animationFrameRef = useRef<number>()
  const startTimeRef = useRef<number>(Date.now())

  // Reset carousel state when not spinning
  useEffect(() => {
    if (!isSpinning) {
      setCurrentOffset(0)
      setIsSlowingDown(false)
    }
  }, [isSpinning])

  const generateItems = useCallback(() => {
      // Generate a smaller, recycled list of items
      const newItems = []
      for (let i = 0; i < 30; i++) { // Reduced from 100 to 30
          const rarityKeys = Object.keys(SYMBOL_CONFIG)
          const randomKey = rarityKeys[Math.floor(Math.random() * rarityKeys.length)]
          newItems.push({
              ...SYMBOL_CONFIG[randomKey as keyof typeof SYMBOL_CONFIG],
              id: i,
          })
      }
      return newItems
  }, [])

  useEffect(() => {
      if (!isSpinning) {
          if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current)
          }
          return
      }

      startTimeRef.current = Date.now()
      let currentSpeed = speed * 2.5 // Fine-tuned initial speed
      let hasStartedSlowing = false
      let position = 0
      let items = generateItems()

      const animate = () => {
          const container = containerRef.current
          if (!container) return

          const elapsedTime = Date.now() - startTimeRef.current

          // Longer initial spin phase
          if (!hasStartedSlowing && elapsedTime > 4000) {
              hasStartedSlowing = true
          }

          if (hasStartedSlowing) {
              currentSpeed = Math.max(0.1, currentSpeed * 0.988) // Smoother deceleration
          }
          
          position -= currentSpeed * 16.666 // Normalize speed

          // Virtualization: recycle items that go off-screen
          const totalWidth = items.length * itemWidth
          if (position < -totalWidth) {
              position += totalWidth
          }
          
          // GPU-accelerated transform
          container.style.transform = `translateX(${position}px)`
          
          animationFrameRef.current = requestAnimationFrame(animate)
      }

      animate()

      return () => {
          if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current)
          }
      }
  }, [isSpinning, speed, generateItems, itemWidth])

  const finalItemIndex = 5 // Center the final item

  const getRarityGlow = (rarity: string) => {
    const glows = {
      'common': 'shadow-lg',
      'uncommon': 'shadow-lg shadow-green-500/30',
      'rare': 'shadow-lg shadow-blue-500/30',
      'epic': 'shadow-lg shadow-purple-500/50',
      'legendary': 'shadow-2xl shadow-yellow-500/60'
    }
    return glows[rarity as keyof typeof glows] || glows.common
  }

  return (
    <div className="relative w-full h-48 overflow-hidden">
      {/* Spinning Items */}
      <div 
        ref={containerRef} 
        className="absolute top-0 left-0 flex h-full items-center"
        style={{ willChange: 'transform' }} // Performance hint for the browser
      >
        {generateItems().map((item, index) => (
          <div key={item.id + '-' + index} className="w-32 h-32 flex-shrink-0">
            <SymbolRenderer symbol={item} />
          </div>
        ))}
      </div>

      {/* Center Marker */}
      <div className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 bg-gradient-to-b from-transparent via-red-500 to-transparent" />
    </div>
  )
} 