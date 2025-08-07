"use client"

import { useEffect, useRef, useState, useMemo } from 'react'
import { motion, useAnimation } from 'framer-motion'
import Confetti from 'react-confetti'

interface RarityEffectsProps {
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  isActive: boolean
  duration?: number
  onComplete?: () => void
}

// Screen shake hook
const useScreenShake = () => {
  const [isShaking, setIsShaking] = useState(false)
  
  const startShake = (intensity: number, duration: number = 1000) => {
    setIsShaking(true)
    document.body.style.transform = 'translateX(0)'
    
    const shakeAnimation = () => {
      const shake = Math.random() * intensity * 2 - intensity
      document.body.style.transform = `translateX(${shake}px) translateY(${shake * 0.5}px)`
    }
    
    const interval = setInterval(shakeAnimation, 50)
    
    setTimeout(() => {
      clearInterval(interval)
      document.body.style.transform = 'translateX(0) translateY(0)'
      setIsShaking(false)
    }, duration)
  }
  
  return { startShake, isShaking }
}

// Particle component
const Particle = ({ x, y, color, size, duration }: {
  x: number
  y: number
  color: string
  size: number
  duration: number
}) => {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        backgroundColor: color,
        boxShadow: `0 0 ${size}px ${color}`
      }}
      initial={{
        scale: 0,
        opacity: 1,
        x: 0,
        y: 0
      }}
      animate={{
        scale: [0, 1, 0],
        opacity: [1, 0.8, 0],
        x: [0, Math.random() * 200 - 100],
        y: [0, Math.random() * 200 - 100]
      }}
      transition={{
        duration,
        ease: "easeOut"
      }}
    />
  )
}

// God rays effect
const GodRays = ({ isActive }: { isActive: boolean }) => {
  if (!isActive) return null
  
  return (
    <div className="fixed inset-0 pointer-events-none z-30">
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute bg-gradient-to-b from-yellow-400/30 via-yellow-400/10 to-transparent"
          style={{
            left: `${12.5 * i}%`,
            top: 0,
            width: '12.5%',
            height: '100%',
            transformOrigin: 'top center'
          }}
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ 
            scaleY: isActive ? 1 : 0, 
            opacity: isActive ? 1 : 0,
            rotate: [0, 2, -2, 0]
          }}
          transition={{
            duration: 2,
            delay: i * 0.1,
            rotate: { duration: 4, repeat: Infinity }
          }}
        />
      ))}
    </div>
  )
}

// Beam effect
const BeamEffect = ({ isActive }: { isActive: boolean }) => {
  if (!isActive) return null
  
  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: isActive ? 1 : 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="absolute top-1/2 left-1/2 w-2 bg-gradient-to-b from-purple-400 via-blue-400 to-cyan-400"
        style={{
          height: '100vh',
          transform: 'translate(-50%, -50%)',
          filter: 'blur(2px)',
          boxShadow: '0 0 20px currentColor'
        }}
        animate={{
          scaleX: [1, 3, 1],
          opacity: [0.8, 1, 0.8]
        }}
        transition={{
          duration: 2,
          repeat: Infinity
        }}
      />
    </motion.div>
  )
}

// Cinematic sequence for legendary items
const CinematicSequence = ({ isActive, onComplete }: { 
  isActive: boolean
  onComplete?: () => void 
}) => {
  const controls = useAnimation()
  
  useEffect(() => {
    if (isActive) {
      const sequence = async () => {
        // Phase 1: Fade to black
        await controls.start({
          opacity: 1,
          transition: { duration: 0.5 }
        })
        
        // Phase 2: Golden flash
        await controls.start({
          backgroundColor: ['#000000', '#FFD700', '#FFA500', '#FFD700'],
          transition: { duration: 1.5 }
        })
        
        // Phase 3: Fade out
        await controls.start({
          opacity: 0,
          transition: { duration: 1 }
        })
        
        onComplete?.()
      }
      
      sequence()
    }
  }, [isActive, controls, onComplete])
  
  if (!isActive) return null
  
  return (
    <motion.div
      className="fixed inset-0 z-40 pointer-events-none"
      initial={{ opacity: 0, backgroundColor: '#000000' }}
      animate={controls}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="text-6xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ 
            scale: isActive ? [0, 1.2, 1] : 0,
            rotate: isActive ? [180, 0] : -180
          }}
          transition={{ 
            duration: 2,
            type: "spring",
            stiffness: 100
          }}
        >
          ✨ LEGENDARY ✨
        </motion.div>
      </div>
    </motion.div>
  )
}

