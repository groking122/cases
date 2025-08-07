"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import SymbolRenderer from './SymbolRenderer'
// Removed hardcoded symbols - using database data instead
import { casinoSoundManager } from '../lib/casinoSoundManager'

interface SpinningReelCarouselProps {
  isSpinning: boolean
  winningItem: any | null
  onComplete: () => void
  spinDuration?: number
  stopDuration?: number
}

export function SpinningReelCarousel({ 
  isSpinning, 
  winningItem, 
  onComplete,
  spinDuration = 3000,
  stopDuration = 2000
}: SpinningReelCarouselProps) {
  console.log('🎰 SpinningReelCarousel component mounted/rendered', { isSpinning, winningItem })
  
  const [animationState, setAnimationState] = useState<'idle' | 'anticipation' | 'nearMiss' | 'resolution' | 'revealHold' | 'celebration' | 'sustain'>('idle')
  const hasCompletedRef = useRef(false)
  const itemWidth = 120
  const visibleItems = 7
  
  // Create comprehensive reel with all symbols
  const reelItems = useRef<any[]>([])
  
  // Generate reel items with all symbols repeated for smooth scrolling
  const generateReelItems = useCallback(() => {
    console.log('🎰 Generating reel items...')
    
    try {
      // Use fallback symbols for carousel animation (visual only)
      const fallbackSymbols = [
        { 
          key: 'dogecoin', 
          name: 'Dogecoin King', 
          emoji: '🐕', 
          rarity: 'legendary',
          imageUrl: null // Will be updated when we fetch real data
        },
        { 
          key: 'hosky', 
          name: 'hosky', 
          emoji: '🦔', 
          rarity: 'legendary',
          imageUrl: 'https://pbs.twimg.com/profile_images/1671953158754107394/fqGb2y7__400x400.jpg'
        }
      ]
      console.log('🎰 Using fallback symbols for carousel animation')
      
      // Reduce reel length to prevent disappearing symbols
      const reelLength = Math.min(20, Math.max(15, fallbackSymbols.length * 2)) // Smaller reel for stability
      const items = []
      
      for (let i = 0; i < reelLength; i++) {
        const symbolIndex = i % fallbackSymbols.length
        const symbol = fallbackSymbols[symbolIndex]
        
        if (!symbol) {
          console.warn('⚠️ Missing symbol at index:', symbolIndex)
          continue
        }
        
        items.push({
          id: `${symbol.key}-${i}`,
          symbol: {
            key: symbol.key,
            name: symbol.name,
            emoji: symbol.emoji,
            imageUrl: symbol.imageUrl
          },
          rarity: symbol.rarity,
          isWinning: false
        })
      }
      
      console.log('🎰 Generated items:', items.length)
      
      // Insert winning item at strategic position for better reveal timing
      if (winningItem && items.length > 0) {
        const winningPosition = Math.floor(items.length * 0.6) // 60% for better timing
        items[winningPosition] = {
          ...winningItem,
          id: `winning-${winningItem.symbol?.key || 'item'}`, // Unique ID for winning item
          isWinning: true
        }
        console.log('🎯 Added winning item at position:', winningPosition, 'out of', items.length)
      }
      
      return items
    } catch (error) {
      console.error('❌ Error generating reel items:', error)
      // Return fallback items on error
      return [
        { id: 'fallback-1', symbol: { key: 'coin', name: 'Fallback Coin', emoji: '🪙' }, rarity: 'common', isWinning: false },
        { id: 'fallback-2', symbol: { key: 'diamond', name: 'Fallback Diamond', emoji: '💎' }, rarity: 'rare', isWinning: false }
      ]
    }
  }, [winningItem])

  // Update reel items when component mounts or winning item changes
  useEffect(() => {
    reelItems.current = generateReelItems()
    console.log('🎰 Updated reel items, length:', reelItems.current.length)
  }, [generateReelItems])

  // Find winning item position in the reel
  const getWinningPosition = useCallback(() => {
    if (!winningItem || reelItems.current.length === 0) {
      return Math.floor(reelItems.current.length * 0.7) // Default position
    }
    
    const winningIndex = reelItems.current.findIndex(item => item.isWinning)
    console.log('🎯 Winning position found at:', winningIndex)
    return winningIndex >= 0 ? winningIndex : Math.floor(reelItems.current.length * 0.7)
  }, [winningItem])

  // Casino-grade multi-phase animation system
  useEffect(() => {
    console.log('🎰 Casino animation triggered - isSpinning:', isSpinning)
    
    if (!isSpinning) {
      console.log('🎰 Resetting to idle state')
      setAnimationState('idle')
      hasCompletedRef.current = false
      return
    }

    if (hasCompletedRef.current) {
      console.log('🎰 Animation already completed, skipping')
      return
    }

    console.log('🎰 🎯 Starting casino-grade animation sequence')
    
    let timers: NodeJS.Timeout[] = []
    
    // Phase 1: Anticipation (3.5s) - Gradual acceleration
    setAnimationState('anticipation')
    console.log('🎰 Phase 1: Anticipation (3.5s)')
    casinoSoundManager.playSound('anticipation')
    
    timers.push(setTimeout(() => {
      if (!hasCompletedRef.current) {
        // Phase 2: Near-Miss (2.5s) - Controlled slowdown with false stops
        setAnimationState('nearMiss')
        console.log('🎰 Phase 2: Near-Miss (2.5s)')
        casinoSoundManager.stopSound('anticipation')
        casinoSoundManager.playSound('nearMiss')
        
        timers.push(setTimeout(() => {
          if (!hasCompletedRef.current) {
            // Phase 3: Resolution (1.2s) - Magnetic snap to winner
            setAnimationState('resolution')
            console.log('🎰 Phase 3: Resolution (1.2s)')
            casinoSoundManager.playSound('resolution')
            
            timers.push(setTimeout(() => {
              if (!hasCompletedRef.current) {
                // Phase 4: Reveal Hold (0.8s) - Spotlight on prize
                setAnimationState('revealHold')
                console.log('🎰 Phase 4: Reveal Hold (0.8s)')
                casinoSoundManager.playSound('revealHold')
                
                timers.push(setTimeout(() => {
                  if (!hasCompletedRef.current) {
                    // Phase 5: Celebration (3-5s) - Tiered effects
                    setAnimationState('celebration')
                    console.log('🎰 Phase 5: Celebration')
                    casinoSoundManager.playSound('celebration')
                    
                    timers.push(setTimeout(() => {
                      if (!hasCompletedRef.current) {
                        // Phase 6: Sustain - Wait for user interaction
                        setAnimationState('sustain')
                        console.log('🎰 Phase 6: Sustain (user-timed)')
                        hasCompletedRef.current = true
                        
                        // Auto-complete after reasonable time if no user interaction
                        timers.push(setTimeout(() => {
                          console.log('🎰 Auto-completing after sustain period')
                          onComplete()
                        }, 5000))
                      }
                    }, 3000)) // 3s celebration base time
                  }
                }, 800)) // 0.8s reveal hold
              }
            }, 1200)) // 1.2s resolution
          }
        }, 2500)) // 2.5s near-miss
      }
    }, 3500)) // 3.5s anticipation

    // Cleanup function
    return () => {
      console.log('🎰 Cleaning up casino animation timers')
      timers.forEach(timer => clearTimeout(timer))
      casinoSoundManager.stopAllSounds() // Stop all sounds on cleanup
    }
  }, [isSpinning, onComplete])

  // Calculate positions with better accuracy
  const winningPosition = getWinningPosition()
  const centerPosition = itemWidth * Math.floor(visibleItems / 2)
  
  // Ensure winning position is valid and calculate precise center positioning
  const validWinningPosition = Math.max(0, Math.min(winningPosition, reelItems.current.length - 1))
  const targetTransform = -(validWinningPosition * itemWidth) + centerPosition

  console.log('🎰 Render check - isSpinning:', isSpinning, 'itemsLength:', reelItems.current.length, 'animationState:', animationState)
  
  // Always render something, but show different states
  if (reelItems.current.length === 0) {
    console.log('🎰 No items to display')
    return (
      <div className="w-full h-56 bg-red-500/20 rounded-xl flex items-center justify-center">
        <div className="text-white text-lg">No items to display</div>
      </div>
    )
  }
  
  if (!isSpinning) {
    console.log('🎰 Not spinning - showing ready state')
    return (
      <div className="w-full h-56 bg-blue-500/20 rounded-xl flex items-center justify-center">
        <div className="text-white text-lg">Ready to spin! ({reelItems.current.length} items loaded)</div>
      </div>
    )
  }

  console.log('🎰 Rendering carousel with', reelItems.current.length, 'items')

  return (
    <div className="relative w-full h-56 overflow-hidden bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-2xl border-4 border-yellow-400/60 shadow-2xl">
      
      {/* Center line indicator - more prominent */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-2 h-full bg-gradient-to-b from-red-500 via-yellow-400 to-red-500 z-20 shadow-lg shadow-yellow-400/50" />
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-full bg-white z-30 shadow-lg" />
      
      {/* Debug info */}
      <div className="absolute top-2 left-2 z-50 text-white text-xs bg-black/50 p-2 rounded">
        State: {animationState} | Items: {reelItems.current.length} | Winning: {winningPosition}
      </div>

      {/* Reel container */}
      <motion.div
        className="flex items-center h-full py-6"
        initial={{ x: 0 }}
        animate={{
          x: animationState === 'anticipation' 
            ? -itemWidth * 8 // Gradual acceleration
            : animationState === 'nearMiss'
            ? -itemWidth * (validWinningPosition - 2) // Stop just before winner for tension
            : animationState === 'resolution'
            ? targetTransform // Magnetic snap to winner
            : animationState === 'revealHold' || animationState === 'celebration' || animationState === 'sustain'
            ? targetTransform // Hold on winner
            : 0 // Starting position
        }}
        transition={{
          duration: animationState === 'anticipation' 
            ? 1.8 // Smooth acceleration cycles
            : animationState === 'nearMiss'
            ? 2.2 // Controlled deceleration with false stops
            : animationState === 'resolution'
            ? 0.8 // Quick magnetic snap
            : 0.3, // Fast transitions for other phases
          ease: animationState === 'anticipation'
            ? [0.2, 0.8, 0.4, 1.05] // Cubic bezier acceleration
            : animationState === 'nearMiss'
            ? [0.68, -0.55, 0.27, 1.55] // Bouncy deceleration for tension
            : animationState === 'resolution'
            ? [0.25, 0.46, 0.45, 0.94] // Magnetic snap easing
            : 'easeOut',
          repeat: animationState === 'anticipation' ? Infinity : 0,
          repeatType: 'loop'
        }}
      >
        {reelItems.current.map((item, index) => {
          // Casino-grade visual states based on animation phase
          const isWinningItem = item.isWinning
          const isInRevealHold = animationState === 'revealHold' && isWinningItem
          const isInCelebration = (animationState === 'celebration' || animationState === 'sustain') && isWinningItem
          const isNearMissItem = animationState === 'nearMiss' && Math.abs(index - reelItems.current.findIndex(i => i.isWinning)) <= 2
          
          // Get rarity-based styling
          const getRarityEffects = (rarity: string) => {
            switch (rarity) {
              case 'legendary':
                return 'from-purple-500/60 to-pink-500/60 border-purple-400 shadow-purple-400/70'
              case 'epic':
                return 'from-purple-600/50 to-blue-500/50 border-purple-500 shadow-purple-500/60'
              case 'rare':
                return 'from-blue-500/50 to-cyan-500/50 border-blue-400 shadow-blue-400/60'
              case 'uncommon':
                return 'from-green-500/50 to-emerald-500/50 border-green-400 shadow-green-400/60'
              default:
                return 'from-gray-500/50 to-gray-600/50 border-gray-400 shadow-gray-400/60'
            }
          }
          
          return (
            <motion.div
              key={`reel-${index}-${item.id}`}
              className={`flex-shrink-0 mx-1 rounded-2xl flex flex-col items-center justify-center transition-all duration-500 backdrop-blur-md ${
                isInCelebration 
                  ? `bg-gradient-to-b ${getRarityEffects(item.rarity)} border-2 shadow-2xl` 
                  : isInRevealHold && isWinningItem
                  ? 'bg-gradient-to-b from-yellow-400/40 to-yellow-600/40 border-2 border-yellow-300/80 shadow-xl shadow-yellow-300/60'
                  : isNearMissItem
                  ? 'bg-black/70 border border-yellow-300/30 shadow-lg'
                  : 'bg-black/60 border border-gray-600/50'
              }`}
              style={{ 
                width: itemWidth - 8, 
                height: 180
              }}
              animate={
                isInCelebration ? {
                  scale: [1, 1.1, 1],
                  rotateY: [0, 10, -10, 0],
                  rotateZ: [0, 2, -2, 0]
                } : isInRevealHold ? {
                  scale: [1, 1.05, 1.05],
                  boxShadow: ['0 0 20px rgba(255,255,0,0.5)', '0 0 40px rgba(255,255,0,0.8)', '0 0 20px rgba(255,255,0,0.5)']
                } : {}
              }
              transition={
                isInCelebration ? {
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                } : isInRevealHold ? {
                  duration: 0.8,
                  repeat: Infinity,
                  ease: "easeInOut"
                } : {}
              }
            >
              <div className="flex flex-col items-center justify-center h-full p-3">
                <motion.div 
                  className={`w-16 h-16 mb-2 flex items-center justify-center transition-all duration-300 ${
                    isInCelebration ? 'drop-shadow-lg' : ''
                  }`}
                  animate={
                    isInCelebration ? {
                      scale: [1, 1.4, 1],
                      filter: [
                        'brightness(1) contrast(1)', 
                        'brightness(1.3) contrast(1.2)', 
                        'brightness(1) contrast(1)'
                      ]
                    } : isInRevealHold ? {
                      scale: [1, 1.2, 1.2],
                    } : {}
                  }
                  transition={
                    isInCelebration ? {
                      duration: 1.0,
                      repeat: Infinity,
                      ease: "easeInOut"
                    } : isInRevealHold ? {
                      duration: 0.8,
                      ease: "easeOut"
                    } : {}
                  }
                >
                  {item.symbol.imageUrl ? (
                    <img 
                      src={item.symbol.imageUrl} 
                      alt={item.symbol.name}
                      className="symbol-image rounded-lg"
                    />
                  ) : (
                    <div className="text-4xl">{item.symbol.emoji}</div>
                  )}
                </motion.div>
                
                <div className={`text-xs font-medium text-center truncate w-full transition-all duration-300 ${
                  isInCelebration ? 'text-white font-bold text-shadow' : 
                  isInRevealHold ? 'text-yellow-100 font-semibold' : 
                  'text-white'
                }`}>
                  {item.symbol.name}
                </div>
                

              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Minimal status indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30">
        <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
          animationState === 'anticipation' ? 'bg-blue-400 animate-pulse' :
          animationState === 'nearMiss' ? 'bg-yellow-400 animate-bounce' :
          animationState === 'resolution' ? 'bg-orange-400' :
          animationState === 'revealHold' ? 'bg-purple-400 shadow-lg shadow-purple-400/50' :
          animationState === 'celebration' ? 'bg-green-400 shadow-lg shadow-green-400/50 animate-pulse' :
          animationState === 'sustain' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 shadow-2xl animate-bounce' :
          'bg-gray-400'
        }`} />
      </div>

      {/* Casino-grade celebration overlays - clickable to skip */}
      {animationState === 'celebration' && (
        <div 
          className="absolute inset-0 z-40 cursor-pointer" 
          onClick={() => {
            console.log('🎉 User clicked during celebration, fast-tracking to sustain phase')
            casinoSoundManager.playSound('click')
            casinoSoundManager.stopAllSounds()
            setAnimationState('sustain')
          }}
          title="Click to skip celebration"
        >
          {/* Main celebration banner */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <motion.div 
              className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black px-8 py-4 rounded-2xl font-bold text-xl shadow-2xl border-4 border-yellow-300"
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 2, -2, 0],
                boxShadow: [
                  '0 0 30px rgba(255,215,0,0.6)',
                  '0 0 60px rgba(255,215,0,0.9)',
                  '0 0 30px rgba(255,215,0,0.6)'
                ]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              🎊 WINNER! 🎊
            </motion.div>
          </div>
          
          {/* Celebration particles */}
          <div className="absolute top-4 left-4">
            <motion.div 
              className="text-2xl"
              animate={{
                y: [0, -20, 0],
                x: [0, 5, 0],
                opacity: [1, 0.5, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: 0.2
              }}
            >
              ✨
            </motion.div>
          </div>
          
          <div className="absolute top-4 right-4">
            <motion.div 
              className="text-2xl"
              animate={{
                y: [0, -20, 0],
                x: [0, -5, 0],
                opacity: [1, 0.5, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: 0.6
              }}
            >
              🎉
            </motion.div>
          </div>
        </div>
      )}

      {/* Sustain phase overlay - CLICKABLE */}
      {animationState === 'sustain' && (
        <div className="absolute inset-0 z-40 flex items-end justify-center pb-16">
          <motion.button 
            onClick={() => {
              console.log('🏆 User clicked to claim reward!')
              casinoSoundManager.playSound('claim')
              onComplete()
            }}
            onMouseEnter={() => casinoSoundManager.playSound('hover')}
            className="bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-2xl cursor-pointer transform transition-all duration-200 hover:scale-110 active:scale-95"
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.9, 1, 0.9],
              boxShadow: [
                '0 4px 20px rgba(34, 197, 94, 0.4)',
                '0 8px 30px rgba(34, 197, 94, 0.6)',
                '0 4px 20px rgba(34, 197, 94, 0.4)'
              ]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            whileHover={{
              scale: 1.1,
              boxShadow: '0 10px 40px rgba(34, 197, 94, 0.8)'
            }}
            whileTap={{
              scale: 0.95
            }}
          >
            🏆 CLAIM YOUR REWARD! 🏆
          </motion.button>
        </div>
      )}
    </div>
  )
} 