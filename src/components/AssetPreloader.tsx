"use client"

import { useEffect, useState, useCallback } from 'react'
import { SYMBOL_CONFIG } from '@/lib/symbols'

interface AssetPreloaderProps {
  onProgress?: (progress: number) => void
  onComplete?: () => void
}

interface AssetItem {
  src: string
  type: 'emoji'
  priority: number
  loaded: boolean
}

export function AssetPreloader({ onProgress, onComplete }: AssetPreloaderProps) {
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [assets, setAssets] = useState<AssetItem[]>([])

  // Organize assets by probability/priority for optimal loading
  const organizeAssets = useCallback(() => {
    const assetList: AssetItem[] = []
    
    Object.values(SYMBOL_CONFIG).forEach(symbol => {
      // Higher priority for more common symbols (lower priority number = loads first)
      const priority = symbol.probability > 0.1 ? 1 : // Common symbols
                      symbol.probability > 0.05 ? 2 : // Uncommon symbols  
                      symbol.probability > 0.01 ? 3 : // Rare symbols
                      symbol.probability > 0.001 ? 4 : // Epic symbols
                      5 // Legendary symbols
      
      // Only add emoji (always available, no 404 errors)
      assetList.push({
        src: symbol.emoji,
        type: 'emoji',
        priority,
        loaded: false
      })
    })
    
    // Sort by priority (lower number = higher priority)
    return assetList.sort((a, b) => a.priority - b.priority)
  }, [])

  // Preload emoji by rendering them offscreen
  const preloadEmoji = useCallback((emoji: string): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        const tempDiv = document.createElement('div')
        tempDiv.textContent = emoji
        tempDiv.style.position = 'absolute'
        tempDiv.style.left = '-9999px'
        tempDiv.style.fontSize = '16px' // Reasonable size for preloading
        tempDiv.style.visibility = 'hidden'
        tempDiv.style.pointerEvents = 'none'
        
        document.body.appendChild(tempDiv)
        
        // Small delay to ensure rendering
        setTimeout(() => {
          try {
            document.body.removeChild(tempDiv)
            resolve(true)
          } catch {
            resolve(true) // Don't fail if already removed
          }
        }, 50) // Increased timeout for better reliability
      } catch (error) {
        console.warn('Failed to preload emoji:', emoji, error)
        resolve(false)
      }
    })
  }, [])

  // Main preloading orchestrator (simplified)
  const startPreloading = useCallback(async () => {
    const assetList = organizeAssets()
    setAssets(assetList)
    
    let loadedCount = 0
    const totalAssets = assetList.length
    
    console.log(`🚀 Starting emoji preloading: ${totalAssets} emojis`)
    
    // Load emojis in small batches to prevent browser lockup
    const batchSize = 3
    
    for (let i = 0; i < assetList.length; i += batchSize) {
      const batch = assetList.slice(i, i + batchSize)
      
      // Process batch in parallel
      const batchPromises = batch.map(async (asset) => {
        let success = false
        
        try {
          success = await preloadEmoji(asset.src)
        } catch (error) {
          console.warn('Emoji preload error:', asset.src, error)
        }
        
        asset.loaded = true
        loadedCount++
        
        const currentProgress = Math.round((loadedCount / totalAssets) * 100)
        setProgress(currentProgress)
        onProgress?.(currentProgress)
        
        return { asset, success }
      })
      
      await Promise.all(batchPromises)
      
      // Small delay between batches
      if (i + batchSize < assetList.length) {
        await new Promise(resolve => setTimeout(resolve, 25))
      }
    }
    
    console.log(`✅ Emoji preloading complete: ${loadedCount}/${totalAssets} loaded`)
    setLoading(false)
    onComplete?.()
  }, [organizeAssets, preloadEmoji, onProgress, onComplete])

  useEffect(() => {
    // Start preloading after a small delay to allow page to settle
    const timer = setTimeout(() => {
      startPreloading()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [startPreloading])

  // Performance monitoring
  useEffect(() => {
    if (!loading) {
      const successfulAssets = assets.filter(a => a.loaded).length
      const failedAssets = assets.length - successfulAssets
      
      if (failedAssets > 0) {
        console.warn(`⚠️ ${failedAssets} emojis failed to preload`)
      }
      
      // Store preload status in sessionStorage for debugging
      sessionStorage.setItem('assetPreloadStats', JSON.stringify({
        total: assets.length,
        successful: successfulAssets,
        failed: failedAssets,
        timestamp: Date.now(),
        type: 'emoji-only'
      }))
    }
  }, [loading, assets])

  return null // This component doesn't render anything visible
}

// Hook for checking preload status
export function useAssetPreloader() {
  const [isReady, setIsReady] = useState(false)
  const [progress, setProgress] = useState(0)
  
  const handleProgress = useCallback((newProgress: number) => {
    setProgress(newProgress)
  }, [])
  
  const handleComplete = useCallback(() => {
    setIsReady(true)
  }, [])
  
  return {
    isReady,
    progress,
    AssetPreloader: () => (
      <AssetPreloader 
        onProgress={handleProgress} 
        onComplete={handleComplete}
      />
    )
  }
}

// Debug component for development
export function AssetPreloaderDebug() {
  const [stats, setStats] = useState<any>(null)
  
  useEffect(() => {
    const statsStr = sessionStorage.getItem('assetPreloadStats')
    if (statsStr) {
      setStats(JSON.parse(statsStr))
    }
  }, [])
  
  if (!stats || process.env.NODE_ENV !== 'development') return null
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs z-50">
      <div>Emojis: {stats.successful}/{stats.total}</div>
      <div>Failed: {stats.failed}</div>
      <div>Type: {stats.type}</div>
      <div>Time: {new Date(stats.timestamp).toLocaleTimeString()}</div>
    </div>
  )
} 