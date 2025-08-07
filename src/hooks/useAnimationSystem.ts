import { useRef, useEffect, useState, useCallback } from 'react'

interface AnimationConfig {
  duration: number
  particleCount: number
  physics: 'basic' | 'advanced' | 'fluid'
  maxFPS: number
  textureQuality: 'low' | 'medium' | 'high'
  fallbackToSprites: boolean
  particleLimit: number
  enablePostProcessing: boolean
}

interface DeviceCapabilities {
  isLowEnd: boolean
  isMobile: boolean
  hardwareConcurrency: number
  deviceMemory: number
  supportsWebGL: boolean
  thermalState: 'normal' | 'fair' | 'serious' | 'critical'
}

interface AnimationController {
  start: (config: AnimationConfig) => void
  stop: () => void
  dispose: () => void
  isRunning: boolean
  currentFPS: number
  memoryUsage: number
}

class AnimationResourcePool {
  private static particles: any[] = []
  private static meshes: any[] = []
  private static textures: Map<string, any> = new Map()
  
  static getParticle() {
    return this.particles.pop() || { id: Math.random(), reset: () => {} }
  }
  
  static returnParticle(particle: any) {
    particle.reset()
    this.particles.push(particle)
  }
  
  static getMesh(type: string) {
    const key = `mesh_${type}`
    return this.meshes.pop() || { type, dispose: () => {} }
  }
  
  static returnMesh(mesh: any) {
    if (mesh && typeof mesh.dispose === 'function') {
      this.meshes.push(mesh)
    }
  }
  
  static getTexture(key: string): any {
    return this.textures.get(key)
  }
  
  static setTexture(key: string, texture: any) {
    this.textures.set(key, texture)
  }
  
  static cleanup() {
    this.particles.forEach(particle => particle.dispose?.())
    this.meshes.forEach(mesh => mesh.dispose?.())
    this.textures.forEach(texture => texture.dispose?.())
    
    this.particles = []
    this.meshes = []
    this.textures.clear()
  }
}

