"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { Symbol, SymbolFormData } from '@/types/admin'
import { ImageUpload } from '@/components/ImageUpload'

interface SymbolEditorProps {
  symbol: Symbol
  onSave: (data: SymbolFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export default function SymbolEditor({
  symbol,
  onSave,
  onCancel,
  isLoading = false
}: SymbolEditorProps) {
  const [formData, setFormData] = useState<SymbolFormData>({
    name: symbol.name || '',
    description: symbol.description || '',
    imageUrl: symbol.imageUrl || '',
    rarity: symbol.rarity || 'common',
    value: symbol.value || 0,
    isActive: symbol.isActive ?? true
  })

  // Reset form data when symbol prop changes (fresh data)
  useEffect(() => {
    console.log('🔄 SymbolEditor: Received symbol data:', symbol)
    console.log('🔄 Symbol image URL:', symbol.imageUrl)
    setFormData({
      name: symbol.name || '',
      description: symbol.description || '',
      imageUrl: symbol.imageUrl || '',
      rarity: symbol.rarity || 'common',
      value: symbol.value || 0,
      isActive: symbol.isActive ?? true
    })
    // Clear errors when new symbol loads
    setErrors({})
  }, [symbol])

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name || !formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    // Temporarily allow empty imageUrl for testing
    // if (!formData.imageUrl || !formData.imageUrl.trim()) {
    //   newErrors.imageUrl = 'Image URL is required'
    // }

    if (!formData.value || formData.value <= 0) {
      newErrors.value = 'Value must be greater than 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🔍 Form submitted with data:', formData)
    console.log('🔍 Image URL in form:', formData.imageUrl)
    
    if (!validateForm()) {
      console.log('❌ Form validation failed:', errors)
      return
    }
    
    try {
      await onSave(formData)
    } catch (error) {
      console.error('Failed to save symbol:', error)
    }
  }

  const rarityOptions = [
    { value: 'common', label: 'Common', color: 'bg-gray-500' },
    { value: 'uncommon', label: 'Uncommon', color: 'bg-green-500' },
    { value: 'rare', label: 'Rare', color: 'bg-blue-500' },
    { value: 'epic', label: 'Epic', color: 'bg-purple-500' },
    { value: 'legendary', label: 'Legendary', color: 'bg-yellow-500' },
    { value: 'mythic', label: 'Mythic', color: 'bg-red-500' }
  ]

  // Check what has changed
  const hasChanges = 
    formData.name !== symbol.name ||
    formData.description !== (symbol.description || '') ||
    formData.imageUrl !== symbol.imageUrl ||
    formData.rarity !== symbol.rarity ||
    formData.value !== symbol.value ||
    formData.isActive !== symbol.isActive

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gray-800 rounded-xl p-6 max-w-2xl mx-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold">Edit Symbol</h3>
          <p className="text-gray-400 text-sm">ID: {symbol.id}</p>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Symbol Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full bg-gray-700 border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="Enter symbol name"
            />
            {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Value (Credits) *
            </label>
            <input
              type="number"
              value={formData.value}
              onChange={(e) => setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
              className={`w-full bg-gray-700 border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 ${
                errors.value ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
            {errors.value && <p className="text-red-400 text-sm mt-1">{errors.value}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            rows={3}
            placeholder="Enter symbol description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Symbol Image *
          </label>
          
          {/* Show original image */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-2">Current Image:</p>
            {symbol.imageUrl ? (
              <img 
                src={symbol.imageUrl} 
                alt="Current symbol" 
                className="w-20 h-20 object-cover rounded-lg border border-gray-600"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`w-20 h-20 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center ${symbol.imageUrl ? 'hidden' : ''}`}>
              <div className="text-center text-gray-400">
                <div className="text-sm">📷</div>
                <div className="text-xs">No Image</div>
              </div>
            </div>
          </div>
          
          <ImageUpload
            onUpload={(url) => {
              console.log('🖼️ Image uploaded successfully, URL:', url)
              setFormData(prev => ({ ...prev, imageUrl: url }))
              // Clear error when image is uploaded
              if (errors.imageUrl) {
                const newErrors = { ...errors }
                delete newErrors.imageUrl
                setErrors(newErrors)
              }
            }}
            folder="symbols"
            isAdmin={true}
            currentImage={formData.imageUrl !== symbol.imageUrl ? formData.imageUrl : undefined}
            buttonText="Upload New Image"
            className="w-full"
          />
          {errors.imageUrl && <p className="text-red-400 text-sm mt-1">{errors.imageUrl}</p>}
          
          {/* Manual URL input as fallback */}
          <details className="mt-4">
            <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
              Or enter new image URL manually
            </summary>
            <div className="mt-2">
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                placeholder="https://example.com/symbol-image.png"
              />
            </div>
          </details>
        </div>

        {/* Rarity Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Rarity
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {rarityOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, rarity: option.value as any }))}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  formData.rarity === option.value
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className={`w-4 h-4 rounded-full ${option.color} mx-auto mb-1`}></div>
                <div className="text-sm font-medium">{option.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Active Status */}
        <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
          <div>
            <label className="text-sm font-medium text-gray-300">Symbol Status</label>
            <p className="text-xs text-gray-400">Controls whether this symbol appears in cases</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Change Summary */}
        {hasChanges && (
          <div className="bg-blue-900/30 border border-blue-600/30 rounded-lg p-4">
            <h4 className="text-blue-400 font-medium mb-2">📝 Changes to be saved:</h4>
            <div className="space-y-1 text-sm">
              {formData.name !== symbol.name && (
                <div className="text-gray-300">• Name: "{symbol.name}" → "{formData.name}"</div>
              )}
              {formData.description !== (symbol.description || '') && (
                <div className="text-gray-300">• Description updated</div>
              )}
              {formData.imageUrl !== symbol.imageUrl && (
                <div className="text-gray-300">• Image URL updated</div>
              )}
              {formData.rarity !== symbol.rarity && (
                <div className="text-gray-300">• Rarity: {symbol.rarity} → {formData.rarity}</div>
              )}
              {formData.value !== symbol.value && (
                <div className="text-gray-300">• Value: ${symbol.value} → ${formData.value}</div>
              )}
              {formData.isActive !== symbol.isActive && (
                <div className="text-gray-300">• Status: {symbol.isActive ? 'Active' : 'Inactive'} → {formData.isActive ? 'Active' : 'Inactive'}</div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-600 rounded-lg text-gray-300 hover:text-white hover:border-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !hasChanges}
            className={`px-6 py-2 rounded-lg font-medium ${
              (isLoading || !hasChanges)
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isLoading ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
          </button>
        </div>
      </form>
    </motion.div>
  )
}