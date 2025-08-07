"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { AnimationPool } from '@/lib/AnimationPool'
import { useDeviceCapabilities } from '@/hooks/useDeviceCapabilities'

interface AnticipationSequenceProps {
  isActive: boolean
  onComplete: () => void
  onCancel?: () => void
  anticipationLevel: 'low' | 'medium' | 'high' | 'legendary'
  enableAudio?: boolean
}

interface PulseEffect {
  id: string
  intensity: number
  duration: number
  color: string
}

// Casino-style anticipation builder inspired by slot machines and Aviator
export const CasinoAnticipationSystem = ({
  isActive,
  onComplete,
  onCancel,
  anticipationLevel = 'medium',
  enableAudio = true
}: AnticipationSequenceProps) => {
  const [currentPhase, setCurrentPhase] = useState<'idle' | 'build' | 'tension' | 'peak' | 'complete'>('idle')
  const [anticipationProgress, setAnticipationProgress] = useState(0)
  const [heartbeatIntensity, setHeartbeatIntensity] = useState(0)
  const [glowPulses, setGlowPulses] = useState<PulseEffect[]>([])
  
  const { canUseComplexEffects, canUseAudio, performanceSettings } = useDeviceCapabilities()
  const controls = useAnimation()
  const audioContextRef = useRef<AudioContext | null>(null)
  const oscillatorRef = useRef<OscillatorNode | null>(null)
  const timeoutRefs = useRef<NodeJS.Timeout[]>([])

  // Anticipation settings based on level (similar to how casinos calibrate tension)
  const anticipationSettings = {
    low: {
      totalDuration: 1500,
      phases: { build: 400, tension: 600, peak: 500 },
      heartbeatMax: 0.3,
      glowCount: 2,
      soundFrequency: 220,
      colors: ['#4F46E5', '#6366F1']
    },
    medium: {
      totalDuration: 2500,
      phases: { build: 800, tension: 1000, peak: 700 },
      heartbeatMax: 0.6,
      glowCount: 4,
      soundFrequency: 440,
      colors: ['#7C3AED', '#8B5CF6', '#A855F7']
    },
    high: {
      totalDuration: 3500,
      phases: { build: 1000, tension: 1500, peak: 1000 },
      heartbeatMax: 0.8,
      glowCount: 6,
      soundFrequency: 660,
      colors: ['#DC2626', '#EF4444', '#F87171']
    },
    legendary: {
      totalDuration: 4500,
      phases: { build: 1200, tension: 2000, peak: 1300 },
      heartbeatMax: 1.0,
      glowCount: 8,
      soundFrequency: 880,
      colors: ['#F59E0B', '#FBBF24', '#FCD34D', '#FEF3C7']
    }
  }

  const settings = anticipationSettings[anticipationLevel]

  // Create subtle audio tension (inspired by casino sound design)
  const createTensionAudio = useCallback(async () => {
    if (!canUseAudio || !enableAudio) return

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      const audioContext = audioContextRef.current
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Very subtle low-frequency pulse (subliminal tension)
      oscillator.frequency.setValueAtTime(settings.soundFrequency, audioContext.currentTime)
      oscillator.type = 'sine'
      
      // Gradual volume increase with heartbeat pattern
      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.02, audioContext.currentTime + 0.1)

      oscillator.start(audioContext.currentTime)
      oscillatorRef.current = oscillator

      // Create heartbeat pattern
      const pulseInterval = setInterval(() => {
        if (audioContext && gainNode) {
          const now = audioContext.currentTime
          gainNode.gain.cancelScheduledValues(now)
          gainNode.gain.setValueAtTime(gainNode.gain.value, now)
          gainNode.gain.exponentialRampToValueAtTime(0.05, now + 0.1)
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
        }
      }, 800 - (heartbeatIntensity * 300)) // Faster heartbeat = more tension

      timeoutRefs.current.push(pulseInterval as any)

    } catch (error) {
      console.warn('Audio context creation failed:', error)
    }
  }, [canUseAudio, enableAudio, settings.soundFrequency, heartbeatIntensity])

  // Stop audio
  const stopTensionAudio = useCallback(() => {
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop()
        oscillatorRef.current.disconnect()
        oscillatorRef.current = null
      } catch (error) {
        // Oscillator might already be stopped
      }
    }
  }, [])

  // Generate glow pulse effects
  const createGlowPulse = useCallback((intensity: number, color: string) => {
    const pulse: PulseEffect = {
      id: `pulse-${Date.now()}-${Math.random()}`,
      intensity,
      duration: 800 + (intensity * 400),
      color
    }

    setGlowPulses(prev => [...prev.slice(-5), pulse]) // Keep last 5 pulses

    // Remove pulse after animation
    setTimeout(() => {
      setGlowPulses(prev => prev.filter(p => p.id !== pulse.id))
    }, pulse.duration + 100)
  }, [])

  // Main anticipation sequence (similar to slot machine buildup)
  const runAnticipationSequence = useCallback(async () => {
    if (!isActive) return

    console.log(`🎰 Starting ${anticipationLevel} anticipation sequence`)
    
    setCurrentPhase('build')
    setAnticipationProgress(0)

    // Clear any existing timeouts
    timeoutRefs.current.forEach(clearTimeout)
    timeoutRefs.current = []

    // Phase 1: Build anticipation
    const buildTimer = setTimeout(() => {
      setCurrentPhase('tension')
      setAnticipationProgress(30)
      
      if (canUseComplexEffects) {
        createTensionAudio()
      }

      // Generate periodic glow pulses
      const pulseTimer = setInterval(() => {
        if (currentPhase !== 'complete') {
          const color = settings.colors[Math.floor(Math.random() * settings.colors.length)]
          createGlowPulse(heartbeatIntensity, color)
        }
      }, 600)
      
      timeoutRefs.current.push(pulseTimer as any)

      // Phase 2: Build tension
      const tensionTimer = setTimeout(() => {
        setCurrentPhase('peak')
        setAnticipationProgress(70)
        
        // Increase heartbeat intensity
        setHeartbeatIntensity(settings.heartbeatMax * 0.8)

        // Phase 3: Peak tension
        const peakTimer = setTimeout(() => {
          setCurrentPhase('complete')
          setAnticipationProgress(100)
          setHeartbeatIntensity(settings.heartbeatMax)

          // Final dramatic pulse
          if (canUseComplexEffects) {
            settings.colors.forEach((color, index) => {
              setTimeout(() => {
                createGlowPulse(1, color)
              }, index * 100)
            })
          }

          // Complete the sequence
          const completeTimer = setTimeout(() => {
            stopTensionAudio()
            onComplete()
          }, 500)

          timeoutRefs.current.push(completeTimer)
        }, settings.phases.peak)

        timeoutRefs.current.push(peakTimer)
      }, settings.phases.tension)

      timeoutRefs.current.push(tensionTimer)
    }, settings.phases.build)

    timeoutRefs.current.push(buildTimer)

    // Progress animation
    const progressInterval = setInterval(() => {
      setAnticipationProgress(prev => {
        const elapsed = Date.now() - Date.now() // This should track actual elapsed time
        const targetProgress = Math.min(95, (elapsed / settings.totalDuration) * 100)
        return Math.min(targetProgress, prev + 2)
      })
    }, 50)

    timeoutRefs.current.push(progressInterval as any)

    // Heartbeat intensity ramp
    const heartbeatInterval = setInterval(() => {
      setHeartbeatIntensity(prev => {
        const target = currentPhase === 'build' ? 0.2 : 
                      currentPhase === 'tension' ? 0.5 :
                      currentPhase === 'peak' ? settings.heartbeatMax : 0
        return prev + ((target - prev) * 0.1)
      })
    }, 100)

    timeoutRefs.current.push(heartbeatInterval as any)

  }, [anticipationLevel, canUseComplexEffects]) // Simplified dependencies

  // Start sequence when activated
  useEffect(() => {
    if (isActive && currentPhase === 'idle') {
      runAnticipationSequence()
    } else if (!isActive) {
      setCurrentPhase('idle')
      setAnticipationProgress(0)
      setHeartbeatIntensity(0)
      setGlowPulses([])
      stopTensionAudio()
      
      // Clean up all timers
      timeoutRefs.current.forEach(clearTimeout)
      timeoutRefs.current = []
    }
  }, [isActive, currentPhase]) // Remove changing dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTensionAudio()
      timeoutRefs.current.forEach(clearTimeout)
      
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, []) // Remove stopTensionAudio dependency

  if (!isActive) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Subtle background pulse (inspired by casino ambiance) */}
      <motion.div
        className="absolute inset-0 bg-black"
        animate={{
          opacity: [0, 0.1 + (heartbeatIntensity * 0.15), 0]
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Glow pulse effects */}
      {canUseComplexEffects && glowPulses.map(pulse => (
        <motion.div
          key={pulse.id}
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at center, ${pulse.color}${Math.floor(pulse.intensity * 30).toString(16).padStart(2, '0')} 0%, transparent 70%)`
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: [0, pulse.intensity * 0.3, 0],
            scale: [0.8, 1.2, 1.5]
          }}
          transition={{ 
            duration: pulse.duration / 1000,
            ease: "easeOut"
          }}
        />
      ))}

      {/* Center focus area with subtle animation */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="w-80 h-80 border border-white/20 rounded-full"
          animate={{
            scale: [1, 1 + (heartbeatIntensity * 0.1), 1],
            borderColor: [
              'rgba(255,255,255,0.2)',
              `${settings.colors[0]}80`,
              'rgba(255,255,255,0.2)'
            ]
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Inner pulse ring */}
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 border border-white/10 rounded-full"
          animate={{
            scale: [1, 1 + (heartbeatIntensity * 0.2), 1],
            opacity: [0.3, 0.7, 0.3]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Progress indicator (subtle, bottom of screen) */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="w-64 h-1 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            className={`h-full bg-gradient-to-r ${
              anticipationLevel === 'legendary' ? 'from-yellow-400 to-orange-500' :
              anticipationLevel === 'high' ? 'from-red-500 to-pink-500' :
              anticipationLevel === 'medium' ? 'from-purple-500 to-blue-500' :
              'from-blue-500 to-cyan-500'
            }`}
            style={{ width: `${anticipationProgress}%` }}
            animate={{
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity
            }}
          />
        </div>
        
        {/* Phase indicator */}
        <div className="text-center mt-2 text-white/60 text-xs">
          {currentPhase === 'build' && 'Building suspense...'}
          {currentPhase === 'tension' && 'Creating tension...'}
          {currentPhase === 'peak' && 'Peak anticipation...'}
          {currentPhase === 'complete' && 'Ready for reveal!'}
        </div>
      </div>

      {/* Cancel button (if enabled) */}
      {onCancel && (
        <motion.button
          onClick={onCancel}
          className="absolute top-8 right-8 text-white/60 hover:text-white/80 transition-colors pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          ✕ Skip
        </motion.button>
      )}

      {/* Debug info (performance settings dependent) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 left-4 text-white/40 text-xs font-mono">
          <div>Phase: {currentPhase}</div>
          <div>Progress: {Math.round(anticipationProgress)}%</div>
          <div>Heartbeat: {Math.round(heartbeatIntensity * 100)}%</div>
          <div>Level: {anticipationLevel}</div>
          <div>Audio: {canUseAudio ? 'ON' : 'OFF'}</div>
          <div>Effects: {canUseComplexEffects ? 'ON' : 'OFF'}</div>
        </div>
      )}
    </div>
  )
}

// Hook for easy integration
export const useAnticipationSequence = () => {
  const [isBuilding, setIsBuilding] = useState(false)
  const [level, setLevel] = useState<'low' | 'medium' | 'high' | 'legendary'>('medium')

  const startAnticipation = useCallback((anticipationLevel: typeof level = 'medium') => {
    setLevel(anticipationLevel)
    setIsBuilding(true)
  }, [])

  const stopAnticipation = useCallback(() => {
    setIsBuilding(false)
  }, [])

  return {
    isBuilding,
    level,
    startAnticipation,
    stopAnticipation
  }
} 