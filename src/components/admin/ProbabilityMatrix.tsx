"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { ProbabilityMatrixProps, CaseTestResult } from '@/types/admin'

export default function ProbabilityMatrix({
  caseId,
  currentWeights,
  availableSymbols,
  onUpdate,
  onTest
}: ProbabilityMatrixProps) {
  const [weights, setWeights] = useState(
    currentWeights.reduce((acc, w) => ({ ...acc, [w.symbolId]: w.weight }), {} as Record<string, number>)
  )
  const [isTestingMode, setIsTestingMode] = useState(false)
  const [testResult, setTestResult] = useState<CaseTestResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0)
  const isValidTotal = Math.abs(totalWeight - 100) < 0.01

  const handleWeightChange = (symbolId: string, newWeight: number) => {
    setWeights(prev => ({ ...prev, [symbolId]: Math.max(0, Math.min(100, newWeight)) }))
  }

  const handleAutoBalance = () => {
    const symbolIds = Object.keys(weights)
    const baseWeight = Math.floor(100 / symbolIds.length)
    const remainder = 100 - (baseWeight * symbolIds.length)
    
    const newWeights = symbolIds.reduce((acc, id, index) => ({
      ...acc,
      [id]: baseWeight + (index < remainder ? 1 : 0)
    }), {} as Record<string, number>)
    
    setWeights(newWeights)
  }

  const handleSave = async () => {
    if (!isValidTotal) return
    
    setIsLoading(true)
    try {
      await onUpdate({
        caseId,
        symbols: Object.entries(weights).map(([symbolId, weight]) => ({ symbolId, weight })),
        reason: 'Admin dashboard update'
      })
    } catch (error) {
      console.error('Failed to update probabilities:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTest = async () => {
    setIsLoading(true)
    try {
      const result = await onTest(caseId, 1000) // Test with 1000 iterations
      setTestResult(result)
      setIsTestingMode(true)
    } catch (error) {
      console.error('Failed to test case:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold">Probability Matrix</h3>
        <div className="flex space-x-3">
          <button
            onClick={handleAutoBalance}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm"
          >
            Auto Balance
          </button>
          <button
            onClick={handleTest}
            disabled={!isValidTotal || isLoading}
            className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 px-4 py-2 rounded-lg text-sm"
          >
            Test Distribution
          </button>
        </div>
      </div>

      {/* Probability Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {availableSymbols.map(symbol => {
          const weight = weights[symbol.id] || 0
          const isSelected = weight > 0

          return (
            <motion.div
              key={symbol.id}
              className={`border-2 rounded-lg p-4 ${
                isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600'
              }`}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center mb-3">
                <img 
                  src={symbol.imageUrl} 
                  alt={symbol.name}
                  className="w-8 h-8 rounded object-cover mr-3"
                />
                <div>
                  <p className="font-medium text-sm">{symbol.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{symbol.rarity}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs text-gray-400">Weight (%)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => handleWeightChange(symbol.id, parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                  min="0"
                  max="100"
                  step="0.01"
                />
                <div className="text-xs text-gray-500">
                  Value: ${symbol.value} • Expected: ${((weight / 100) * symbol.value).toFixed(2)}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Validation Summary */}
      <div className="bg-gray-700 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">Total Probability:</span>
          <span className={`font-bold ${isValidTotal ? 'text-green-400' : 'text-red-400'}`}>
            {totalWeight.toFixed(2)}%
          </span>
        </div>
        
        {!isValidTotal && (
          <div className="text-red-400 text-sm">
            ⚠️ Probabilities must sum to exactly 100%
          </div>
        )}

        <div className="mt-3">
          <div className="text-sm text-gray-400 mb-1">Expected Value per Opening:</div>
          <div className="text-lg font-semibold text-green-400">
            ${Object.entries(weights).reduce((sum, [symbolId, weight]) => {
              const symbol = availableSymbols.find(s => s.id === symbolId)
              return sum + ((weight / 100) * (symbol?.value || 0))
            }, 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Test Results */}
      {testResult && isTestingMode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-700 rounded-lg p-4 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">Test Results (1000 iterations)</h4>
            <button
              onClick={() => setIsTestingMode(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Avg Value</div>
              <div className="font-semibold">${testResult.averageValue.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-400">Min Value</div>
              <div className="font-semibold">${testResult.valueDistribution.min.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-400">Max Value</div>
              <div className="font-semibold">${testResult.valueDistribution.max.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-400">Std Dev</div>
              <div className="font-semibold">${testResult.valueDistribution.standardDeviation.toFixed(2)}</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm text-gray-400 mb-2">Distribution Accuracy:</div>
            <div className="space-y-1">
              {testResult.results.map(result => {
                const symbol = availableSymbols.find(s => s.id === result.symbolId)
                return (
                  <div key={result.symbolId} className="flex justify-between text-xs">
                    <span>{symbol?.name}</span>
                    <span className={`${Math.abs(result.deviation) < 1 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {result.percentage.toFixed(1)}% (expected {result.expectedPercentage.toFixed(1)}%)
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={handleSave}
          disabled={!isValidTotal || isLoading}
          className={`px-6 py-2 rounded-lg font-medium ${
            isValidTotal && !isLoading
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? 'Saving...' : 'Save Probabilities'}
        </button>
      </div>
    </div>
  )
}