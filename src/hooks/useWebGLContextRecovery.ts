"use client"

import { useEffect, useState, useCallback } from 'react'

export interface WebGLContextState {
  isContextLost: boolean
  isRecovering: boolean
  lossCount: number
  lastLossTime?: number
}

export const useWebGLContextRecovery = (canvas?: HTMLCanvasElement | null) => {
  const [contextState, setContextState] = useState<WebGLContextState>({
    isContextLost: false,
    isRecovering: false,
    lossCount: 0
  })

  const handleContextLost = useCallback((event: Event) => {
    console.warn('🚨 WebGL Context Lost:', {
      timestamp: Date.now(),
      reason: 'GPU context lost - likely due to memory or driver issues'
    })
    
    event.preventDefault()
    
    setContextState(prev => ({
      ...prev,
      isContextLost: true,
      isRecovering: false,
      lossCount: prev.lossCount + 1,
      lastLossTime: Date.now()
    }))
  }, [])

  const handleContextRestored = useCallback(() => {
    console.log('✅ WebGL Context Restored - reinitializing scene')
    
    setContextState(prev => ({
      ...prev,
      isContextLost: false,
      isRecovering: true
    }))

    // Give a moment for WebGL to stabilize, then mark as fully recovered
    setTimeout(() => {
      setContextState(prev => ({
        ...prev,
        isRecovering: false
      }))
    }, 1000)
  }, [])

  // Monitor for frequent context loss (indicates serious issues)
  const isFrequentLoss = contextState.lossCount >= 3

  // Suggest fallback after multiple losses
  const shouldUseFallback = contextState.lossCount >= 2

  useEffect(() => {
    if (!canvas) return

    canvas.addEventListener('webglcontextlost', handleContextLost)
    canvas.addEventListener('webglcontextrestored', handleContextRestored)

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      canvas.removeEventListener('webglcontextrestored', handleContextRestored)
    }
  }, [canvas, handleContextLost, handleContextRestored])

  const forceRecovery = useCallback(() => {
    console.log('🔄 Forcing WebGL context recovery...')
    
    // Simply reset our context state - let React Three Fiber handle canvas recreation
    setContextState(prev => ({
      ...prev,
      isContextLost: false,
      isRecovering: true
    }))

    // Mark as fully recovered after a brief moment
    setTimeout(() => {
      setContextState(prev => ({
        ...prev,
        isRecovering: false
      }))
    }, 1000)
  }, [])

  return {
    contextState,
    isContextLost: contextState.isContextLost,
    isRecovering: contextState.isRecovering,
    lossCount: contextState.lossCount,
    isFrequentLoss,
    shouldUseFallback,
    forceRecovery
  }
} 