"use client"

import React, { memo } from 'react'
import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAnimationSystem } from '@/hooks/useAnimationSystem'
import { useAnimationSync } from '@/hooks/useAnimationSync'
import { RarityEffectsSystem, useRarityEffects } from './RarityEffectsSystem'
import { CasinoAnticipationSystem, useAnticipationSequence } from './CasinoAnticipationSystem'
import { useDeviceCapabilities } from '@/hooks/useDeviceCapabilities'
import { AnimationPool } from '@/lib/AnimationPool'
import { WebGLPerformanceMonitor } from './WebGLPerformanceMonitor'
import { CSGOCaseModel } from './CSGOCaseModel'
import { CSGOItemCarousel } from './CSGOItemCarousel'
import { SimpleCarousel } from './SimpleCarousel'
import SymbolRenderer from './SymbolRenderer'
import { SYMBOL_CONFIG, getSymbolByKey } from '@/lib/symbols'

// Memoized components to prevent unnecessary re-renders
const MemoizedCaseModel = memo(CSGOCaseModel)
const MemoizedAnticipationSystem = memo(CasinoAnticipationSystem)
const MemoizedRarityEffects = memo(RarityEffectsSystem)

interface EnhancedMysteryBoxProps {
  isOpen: boolean
  onOpen: () => Promise<any>
  onComplete: (result: any) => void
  onError: (error: string) => void
}

interface PerformanceDebugPanelProps {
  animationStats: any
  deviceCapabilities: any
  performanceMode: string
  syncState: any
  onToggleMode: () => void
  maxParticles: number
  canUseComplexEffects: boolean
}

