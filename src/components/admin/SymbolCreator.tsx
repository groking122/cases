"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { SymbolFormData } from '@/types/admin'
import { ImageUpload } from '@/components/ImageUpload'

interface SymbolCreatorProps {
  onSave: (data: SymbolFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export default function SymbolCreator({
  onSave,
  onCancel,
  isLoading = false
}: SymbolCreatorProps) {
  const [formData, setFormData] = useState<SymbolFormData>({
    name: '',
    description: '',
    imageUrl: '',
    rarity: 'common',
    value: 10.00,
    isActive: true
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name || !formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.imageUrl || !formData.imageUrl.trim()) {
      newErrors.imageUrl = 'Image URL is required'
    }

    if (!formData.value || formData.value <= 0) {
      newErrors.value = 'Value must be greater than 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gray-800 rounded-xl p-6 max-w-2xl mx-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold">Create New Symbol</h3>
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
          <ImageUpload
            onUpload={(url) => {
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
            currentImage={formData.imageUrl}
            buttonText="Upload Symbol Image"
            className="w-full"
          />
          {errors.imageUrl && <p className="text-red-400 text-sm mt-1">{errors.imageUrl}</p>}
          
          {/* Manual URL input as fallback */}
          <details className="mt-4">
            <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
              Or enter image URL manually
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
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
            className="mr-2"
          />
          <label htmlFor="isActive" className="text-sm text-gray-300">
            Symbol is active and available for cases
          </label>
        </div>

        {/* Preview */}
        {formData.name && formData.imageUrl && (
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Preview</h4>
            <div className="bg-gray-800 rounded-lg p-4 max-w-xs">
              <img 
                src={formData.imageUrl} 
                alt={formData.name}
                className="w-full h-24 object-cover rounded-lg mb-3"
              />
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{formData.name}</span>
                <span className={`px-2 py-1 rounded-full text-xs text-white ${
                  rarityOptions.find(r => r.value === formData.rarity)?.color || 'bg-gray-500'
                }`}>
                  {formData.rarity}
                </span>
              </div>
              <div className="text-green-400 font-bold">${formData.value}</div>
              {formData.description && (
                <p className="text-gray-400 text-sm mt-2">{formData.description}</p>
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
            disabled={isLoading}
            className={`px-6 py-2 rounded-lg font-medium ${
              isLoading
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isLoading ? 'Creating...' : 'Create Symbol'}
          </button>
        </div>
      </form>
    </motion.div>
  )
}