export const RarityEffectsSystem = ({ 
  rarity, 
  isActive, 
  duration = 3000,
  onComplete 
}: RarityEffectsProps) => {
  const [particles, setParticles] = useState<Array<{
    id: string
    x: number
    y: number
    color: string
    size: number
    duration: number
  }>>([])
  const [showGodRays, setShowGodRays] = useState(false)
  const [showBeam, setShowBeam] = useState(false)
  const [showCinematic, setShowCinematic] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  
  const { startShake } = useScreenShake()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Rarity configurations
  const rarityConfigs: Record<string, {
    particleCount: number
    colors: string[]
    screenShake: number
    effects: string[]
  }> = {
    common: {
      particleCount: 0,
      colors: ['#9CA3AF'],
      screenShake: 0,
      effects: []
    },
    uncommon: {
      particleCount: 20,
      colors: ['#10B981', '#34D399'],
      screenShake: 0.5,
      effects: []
    },
    rare: {
      particleCount: 50,
      colors: ['#3B82F6', '#60A5FA', '#93C5FD'],
      screenShake: 1,
      effects: ['particles']
    },
    epic: {
      particleCount: 100,
      colors: ['#8B5CF6', '#A78BFA', '#C4B5FD'],
      screenShake: 2,
      effects: ['particles', 'beam', 'shake']
    },
    legendary: {
      particleCount: 200,
      colors: ['#F59E0B', '#FBBF24', '#FCD34D', '#F87171'],
      screenShake: 3,
      effects: ['particles', 'godrays', 'cinematic', 'confetti', 'shake']
    }
  }

  // Generate particles
  const generateParticles = (count: number, colors: string[]) => {
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: `particle-${i}-${Date.now()}`,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      duration: Math.random() * 2 + 1
    }))
    
    setParticles(newParticles)
    
    // Clear particles after animation
    setTimeout(() => setParticles([]), Math.max(...newParticles.map(p => p.duration)) * 1000)
  }

  // Play rarity sound (placeholder)
  const playRaritySound = (rarity: string) => {
    // In a real implementation, you would play audio files here
    console.log(`🔊 Playing ${rarity} sound effect`)
  }

  // Trigger all effects for the rarity
  const triggerRarityEffects = () => {
    const config = rarityConfigs[rarity]
    console.log(`✨ Triggering ${rarity} effects:`, config.effects)

    // Core particle burst
    if (config.particleCount > 0) {
      generateParticles(config.particleCount, config.colors)
    }

    // Screen shake
    if (config.effects.includes('shake') && config.screenShake > 0) {
      startShake(config.screenShake, 800)
    }

    // Beam effect
    if (config.effects.includes('beam')) {
      setShowBeam(true)
      setTimeout(() => setShowBeam(false), 2000)
    }

    // God rays
    if (config.effects.includes('godrays')) {
      setShowGodRays(true)
      setTimeout(() => setShowGodRays(false), 4000)
    }

    // Confetti
    if (config.effects.includes('confetti')) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 5000)
    }

    // Cinematic sequence
    if (config.effects.includes('cinematic')) {
      setShowCinematic(true)
    }

    // Play sound
    if (rarity !== 'common') {
      playRaritySound(rarity)
    }

    // Auto-complete after duration
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      onComplete?.()
    }, duration)
  }

  // Handle cinematic completion
  const handleCinematicComplete = () => {
    setShowCinematic(false)
    onComplete?.()
  }

  // Trigger effects when active
  useEffect(() => {
    if (isActive) {
      triggerRarityEffects()
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isActive, rarity])

  if (!isActive) return null

  return (
    <>
      {/* Particles */}
      <div className="fixed inset-0 pointer-events-none z-10">
        {particles.map(particle => (
          <Particle
            key={particle.id}
            x={particle.x}
            y={particle.y}
            color={particle.color}
            size={particle.size}
            duration={particle.duration}
          />
        ))}
      </div>

      {/* Beam Effect */}
      <BeamEffect isActive={showBeam} />

      {/* God Rays */}
      <GodRays isActive={showGodRays} />

      {/* Confetti */}
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={rarity === 'legendary' ? 500 : 200}
          gravity={0.1}
          colors={rarityConfigs[rarity].colors}
          run={showConfetti}
        />
      )}

      {/* Cinematic Sequence */}
      <CinematicSequence 
        isActive={showCinematic} 
        onComplete={handleCinematicComplete}
      />

      {/* Subtle glow overlay */}
      {rarity !== 'common' && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-5"
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: isActive ? [0, 0.3, 0] : 0,
            backgroundColor: [
              'transparent',
              `${rarityConfigs[rarity].colors[0]}20`,
              'transparent'
            ]
          }}
          transition={{ 
            duration: 2,
            repeat: rarity === 'legendary' ? 2 : 0
          }}
        />
      )}
    </>
  )
}

// Convenience hook for triggering rarity effects
export const useRarityEffects = () => {
  const [activeRarity, setActiveRarity] = useState<string | null>(null)
  
  const triggerEffects = (rarity: string, duration?: number) => {
    console.log(`🎆 Triggering ${rarity} rarity effects`)
    setActiveRarity(rarity)
    
    setTimeout(() => {
      setActiveRarity(null)
    }, duration || 3000)
  }

  return {
    activeRarity,
    triggerEffects,
    isActive: activeRarity !== null
  }
} 