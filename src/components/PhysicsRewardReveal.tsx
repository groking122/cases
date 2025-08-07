"use client"

import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { Float, Text, MeshDistortMaterial } from '@react-three/drei'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { SYMBOL_CONFIG } from '@/lib/symbols'
import { RarityBloomMaterial } from './RarityBloomMaterial'

interface PhysicsRewardRevealProps {
  symbol: any
  rarity: string
  isActive: boolean
  onComplete?: () => void
}

// Physics-based bouncing floor (moved to main WebGL component to avoid context issues)

// Physics-based reward item that falls and bounces
const PhysicsRewardItem = ({ 
  symbol, 
  rarity, 
  isActive,
  onComplete 
}: PhysicsRewardRevealProps) => {
  const rigidBodyRef = useRef<any>()
  const meshRef = useRef<THREE.Mesh>(null!)
  const [hasLanded, setHasLanded] = useState(false)
  const [bounceCount, setBounceCount] = useState(0)
  // Rarity-based physics properties
  const physicsProps = {
    common: { mass: 1, restitution: 0.6, size: 0.8 },
    uncommon: { mass: 1.2, restitution: 0.7, size: 1.0 },
    rare: { mass: 1.5, restitution: 0.8, size: 1.2 },
    epic: { mass: 2.0, restitution: 0.9, size: 1.4 },
    legendary: { mass: 2.5, restitution: 1.0, size: 1.6 }
  }

  const props = physicsProps[rarity as keyof typeof physicsProps] || physicsProps.common

  // Handle collision events
  useEffect(() => {
    if (rigidBodyRef.current && isActive) {
      const handleCollision = () => {
        setBounceCount(prev => {
          const newCount = prev + 1
          if (newCount >= 3 && !hasLanded) {
            setHasLanded(true)
            setTimeout(() => onComplete?.(), 1000) // Complete after settling
          }
          return newCount
        })
      }
      
      // Note: Rapier collision events work differently in React Three Rapier
      // This is handled through the RigidBody component props instead
    }
  }, [isActive, hasLanded, onComplete])

  // Animate the mesh while physics handles position
  useFrame((state, delta) => {
    if (meshRef.current && isActive) {
      const time = state.clock.getElapsedTime()
      
      // Floating rotation animation
      if (hasLanded) {
        meshRef.current.rotation.y = time * 0.5
        meshRef.current.rotation.x = Math.sin(time * 2) * 0.1
      } else {
        // Spinning while falling
        meshRef.current.rotation.y = time * 3
        meshRef.current.rotation.x = time * 2
      }
    }
  })

  // Cinematic camera focus is handled by the CinematicCamera component

  if (!isActive) return null

  return (
    <>
      {/* Physics Reward Item */}
      <RigidBody
        ref={rigidBodyRef}
        position={[0, 8, 0]} // Start high up
        mass={props.mass}
        restitution={props.restitution}
        friction={0.2}
        gravityScale={1.2} // Slightly faster fall
        canSleep={false} // Keep physics active
      >
        <mesh ref={meshRef} castShadow scale={props.size}>
          {/* Use different geometries based on rarity */}
          {rarity === 'legendary' ? (
            <dodecahedronGeometry args={[1, 2]} />
          ) : rarity === 'epic' ? (
            <icosahedronGeometry args={[1, 1]} />
          ) : (
            <boxGeometry args={[1, 1, 1]} />
          )}
          
          {/* Professional bloom material */}
          <RarityBloomMaterial 
            rarity={rarity}
            intensity={hasLanded ? 1.0 : 0.5}
            bloomStrength={hasLanded ? 2.0 : 1.0}
          />
        </mesh>
        
        {/* Collision shape */}
        <CuboidCollider args={[props.size * 0.5, props.size * 0.5, props.size * 0.5]} />
      </RigidBody>

      {/* Floating reward text */}
      {hasLanded && (
        <Float speed={2} rotationIntensity={0.3} floatIntensity={0.5}>
          <Text
            position={[0, 3, 0]}
            fontSize={0.6}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            {symbol?.name || 'Unknown Reward'}
          </Text>
          
          {/* Value display */}
          <Text
            position={[0, 2.2, 0]}
            fontSize={0.4}
            color="#F59E0B"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.03}
            outlineColor="#000000"
          >
            💰 +{symbol?.value || 0} Credits
          </Text>
        </Float>
      )}

      {/* Legendary celebration effects */}
      {hasLanded && rarity === 'legendary' && (
        <>
          {/* Golden particle explosion */}
          {Array.from({ length: 20 }).map((_, i) => (
            <RigidBody
              key={i}
              position={[
                Math.random() * 4 - 2,
                2 + Math.random() * 2,
                Math.random() * 4 - 2
              ]}
              mass={0.1}
              restitution={0.8}
            >
              <mesh>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshStandardMaterial 
                  color="#F59E0B" 
                  emissive="#F59E0B"
                  emissiveIntensity={0.5}
                />
              </mesh>
              <CuboidCollider args={[0.1, 0.1, 0.1]} />
            </RigidBody>
          ))}
          
          {/* Celebration text */}
          <Text
            position={[0, 4.5, 0]}
            fontSize={0.8}
            color="#F59E0B"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.1}
            outlineColor="#000000"
          >
            🎉 LEGENDARY! 🎉
          </Text>
        </>
      )}
    </>
  )
}

export default PhysicsRewardItem
export { PhysicsRewardItem } 