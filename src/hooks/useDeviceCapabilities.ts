import { useState, useEffect, useCallback } from 'react'

interface DeviceCapabilities {
  // Hardware Info
  hardwareConcurrency: number
  deviceMemory: number
  isMobile: boolean
  isLowEnd: boolean
  
  // Graphics Support
  webglSupport: boolean
  webgl2Support: boolean
  maxTextureSize: number
  
  // Audio Support
  webAudioSupport: boolean
  audioContextSupport: boolean
  
  // Performance Features
  imageSupport: boolean
  videoBitmapSupport: boolean
  offscreenCanvasSupport: boolean
  
  // Network & Battery
  connectionType: string
  batteryLevel?: number
  isCharging?: boolean
  
  // Thermal State
  thermalState: 'unknown' | 'normal' | 'fair' | 'serious' | 'critical'
  
  // Performance Tier
  performanceTier: 'low' | 'medium' | 'high'
}

interface PerformanceSettings {
  maxParticles: number
  animationQuality: 'low' | 'medium' | 'high'
  enableComplexEffects: boolean
  targetFPS: number
  enableAudio: boolean
  textureQuality: number
  enablePostProcessing: boolean
}

export const useDeviceCapabilities = () => {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    hardwareConcurrency: 4,
    deviceMemory: 4,
    isMobile: false,
    isLowEnd: false,
    webglSupport: false,
    webgl2Support: false,
    maxTextureSize: 0,
    webAudioSupport: false,
    audioContextSupport: false,
    imageSupport: false,
    videoBitmapSupport: false,
    offscreenCanvasSupport: false,
    connectionType: 'unknown',
    thermalState: 'unknown',
    performanceTier: 'medium'
  })

  const [performanceSettings, setPerformanceSettings] = useState<PerformanceSettings>({
    maxParticles: 300,
    animationQuality: 'medium',
    enableComplexEffects: true,
    targetFPS: 60,
    enableAudio: true,
    textureQuality: 1024,
    enablePostProcessing: false
  })

  // Detect WebGL capabilities
  const detectWebGLSupport = useCallback(() => {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      const gl2 = canvas.getContext('webgl2')
      
      const webglSupport = !!gl
      const webgl2Support = !!gl2
      
      let maxTextureSize = 0
      if (gl && 'getParameter' in gl) {
        const webglContext = gl as WebGLRenderingContext
        maxTextureSize = webglContext.getParameter(webglContext.MAX_TEXTURE_SIZE)
      }
      
      return { webglSupport, webgl2Support, maxTextureSize }
    } catch (error) {
      console.warn('WebGL detection failed:', error)
      return { webglSupport: false, webgl2Support: false, maxTextureSize: 0 }
    }
  }, [])

  // Detect audio capabilities
  const detectAudioSupport = useCallback(() => {
    const webAudioSupport = !!(window.AudioContext || (window as any).webkitAudioContext)
    const audioContextSupport = !!window.AudioContext
    
    return { webAudioSupport, audioContextSupport }
  }, [])

  // Detect mobile device
  const detectMobile = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone', 'mobile']
    const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword))
    const isMobileScreen = window.innerWidth <= 768
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    
    return isMobileUA || (isMobileScreen && isTouchDevice)
  }, [])

  // Detect connection type
  const detectConnection = useCallback(() => {
    const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection
    
    if (connection) {
      return connection.effectiveType || connection.type || 'unknown'
    }
    return 'unknown'
  }, [])

  // Detect thermal state (experimental)
  const detectThermalState = useCallback(() => {
    const thermal = (navigator as any).thermal
    if (thermal && thermal.state) {
      return thermal.state
    }
    return 'unknown'
  }, [])

  // Detect battery status
  const detectBatteryStatus = useCallback(async () => {
    try {
      const battery = await (navigator as any).getBattery?.()
      if (battery) {
        return {
          batteryLevel: battery.level,
          isCharging: battery.charging
        }
      }
    } catch (error) {
      console.warn('Battery API not supported')
    }
    return { batteryLevel: undefined, isCharging: undefined }
  }, [])

  // Calculate performance tier
  const calculatePerformanceTier = useCallback((caps: Partial<DeviceCapabilities>) => {
    const {
      hardwareConcurrency = 4,
      deviceMemory = 4,
      isMobile = false,
      webglSupport = false,
      maxTextureSize = 0
    } = caps

    // Low-end criteria (similar to how Aviator determines device tiers)
    if (
      isMobile ||
      hardwareConcurrency < 4 ||
      deviceMemory < 4 ||
      !webglSupport ||
      maxTextureSize < 2048
    ) {
      return 'low'
    }

    // High-end criteria
    if (
      hardwareConcurrency >= 8 &&
      deviceMemory >= 8 &&
      webglSupport &&
      maxTextureSize >= 4096
    ) {
      return 'high'
    }

    return 'medium'
  }, [])

  // Generate performance settings based on capabilities
  const generatePerformanceSettings = useCallback((caps: DeviceCapabilities): PerformanceSettings => {
    const { performanceTier, thermalState, batteryLevel, isCharging } = caps

    // Base settings by tier
    const tierSettings = {
      low: {
        maxParticles: 100,
        animationQuality: 'low' as const,
        enableComplexEffects: false,
        targetFPS: 30,
        enableAudio: false,
        textureQuality: 512,
        enablePostProcessing: false
      },
      medium: {
        maxParticles: 300,
        animationQuality: 'medium' as const,
        enableComplexEffects: true,
        targetFPS: 60,
        enableAudio: true,
        textureQuality: 1024,
        enablePostProcessing: false
      },
      high: {
        maxParticles: 500,
        animationQuality: 'high' as const,
        enableComplexEffects: true,
        targetFPS: 60,
        enableAudio: true,
        textureQuality: 2048,
        enablePostProcessing: true
      }
    }

    let settings = { ...tierSettings[performanceTier] }

    // Thermal throttling adjustments
    if (thermalState === 'serious' || thermalState === 'critical') {
      settings.maxParticles = Math.min(150, settings.maxParticles)
      settings.targetFPS = 30
      settings.enableComplexEffects = false
      settings.enablePostProcessing = false
    }

    // Battery optimization (when not charging and low battery)
    if (batteryLevel !== undefined && batteryLevel < 0.2 && !isCharging) {
      settings.maxParticles = Math.floor(settings.maxParticles * 0.7)
      settings.targetFPS = Math.min(45, settings.targetFPS)
      settings.enableAudio = false
    }

    return settings
  }, [])

  // Initialize capabilities detection
  useEffect(() => {
    const detectCapabilities = async () => {
      console.log('🔍 Detecting device capabilities...')

      // Basic hardware info
      const hardwareConcurrency = navigator.hardwareConcurrency || 4
      const deviceMemory = (navigator as any).deviceMemory || 4
      const isMobile = detectMobile()

      // Graphics capabilities
      const { webglSupport, webgl2Support, maxTextureSize } = detectWebGLSupport()

      // Audio capabilities
      const { webAudioSupport, audioContextSupport } = detectAudioSupport()

      // Feature detection
      const imageSupport = typeof Image !== 'undefined'
      const videoBitmapSupport = 'createImageBitmap' in window
      const offscreenCanvasSupport = typeof OffscreenCanvas !== 'undefined'

      // Network and battery
      const connectionType = detectConnection()
      const { batteryLevel, isCharging } = await detectBatteryStatus()

      // Thermal state
      const thermalState = detectThermalState()

      // Calculate if device is low-end
      const isLowEnd = isMobile || hardwareConcurrency < 4 || deviceMemory < 4 || !webglSupport

      const detectedCapabilities: DeviceCapabilities = {
        hardwareConcurrency,
        deviceMemory,
        isMobile,
        isLowEnd,
        webglSupport,
        webgl2Support,
        maxTextureSize,
        webAudioSupport,
        audioContextSupport,
        imageSupport,
        videoBitmapSupport,
        offscreenCanvasSupport,
        connectionType,
        batteryLevel,
        isCharging,
        thermalState,
        performanceTier: 'medium' // Will be calculated below
      }

      // Calculate performance tier
      detectedCapabilities.performanceTier = calculatePerformanceTier(detectedCapabilities)

      // Generate performance settings
      const perfSettings = generatePerformanceSettings(detectedCapabilities)

      setCapabilities(detectedCapabilities)
      setPerformanceSettings(perfSettings)

      console.log('✅ Device capabilities detected:', {
        tier: detectedCapabilities.performanceTier,
        mobile: detectedCapabilities.isMobile,
        webgl: detectedCapabilities.webglSupport,
        particles: perfSettings.maxParticles
      })
    }

    detectCapabilities()

    // Monitor thermal state changes
    const handleThermalChange = () => {
      const newThermalState = detectThermalState()
      setCapabilities(prev => {
        const updated = { ...prev, thermalState: newThermalState }
        const newSettings = generatePerformanceSettings(updated)
        setPerformanceSettings(newSettings)
        return updated
      })
    }

    // Listen for thermal changes (if supported)
    if ('thermal' in navigator) {
      (navigator as any).thermal?.addEventListener('change', handleThermalChange)
    }

    // Monitor battery changes
    const monitorBattery = async () => {
      try {
        const battery = await (navigator as any).getBattery?.()
        if (battery) {
          const updateBatteryStatus = () => {
            setCapabilities(prev => {
              const updated = {
                ...prev,
                batteryLevel: battery.level,
                isCharging: battery.charging
              }
              const newSettings = generatePerformanceSettings(updated)
              setPerformanceSettings(newSettings)
              return updated
            })
          }

          battery.addEventListener('levelchange', updateBatteryStatus)
          battery.addEventListener('chargingchange', updateBatteryStatus)
        }
      } catch (error) {
        // Battery API not supported
      }
    }

    monitorBattery()

    return () => {
      if ('thermal' in navigator) {
        (navigator as any).thermal?.removeEventListener('change', handleThermalChange)
      }
    }
  }, [
    detectMobile,
    detectWebGLSupport,
    detectAudioSupport,
    detectConnection,
    detectThermalState,
    detectBatteryStatus,
    calculatePerformanceTier,
    generatePerformanceSettings
  ])

  // Manual performance override (for testing)
  const overridePerformanceSettings = useCallback((overrides: Partial<PerformanceSettings>) => {
    setPerformanceSettings(prev => ({ ...prev, ...overrides }))
  }, [])

  // Get optimal settings for specific animation type
  const getAnimationSettings = useCallback((animationType: 'particle' | 'transition' | 'complex') => {
    const base = performanceSettings

    switch (animationType) {
      case 'particle':
        return {
          count: base.maxParticles,
          quality: base.animationQuality,
          enablePhysics: base.enableComplexEffects
        }
      case 'transition':
        return {
          duration: base.animationQuality === 'low' ? 300 : base.animationQuality === 'medium' ? 500 : 800,
          easing: base.animationQuality === 'low' ? 'ease' : 'ease-out',
          enableBounce: base.enableComplexEffects
        }
      case 'complex':
        return {
          enabled: base.enableComplexEffects,
          quality: base.animationQuality,
          postProcessing: base.enablePostProcessing
        }
      default:
        return base
    }
  }, [performanceSettings])

  return {
    capabilities,
    performanceSettings,
    overridePerformanceSettings,
    getAnimationSettings,
    
    // Convenience accessors
    isLowEnd: capabilities.isLowEnd,
    isMobile: capabilities.isMobile,
    canUseComplexEffects: performanceSettings.enableComplexEffects,
    canUseAudio: performanceSettings.enableAudio,
    maxParticles: performanceSettings.maxParticles,
    targetFPS: performanceSettings.targetFPS
  }
} 