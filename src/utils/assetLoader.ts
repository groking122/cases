// Utility to preload assets based on priority
export const preloadAssets = () => {
  const assets = [
    // Common assets first (highest priority)
    { id: 'copper', src: '/symbols/common/copper-coin.png', priority: 1 },
    { id: 'clover', src: '/symbols/common/lucky-clover.png', priority: 1 },
    
    // Uncommon
    { id: 'rabbit', src: '/symbols/uncommon/swift-rabbit.png', priority: 2 },
    
    // Rare
    { id: 'diamond', src: '/symbols/rare/silver-diamond.png', priority: 3 },
    { id: 'crown', src: '/symbols/rare/golden-crown.png', priority: 3 },
    
    // Epic (use WebP for better compression)
    { id: 'dragon', src: '/symbols/epic/ruby-dragon.webp', priority: 4 },
    { id: 'moon', src: '/symbols/epic/sapphire-moon.webp', priority: 4 },
    { id: 'phoenix', src: '/symbols/epic/phoenix-feather.webp', priority: 4 },
    
    // Legendary (use GIF for animations)
    { id: 'unicorn', src: '/symbols/legendary/unicorn-horn.gif', priority: 5 },
    { id: 'dogecoin', src: '/symbols/legendary/dogecoin-king.gif', priority: 5 },
    { id: 'bitcoin', src: '/symbols/legendary/bitcoin-legend.gif', priority: 5 },
  ]

  // Sort by priority (lowest first for faster loading)
  assets.sort((a, b) => a.priority - b.priority)

  // Preload images in priority order
  const preloadPromises = assets.map(asset => {
    return new Promise<{ id: string; src: string; loaded: boolean }>((resolve) => {
      const img = document.createElement('img')
      img.src = asset.src
      
      img.onload = () => {
        resolve({ id: asset.id, src: asset.src, loaded: true })
      }
      
      img.onerror = () => {
        // Even if image fails to load, resolve so it doesn't block
        resolve({ id: asset.id, src: asset.src, loaded: false })
      }
    })
  })

  return {
    assets,
    preloadPromises
  }
}

// Update symbol data with image URLs
export const updateSymbolsWithAssets = (symbols: any[]) => {
  const { assets } = preloadAssets()
  
  return symbols.map(symbol => {
    const asset = assets.find(a => a.id === symbol.id)
    return {
      ...symbol,
      imageUrl: asset ? asset.src : null
    }
  })
}

// Check if an asset exists
export const checkAssetExists = async (src: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = document.createElement('img')
    img.src = src
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
  })
}

// Create asset directory structure helper
export const getAssetPath = (rarity: string, filename: string): string => {
  return `/symbols/${rarity}/${filename}`
}

// Asset management for admin panel
export const assetManager = {
  // Upload asset (in a real app, this would upload to server)
  uploadAsset: async (symbolId: string, file: File): Promise<string> => {
    // For demo purposes, create a blob URL
    // In production, upload to your CDN/storage service
    const url = URL.createObjectURL(file)
    
    // Store in localStorage for persistence in demo
    const assets = JSON.parse(localStorage.getItem('customAssets') || '{}')
    assets[symbolId] = url
    localStorage.setItem('customAssets', JSON.stringify(assets))
    
    return url
  },

  // Get custom asset URL
  getCustomAsset: (symbolId: string): string | null => {
    const assets = JSON.parse(localStorage.getItem('customAssets') || '{}')
    return assets[symbolId] || null
  },

  // Remove custom asset
  removeCustomAsset: (symbolId: string): void => {
    const assets = JSON.parse(localStorage.getItem('customAssets') || '{}')
    if (assets[symbolId]) {
      URL.revokeObjectURL(assets[symbolId])
      delete assets[symbolId]
      localStorage.setItem('customAssets', JSON.stringify(assets))
    }
  },

  // Get all custom assets
  getAllCustomAssets: (): Record<string, string> => {
    return JSON.parse(localStorage.getItem('customAssets') || '{}')
  }
}

// Performance monitoring
export const assetPerformance = {
  // Track loading times
  trackLoadTime: (symbolId: string, startTime: number, endTime: number) => {
    const loadTime = endTime - startTime
    console.log(`Asset ${symbolId} loaded in ${loadTime}ms`)
    
    // Store performance data
    const perfData = JSON.parse(localStorage.getItem('assetPerformance') || '{}')
    if (!perfData[symbolId]) {
      perfData[symbolId] = []
    }
    perfData[symbolId].push(loadTime)
    localStorage.setItem('assetPerformance', JSON.stringify(perfData))
  },

  // Get average load time for asset
  getAverageLoadTime: (symbolId: string): number => {
    const perfData = JSON.parse(localStorage.getItem('assetPerformance') || '{}')
    const times = perfData[symbolId] || []
    if (times.length === 0) return 0
    return times.reduce((a: number, b: number) => a + b, 0) / times.length
  }
} 