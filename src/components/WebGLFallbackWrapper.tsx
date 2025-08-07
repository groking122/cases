"use client"

import { useState, useEffect } from 'react'
import { WebGLMysteryBox } from './WebGLMysteryBox'
import { EnhancedMysteryBox } from './EnhancedMysteryBox'
import { motion } from 'framer-motion'

interface WebGLFallbackWrapperProps {
  isOpen: boolean
  onOpen: () => Promise<any>
  onComplete: (result: any) => void
  onError: (error: string) => void
  useWebGL: boolean
}

export const WebGLFallbackWrapper = ({
  isOpen,
  onOpen,
  onComplete,
  onError,
  useWebGL
}: WebGLFallbackWrapperProps) => {
  const [hasWebGLError, setHasWebGLError] = useState(false)
  const [errorCount, setErrorCount] = useState(0)
  const [showFallbackMessage, setShowFallbackMessage] = useState(false)

  // Reset error state when switching modes or closing
  useEffect(() => {
    if (!isOpen) {
      setHasWebGLError(false)
      setShowFallbackMessage(false)
    }
  }, [isOpen, useWebGL])

  const handleWebGLError = (error: string) => {
    console.warn('🚨 WebGL Error detected:', error)
    
    setErrorCount(prev => prev + 1)
    
    // Auto-fallback after WebGL-specific errors
    const isWebGLSpecificError = 
      error.includes('WebGL') || 
      error.includes('context') || 
      error.includes('Canvas has an existing context')
    
    if (isWebGLSpecificError || errorCount >= 1) {
      console.log('🔄 Falling back to Standard version due to WebGL issues')
      setHasWebGLError(true)
      setShowFallbackMessage(true)
      
      // Auto-hide fallback message after 5 seconds
      setTimeout(() => {
        setShowFallbackMessage(false)
      }, 5000)
    }
    
    // Forward error to parent
    onError(error)
  }

  // Force fallback to standard version if WebGL has issues
  const shouldUseStandard = !useWebGL || hasWebGLError

  return (
    <div className="relative">
      {/* Fallback Message */}
      {showFallbackMessage && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-600/90 text-white px-6 py-3 rounded-lg shadow-lg"
        >
          <div className="text-center">
            <div className="font-semibold">⚠️ WebGL Issue Detected</div>
            <div className="text-sm">Automatically switched to Standard version for stability</div>
          </div>
        </motion.div>
      )}

      {/* WebGL Version (with error boundary) */}
      {!shouldUseStandard && (
        <WebGLMysteryBox
          isOpen={isOpen}
          onOpen={onOpen}
          onComplete={onComplete}
          onError={handleWebGLError}
        />
      )}

      {/* Standard Version (Fallback) */}
      {shouldUseStandard && (
        <EnhancedMysteryBox
          isOpen={isOpen}
          onOpen={onOpen}
          onComplete={onComplete}
          onError={onError}
        />
      )}

      {/* Reset Button (if in fallback mode) */}
      {hasWebGLError && !isOpen && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => {
            setHasWebGLError(false)
            setErrorCount(0)
            setShowFallbackMessage(false)
            console.log('🔄 WebGL reset - ready to try again')
          }}
          className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm z-50"
        >
          🔄 Try WebGL Again
        </motion.button>
      )}
    </div>
  )
}

export default WebGLFallbackWrapper 