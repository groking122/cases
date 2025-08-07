"use client"

import { useState, useRef, useEffect } from 'react'
import { motion, useDragControls, PanInfo } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import Confetti from 'react-confetti'
import { RARITY_CONFIG } from '@/lib/symbols'
import SymbolRenderer from './SymbolRenderer'

interface ItemInspectorProps {
  item: {
    id: string
    name: string
    rarity: string
    value: number
    emoji: string
    description?: string
    collection?: string
  }
  isVisible: boolean
  onClose: () => void
}

// 3D Item Display Component
function Item3D({ emoji, rarity }: { emoji: string, rarity: string }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [rotation, setRotation] = useState({ x: 0, y: 0 })

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x = rotation.x
      meshRef.current.rotation.y = rotation.y
    }
  })

  const getRarityGlow = (rarity: string) => {
    const intensities = {
      'common': 0.5,
      'uncommon': 0.8,
      'rare': 1.2,
      'epic': 1.8,
      'legendary': 2.5
    }
    return intensities[rarity as keyof typeof intensities] || 0.5
  }

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight 
        position={[5, 5, 5]} 
        intensity={getRarityGlow(rarity)} 
        color={RARITY_CONFIG[rarity as keyof typeof RARITY_CONFIG]?.glow || '#ffffff'}
      />
      <mesh ref={meshRef}>
        <planeGeometry args={[3, 3]} />
        <meshStandardMaterial 
          transparent
          opacity={0.9}
          emissive={RARITY_CONFIG[rarity as keyof typeof RARITY_CONFIG]?.glow || '#000000'}
          emissiveIntensity={0.2}
        />
        <Text
          position={[0, 0, 0.1]}
          fontSize={2}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {emoji}
        </Text>
      </mesh>
    </>
  )
}

// Rarity-specific particle effects
function RarityEffects({ rarity }: { rarity: string }) {
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (rarity === 'epic' || rarity === 'legendary') {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 5000)
    }
  }, [rarity])

  return (
    <>
      {rarity === 'legendary' && showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
          gravity={0.1}
          colors={['#FFD700', '#FFA500', '#FFFF00', '#FF8C00']}
        />
      )}
      
      {rarity === 'epic' && (
        <motion.div
          className="absolute inset-0 bg-purple-500/10"
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      
      {rarity === 'legendary' && (
        <motion.div
          className="absolute inset-0 bg-gradient-radial from-yellow-400/20 to-transparent"
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.6, 0.3] 
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}
    </>
  )
}

export function CSGOItemInspector({ item, isVisible, onClose }: ItemInspectorProps) {
  const controls = useDragControls()
  const [rotation, setRotation] = useState({ x: 0, y: 0 })
  const rarityConfig = RARITY_CONFIG[item.rarity as keyof typeof RARITY_CONFIG]

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setRotation(prev => ({
      x: prev.x + info.delta.y * 0.01,
      y: prev.y + info.delta.x * 0.01
    }))
  }

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <RarityEffects rarity={item.rarity} />
      
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative max-w-4xl w-full bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border-2 border-gray-600 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 bg-gradient-to-r ${rarityConfig?.gradient || 'from-gray-700 to-gray-800'} border-b border-gray-600`}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">{item.name}</h2>
              <div className="flex items-center gap-4">
                <span className={`px-4 py-2 rounded-full bg-gradient-to-r ${rarityConfig?.gradient} text-white font-bold text-lg`}>
                  {item.rarity.toUpperCase()}
                </span>
                <span className="text-yellow-300 font-bold text-xl">
                  💰 {item.value} Credits
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 text-3xl font-bold w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* 3D Item Display */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">🔍 Item Inspection</h3>
            
            <motion.div
              drag
              dragControls={controls}
              dragElastic={0.05}
              dragMomentum={false}
              onDrag={handleDrag}
              whileHover={{ scale: 1.02 }}
              className="relative h-80 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border-2 border-gray-600 cursor-grab active:cursor-grabbing overflow-hidden"
            >
              {/* Rarity glow background */}
              <motion.div
                className={`absolute inset-0 bg-gradient-to-br ${rarityConfig?.gradient} opacity-10`}
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />

                             {/* 3D Canvas */}
               <Canvas camera={{ position: [0, 0, 5] }}>
                 <Item3D emoji={item.emoji} rarity={item.rarity} />
               </Canvas>

              {/* Inspection overlay */}
              <div className="absolute bottom-4 left-4 text-gray-300 text-sm">
                🖱️ Drag to rotate • 🔍 Inspect item
              </div>

              {/* Shimmer effect for high rarities */}
              {(item.rarity === 'epic' || item.rarity === 'legendary') && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{
                    x: [-300, 300],
                    opacity: [0, 1, 0]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: Math.random() * 2
                  }}
                />
              )}
            </motion.div>

                         {/* Item display */}
             <div className="text-center">
               <SymbolRenderer
                 symbol={{
                   id: item.id,
                   name: item.name,
                   emoji: item.emoji,
                   imageUrl: null, // Using emoji for now in inspector
                   rarity: item.rarity
                 }}
                 size={200}
                 className="mb-4"
               />
             </div>
          </div>

          {/* Item Information */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">📋 Item Details</h3>

            <div className="space-y-4">
              {/* Basic Info */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <h4 className="text-lg font-semibold text-white mb-3">Basic Information</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Name:</span>
                    <span className="text-white font-medium">{item.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rarity:</span>
                    <span className={`font-bold ${rarityConfig?.textColor || 'text-white'}`}>
                      {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Value:</span>
                    <span className="text-yellow-400 font-bold">{item.value} Credits</span>
                  </div>
                  {item.collection && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Collection:</span>
                      <span className="text-white">{item.collection}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {item.description && (
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <h4 className="text-lg font-semibold text-white mb-3">Description</h4>
                  <p className="text-gray-300 leading-relaxed">{item.description}</p>
                </div>
              )}

              {/* Market Info */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <h4 className="text-lg font-semibold text-white mb-3">Market Information</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Market Value:</span>
                    <span className="text-green-400 font-bold">{item.value} Credits</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tradeable:</span>
                    <span className="text-green-400">✅ Yes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Marketable:</span>
                    <span className="text-green-400">✅ Yes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-lg transition-all"
              >
                🏪 View in Market
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-6 rounded-lg transition-all"
              >
                💰 Sell Item
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
} 