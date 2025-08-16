"use client"

import { useEffect } from 'react'

export function WalletErrorHandler() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Override console.error to filter out Eternl DOM errors
    const originalConsoleError = console.error
    
    const handleConsoleError = (...args: any[]) => {
      const message = args.join(' ')
      
      // Filter out known Eternl wallet extension DOM errors
      if (
        message.includes('dom:receive no data domId') ||
        message.includes('onMessageHandlerEternlDOM') ||
        (message.includes('Eternl') && message.includes('DOM'))
      ) {
        // Log a friendlier warning instead
        console.warn('🔔 Eternl wallet extension communication issue detected. This is usually temporary and won\'t affect functionality.')
        return
      }
      
      // Let other errors through normally
      originalConsoleError.apply(console, args)
    }
    
    console.error = handleConsoleError
    
    // Add a global error handler for unhandled wallet extension errors
    const handleUnhandledError = (event: ErrorEvent) => {
      if (
        event.message?.includes('dom:receive no data domId') ||
        event.message?.includes('Eternl')
      ) {
        event.preventDefault()
        console.warn('🔔 Filtered Eternl wallet extension error:', event.message)
      }
    }
    
    window.addEventListener('error', handleUnhandledError)
    
    // Cleanup on unmount
    return () => {
      console.error = originalConsoleError
      window.removeEventListener('error', handleUnhandledError)
    }
  }, [])

  return null
}