// Performance debug panel
const PerformanceDebugPanel = ({ 
  animationStats, 
  deviceCapabilities, 
  performanceMode, 
  syncState,
  onToggleMode,
  maxParticles,
  canUseComplexEffects
}: PerformanceDebugPanelProps) => {
  const [isVisible, setIsVisible] = useState(false)

  if (!isVisible) {
    return (
      <motion.button
        className="fixed top-4 left-4 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm z-50 hover:bg-gray-700"
        onClick={() => setIsVisible(true)}
        whileHover={{ scale: 1.05 }}
      >
        ⚡ Performance
      </motion.button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -300 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed top-4 left-4 w-80 bg-gray-900 text-white rounded-lg border border-gray-700 p-4 z-50 max-h-96 overflow-y-auto"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">⚡ Performance Monitor</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        {/* Performance Stats */}
        <div className="bg-gray-800 rounded p-3">
          <div className="text-sm font-semibold mb-2 text-green-400">Performance Stats</div>
          <div className="space-y-1 text-xs">
            <div>FPS: <span className={`font-bold ${
              animationStats.fps >= 50 ? 'text-green-300' : 
              animationStats.fps >= 30 ? 'text-yellow-300' : 'text-red-300'
            }`}>{animationStats.fps}</span></div>
            <div>Mode: <span className="text-blue-300">{performanceMode}</span></div>
            <div>Particles: <span className="text-purple-300">{animationStats.activeParticles}</span></div>
            <div>Thermal: <span className={`font-bold ${
              animationStats.thermalState === 'normal' ? 'text-green-300' : 
              animationStats.thermalState === 'fair' ? 'text-yellow-300' : 'text-red-300'
            }`}>{animationStats.thermalState}</span></div>
          </div>
        </div>

        {/* Device Info */}
        <div className="bg-gray-800 rounded p-3">
          <div className="text-sm font-semibold mb-2 text-blue-400">Device Capabilities</div>
          <div className="space-y-1 text-xs">
            <div>Tier: <span className={`font-bold ${
              deviceCapabilities.performanceTier === 'high' ? 'text-green-300' : 
              deviceCapabilities.performanceTier === 'medium' ? 'text-yellow-300' : 'text-red-300'
            }`}>{deviceCapabilities.performanceTier.toUpperCase()}</span></div>
            <div>CPU Cores: <span className="text-cyan-300">{deviceCapabilities.hardwareConcurrency}</span></div>
            <div>Memory: <span className="text-cyan-300">{deviceCapabilities.deviceMemory}GB</span></div>
            <div>WebGL: <span className={deviceCapabilities.webglSupport ? 'text-green-300' : 'text-red-300'}>
              {deviceCapabilities.webglSupport ? 'Supported' : 'Not Supported'}
            </span></div>
            <div>Mobile: <span className={deviceCapabilities.isMobile ? 'text-yellow-300' : 'text-green-300'}>
              {deviceCapabilities.isMobile ? 'Yes' : 'No'}
            </span></div>
            <div>Max Particles: <span className="text-purple-300">{maxParticles}</span></div>
            <div>Complex FX: <span className={canUseComplexEffects ? 'text-green-300' : 'text-red-300'}>
              {canUseComplexEffects ? 'Enabled' : 'Disabled'}
            </span></div>
          </div>
        </div>

        {/* Animation Sync */}
        <div className="bg-gray-800 rounded p-3">
          <div className="text-sm font-semibold mb-2 text-orange-400">Animation Sync</div>
          <div className="space-y-1 text-xs">
            <div>Phase: <span className="text-orange-300">{syncState.phase}</span></div>
            <div>Progress: <span className="text-orange-300">{Math.round(syncState.progress)}%</span></div>
            {syncState.error && (
              <div>Error: <span className="text-red-300">{syncState.error}</span></div>
            )}
          </div>
        </div>

        {/* Animation Pool Stats */}
        <div className="bg-gray-800 rounded p-3">
          <div className="text-sm font-semibold mb-2 text-orange-400">Animation Pool</div>
          <div className="space-y-1 text-xs">
            <div>Active Particles: <span className="text-orange-300">{animationStats.activeParticles}</span></div>
            <div>Pool Efficiency: <span className="text-orange-300">
              {Math.round((AnimationPool.getStats().poolEfficiency?.particles || 0) * 100)}%
            </span></div>
            <div>Cached Textures: <span className="text-orange-300">{AnimationPool.getStats().cachedTextures}</span></div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 rounded p-3">
          <div className="text-sm font-semibold mb-2 text-purple-400">Controls</div>
          <div className="space-y-2">
            <button
              onClick={onToggleMode}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs py-1 px-2 rounded"
            >
              Toggle Performance Mode
            </button>
            <button
              onClick={() => AnimationPool.forceGarbageCollection()}
              className="w-full bg-red-600 hover:bg-red-700 text-white text-xs py-1 px-2 rounded"
            >
              Force GC
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export const EnhancedMysteryBox = ({ 
  isOpen, 
  onOpen, 
  onComplete, 
  onError 
}: EnhancedMysteryBoxProps) => {
  const [stage, setStage] = useState<'idle' | 'anticipation' | 'opening' | 'spinning' | 'revealing' | 'complete'>('idle')
  const [wonItem, setWonItem] = useState<any>(null)
  const [carouselItems, setCarouselItems] = useState<any[]>([])
  const [useSimpleCarousel, setUseSimpleCarousel] = useState(false)

  // Casino-grade hooks
  const {
    capabilities: deviceCapabilities,
    performanceSettings,
    getAnimationSettings,
    overridePerformanceSettings,
    isLowEnd,
    isMobile,
    canUseComplexEffects,
    maxParticles
  } = useDeviceCapabilities()

  const {
    isBuilding: isAnticipationActive,
    level: anticipationLevel,
    startAnticipation,
    stopAnticipation
  } = useAnticipationSequence()

  // Legacy animation system (for compatibility)
  const {
    startAnimation,
    stopAnimation,
    performanceMode,
    animationStats,
    isRunning,
    setPerformanceMode
  } = useAnimationSystem()

  const {
    syncAnimationWithAPI,
    forceComplete,
    reset: resetSync,
    syncState,
    isRunning: isSyncRunning,
    canSkip,
    progress
  } = useAnimationSync({
    minAnimationDuration: 8000, // Longer duration for smoother pacing
    maxApiTimeout: 12000, // More time for API
    gracePeriod: 2000, // Longer grace period
    fallbackDuration: 10000 // Longer fallback for complete experience
  })

  const { triggerEffects, activeRarity } = useRarityEffects()

  // Generate carousel items
  const generateCarouselItems = useCallback((winningItem?: any) => {
    const symbols = Object.values(SYMBOL_CONFIG)
    const items = Array.from({ length: 50 }, (_, i) => {
      const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)]
      return {
        id: `carousel-${i}`,
        symbol: randomSymbol,
        rarity: randomSymbol.rarity,
        isWinning: false
      }
    })

    // Insert winning item if provided
    if (winningItem) {
      const wonSymbol = getSymbolByKey(winningItem.id)
      if (wonSymbol) {
        const winningIndex = 30
        items[winningIndex] = {
          id: `winning-${winningItem.id}`,
          symbol: wonSymbol,
          rarity: winningItem.rarity,
          isWinning: true
        }
      }
    }

    return items
  }, [])

  // Handle case opening with casino-style anticipation
  const handleCaseOpen = useCallback(() => {
    if (isSyncRunning || isAnticipationActive) return

    console.log('🎰 Starting casino-grade mystery box opening')
    console.log('📊 Device capabilities:', {
      tier: deviceCapabilities.performanceTier,
      mobile: isMobile,
      particles: maxParticles,
      effects: canUseComplexEffects
    })

    // Auto-select carousel type based on device capabilities
    if (isLowEnd || performanceMode === 'lite') {
      setUseSimpleCarousel(true)
    }

    // Start with anticipation building (like Aviator's plane takeoff tension)
    setStage('anticipation')
    
    // Determine anticipation level based on expected rarity (for demonstration)
    const anticipationLevels: Array<'low' | 'medium' | 'high' | 'legendary'> = ['low', 'medium', 'high', 'legendary']
    const randomLevel = anticipationLevels[Math.floor(Math.random() * anticipationLevels.length)]
    
    startAnticipation(randomLevel)

    // Start the actual case opening process
    syncAnimationWithAPI(
      // API call
      onOpen,
      
      // Animation start (after anticipation)
      () => {
        console.log('🎬 Transitioning from anticipation to opening')
        stopAnticipation()
        setStage('opening')
        
        // Use performance-optimized animation settings
        const animSettings = getAnimationSettings('complex')
        console.log('⚙️ Using animation settings:', animSettings)
        
        startAnimation('common')
        
        // Generate carousel items with performance considerations
        setTimeout(() => {
          setStage('spinning')
          const items = generateCarouselItems()
          console.log(`📦 Generated ${items.length} items for ${deviceCapabilities.performanceTier} device`)
          setCarouselItems(items)
        }, canUseComplexEffects ? 1500 : 800) // Slightly faster transition to spinning
      },
      
      // Reveal
      (result) => {
        console.log('🎭 Revealing result:', result)
        setStage('revealing')
        setWonItem(result)
        
        // Update carousel with winning item
        setCarouselItems(generateCarouselItems(result))
        
        // Trigger rarity effects with performance awareness
        if (result?.rarity && canUseComplexEffects) {
          triggerEffects(result.rarity, performanceSettings.enableComplexEffects ? 3000 : 1500)
        }
        
        // Start rarity-specific animation with performance limits
        const particleSettings = getAnimationSettings('particle') as { count: number; quality: string; enablePhysics: boolean }
        console.log(`✨ Triggering ${result?.rarity} effects with ${particleSettings.count} particles`)
        startAnimation(result?.rarity || 'common')
      },
      
      // Complete
      (result) => {
        console.log('🏁 Animation sequence complete')
        setStage('complete')
        stopAnimation()
        
        // Cleanup animation resources
        setTimeout(() => {
          // Release animation pool resources for memory efficiency
          const poolStats = AnimationPool.getStats()
          console.log('📊 Animation pool stats:', poolStats)
          
          setStage('idle')
          resetSync()
          onComplete(result)
        }, canUseComplexEffects ? 2000 : 1000)
      },
      
      // Error
      (error) => {
        console.error('❌ Animation error:', error)
        stopAnticipation()
        setStage('idle')
        stopAnimation()
        resetSync()
        onError(error)
      }
    )
  }, [
    isSyncRunning,
    isAnticipationActive,
    isLowEnd,
    performanceMode,
    deviceCapabilities,
    isMobile,
    maxParticles,
    canUseComplexEffects,
    performanceSettings,
    startAnticipation,
    stopAnticipation,
    syncAnimationWithAPI,
    onOpen,
    getAnimationSettings,
    startAnimation,
    generateCarouselItems,
    triggerEffects,
    stopAnimation,
    resetSync,
    onComplete,
    onError
  ])

  // Handle carousel completion
  const handleCarouselComplete = useCallback(() => {
    console.log('🎪 Carousel animation completed')
    // The sync system will handle the timing automatically
  }, [])

  // Handle skip
  const handleSkip = useCallback(() => {
    console.log('⏭️ Skipping animation')
    forceComplete(wonItem)
  }, [forceComplete, wonItem])

  // Toggle performance mode
  const togglePerformanceMode = useCallback(() => {
    const modes: Array<'lite' | 'default' | 'enhanced'> = ['lite', 'default', 'enhanced']
    const currentIndex = modes.indexOf(performanceMode as any)
    const nextMode = modes[(currentIndex + 1) % modes.length]
    setPerformanceMode(nextMode)
    console.log(`🔧 Switched to ${nextMode} performance mode`)
  }, [performanceMode, setPerformanceMode])

  // Reset when not open
  useEffect(() => {
    if (!isOpen) {
      setStage('idle')
      setWonItem(null)
      setCarouselItems([])
      stopAnimation()
      resetSync()
    }
  }, [isOpen, stopAnimation, resetSync])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(147, 51, 234, 0.15) 0%, rgba(0, 0, 0, 0.95) 70%)'
        }}
      >
        {/* Performance Debug Panel */}
        <PerformanceDebugPanel
          animationStats={animationStats}
          deviceCapabilities={deviceCapabilities}
          performanceMode={performanceMode}
          syncState={syncState}
          onToggleMode={togglePerformanceMode}
          maxParticles={maxParticles}
          canUseComplexEffects={canUseComplexEffects}
        />

        {/* Real-time Performance Monitor */}
        <WebGLPerformanceMonitor
          isActive={stage !== 'idle' && stage !== 'complete'}
          renderMode="standard"
        />

        {/* Header */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center pt-8 pb-6"
        >
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-4">
            {stage === 'idle' ? '🎁 Mystery Box' :
             stage === 'anticipation' ? '🎯 Building Tension...' :
             stage === 'opening' ? '🔓 Opening...' :
             stage === 'spinning' ? '🎰 Spinning...' :
             stage === 'revealing' ? '✨ Revealing!' :
             '🏆 Complete!'}
          </h1>
          
          <div className="text-lg text-gray-300 mb-4">
            Performance Mode: <span className="text-blue-400 font-bold">{performanceMode}</span>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div className="max-w-4xl mx-auto px-4 mb-8">
          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden border border-gray-600">
            <motion.div
              className="h-3 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 rounded-full shadow-lg"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-400 mt-2">
            <span>Opening</span>
            <span className="font-bold">{Math.round(progress)}%</span>
            <span>Complete</span>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4">
          <AnimatePresence mode="wait">
            {/* Idle State */}
            {stage === 'idle' && (
              <motion.div
                key="idle"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="text-center"
              >
                <motion.button
                  onClick={handleCaseOpen}
                  disabled={isSyncRunning}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl text-xl transition-all transform hover:scale-105 disabled:opacity-50"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  🎁 Open Mystery Box
                </motion.button>
              </motion.div>
            )}

            {/* Opening State */}
            {stage === 'opening' && (
              <motion.div
                key="opening"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex justify-center"
              >
                <MemoizedCaseModel isOpening={true} />
              </motion.div>
            )}

            {/* Spinning State */}
            {stage === 'spinning' && carouselItems.length > 0 && (
              <motion.div
                key="spinning"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
              >
                {useSimpleCarousel ? (
                  <SimpleCarousel
                    isSpinning={true}
                    items={carouselItems}
                    winningItem={carouselItems.find(item => item.isWinning) || null}
                    onComplete={handleCarouselComplete}
                  />
                ) : (
                  <CSGOItemCarousel
                    isSpinning={true}
                    items={carouselItems}
                    winningItem={carouselItems.find(item => item.isWinning) || null}
                    onComplete={handleCarouselComplete}
                    speed={0.7}
                  />
                )}
              </motion.div>
            )}

            {/* Revealing/Complete State */}
            {(stage === 'revealing' || stage === 'complete') && wonItem && (
              <motion.div
                key="result"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="text-center"
              >
                <div className="max-w-md mx-auto bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 border-2 border-yellow-400 shadow-2xl">
                  <div className="mb-6">
                    <SymbolRenderer
                      symbol={{
                        id: wonItem.id,
                        name: wonItem.name || 'Unknown',
                        emoji: getSymbolByKey(wonItem.id)?.emoji || '❓',
                        imageUrl: getSymbolByKey(wonItem.id)?.imageUrl || null,
                        rarity: wonItem.rarity
                      }}
                      size={200}
                      revealAnimation={stage === 'revealing'}
                    />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-3">
                    {getSymbolByKey(wonItem.id)?.name || 'Unknown Item'}
                  </h3>
                  
                  <div className="text-yellow-300 font-bold text-xl">
                    💰 +{wonItem.value || 0} Credits
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Control Buttons */}
        {canSkip && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={handleSkip}
            className="fixed bottom-8 right-8 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-all"
          >
            ⏭️ Skip Animation
          </motion.button>
        )}

        {/* Casino Anticipation System */}
        <MemoizedAnticipationSystem
          isActive={isAnticipationActive}
          anticipationLevel={anticipationLevel}
          onComplete={() => {
            console.log('🎯 Anticipation building complete')
            // The sync system will handle the next phase
          }}
          onCancel={() => {
            console.log('❌ Anticipation cancelled by user')
            stopAnticipation()
            setStage('idle')
            resetSync()
          }}
          enableAudio={deviceCapabilities.webAudioSupport}
        />

        {/* Rarity Effects */}
        <MemoizedRarityEffects
          rarity={activeRarity as any || 'common'}
          isActive={!!activeRarity}
          onComplete={() => {}}
        />
      </motion.div>
    </AnimatePresence>
  )
} 