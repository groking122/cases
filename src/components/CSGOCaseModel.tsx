"use client"

import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Box } from '@react-three/drei'
import { motion } from 'framer-motion'
import * as THREE from 'three'

interface CaseModelProps {
  isOpening?: boolean
  rarity?: string
  onClick?: () => void
}

function CaseGeometry({ isOpening, rarity, onClick }: CaseModelProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  // Rotation animation
  useFrame((state) => {
    if (meshRef.current) {
      if (isOpening) {
        // Fast spinning when opening
        meshRef.current.rotation.y += 0.1
        meshRef.current.rotation.x += 0.05
      } else if (hovered) {
        // Gentle rotation on hover
        meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime) * 0.3
        meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.8) * 0.1
      } else {
        // Idle floating animation
        meshRef.current.rotation.y += 0.01
        meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1
      }
    }
  })

  // Rarity-based colors
  const getRarityColor = (rarity: string) => {
    const colors = {
      'common': '#9CA3AF',
      'uncommon': '#10B981', 
      'rare': '#3B82F6',
      'epic': '#9333EA',
      'legendary': '#FFD700'
    }
    return colors[rarity as keyof typeof colors] || colors.common
  }

  const rarityColor = getRarityColor(rarity || 'common')

  return (
    <mesh
      ref={meshRef}
      onClick={onClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      scale={hovered ? 1.1 : 1}
    >
      {/* Main case body */}
      <boxGeometry args={[2, 1.2, 0.8]} />
      <meshStandardMaterial 
        color={rarityColor}
        metalness={0.8}
        roughness={0.2}
        envMapIntensity={1}
      />
      
      {/* Case lid */}
      <mesh position={[0, 0.7, 0]} rotation={isOpening ? [Math.PI * 0.3, 0, 0] : [0, 0, 0]}>
        <boxGeometry args={[2.1, 0.2, 0.9]} />
        <meshStandardMaterial 
          color={new THREE.Color(rarityColor).multiplyScalar(1.2)}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Glowing edges for higher rarities */}
      {(rarity === 'epic' || rarity === 'legendary') && (
        <mesh>
          <boxGeometry args={[2.2, 1.4, 1]} />
          <meshBasicMaterial 
            color={rarityColor}
            transparent
            opacity={0.3}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </mesh>
  )
}

export function CSGOCaseModel({ isOpening, rarity, onClick }: CaseModelProps) {
  return (
    <div className="w-full h-80 relative">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        {/* Lighting setup */}
        <ambientLight intensity={0.4} />
        <spotLight 
          position={[10, 10, 10]} 
          angle={0.3} 
          penumbra={1} 
          intensity={2}
          castShadow
        />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        {/* Additional lighting for realistic reflections */}
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <directionalLight position={[-5, -5, -5]} intensity={0.3} />
        
        {/* The case model */}
        <CaseGeometry 
          isOpening={isOpening} 
          rarity={rarity} 
          onClick={onClick}
        />
      </Canvas>

      {/* Overlay effects */}
      {isOpening && (
        <motion.div
          className="absolute inset-0 bg-gradient-radial from-yellow-400/20 to-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </div>
  )
} 