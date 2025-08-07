"use client"

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useDeviceCapabilities } from '@/hooks/useDeviceCapabilities'

interface PerformanceMetrics {
  fps: number
  frameTime: number
  memoryUsage: number
  gpuMemoryUsage?: number
  particleCount: number
  renderCalls: number
  triangles: number
}

interface WebGLPerformanceMonitorProps {
  isActive: boolean
  renderMode: 'standard' | 'webgl'
  onMetricsChange?: (metrics: PerformanceMetrics) => void
}

export const WebGLPerformanceMonitor = ({ 
  isActive, 
  renderMode,
  onMetricsChange 
}: WebGLPerformanceMonitorProps) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    memoryUsage: 0,
    particleCount: 0,
    renderCalls: 0,
    triangles: 0
  })
  const [showDetails, setShowDetails] = useState(false)
  
  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  const fpsHistoryRef = useRef<number[]>([])
  
  const { capabilities } = useDeviceCapabilities()

  // Performance monitoring loop
  useEffect(() => {
    if (!isActive) return

    const measurePerformance = () => {
      const now = performance.now()
      const deltaTime = now - lastTimeRef.current
      frameCountRef.current++

      // Calculate FPS
      if (deltaTime >= 1000) { // Every second
        const fps = Math.round((frameCountRef.current * 1000) / deltaTime)
        
        // Update FPS history
        fpsHistoryRef.current.push(fps)
        if (fpsHistoryRef.current.length > 60) {
          fpsHistoryRef.current.shift()
        }

        // Calculate average frame time
        const avgFrameTime = deltaTime / frameCountRef.current

        // Get memory usage (if available)
        const memoryInfo = (performance as any).memory
        const memoryUsage = memoryInfo ? 
          Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024) : 0

        // Estimate particle count and render calls based on render mode
        const estimatedMetrics = renderMode === 'webgl' ? {
          particleCount: capabilities.performanceTier === 'high' ? 500 : 
                        capabilities.performanceTier === 'medium' ? 300 : 100,
          renderCalls: fps > 50 ? 15 : 25, // WebGL batches better
          triangles: capabilities.performanceTier === 'high' ? 10000 : 5000
        } : {
          particleCount: 50, // DOM-based particles are limited
          renderCalls: fps > 30 ? 50 : 80, // More DOM manipulations
          triangles: 200 // Minimal 3D
        }

        const newMetrics: PerformanceMetrics = {
          fps,
          frameTime: avgFrameTime,
          memoryUsage,
          ...estimatedMetrics
        }

        setMetrics(newMetrics)
        onMetricsChange?.(newMetrics)

        frameCountRef.current = 0
        lastTimeRef.current = now
      }

      if (isActive) {
        requestAnimationFrame(measurePerformance)
      }
    }

    measurePerformance()
  }, [isActive, renderMode, capabilities, onMetricsChange])

  // Calculate performance grade
  const getPerformanceGrade = () => {
    const { fps, frameTime } = metrics
    
    if (fps >= 58 && frameTime <= 17) return { grade: 'A+', color: 'text-green-400' }
    if (fps >= 50 && frameTime <= 20) return { grade: 'A', color: 'text-green-300' }
    if (fps >= 40 && frameTime <= 25) return { grade: 'B', color: 'text-yellow-400' }
    if (fps >= 30 && frameTime <= 33) return { grade: 'C', color: 'text-orange-400' }
    return { grade: 'D', color: 'text-red-400' }
  }

  // Calculate FPS stability
  const getFPSStability = () => {
    if (fpsHistoryRef.current.length < 10) return 'Measuring...'
    
    const avg = fpsHistoryRef.current.reduce((a, b) => a + b, 0) / fpsHistoryRef.current.length
    const variance = fpsHistoryRef.current.reduce((sum, fps) => sum + Math.pow(fps - avg, 2), 0) / fpsHistoryRef.current.length
    const stdDev = Math.sqrt(variance)
    
    if (stdDev <= 3) return 'Excellent'
    if (stdDev <= 5) return 'Good'
    if (stdDev <= 8) return 'Fair'
    return 'Poor'
  }

  const performanceGrade = getPerformanceGrade()
  const fpsStability = getFPSStability()

  if (!isActive) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: -300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -300 }}
      className="fixed top-4 left-4 bg-black/90 text-white rounded-lg border border-gray-600 z-50"
    >
      {/* Compact View */}
      <div className="p-3">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className={`text-lg font-bold ${performanceGrade.color}`}>
              {performanceGrade.grade}
            </div>
            <div className="text-sm text-gray-400">
              {renderMode.toUpperCase()}
            </div>
          </div>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
          >
            {showDetails ? 'Hide' : 'Details'}
          </button>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className={`font-bold ${
              metrics.fps >= 50 ? 'text-green-400' : 
              metrics.fps >= 30 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {metrics.fps}
            </span>
            <span className="text-gray-400 ml-1">FPS</span>
          </div>
          
          <div>
            <span className="text-cyan-400 font-bold">
              {metrics.memoryUsage}MB
            </span>
            <span className="text-gray-400 ml-1">RAM</span>
          </div>

          <div>
            <span className="text-purple-400 font-bold">
              {metrics.particleCount}
            </span>
            <span className="text-gray-400 ml-1">Particles</span>
          </div>
        </div>
      </div>

      {/* Detailed View */}
      {showDetails && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-gray-700 p-3"
        >
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-400 mb-1">Performance</div>
              <div>Frame Time: <span className="text-orange-300">{metrics.frameTime.toFixed(1)}ms</span></div>
              <div>Stability: <span className="text-blue-300">{fpsStability}</span></div>
              <div>Grade: <span className={performanceGrade.color}>{performanceGrade.grade}</span></div>
            </div>
            
            <div>
              <div className="text-gray-400 mb-1">Rendering</div>
              <div>Calls: <span className="text-green-300">{metrics.renderCalls}</span></div>
              <div>Triangles: <span className="text-yellow-300">{metrics.triangles.toLocaleString()}</span></div>
              <div>Mode: <span className="text-purple-300">{renderMode}</span></div>
            </div>
          </div>

          {/* FPS History Graph */}
          <div className="mt-3">
            <div className="text-gray-400 text-xs mb-1">FPS History (60s)</div>
            <div className="flex items-end gap-1 h-8">
              {fpsHistoryRef.current.slice(-30).map((fps, i) => (
                <div
                  key={i}
                  className={`w-1 ${
                    fps >= 50 ? 'bg-green-400' :
                    fps >= 30 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ 
                    height: `${Math.max(2, (fps / 60) * 32)}px`,
                    opacity: 0.7 + (i / 30) * 0.3
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0</span>
              <span>60 FPS</span>
            </div>
          </div>

          {/* Performance Tips */}
          <div className="mt-3 text-xs text-gray-400">
            {renderMode === 'webgl' ? (
              <div>💡 WebGL: {metrics.fps >= 50 ? 'Optimal performance!' : 'Try reducing particle count'}</div>
            ) : (
              <div>💡 Standard: {metrics.fps >= 30 ? 'Good DOM performance' : 'Consider WebGL upgrade'}</div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

export default WebGLPerformanceMonitor 