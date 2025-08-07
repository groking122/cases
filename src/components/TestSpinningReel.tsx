"use client"

import { useState } from 'react'
import { SpinningReelCarousel } from './SpinningReelCarousel'
import { casinoSoundManager } from '../lib/casinoSoundManager'

export function TestSpinningReel() {
  const [isSpinning, setIsSpinning] = useState(false)
  const [volume, setVolume] = useState(0.7)

  const testWinningItem = {
    symbol: {
      key: 'diamond',
      name: 'Silver Diamond',
      emoji: '💎',
      imageUrl: null
    },
    rarity: 'rare',
    isWinning: true
  }

  const handleStart = () => {
    console.log('🧪 Starting test spin - setting isSpinning to true')
    setIsSpinning(true)
  }

  const handleComplete = () => {
    console.log('🧪 Test spin completed - setting isSpinning to false')
    setIsSpinning(false)
  }

  const handleForceStop = () => {
    console.log('🧪 Force stopping test spin')
    casinoSoundManager.stopAllSounds()
    setIsSpinning(false)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    casinoSoundManager.setMasterVolume(newVolume)
  }

  console.log('🧪 TestSpinningReel render - isSpinning:', isSpinning)

  return (
    <div className="p-8 bg-gray-900 min-h-screen">
      <h1 className="text-white text-2xl mb-6">Spinning Reel Test</h1>
      
      <div className="mb-6 space-x-4">
        <button
          onClick={handleStart}
          disabled={isSpinning}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg disabled:bg-gray-500"
        >
          {isSpinning ? 'Spinning...' : 'Start Spin'}
        </button>
        
        <button
          onClick={handleForceStop}
          disabled={!isSpinning}
          className="px-6 py-3 bg-red-500 text-white rounded-lg disabled:bg-gray-500"
        >
          Force Stop (Skip Animation)
        </button>
        
        <div className="flex items-center space-x-2 text-white">
          <span>🔊</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            className="w-20"
          />
          <span className="text-sm">{Math.round(volume * 100)}%</span>
        </div>
      </div>
      
      <div className="mb-4 text-gray-400 text-sm">
        <p>🎰 Casino-Grade Animation System:</p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
          <li><strong>Anticipation (3.5s):</strong> Gradual acceleration with excitement building</li>
          <li><strong>Near-Miss (2.5s):</strong> Tension-building slowdown with false stops</li>
          <li><strong>Resolution (1.2s):</strong> Magnetic snap to winning item</li>
          <li><strong>Reveal Hold (0.8s):</strong> Spotlight effect on prize</li>
          <li><strong>Celebration (3s):</strong> Tiered effects based on rarity</li>
          <li><strong>Sustain (user-timed):</strong> Persistent glow until interaction</li>
          <li><strong>Total: ~12 seconds</strong> of psychological engagement!</li>
        </ul>
        
        <div className="mt-3 p-2 bg-green-900/30 rounded border border-green-600/50">
          <p className="text-green-400 text-xs font-semibold">✅ Professional Features:</p>
          <ul className="text-xs text-green-300 mt-1 space-y-0.5">
            <li>• Near-miss psychology for engagement</li>
            <li>• Rarity-based celebration tiers</li>
            <li>• Smooth cubic-bezier easing curves</li>
            <li>• No symbol disappearing or freezing</li>
            <li>• Guaranteed completion flow</li>
            <li>• <strong>Interactive claim button</strong> - fully clickable!</li>
            <li>• Click celebration to skip to claim phase</li>
            <li>• <strong>🔊 Casino sound effects</strong> - procedurally generated!</li>
            <li>• Clean UI - removed distracting status text</li>
          </ul>
        </div>
        
        <div className="mt-3 p-2 bg-blue-900/30 rounded border border-blue-600/50">
          <p className="text-blue-400 text-xs font-semibold">🔊 Sound System:</p>
          <ul className="text-xs text-blue-300 mt-1 space-y-0.5">
            <li>• <strong>Anticipation:</strong> Building tension with rising frequencies</li>
            <li>• <strong>Near-Miss:</strong> Drum-like percussion with irregular rhythm</li>
            <li>• <strong>Resolution:</strong> Satisfying "thock" magnetic snap sound</li>
            <li>• <strong>Reveal:</strong> Magical shimmer/sparkle effects</li>
            <li>• <strong>Celebration:</strong> Triumphant fanfare with harmonies</li>
            <li>• <strong>Claim:</strong> Pleasant success chime</li>
            <li>• <strong>Interactions:</strong> Hover and click feedback sounds</li>
          </ul>
        </div>
      </div>

      <div className="w-full max-w-4xl">
        <SpinningReelCarousel
          isSpinning={isSpinning}
          winningItem={testWinningItem}
          onComplete={handleComplete}
          spinDuration={3500} // 3.5 seconds anticipation phase
          stopDuration={2500} // 2.5 seconds near-miss phase
        />
      </div>
    </div>
  )
} 