export const useAnimationSystem = () => {
  const animationRef = useRef<AnimationController | null>(null)
  const [performanceMode, setPerformanceMode] = useState<'lite' | 'default' | 'enhanced'>('default')
  const [deviceCapabilities, setDeviceCapabilities] = useState<DeviceCapabilities>({
    isLowEnd: false,
    isMobile: false,
    hardwareConcurrency: 4,
    deviceMemory: 4,
    supportsWebGL: true,
    thermalState: 'normal'
  })
  const [animationStats, setAnimationStats] = useState<{
    fps: number
    memoryUsage: number
    activeParticles: number
    thermalState: 'normal' | 'fair' | 'serious' | 'critical'
  }>({
    fps: 60,
    memoryUsage: 0,
    activeParticles: 0,
    thermalState: 'normal'
  })

  // Detect device capabilities
  useEffect(() => {
    const detectCapabilities = () => {
      const nav = navigator as any
      const isLowEnd = (nav.hardwareConcurrency || 4) < 4 || (nav.deviceMemory || 4) < 2
      const isMobile = window.innerWidth < 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      // WebGL detection
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      const supportsWebGL = !!gl
      
      setDeviceCapabilities({
        isLowEnd,
        isMobile,
        hardwareConcurrency: nav.hardwareConcurrency || 4,
        deviceMemory: nav.deviceMemory || 4,
        supportsWebGL,
        thermalState: 'normal'
      })
      
      // Set performance mode based on capabilities
      if (isLowEnd || isMobile) {
        setPerformanceMode('lite')
      } else if ((nav.hardwareConcurrency || 4) >= 8 && (nav.deviceMemory || 4) >= 8) {
        setPerformanceMode('enhanced')
      } else {
        setPerformanceMode('default')
      }
    }

    detectCapabilities()

    // Monitor thermal state if available
    if ('thermal' in navigator) {
      const handleThermalChange = () => {
        const thermalState = (navigator as any).thermal?.state || 'normal'
        setDeviceCapabilities(prev => ({ ...prev, thermalState }))
        
        // Automatically reduce performance on thermal throttling
        if (thermalState === 'serious' || thermalState === 'critical') {
          setPerformanceMode('lite')
        }
      }

      ;(navigator as any).thermal?.addEventListener('change', handleThermalChange)
      
      return () => {
        ;(navigator as any).thermal?.removeEventListener('change', handleThermalChange)
      }
    }
  }, [])

  // Get animation config based on performance mode and rarity
  const getAnimationConfig = useCallback((rarity: string): AnimationConfig => {
    const baseConfigs = {
      lite: {
        duration: 2000,
        particleCount: 50,
        physics: 'basic' as const,
        maxFPS: 30,
        textureQuality: 'low' as const,
        fallbackToSprites: true,
        particleLimit: 100,
        enablePostProcessing: false
      },
      default: {
        duration: 3000,
        particleCount: 200,
        physics: 'advanced' as const,
        maxFPS: 60,
        textureQuality: 'medium' as const,
        fallbackToSprites: false,
        particleLimit: 300,
        enablePostProcessing: true
      },
      enhanced: {
        duration: 4000,
        particleCount: 500,
        physics: 'fluid' as const,
        maxFPS: 60,
        textureQuality: 'high' as const,
        fallbackToSprites: false,
        particleLimit: 1000,
        enablePostProcessing: true
      }
    }

    const baseConfig = baseConfigs[performanceMode]

    // Rarity-specific enhancements
    const rarityMultipliers = {
      common: { particleCount: 0.5, duration: 0.8 },
      uncommon: { particleCount: 0.7, duration: 0.9 },
      rare: { particleCount: 1.0, duration: 1.0 },
      epic: { particleCount: 1.5, duration: 1.2 },
      legendary: { particleCount: 2.0, duration: 1.5 }
    }

    const multiplier = rarityMultipliers[rarity as keyof typeof rarityMultipliers] || rarityMultipliers.common

    return {
      ...baseConfig,
      particleCount: Math.floor(baseConfig.particleCount * multiplier.particleCount),
      duration: Math.floor(baseConfig.duration * multiplier.duration)
    }
  }, [performanceMode])

  // Create animation controller
  const createAnimationController = useCallback((): AnimationController => {
    let isRunning = false
    let animationId: number | null = null
    let startTime = 0
    let frameCount = 0
    let lastFPSUpdate = 0

    const updateStats = () => {
      frameCount++
      const now = performance.now()
      
      if (now - lastFPSUpdate >= 1000) {
        const fps = Math.round((frameCount * 1000) / (now - lastFPSUpdate))
        setAnimationStats(prev => ({
          ...prev,
          fps,
          activeParticles: AnimationResourcePool['particles']?.length || 0,
          thermalState: deviceCapabilities.thermalState
        }))
        frameCount = 0
        lastFPSUpdate = now
      }
    }

    const animate = () => {
      if (!isRunning) return

      updateStats()
      
      // Add your actual animation logic here
      // This is where particle systems, 3D transforms, etc. would go
      
      animationId = requestAnimationFrame(animate)
    }

    return {
      start: (config: AnimationConfig) => {
        if (isRunning) return
        
        isRunning = true
        startTime = performance.now()
        lastFPSUpdate = startTime
        frameCount = 0
        
        console.log('Starting animation with config:', config)
        animate()
      },
      stop: () => {
        isRunning = false
        if (animationId) {
          cancelAnimationFrame(animationId)
          animationId = null
        }
      },
      dispose: () => {
        isRunning = false
        if (animationId) {
          cancelAnimationFrame(animationId)
          animationId = null
        }
        AnimationResourcePool.cleanup()
      },
      isRunning,
      currentFPS: animationStats.fps,
      memoryUsage: animationStats.memoryUsage
    }
  }, [deviceCapabilities.thermalState, animationStats.fps, animationStats.memoryUsage])

  // Start animation with automatic config
  const startAnimation = useCallback((rarity: string = 'common') => {
    if (animationRef.current) {
      animationRef.current.dispose()
    }

    const config = getAnimationConfig(rarity)
    animationRef.current = createAnimationController()
    animationRef.current.start(config)
    
    console.log(`Started ${rarity} animation in ${performanceMode} mode`)
  }, [getAnimationConfig, createAnimationController, performanceMode])

  // Stop animation
  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.stop()
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        animationRef.current.dispose()
      }
      AnimationResourcePool.cleanup()
    }
  }, [])

  return {
    startAnimation,
    stopAnimation,
    performanceMode,
    deviceCapabilities,
    animationStats,
    isRunning: animationRef.current?.isRunning || false,
    
    // Manual performance mode override
    setPerformanceMode: (mode: 'lite' | 'default' | 'enhanced') => {
      setPerformanceMode(mode)
    },
    
    // Get current config for debugging
    getCurrentConfig: (rarity: string) => getAnimationConfig(rarity),
    
    // Resource pool access for debugging
    getResourcePoolStats: () => ({
      particles: AnimationResourcePool['particles']?.length || 0,
      meshes: AnimationResourcePool['meshes']?.length || 0,
      textures: AnimationResourcePool['textures']?.size || 0
    })
  }
} 