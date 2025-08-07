"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { SymbolLibraryProps } from '@/types/admin'

export default function SymbolLibrary({
  symbols,
  onEdit,
  onCreate,
  onDelete,
  onToggleActive
}: SymbolLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [rarityFilter, setRarityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredSymbols = symbols.filter(symbol => {
    const matchesSearch = symbol.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRarity = rarityFilter === 'all' || symbol.rarity === rarityFilter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && symbol.isActive) ||
      (statusFilter === 'inactive' && !symbol.isActive)
    
    return matchesSearch && matchesRarity && matchesStatus
  })

  const rarityColors = {
    common: 'bg-gray-500',
    uncommon: 'bg-green-500',
    rare: 'bg-blue-500',
    epic: 'bg-purple-500',
    legendary: 'bg-yellow-500',
    mythic: 'bg-red-500'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Symbol Library</h2>
        <button
          onClick={onCreate}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
        >
          + Create Symbol
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 bg-gray-800 p-4 rounded-lg">
        <div className="flex-1 min-w-64">
          <input
            type="text"
            placeholder="Search symbols..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
          />
        </div>
        
        <select
          value={rarityFilter}
          onChange={(e) => setRarityFilter(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
        >
          <option value="all">All Rarities</option>
          <option value="common">Common</option>
          <option value="uncommon">Uncommon</option>
          <option value="rare">Rare</option>
          <option value="epic">Epic</option>
          <option value="legendary">Legendary</option>
          <option value="mythic">Mythic</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Symbol Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredSymbols.map((symbol) => (
          <motion.div
            key={symbol.id}
            className={`bg-gray-800 rounded-xl p-4 border-2 ${
              symbol.isActive ? 'border-gray-600' : 'border-red-600/50'
            }`}
            whileHover={{ scale: 1.02 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Symbol Image */}
            <div className="relative mb-4">
              {symbol.imageUrl ? (
                <img
                  src={symbol.imageUrl}
                  alt={symbol.name}
                  className="w-full h-32 object-cover rounded-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-full h-32 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center ${symbol.imageUrl ? 'hidden' : ''}`}>
                <div className="text-center text-gray-400">
                  <div className="text-2xl mb-1">📷</div>
                  <div className="text-xs">No Image</div>
                </div>
              </div>
              <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium text-white ${
                rarityColors[symbol.rarity as keyof typeof rarityColors] || 'bg-gray-500'
              }`}>
                {symbol.rarity}
              </div>
              {!symbol.isActive && (
                <div className="absolute inset-0 bg-red-600/20 rounded-lg flex items-center justify-center">
                  <span className="text-red-400 font-semibold">INACTIVE</span>
                </div>
              )}
            </div>

            {/* Symbol Info */}
            <div className="mb-4">
              <h3 className="font-semibold text-lg mb-1">{symbol.name}</h3>
              <p className="text-gray-400 text-sm mb-2">{symbol.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-green-400 font-bold">${symbol.value}</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  symbol.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {symbol.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Metadata */}
            {symbol.metadata && Object.keys(symbol.metadata).length > 0 && (
              <div className="mb-4 p-2 bg-gray-700 rounded text-xs">
                <div className="text-gray-400 mb-1">Metadata:</div>
                {Object.entries(symbol.metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-500">{key}:</span>
                    <span className="text-gray-300">{String(value).substring(0, 20)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={() => onEdit(symbol)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => onToggleActive(symbol.id, !symbol.isActive)}
                className={`flex-1 px-3 py-2 rounded text-sm ${
                  symbol.isActive
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {symbol.isActive ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => onDelete(symbol.id)}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
              >
                🗑️
              </button>
            </div>

            {/* Usage Stats */}
            <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Created:</span>
                <span>{new Date(symbol.createdAt).toLocaleDateString()}</span>
              </div>
              {symbol.updatedAt !== symbol.createdAt && (
                <div className="flex justify-between">
                  <span>Updated:</span>
                  <span>{new Date(symbol.updatedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredSymbols.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-4">No symbols found</div>
          <p className="text-gray-500 mb-6">
            {searchTerm || rarityFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first symbol to get started'
            }
          </p>
          <button
            onClick={onCreate}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg"
          >
            Create Symbol
          </button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="font-semibold mb-3">Library Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-400">Total Symbols</div>
            <div className="text-xl font-bold">{symbols.length}</div>
          </div>
          <div>
            <div className="text-gray-400">Active</div>
            <div className="text-xl font-bold text-green-400">
              {symbols.filter(s => s.isActive).length}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Average Value</div>
            <div className="text-xl font-bold text-blue-400">
              ${(symbols.reduce((sum, s) => sum + s.value, 0) / symbols.length).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-gray-400">Most Common</div>
            <div className="text-xl font-bold text-purple-400 capitalize">
              {symbols.reduce((acc, s) => {
                acc[s.rarity] = (acc[s.rarity] || 0) + 1
                return acc
              }, {} as Record<string, number>) && 
              Object.entries(symbols.reduce((acc, s) => {
                acc[s.rarity] = (acc[s.rarity] || 0) + 1
                return acc
              }, {} as Record<string, number>)).sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}