"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { SYMBOL_CONFIG } from '@/lib/symbols'
import { assetManager } from '@/utils/assetLoader'
import SymbolRenderer from './SymbolRenderer'

interface AssetStatus {
  id: string
  name: string
  emoji: string
  rarity: string
  hasCustomAsset: boolean
  customUrl?: string
  loadTime?: number
}

export function AssetAdminPanel() {
  const [symbols, setSymbols] = useState<AssetStatus[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})

  // Initialize symbols
  useEffect(() => {
    const symbolList = Object.values(SYMBOL_CONFIG).map(symbol => ({
      id: symbol.key,
      name: symbol.name,
      emoji: symbol.icon,
      rarity: symbol.rarity,
      hasCustomAsset: !!assetManager.getCustomAsset(symbol.key),
      customUrl: assetManager.getCustomAsset(symbol.key) || undefined
    }))

    setSymbols(symbolList)
  }, [])

  const handleFileUpload = async (symbolId: string, file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    try {
      setUploadProgress(prev => ({ ...prev, [symbolId]: 0 }))

      // Simulate upload progress for UI feedback
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const currentProgress = prev[symbolId] || 0
          if (currentProgress >= 90) {
            clearInterval(interval)
            return prev
          }
          return { ...prev, [symbolId]: currentProgress + 10 }
        })
      }, 100)

      const startTime = Date.now()
      
      // Upload to Supabase Storage via API
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'symbols')
      formData.append('isAdmin', 'true')

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      const endTime = Date.now()

      clearInterval(interval)
      setUploadProgress(prev => ({ ...prev, [symbolId]: 100 }))

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Upload failed')
      }

      // Update symbol list with the new URL
      setSymbols(prev => prev.map(symbol => 
        symbol.id === symbolId 
          ? { ...symbol, hasCustomAsset: true, customUrl: result.url, loadTime: endTime - startTime }
          : symbol
      ))

      // Store in localStorage for backwards compatibility with existing code
      const assets = JSON.parse(localStorage.getItem('customAssets') || '{}')
      assets[symbolId] = result.url
      localStorage.setItem('customAssets', JSON.stringify(assets))

      // Clear progress after animation
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProg = { ...prev }
          delete newProg[symbolId]
          return newProg
        })
      }, 2000)

    } catch (error: any) {
      console.error('Upload failed:', error)
      alert(`Upload failed: ${error.message || 'Please try again.'}`)
      setUploadProgress(prev => {
        const newProg = { ...prev }
        delete newProg[symbolId]
        return newProg
      })
    }
  }

  const handleRemoveAsset = (symbolId: string) => {
    assetManager.removeCustomAsset(symbolId)
    setSymbols(prev => prev.map(symbol => 
      symbol.id === symbolId 
        ? { ...symbol, hasCustomAsset: false, customUrl: undefined }
        : symbol
    ))
  }

  const getRarityColor = (rarity: string) => {
    const colors = {
      common: 'border-gray-400 bg-gray-800',
      uncommon: 'border-green-500 bg-green-900/20',
      rare: 'border-blue-500 bg-blue-900/20',
      epic: 'border-purple-500 bg-purple-900/20',
      legendary: 'border-yellow-500 bg-yellow-900/20'
    }
    return colors[rarity as keyof typeof colors] || colors.common
  }

  const groupedSymbols = symbols.reduce((acc, symbol) => {
    if (!acc[symbol.rarity]) {
      acc[symbol.rarity] = []
    }
    acc[symbol.rarity].push(symbol)
    return acc
  }, {} as Record<string, AssetStatus[]>)

  const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary']

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
            🎨 Asset Management Panel
          </h1>
          <p className="text-gray-400 text-lg">
            Upload and manage symbol assets for your CS:GO-style case opening experience
          </p>
        </motion.div>

        {/* Statistics */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-2xl font-bold text-blue-400">
              {symbols.filter(s => s.hasCustomAsset).length}
            </div>
            <div className="text-gray-400">Assets Uploaded</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-2xl font-bold text-green-400">
              {symbols.length}
            </div>
            <div className="text-gray-400">Total Symbols</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-2xl font-bold text-purple-400">
              {Math.round((symbols.filter(s => s.hasCustomAsset).length / symbols.length) * 100)}%
            </div>
            <div className="text-gray-400">Completion</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-2xl font-bold text-yellow-400">
              {symbols.filter(s => s.rarity === 'legendary' && s.hasCustomAsset).length}
            </div>
            <div className="text-gray-400">Legendary Assets</div>
          </div>
        </motion.div>

        {/* Symbols by Rarity */}
        {rarityOrder.map((rarity, index) => {
          const raritySymbols = groupedSymbols[rarity] || []
          if (raritySymbols.length === 0) return null

          return (
            <motion.div
              key={rarity}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="mb-8"
            >
              <h2 className="text-2xl font-bold mb-4 capitalize flex items-center gap-3">
                <span className={`w-4 h-4 rounded-full ${
                  rarity === 'legendary' ? 'bg-yellow-500' :
                  rarity === 'epic' ? 'bg-purple-500' :
                  rarity === 'rare' ? 'bg-blue-500' :
                  rarity === 'uncommon' ? 'bg-green-500' :
                  'bg-gray-500'
                }`} />
                {rarity} Symbols ({raritySymbols.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {raritySymbols.map(symbol => (
                  <motion.div
                    key={symbol.id}
                    className={`border rounded-xl p-6 ${getRarityColor(symbol.rarity)} transition-all hover:scale-105`}
                    whileHover={{ y: -5 }}
                  >
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-semibold mb-3">{symbol.name}</h3>
                      
                      {/* Symbol Preview */}
                      <div className="flex justify-center mb-4">
                        <SymbolRenderer
                          symbol={{
                            id: symbol.id,
                            name: symbol.name,
                            emoji: symbol.emoji,
                            imageUrl: symbol.customUrl || null,
                            rarity: symbol.rarity
                          }}
                          size={120}
                        />
                      </div>

                      {/* Status */}
                      <div className="mb-4">
                        {symbol.hasCustomAsset ? (
                          <div className="text-green-400 text-sm font-medium">
                            ✅ Custom Asset Loaded
                            {symbol.loadTime && (
                              <div className="text-gray-400 text-xs">
                                Load time: {symbol.loadTime}ms
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-yellow-400 text-sm font-medium">
                            📱 Using Emoji Fallback
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Upload Progress */}
                    {uploadProgress[symbol.id] !== undefined && (
                      <div className="mb-4">
                        <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                          <motion.div
                            className="h-2 bg-blue-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress[symbol.id]}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <div className="text-center text-sm text-gray-400 mt-1">
                          Uploading... {uploadProgress[symbol.id]}%
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-3">
                      <label className="block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleFileUpload(symbol.id, file)
                            }
                          }}
                          className="hidden"
                        />
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg cursor-pointer text-center text-sm transition-colors"
                        >
                          📤 Upload Asset
                        </motion.div>
                      </label>

                      {symbol.hasCustomAsset && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleRemoveAsset(symbol.id)}
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors"
                        >
                          🗑️ Remove Asset
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )
        })}

        {/* Instructions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700"
        >
          <h3 className="text-xl font-bold mb-4">📚 Asset Guidelines</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-300">
            <div>
              <h4 className="font-semibold text-white mb-2">Image Requirements:</h4>
              <ul className="space-y-1">
                <li>• Format: PNG, JPG, WebP, or GIF</li>
                <li>• Size: Maximum 5MB</li>
                <li>• Dimensions: 512x512px recommended</li>
                <li>• Transparent background preferred</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Rarity Suggestions:</h4>
              <ul className="space-y-1">
                <li>• <span className="text-gray-400">Common:</span> Simple PNG images</li>
                <li>• <span className="text-green-400">Uncommon:</span> PNG with effects</li>
                <li>• <span className="text-blue-400">Rare:</span> High-quality WebP</li>
                <li>• <span className="text-purple-400">Epic:</span> WebP with particles</li>
                <li>• <span className="text-yellow-400">Legendary:</span> Animated GIF</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
} 