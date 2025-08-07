"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { CaseConfig, Symbol, CaseFormData, ProbabilityValidationResult } from '@/types/admin'
import { ImageUpload } from '@/components/ImageUpload'

interface CaseConfiguratorProps {
  existingCase?: CaseConfig
  symbols: Symbol[]
  onSave: (data: CaseFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export default function CaseConfigurator({
  existingCase,
  symbols,
  onSave,
  onCancel,
  isLoading = false
}: CaseConfiguratorProps) {
  const [formData, setFormData] = useState<CaseFormData>({
    name: existingCase?.name || '',
    description: existingCase?.description || '',
    price: existingCase?.price || 0,
    imageUrl: existingCase?.imageUrl || '',
    isActive: existingCase?.isActive ?? true,
    symbols: existingCase?.symbols.map(s => ({
      symbolId: s.symbolId,
      weight: s.weight
    })) || []
  })

  // Reset form data when existingCase changes (fresh data arrives)
  useEffect(() => {
    if (existingCase) {
      console.log('🔄 CaseConfigurator: Received fresh case data:', existingCase)
      console.log('🔄 Fresh symbols:', existingCase.symbols)
      setFormData({
        name: existingCase.name || '',
        description: existingCase.description || '',
        price: existingCase.price || 0,
        imageUrl: existingCase.imageUrl || '',
        isActive: existingCase.isActive ?? true,
        symbols: existingCase.symbols.map(s => ({
          symbolId: s.symbolId,
          weight: s.weight
        })) || []
      })
      setSelectedSymbols(new Set(existingCase.symbols.map(s => s.symbolId)))
    }
  }, [existingCase])
  
  const [validation, setValidation] = useState<ProbabilityValidationResult | null>(null)
  const [selectedSymbols, setSelectedSymbols] = useState<Set<string>>(
    new Set(formData.symbols.map(s => s.symbolId))
  )

  useEffect(() => {
    validateProbabilities()
  }, [formData.symbols])

  const validateProbabilities = () => {
    const totalWeight = formData.symbols.reduce((sum, s) => sum + s.weight, 0)
    const errors: string[] = []
    const warnings: string[] = []

    if (formData.symbols.length === 0) {
      errors.push('At least one symbol is required')
    }

    if (Math.abs(totalWeight - 100) > 0.01) {
      errors.push(`Probabilities must sum to 100%. Currently: ${totalWeight.toFixed(2)}%`)
    }

    formData.symbols.forEach(symbol => {
      if (symbol.weight < 0) {
        errors.push(`Symbol has negative weight`)
      }
      if (symbol.weight === 0) {
        warnings.push(`Symbol has 0% drop rate`)
      }
    })

    // Calculate rarity distribution
    const distribution = symbols
      .filter(s => formData.symbols.some(fs => fs.symbolId === s.id))
      .map(symbol => {
        const weight = formData.symbols.find(fs => fs.symbolId === symbol.id)?.weight || 0
        return {
          rarity: symbol.rarity,
          percentage: weight,
          expectedValue: (weight / 100) * symbol.value
        }
      })

    setValidation({
      isValid: errors.length === 0,
      totalWeight,
      errors,
      warnings,
      distribution
    })
  }

  const handleSymbolToggle = (symbolId: string) => {
    if (selectedSymbols.has(symbolId)) {
      // Remove symbol
      setSelectedSymbols(prev => {
        const newSet = new Set(prev)
        newSet.delete(symbolId)
        return newSet
      })
      setFormData(prev => ({
        ...prev,
        symbols: prev.symbols.filter(s => s.symbolId !== symbolId)
      }))
    } else {
      // Add symbol with default weight
      setSelectedSymbols(prev => new Set([...prev, symbolId]))
      setFormData(prev => ({
        ...prev,
        symbols: [...prev.symbols, { symbolId, weight: 10 }]
      }))
    }
  }

  const handleWeightChange = (symbolId: string, weight: number) => {
    setFormData(prev => ({
      ...prev,
      symbols: prev.symbols.map(s => 
        s.symbolId === symbolId ? { ...s, weight } : s
      )
    }))
  }

  const handleAutoBalance = () => {
    const numSymbols = formData.symbols.length
    if (numSymbols === 0) return

    const baseWeight = Math.floor(100 / numSymbols)
    const remainder = 100 - (baseWeight * numSymbols)

    setFormData(prev => ({
      ...prev,
      symbols: prev.symbols.map((s, index) => ({
        ...s,
        weight: baseWeight + (index < remainder ? 1 : 0)
      }))
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validation?.isValid) return
    
    await onSave(formData)
  }

  const isFormValid = validation?.isValid && formData.name && formData.price > 0 && formData.imageUrl

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gray-800 rounded-xl p-6 max-w-4xl mx-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold">
          {existingCase ? 'Edit Case' : 'Create New Case'}
        </h3>
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
              Case Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter case name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Price (Credits)
            </label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
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
            placeholder="Enter case description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Case Image
          </label>
          
          {/* Show current image if editing */}
          {existingCase && existingCase.imageUrl && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2">Current Image:</p>
                            {existingCase.imageUrl ? (
                <img
                  src={existingCase.imageUrl}
                  alt="Current case"
                  className="w-20 h-20 object-cover rounded-lg border border-gray-600"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-20 h-20 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center ${existingCase.imageUrl ? 'hidden' : ''}`}>
                <div className="text-center text-gray-400">
                  <div className="text-sm">📦</div>
                  <div className="text-xs">No Image</div>
                </div>
              </div>
            </div>
          )}
          
          <ImageUpload
            onUpload={(url) => {
              setFormData(prev => ({ ...prev, imageUrl: url }))
            }}
            folder="cases"
            isAdmin={true}
            currentImage={formData.imageUrl !== existingCase?.imageUrl ? formData.imageUrl : undefined}
            buttonText={existingCase ? "Upload New Case Image" : "Upload Case Image"}
            className="w-full"
          />
          
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
                placeholder="https://example.com/case-image.png"
              />
            </div>
          </details>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
            className="mr-2"
          />
          <label htmlFor="isActive" className="text-sm text-gray-300">
            Case is active and available for opening
          </label>
        </div>

        {/* Symbol Selection */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium">Symbols & Probabilities</h4>
            <button
              type="button"
              onClick={handleAutoBalance}
              className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm"
              disabled={formData.symbols.length === 0}
            >
              Auto Balance
            </button>
          </div>

          {/* Symbol Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {symbols.map(symbol => {
              const isSelected = selectedSymbols.has(symbol.id)
              const symbolWeight = formData.symbols.find(s => s.symbolId === symbol.id)?.weight || 0

              return (
                <div
                  key={symbol.id}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                  onClick={() => handleSymbolToggle(symbol.id)}
                >
                  <div className="flex items-center mb-3">
                    {symbol.imageUrl ? (
                      <img 
                        src={symbol.imageUrl} 
                        alt={symbol.name}
                        className="w-8 h-8 rounded object-cover mr-3"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-8 h-8 rounded bg-gray-600 border border-gray-500 flex items-center justify-center mr-3 ${symbol.imageUrl ? 'hidden' : ''}`}>
                      <span className="text-gray-400 text-xs">💎</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{symbol.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{symbol.rarity}</p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-3">
                      <label className="block text-xs text-gray-400 mb-1">
                        Drop Rate (%)
                      </label>
                      <input
                        type="number"
                        value={symbolWeight}
                        onChange={(e) => handleWeightChange(symbol.id, parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                        min="0"
                        max="100"
                        step="0.01"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Validation Results */}
          {validation && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <span>Total Probability:</span>
                <span className={`font-bold ${
                  validation.isValid ? 'text-green-400' : 'text-red-400'
                }`}>
                  {validation.totalWeight.toFixed(2)}%
                </span>
              </div>

              {validation.errors.length > 0 && (
                <div className="bg-red-900/50 border border-red-600 rounded-lg p-3">
                  <h5 className="text-red-400 font-medium mb-2">Errors:</h5>
                  <ul className="text-red-300 text-sm space-y-1">
                    {validation.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-3">
                  <h5 className="text-yellow-400 font-medium mb-2">Warnings:</h5>
                  <ul className="text-yellow-300 text-sm space-y-1">
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Expected Value Calculator */}
              {validation.distribution.length > 0 && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h5 className="font-medium mb-3">Expected Value Analysis</h5>
                  <div className="space-y-2">
                    {validation.distribution.map((dist, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="capitalize">{dist.rarity}:</span>
                        <span>{dist.percentage.toFixed(2)}% (${dist.expectedValue.toFixed(2)})</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-600 pt-2 font-medium">
                      <div className="flex justify-between">
                        <span>Total Expected Value:</span>
                        <span className="text-green-400">
                          ${validation.distribution.reduce((sum, d) => sum + d.expectedValue, 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

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
            disabled={!isFormValid || isLoading}
            className={`px-6 py-2 rounded-lg font-medium ${
              isFormValid && !isLoading
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? 'Saving...' : existingCase ? 'Update Case' : 'Create Case'}
          </button>
        </div>
      </form>
    </motion.div>
  )
}