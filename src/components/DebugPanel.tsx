"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface DebugPanelProps {
  stage: string
  progress: number
  carouselItems: any[]
  wonSkin: any
  isOpening: boolean
  extraInfo?: Record<string, any>
}

export function DebugPanel({ stage, progress, carouselItems, wonSkin, isOpening, extraInfo }: DebugPanelProps) {
  const [logs, setLogs] = useState<string[]>([])
  const [isVisible, setIsVisible] = useState(false)

  // Capture console logs
  useEffect(() => {
    const originalConsoleLog = console.log
    const originalConsoleWarn = console.warn

    console.log = (...args) => {
      const message = args.join(' ')
      setLogs(prev => [...prev.slice(-10), `[LOG] ${new Date().toLocaleTimeString()}: ${message}`])
      originalConsoleLog(...args)
    }

    console.warn = (...args) => {
      const message = args.join(' ')
      setLogs(prev => [...prev.slice(-10), `[WARN] ${new Date().toLocaleTimeString()}: ${message}`])
      originalConsoleWarn(...args)
    }

    return () => {
      console.log = originalConsoleLog
      console.warn = originalConsoleWarn
    }
  }, [])

  if (!isVisible) {
    return (
      <motion.button
        className="fixed top-4 right-4 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm z-50 hover:bg-gray-700"
        onClick={() => setIsVisible(true)}
        whileHover={{ scale: 1.05 }}
      >
        🐛 Debug
      </motion.button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed top-4 right-4 w-80 bg-gray-900 text-white rounded-lg border border-gray-700 p-4 z-50 max-h-96 overflow-y-auto"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">🐛 Debug Panel</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        {/* Current State */}
        <div className="bg-gray-800 rounded p-3">
          <div className="text-sm font-semibold mb-2 text-blue-400">Current State</div>
          <div className="space-y-1 text-xs">
            <div>Stage: <span className="text-yellow-300">{stage}</span></div>
            <div>Progress: <span className="text-green-300">{progress}%</span></div>
            <div>Is Opening: <span className={isOpening ? 'text-green-300' : 'text-red-300'}>
              {isOpening ? 'YES' : 'NO'}
            </span></div>
            <div>Carousel Items: <span className="text-purple-300">{carouselItems.length}</span></div>
            <div>Won Skin: <span className="text-orange-300">
              {wonSkin ? wonSkin.id : 'None'}
            </span></div>
            {extraInfo && Object.entries(extraInfo).map(([key, value]) => (
              <div key={key}>{key}: <span className="text-cyan-300">{String(value)}</span></div>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-800 rounded p-3">
          <div className="text-sm font-semibold mb-2 text-blue-400">Progress Visual</div>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-1">{progress}%</div>
        </div>

        {/* Stage Timeline */}
        <div className="bg-gray-800 rounded p-3">
          <div className="text-sm font-semibold mb-2 text-blue-400">Stage Timeline</div>
          <div className="space-y-1 text-xs">
            {[
              { stage: 'closed', range: '0%', desc: 'Initial state' },
              { stage: 'opening', range: '0-20%', desc: 'Case opening' },
              { stage: 'spinning', range: '20-75%', desc: 'Carousel spinning' },
              { stage: 'revealing', range: '75-95%', desc: 'Prize reveal' },
              { stage: 'complete', range: '95-100%', desc: 'Complete' },
            ].map((item) => (
              <div 
                key={item.stage}
                className={`flex justify-between ${
                  stage === item.stage ? 'text-yellow-300 font-bold' : 'text-gray-400'
                }`}
              >
                <span>{item.stage}</span>
                <span>{item.range}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Carousel Debug */}
        {carouselItems.length > 0 && (
          <div className="bg-gray-800 rounded p-3">
            <div className="text-sm font-semibold mb-2 text-blue-400">Carousel Debug</div>
            <div className="space-y-1 text-xs">
              <div>Total Items: <span className="text-purple-300">{carouselItems.length}</span></div>
              <div>Winning Items: <span className="text-yellow-300">
                {carouselItems.filter(item => item.isWinning).length}
              </span></div>
              <div>First Winner At: <span className="text-green-300">
                {carouselItems.findIndex(item => item.isWinning)}
              </span></div>
            </div>
          </div>
        )}

        {/* Recent Logs */}
        <div className="bg-gray-800 rounded p-3">
          <div className="text-sm font-semibold mb-2 text-blue-400">Recent Logs</div>
          <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet...</div>
            ) : (
              logs.map((log, index) => (
                <div 
                  key={index}
                  className={`${
                    log.includes('[WARN]') ? 'text-yellow-300' : 'text-gray-300'
                  }`}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded p-3">
          <div className="text-sm font-semibold mb-2 text-blue-400">Quick Actions</div>
          <div className="space-y-2">
            <button
              onClick={() => setLogs([])}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-2 rounded"
            >
              Clear Logs
            </button>
            <button
              onClick={() => {
                console.log('=== DEBUG SNAPSHOT ===')
                console.log('Stage:', stage)
                console.log('Progress:', progress)
                console.log('Carousel Items:', carouselItems.length)
                console.log('Won Skin:', wonSkin)
                console.log('Is Opening:', isOpening)
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-xs py-1 px-2 rounded"
            >
              Take Snapshot
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
} 