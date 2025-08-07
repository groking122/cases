import { useCallback, useRef, useState } from 'react'

interface SyncConfig {
  minAnimationDuration: number
  maxApiTimeout: number
  gracePeriod: number
  fallbackDuration: number
}

interface SyncState {
  phase: 'idle' | 'starting' | 'api-pending' | 'syncing' | 'revealing' | 'complete' | 'error'
  progress: number
  apiResult: any | null
  error: string | null
  timing: {
    animationStart: number
    apiStart: number
    apiEnd: number
    revealTime: number
  }
}

export const useAnimationSync = (config: SyncConfig = {
  minAnimationDuration: 3000,
  maxApiTimeout: 6000,
  gracePeriod: 1000,
  fallbackDuration: 4000
}) => {
  const [syncState, setSyncState] = useState<SyncState>({
    phase: 'idle',
    progress: 0,
    apiResult: null,
    error: null,
    timing: {
      animationStart: 0,
      apiStart: 0,
      apiEnd: 0,
      revealTime: 0
    }
  })

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Clean up timers
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
      syncTimeoutRef.current = null
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }, [])

  // Start progress tracking
  const startProgressTracking = useCallback(() => {
    let currentProgress = 0
    
    progressIntervalRef.current = setInterval(() => {
      setSyncState(prev => {
        if (prev.phase === 'complete') return prev // Stop updating when complete
        
        const elapsed = Date.now() - prev.timing.animationStart
        const phase = prev.phase
        
        // Different progress curves for different phases
        let newProgress = currentProgress
        if (phase === 'starting') {
          newProgress = Math.min(20, (elapsed / 1000) * 10) // 20% in first 2 seconds
        } else if (phase === 'api-pending') {
          newProgress = Math.min(60, 20 + ((elapsed - 2000) / 2000) * 40) // 60% by 4 seconds
        } else if (phase === 'syncing') {
          newProgress = Math.min(85, 60 + ((elapsed - 4000) / 1000) * 25) // 85% by 5 seconds
        } else if (phase === 'revealing') {
          newProgress = Math.min(100, 85 + ((elapsed - 5000) / 500) * 15) // 100% by 5.5 seconds
        }
        
        // Only update if progress actually changed
        if (Math.abs(newProgress - prev.progress) < 1) return prev
        currentProgress = newProgress
        
        return { ...prev, progress: currentProgress }
      })
    }, 300) // Reduce frequency from 100ms to 300ms
  }, [])

  // Main synchronization function
  const syncAnimationWithAPI = useCallback(async (
    apiCall: () => Promise<any>,
    onAnimationStart: () => void,
    onReveal: (result: any) => void,
    onComplete: (result: any) => void,
    onError: (error: string) => void
  ) => {
    cleanup()

    const animationStart = Date.now()
    
    // Initialize state
    setSyncState({
      phase: 'starting',
      progress: 0,
      apiResult: null,
      error: null,
      timing: {
        animationStart,
        apiStart: 0,
        apiEnd: 0,
        revealTime: 0
      }
    })

    // Start animation immediately
    console.log('🎬 Starting animation sequence')
    onAnimationStart()
    startProgressTracking()

    try {
      // Start API call
      setSyncState(prev => ({
        ...prev,
        phase: 'api-pending',
        timing: { ...prev.timing, apiStart: Date.now() }
      }))

      console.log('🌐 Starting API call')
      
      // Race between API call and timeout
      const apiResult = await Promise.race([
        apiCall(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API_TIMEOUT')), config.maxApiTimeout)
        )
      ])

      const apiEnd = Date.now()
      const elapsed = apiEnd - animationStart

      console.log(`✅ API completed in ${elapsed}ms`)

      // Update state with API result
      setSyncState(prev => ({
        ...prev,
        apiResult,
        timing: { ...prev.timing, apiEnd }
      }))

      // Calculate remaining time for smooth reveal
      const remainingTime = Math.max(
        config.minAnimationDuration - elapsed,
        config.gracePeriod
      )

      console.log(`⏱️ Waiting ${remainingTime}ms before reveal`)

      // Sync phase - wait for perfect timing
      setSyncState(prev => ({ ...prev, phase: 'syncing' }))

      syncTimeoutRef.current = setTimeout(() => {
        const revealTime = Date.now()
        
        console.log('🎭 Starting reveal sequence')
        
        setSyncState(prev => ({
          ...prev,
          phase: 'revealing',
          timing: { ...prev.timing, revealTime }
        }))

        // Trigger reveal
        onReveal(apiResult)

        // Complete after reveal animation
        setTimeout(() => {
          console.log('🏁 Animation sequence complete')
          
          setSyncState(prev => ({
            ...prev,
            phase: 'complete',
            progress: 100
          }))

          cleanup()
          onComplete(apiResult)
        }, 1500) // Reveal duration

      }, remainingTime)

    } catch (error) {
      console.error('❌ Animation sync error:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      setSyncState(prev => ({
        ...prev,
        phase: 'error',
        error: errorMessage
      }))

      cleanup()

      // Handle different error types
      if (errorMessage === 'API_TIMEOUT') {
        console.log('⏰ API timeout - using fallback animation')
        
        // Continue with fallback animation
        const elapsed = Date.now() - animationStart
        const fallbackDelay = Math.max(config.fallbackDuration - elapsed, 500)
        
        setTimeout(() => {
          onError('API timeout - using fallback')
        }, fallbackDelay)
      } else {
        onError(errorMessage)
      }
    }
  }, [config, cleanup, startProgressTracking])

  // Force complete (for skip button)
  const forceComplete = useCallback((result?: any) => {
    console.log('⏭️ Force completing animation')
    
    cleanup()
    
    setSyncState(prev => ({
      ...prev,
      phase: 'complete',
      progress: 100,
      apiResult: result || prev.apiResult
    }))
  }, [cleanup])

  // Reset state
  const reset = useCallback(() => {
    cleanup()
    
    setSyncState({
      phase: 'idle',
      progress: 0,
      apiResult: null,
      error: null,
      timing: {
        animationStart: 0,
        apiStart: 0,
        apiEnd: 0,
        revealTime: 0
      }
    })
  }, [cleanup])

  // Get timing diagnostics
  const getTimingDiagnostics = useCallback(() => {
    const { timing } = syncState
    
    return {
      totalDuration: timing.revealTime - timing.animationStart,
      apiDuration: timing.apiEnd - timing.apiStart,
      waitTime: timing.revealTime - timing.apiEnd,
      isWithinTargets: {
        totalDuration: (timing.revealTime - timing.animationStart) >= config.minAnimationDuration,
        apiTimeout: (timing.apiEnd - timing.apiStart) <= config.maxApiTimeout
      }
    }
  }, [syncState.timing, config])

  return {
    syncState,
    syncAnimationWithAPI,
    forceComplete,
    reset,
    getTimingDiagnostics,
    
    // Computed states for easy usage
    isRunning: ['starting', 'api-pending', 'syncing', 'revealing'].includes(syncState.phase),
    isComplete: syncState.phase === 'complete',
    hasError: syncState.phase === 'error',
    canSkip: ['api-pending', 'syncing'].includes(syncState.phase),
    
    // Progress information
    progress: syncState.progress,
    phase: syncState.phase,
    result: syncState.apiResult,
    error: syncState.error
  }
} 