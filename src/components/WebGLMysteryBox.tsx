"use client"

import { useRef, useState, useEffect, useCallback, Suspense, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
// Physics removed for stability - using visual effects only
import { 
  Environment, 
  PresentationControls, 
  Float, 
  Text,
  MeshDistortMaterial,
  Sparkles,
  Effects
} from '@react-three/drei'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { useDeviceCapabilities } from '@/hooks/useDeviceCapabilities'
import { SYMBOL_CONFIG, getSymbolByKey } from '@/lib/symbols'
import { AnimationPool } from '@/lib/AnimationPool'
import { WebGLPerformanceMonitor } from './WebGLPerformanceMonitor'
import { useWebGLContextRecovery } from '@/hooks/useWebGLContextRecovery'
// Custom materials temporarily disabled for stability
// Simplified physics for WebGL stability
import { CinematicCamera } from './CinematicCamera'

interface WebGLMysteryBoxProps {
  isOpen: boolean
  onOpen: () => Promise<any>
  onComplete: (result: any) => void
  onError: (error: string) => void
}

// WebGL Mystery Box 3D Model
const MysteryBoxMesh = ({ 
  isOpening, 
  animationPhase, 
  rarity = 'common',
  onClick 
}: {
  isOpening: boolean
  animationPhase: string
  rarity: string
  onClick: () => void
}) => {
  const boxRef = useRef<THREE.Mesh>(null!)
  const lidRef = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.Mesh>(null!)
  
  // Rarity-based colors
  const rarityColors = {
    common: '#9CA3AF',
    uncommon: '#10B981',
    rare: '#3B82F6',
    epic: '#8B5CF6',
    legendary: '#F59E0B'
  }

  useFrame((state) => {
    if (!boxRef.current || !lidRef.current) return

    const time = state.clock.getElapsedTime()
    
    if (isOpening) {
      // Opening animation
      if (animationPhase === 'opening') {
        lidRef.current.rotation.x = Math.sin(time * 8) * 0.1 - Math.PI * 0.3
      } else if (animationPhase === 'revealing') {
        lidRef.current.rotation.x = -Math.PI * 0.8
        lidRef.current.position.y = Math.sin(time * 4) * 0.1 + 1.5
      }
      
      // Rarity-based glow animation
      if (glowRef.current && glowRef.current.material) {
        const material = glowRef.current.material as THREE.MeshStandardMaterial
        const baseOpacity = animationPhase === 'revealing' ? 0.3 : 0.1
        const glowIntensity = baseOpacity + Math.sin(time * 6) * 0.1
        material.opacity = glowIntensity
      }
    } else {
      // Idle floating animation
      boxRef.current.rotation.y = Math.sin(time * 0.5) * 0.1
      boxRef.current.position.y = Math.sin(time * 1.2) * 0.1
      
      if (glowRef.current && glowRef.current.material) {
        const material = glowRef.current.material as THREE.MeshStandardMaterial
        material.opacity = 0.05 + Math.sin(time * 2) * 0.02
        material.emissiveIntensity = 0.2 + Math.sin(time * 3) * 0.1
      }
    }
  })

  return (
    <group onClick={onClick}>
      {/* Main Box */}
      <mesh ref={boxRef} position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial 
          color="#4A5568" 
          metalness={0.7} 
          roughness={0.3}
          emissive="#1A202C"
          emissiveIntensity={0.1}
        />
      </mesh>
      
      {/* Box Lid */}
      <mesh ref={lidRef} position={[0, 1.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.1, 0.2, 2.1]} />
        <meshStandardMaterial 
          color="#2D3748" 
          metalness={0.8} 
          roughness={0.2}
          emissive="#1A202C"
          emissiveIntensity={0.15}
        />
      </mesh>
      
              {/* Rarity Glow Effect */}
        <mesh ref={glowRef} position={[0, 0, 0]} scale={[1.2, 1.2, 1.2]}>
          <boxGeometry args={[2.2, 2.2, 2.2]} />
          <meshStandardMaterial 
            color={rarityColors[rarity as keyof typeof rarityColors]}
            transparent
            opacity={animationPhase === 'revealing' ? 0.4 : 0.15}
            emissive={rarityColors[rarity as keyof typeof rarityColors]}
            emissiveIntensity={animationPhase === 'revealing' ? 0.8 : 0.3}
          />
        </mesh>
      
      {/* Sparkle Effects for High Rarity */}
      {(rarity === 'epic' || rarity === 'legendary') && (
        <Sparkles
          count={rarity === 'legendary' ? 200 : 100}
          scale={[4, 4, 4]}
          size={rarity === 'legendary' ? 6 : 4}
          speed={rarity === 'legendary' ? 2 : 1}
          color={rarityColors[rarity as keyof typeof rarityColors]}
        />
      )}
    </group>
  )
}

// GPU-Optimized Particle System
const GPUParticleSystem = ({ 
  count = 500, 
  rarity = 'common',
  isActive = false,
  canUseComplexEffects = true
}: {
  count: number
  rarity: string
  isActive: boolean
  canUseComplexEffects?: boolean
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  
  const particles = useMemo(() => {
    const tempObject = new THREE.Object3D()
    const positions = []
    const velocities = []
    
    for (let i = 0; i < count; i++) {
      positions.push([
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      ])
      velocities.push([
        (Math.random() - 0.5) * 0.1,
        Math.random() * 0.1,
        (Math.random() - 0.5) * 0.1
      ])
    }
    
    return { positions, velocities, tempObject }
  }, [count])

  useFrame((state) => {
    if (!meshRef.current || !isActive) return

    const time = state.clock.getElapsedTime()
    
    for (let i = 0; i < count; i++) {
      const [x, y, z] = particles.positions[i]
      const [vx, vy, vz] = particles.velocities[i]
      
      particles.tempObject.position.set(
        x + Math.sin(time + i) * vx * 10,
        y + Math.sin(time * 2 + i) * vy * 10,
        z + Math.sin(time * 1.5 + i) * vz * 10
      )
      
      particles.tempObject.rotation.set(
        time + i,
        time * 0.5 + i,
        time * 0.8 + i
      )
      
      particles.tempObject.scale.setScalar(
        0.1 + Math.sin(time * 3 + i) * 0.05
      )
      
      particles.tempObject.updateMatrix()
      meshRef.current.setMatrixAt(i, particles.tempObject.matrix)
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  const particleColor = {
    common: '#9CA3AF',
    uncommon: '#10B981',
    rare: '#3B82F6',
    epic: '#8B5CF6',
    legendary: '#F59E0B'
  }[rarity] || '#9CA3AF'

  if (!canUseComplexEffects && count > 100) {
    return null // Skip particles on low-end devices
  }

        return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshStandardMaterial 
        color={particleColor}
        emissive={particleColor}
        emissiveIntensity={0.3}
        transparent
        opacity={0.8}
      />
    </instancedMesh>
  )
}

// Reward Item 3D Display
const RewardItem = ({ 
  symbol, 
  isVisible = false,
  rarity = 'common'
}: {
  symbol: any
  isVisible: boolean
  rarity: string
}) => {
  const itemRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    if (!itemRef.current || !isVisible) return

    const time = state.clock.getElapsedTime()
    itemRef.current.rotation.y = time * 2
    itemRef.current.position.y = Math.sin(time * 3) * 0.2 + 2
  })

  if (!isVisible) return null

    return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <mesh ref={itemRef} position={[0, 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={symbol?.key && symbol.key in SYMBOL_CONFIG ? SYMBOL_CONFIG[symbol.key as keyof typeof SYMBOL_CONFIG]?.color : '#ffffff'}
          metalness={0.6}
          roughness={0.4}
          emissive={symbol?.key && symbol.key in SYMBOL_CONFIG ? SYMBOL_CONFIG[symbol.key as keyof typeof SYMBOL_CONFIG]?.color : '#ffffff'}
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* 3D Text Display */}
      <Text
        position={[0, 3.5, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {symbol?.name || 'Unknown'}
      </Text>
    </Float>
  )
}

// Loading Fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin text-4xl">🎰</div>
  </div>
)

// Main WebGL Mystery Box Component
export const WebGLMysteryBox = ({ 
  isOpen, 
  onOpen, 
  onComplete, 
  onError 
}: WebGLMysteryBoxProps) => {
  const [stage, setStage] = useState<'idle' | 'opening' | 'spinning' | 'revealing' | 'complete'>('idle')
  const [wonItem, setWonItem] = useState<any>(null)
  const [showParticles, setShowParticles] = useState(false)
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null)
  
  // WebGL context recovery
  const { 
    isContextLost, 
    isRecovering, 
    shouldUseFallback, 
    lossCount,
    forceRecovery 
  } = useWebGLContextRecovery(canvasElement)
  
  // Device optimization
  const {
    capabilities: deviceCapabilities,
    isLowEnd,
    isMobile,
    canUseComplexEffects,
    maxParticles
  } = useDeviceCapabilities()

  // WebGL-optimized particle count based on device (reduced to prevent context loss)
  const particleCount = useMemo(() => {
    if (isLowEnd) return Math.min(25, maxParticles / 8)
    if (isMobile) return Math.min(75, maxParticles / 4)
    return Math.min(200, maxParticles / 2) // Cap at 200 to prevent memory issues
  }, [isLowEnd, isMobile, maxParticles])

  const handleBoxClick = useCallback(async () => {
    if (stage !== 'idle') return

    console.log('🎰 Starting WebGL mystery box opening')
    console.log('📊 WebGL Device capabilities:', {
      tier: deviceCapabilities.performanceTier,
      particles: particleCount,
      webgl: deviceCapabilities.webglSupport
    })

    setStage('opening')
    
    try {
      // Show opening animation first
      setTimeout(() => setStage('spinning'), 1000)
      
      // Call API
      const result = await onOpen()
      
      // Process result
      setTimeout(() => {
        setStage('revealing')
        setWonItem(result)
        setShowParticles(true)
        
        // Complete after reveal
        setTimeout(() => {
          setStage('complete')
          onComplete(result)
          
          // Reset for next use
          setTimeout(() => {
            setStage('idle')
            setShowParticles(false)
            setWonItem(null)
          }, 3000)
        }, 2000)
      }, 3000)
      
    } catch (error: any) {
      console.error('❌ WebGL box opening error:', error)
      onError(error.message || 'WebGL animation failed')
      setStage('idle')
    }
  }, [stage, onOpen, onComplete, onError, deviceCapabilities, particleCount])

  // Reset when not open + cleanup resources
  useEffect(() => {
    if (!isOpen) {
      setStage('idle')
      setWonItem(null)
      setShowParticles(false)
      setCanvasElement(null) // Clear canvas reference
      
      // Force garbage collection for WebGL resources
      if (typeof window !== 'undefined' && window.gc) {
        window.gc()
      }
    }
  }, [isOpen])

  // Cleanup on unmount to prevent context loss
  useEffect(() => {
    return () => {
      // Clean up any remaining state
      setStage('idle')
      setWonItem(null)
      setShowParticles(false)
      setCanvasElement(null)
      AnimationPool.forceGarbageCollection()
    }
  }, [])

  // Force remount if context lost and recovered
  useEffect(() => {
    if (!isContextLost && isRecovering) {
      // Clear canvas reference to force clean remount
      setCanvasElement(null)
      
      setTimeout(() => {
        console.log('✅ WebGL context recovered - ready for use')
      }, 1000)
    }
  }, [isContextLost, isRecovering])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
      {/* Performance Monitor */}
      <WebGLPerformanceMonitor
        isActive={stage !== 'idle' && stage !== 'complete'}
        renderMode="webgl"
      />
      {/* Device Performance Indicator */}
      <div className="absolute top-8 left-8 bg-black/50 rounded-lg p-3 text-white text-sm">
        <div>WebGL Mode: {isContextLost ? '❌ LOST' : deviceCapabilities.webglSupport ? '✅ ON' : 'FALLBACK'}</div>
        <div>Particles: {particleCount}</div>
        <div>Device: {deviceCapabilities.performanceTier.toUpperCase()}</div>
        {lossCount > 0 && <div className="text-yellow-400">Context Losses: {lossCount}</div>}
        {isRecovering && <div className="text-blue-400">🔄 Recovering...</div>}
      </div>

      {/* Progress Indicator */}
      <div className="absolute top-8 right-8 text-white text-lg">
        {stage === 'idle' && '🎁 Ready'}
        {stage === 'opening' && '🔓 Opening...'}
        {stage === 'spinning' && '🎰 Processing...'}
        {stage === 'revealing' && '✨ Revealing!'}
        {stage === 'complete' && '🏆 Complete!'}
      </div>

      {/* Main WebGL Scene */}
      <div className="w-full h-full">
        <Suspense fallback={<LoadingFallback />}>
                  <Canvas
          shadows={canUseComplexEffects}
          camera={{ position: [0, 2, 8], fov: 50 }}
          gl={{ 
            antialias: canUseComplexEffects,
            alpha: false,
            powerPreference: isLowEnd ? 'low-power' : 'high-performance',
            preserveDrawingBuffer: false,
            failIfMajorPerformanceCaveat: false
          }}
          style={{ background: '#000000' }}
          onCreated={({ gl, scene, camera }) => {
            try {
              // Store canvas reference for context recovery hook
              setCanvasElement(gl.domElement)
              
              // Optimize WebGL settings for stability
              gl.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // Cap pixel ratio
              gl.shadowMap.enabled = canUseComplexEffects && !isLowEnd
              gl.shadowMap.type = THREE.PCFSoftShadowMap
              
              console.log('🎰 WebGL initialized successfully:', {
                pixelRatio: gl.getPixelRatio(),
                shadowMapEnabled: gl.shadowMap.enabled,
                context: gl.getContext().constructor.name
              })
            } catch (error) {
              console.error('❌ WebGL initialization error:', error)
              // Don't set canvas element if initialization fails
            }
          }}
        >
            {/* Enhanced Lighting for Better Visibility */}
            <ambientLight intensity={0.4} />
            <directionalLight 
              position={[10, 10, 5]} 
              intensity={1.5}
              castShadow={canUseComplexEffects}
            />
            <pointLight 
              position={[5, 5, 5]} 
              intensity={0.8}
              color="#ffffff"
            />
            <pointLight 
              position={[-5, -5, -5]} 
              intensity={0.5}
              color="#ffffff"
            />
            <pointLight 
              position={[0, 0, 8]} 
              intensity={0.6}
              color="#ffffff"
            />

            {/* Simplified Environment (reduce memory usage) */}
            {canUseComplexEffects && !isLowEnd && (
              <Environment preset="warehouse" />
            )}
            
            {/* Ground/Floor for context (only on higher-end devices) */}
            {!isLowEnd && (
              <mesh position={[0, -2, 0]} receiveShadow>
                <planeGeometry args={[10, 10]} />
                <meshStandardMaterial 
                  color="#1A1A1A" 
                  transparent 
                  opacity={0.1}
                />
              </mesh>
            )}

            {/* Mystery Box (Interactive) */}
            <PresentationControls enabled={stage === 'idle'}>
              <MysteryBoxMesh
                isOpening={stage !== 'idle'}
                animationPhase={stage}
                rarity={wonItem?.rarity || 'common'}
                onClick={handleBoxClick}
              />
            </PresentationControls>

                        {/* Reward Item Display */}
            <RewardItem
              symbol={wonItem}
              isVisible={stage === 'revealing' || stage === 'complete'}
              rarity={wonItem?.rarity || 'common'}
            />

            {/* GPU Particle System (Only when needed to reduce memory) */}
            {showParticles && canUseComplexEffects && (
              <GPUParticleSystem
                count={particleCount}
                rarity={wonItem?.rarity || 'common'}
                isActive={showParticles}
                canUseComplexEffects={canUseComplexEffects}
              />
            )}

            {/* Cinematic Camera Control */}
            {stage === 'revealing' && (
              <CinematicCamera
                stage={stage}
                rarity={wonItem?.rarity || 'common'}
                isActive={true}
              />
            )}

            {/* Performance optimizations */}
            {canUseComplexEffects && (
              <Effects>
                {/* Add bloom and other post-processing effects here */}
              </Effects>
            )}
          </Canvas>
        </Suspense>
      </div>

      {/* Click Instructions */}
      {stage === 'idle' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white text-center"
        >
          <div className="text-xl mb-2">🎰 WebGL Mystery Box</div>
          <div className="text-sm opacity-75">Click the box to open</div>
        </motion.div>
      )}

      {/* Context Recovery Button */}
      {isContextLost && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => {
            // Reset all states and force component remount
            setStage('idle')
            setWonItem(null)
            setShowParticles(false)
            setCanvasElement(null)
            
            // Trigger recovery
            forceRecovery()
            
            // Force a brief delay to ensure clean state
            setTimeout(() => {
              console.log('✅ WebGL recovery initiated - please try again')
            }, 500)
          }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-lg"
        >
          🔄 Reset WebGL
        </motion.button>
      )}

      {/* Fallback Suggestion */}
      {shouldUseFallback && !isContextLost && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-yellow-600/90 text-white px-4 py-2 rounded-lg text-sm"
        >
          ⚠️ Multiple context losses detected. Consider using Standard version.
        </motion.div>
      )}

      {/* Skip Button */}
      {stage !== 'idle' && stage !== 'complete' && !isContextLost && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => {
            setStage('complete')
            onComplete(wonItem || { id: 'test', rarity: 'common', value: 100 })
          }}
          className="absolute bottom-8 right-8 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
        >
          ⏭️ Skip
        </motion.button>
      )}
    </div>
  )
}

export default WebGLMysteryBox 