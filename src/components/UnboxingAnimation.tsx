"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import confetti from 'canvas-confetti'
import { SYMBOL_CONFIG, RARITY_CONFIG, getSymbolByKey } from '@/lib/symbols'

interface Skin {
  id: string
  name: string
  rarity: string
  value: number
  image_url: string
  description: string
  collection?: string
}

interface UnboxingAnimationProps {
  isOpening: boolean
  onComplete: (skin: Skin) => void
  skins: Skin[]
  wonSkin: Skin | null
  apiResult?: any
}

type AnimationPhase = 'anticipation' | 'spinning' | 'slowing' | 'revealing' | 'celebrating' | 'complete'

export function UnboxingAnimation({ isOpening, onComplete, wonSkin, apiResult }: UnboxingAnimationProps) {
  const [phase, setPhase] = useState<AnimationPhase>('anticipation')
  const [progress, setProgress] = useState(0)
  const [spinSpeed, setSpinSpeed] = useState(0)
  const [particles, setParticles] = useState<Array<{id: string, x: number, y: number, delay: number}>>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Professional confetti effects based on rarity
  const triggerRarityEffects = (rarity: string) => {
    const effects = {
      'common': {
        particles: 30,
        colors: ['#9CA3AF', '#D1D5DB', '#6B7280'],
        duration: 2000,
        spread: 45
      },
      'uncommon': {
        particles: 50,
        colors: ['#10B981', '#34D399', '#6EE7B7'],
        duration: 3000,
        spread: 60
      },
      'rare': {
        particles: 80,
        colors: ['#3B82F6', '#60A5FA', '#93C5FD'],
        duration: 4000,
        spread: 70
      },
      'epic': {
        particles: 120,
        colors: ['#9333EA', '#A855F7', '#C084FC'],
        duration: 5000,
        spread: 90
      },
      'legendary': {
        particles: 200,
        colors: ['#FFD700', '#FFA500', '#FFFF00', '#FF8C00'],
        duration: 6000,
        spread: 120
      }
    }

    const config = effects[rarity as keyof typeof effects] || effects.common

    // Multiple burst effect for epic and legendary
    if (rarity === 'epic' || rarity === 'legendary') {
      // First burst
      confetti({
        particleCount: config.particles / 3,
        spread: config.spread,
        origin: { y: 0.6 },
        colors: config.colors,
        gravity: 0.8,
        scalar: 1.2
      })

      // Second burst with delay
      setTimeout(() => {
        confetti({
          particleCount: config.particles / 3,
          spread: config.spread + 20,
          origin: { y: 0.4 },
          colors: config.colors,
          gravity: 0.6,
          scalar: 0.8
        })
      }, 300)

      // Final burst for legendary
      if (rarity === 'legendary') {
        setTimeout(() => {
          confetti({
            particleCount: config.particles / 2,
            spread: 360,
            origin: { y: 0.3 },
            colors: config.colors,
            gravity: 0.4,
            scalar: 1.5,
            shapes: ['star']
          })
        }, 600)
      }
    } else {
      confetti({
        particleCount: config.particles,
        spread: config.spread,
        origin: { y: 0.6 },
        colors: config.colors
      })
    }
  }

  // Generate floating particles for atmosphere
  const generateParticles = () => {
    const timestamp = Date.now()
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: `particle-${timestamp}-${i}`,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2
    }))
    setParticles(newParticles)
  }

  // Professional animation sequence
  useEffect(() => {
    if (!isOpening || !wonSkin) return

    let timeouts: NodeJS.Timeout[] = []
    
    const sequence = async () => {
      // Phase 1: Anticipation (1s)
      setPhase('anticipation')
      setProgress(0)
      generateParticles()
      
      timeouts.push(setTimeout(() => setProgress(20), 200))
      
      // Phase 2: Spinning (3s)
      timeouts.push(setTimeout(() => {
        setPhase('spinning')
        setSpinSpeed(1)
        setProgress(40)
      }, 1000))

      // Increase intensity
      timeouts.push(setTimeout(() => {
        setSpinSpeed(2)
        setProgress(60)
      }, 2000))

      timeouts.push(setTimeout(() => {
        setSpinSpeed(3)
        setProgress(75)
      }, 3000))

      // Phase 3: Slowing down (1s)
      timeouts.push(setTimeout(() => {
        setPhase('slowing')
        setSpinSpeed(1)
        setProgress(85)
      }, 4000))

      timeouts.push(setTimeout(() => {
        setSpinSpeed(0)
        setProgress(95)
      }, 4500))

      // Phase 4: Revealing (1s)
      timeouts.push(setTimeout(() => {
        setPhase('revealing')
        setProgress(100)
        
        // Trigger effects based on rarity
        if (wonSkin) {
          triggerRarityEffects(wonSkin.rarity)
        }

        // Screen shake for epic/legendary
        if (wonSkin && ['epic', 'legendary'].includes(wonSkin.rarity)) {
          if (containerRef.current) {
            containerRef.current.style.animation = 'shake 0.5s ease-in-out'
            setTimeout(() => {
              if (containerRef.current) {
                containerRef.current.style.animation = ''
              }
            }, 500)
          }
        }
      }, 5000))

      // Phase 5: Celebrating (2s)
      timeouts.push(setTimeout(() => {
        setPhase('celebrating')
      }, 6000))

      // Complete
      timeouts.push(setTimeout(() => {
        setPhase('complete')
        onComplete(wonSkin)
      }, 8000))
    }

    sequence()

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout))
    }
  }, [isOpening, wonSkin, onComplete])

  if (!isOpening) return null

  const wonSymbol = wonSkin ? getSymbolByKey(wonSkin.id) : null
  const rarityConfig = wonSymbol ? RARITY_CONFIG[wonSymbol.rarity as keyof typeof RARITY_CONFIG] : null

  return (
    <AnimatePresence>
      <motion.div 
        ref={containerRef}
        className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          background: 'radial-gradient(ellipse at center, rgba(147, 51, 234, 0.1) 0%, rgba(0, 0, 0, 0.95) 70%)'
        }}
      >
        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute w-1 h-1 bg-white/20 rounded-full"
              style={{ left: `${particle.x}%`, top: `${particle.y}%` }}
              animate={{
                y: [0, -50, 0],
                opacity: [0, 1, 0],
                scale: [0, 1, 0]
              }}
              transition={{
                duration: 4,
                delay: particle.delay,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>

        {/* Main container */}
        <motion.div
          className="relative max-w-4xl w-full"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Title */}
          <motion.div
            className="text-center mb-8"
            animate={{
              y: phase === 'celebrating' ? [0, -10, 0] : 0
            }}
            transition={{ duration: 2, repeat: phase === 'celebrating' ? Infinity : 0 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent mb-4">
              {phase === 'anticipation' && '🎁 Preparing Mystery Box'}
              {phase === 'spinning' && '🎰 Opening Box'}
              {phase === 'slowing' && '⚡ Finalizing'}
              {phase === 'revealing' && '✨ Revealed!'}
              {phase === 'celebrating' && '🎉 Congratulations!'}
              {phase === 'complete' && '🏆 Complete'}
            </h1>
            
            <motion.p 
              className="text-lg text-gray-300"
              key={phase}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {phase === 'anticipation' && 'Building anticipation...'}
              {phase === 'spinning' && 'Fate is spinning...'}
              {phase === 'slowing' && 'Destiny approaches...'}
              {phase === 'revealing' && 'Your reward awaits!'}
              {phase === 'celebrating' && 'Amazing luck!'}
              {phase === 'complete' && 'Enjoy your prize!'}
            </motion.p>
          </motion.div>

          {/* Main animation area */}
          <div className="relative h-80 mb-8 mx-auto max-w-2xl">
            
            {/* Mystery Box Animation */}
            {(phase === 'anticipation' || phase === 'spinning' || phase === 'slowing') && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{
                  rotateY: spinSpeed > 0 ? [0, 360] : 0,
                  scale: phase === 'anticipation' ? [0.8, 1, 0.8] : 1
                }}
                transition={{
                  rotateY: {
                    duration: spinSpeed > 0 ? (4 - spinSpeed) / 2 : 0,
                    repeat: spinSpeed > 0 ? Infinity : 0,
                    ease: "linear"
                  },
                  scale: {
                    duration: 2,
                    repeat: phase === 'anticipation' ? Infinity : 0
                  }
                }}
                style={{ perspective: '1000px' }}
              >
                <div className="relative">
                  {/* Mystery box with 3D effect */}
                  <motion.div
                    className="w-48 h-48 bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 rounded-3xl shadow-2xl border-4 border-purple-500/50 flex items-center justify-center"
                    animate={{
                      boxShadow: spinSpeed > 0 ? 
                        ['0 0 20px rgba(147, 51, 234, 0.5)', '0 0 40px rgba(147, 51, 234, 0.8)', '0 0 20px rgba(147, 51, 234, 0.5)'] :
                        '0 0 30px rgba(147, 51, 234, 0.6)'
                    }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <motion.div
                      className="text-8xl"
                      animate={{
                        rotate: spinSpeed > 0 ? [0, 360] : 0,
                        scale: [1, 1.1, 1]
                      }}
                      transition={{
                        rotate: {
                          duration: spinSpeed > 0 ? 2 / spinSpeed : 0,
                          repeat: spinSpeed > 0 ? Infinity : 0,
                          ease: "linear"
                        },
                        scale: {
                          duration: 1,
                          repeat: Infinity
                        }
                      }}
                    >
                      🎁
                    </motion.div>
                  </motion.div>

                  {/* Energy rings */}
                  {spinSpeed > 0 && (
                    <>
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute inset-0 border-2 border-purple-400/30 rounded-full"
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.5, 0, 0.5]
                          }}
                          transition={{
                            duration: 2,
                            delay: i * 0.3,
                            repeat: Infinity
                          }}
                        />
                      ))}
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* Reveal Animation */}
            {(phase === 'revealing' || phase === 'celebrating' || phase === 'complete') && wonSymbol && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 15, stiffness: 300 }}
              >
                <motion.div
                  className={`relative p-8 rounded-3xl bg-gradient-to-br ${rarityConfig?.gradient || 'from-gray-600 to-gray-700'} 
                    border-4 ${rarityConfig?.border || 'border-gray-500'} shadow-2xl`}
                  animate={{
                    scale: phase === 'celebrating' ? [1, 1.05, 1] : 1,
                    rotateY: phase === 'celebrating' ? [0, 5, -5, 0] : 0,
                    boxShadow: `0 0 60px ${rarityConfig?.glow || '#999'}60`
                  }}
                  transition={{
                    duration: 2,
                    repeat: phase === 'celebrating' ? Infinity : 0
                  }}
                >
                  {/* Shimmer effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-3xl"
                    animate={{
                      x: phase === 'revealing' ? [-300, 300] : 0,
                      opacity: phase === 'revealing' ? [0, 1, 0] : 0
                    }}
                    transition={{ duration: 1.5 }}
                  />

                  {/* Pity timer indicator */}
                  {apiResult?.caseOpening?.isPityActivated && (
                    <motion.div
                      initial={{ scale: 0, y: -50 }}
                      animate={{ scale: 1, y: -40 }}
                      className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 py-2 rounded-full font-bold text-sm shadow-lg"
                    >
                      🛡️ PROTECTION ACTIVATED
                    </motion.div>
                  )}
                  
                  <div className="relative z-10 text-center">
                    <motion.div 
                      className="text-8xl mb-4"
                      animate={{
                        scale: phase === 'celebrating' ? [1, 1.2, 1] : 1,
                        rotate: phase === 'celebrating' && wonSymbol.rarity === 'legendary' ? [0, 10, -10, 0] : 0
                      }}
                      transition={{ duration: 3, repeat: phase === 'celebrating' ? Infinity : 0 }}
                    >
                      {wonSymbol.emoji}
                    </motion.div>
                    
                    <motion.h2 
                      className="text-3xl font-bold text-white mb-3"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      {wonSymbol.name}
                    </motion.h2>
                    
                    <motion.div 
                      className={`inline-block px-6 py-2 rounded-full bg-gradient-to-r ${rarityConfig?.gradient} text-white font-bold text-lg mb-4 shadow-lg`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      {wonSymbol.rarity.toUpperCase()}
                    </motion.div>
                    
                    <motion.div 
                      className="text-yellow-300 font-bold text-2xl"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.7 }}
                    >
                      💰 +{wonSkin?.value || 0} Credits
                    </motion.div>

                    {/* Net result */}
                    {apiResult && (
                      <motion.div 
                        className={`text-lg mt-3 font-semibold ${
                          apiResult.netResult > 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.9 }}
                      >
                        {apiResult.netResult > 0 ? '+' : ''}{apiResult.netResult} net
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </div>

          {/* Progress bar */}
          <motion.div
            className="w-full max-w-md mx-auto mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden border border-gray-600">
              <motion.div
                className="h-3 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>Opening</span>
              <span className="text-center">{progress}%</span>
              <span>Complete</span>
            </div>
          </motion.div>

          {/* Phase indicator */}
          <motion.div
            className="text-center text-sm text-gray-500"
            key={phase}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {phase === 'complete' && 'Click anywhere to close'}
          </motion.div>
        </motion.div>

        {/* Close on complete */}
        {phase === 'complete' && (
          <div 
            className="absolute inset-0 cursor-pointer z-10"
            onClick={() => onComplete(wonSkin!)}
          />
        )}
      </motion.div>

      {/* CSS for shake animation */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
      `}</style>
    </AnimatePresence>
  )
} 