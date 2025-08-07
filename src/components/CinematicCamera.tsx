"use client"

import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { gsap } from 'gsap'
import * as THREE from 'three'

interface CinematicCameraProps {
  stage: string
  rarity: string
  isActive: boolean
  targetPosition?: THREE.Vector3
}

// Professional camera sequences for different rarities
export const CinematicCamera = ({ 
  stage, 
  rarity, 
  isActive,
  targetPosition 
}: CinematicCameraProps) => {
  const { camera, controls } = useThree()
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const originalPosition = useRef<THREE.Vector3>(new THREE.Vector3(0, 2, 8))
  const originalTarget = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0))

  // Store original camera settings
  useEffect(() => {
    if (camera.position) {
      originalPosition.current.copy(camera.position)
    }
  }, [camera])

  // Cinematic sequences based on rarity
  useEffect(() => {
    if (!isActive || stage !== 'revealing') return

    // Kill any existing timeline
    if (timelineRef.current) {
      timelineRef.current.kill()
    }

    const timeline = gsap.timeline()
    timelineRef.current = timeline

    // Different sequences for different rarities
    switch (rarity) {
      case 'legendary':
        // Epic legendary sequence: zoom out, orbit, zoom in
        timeline
          .to(camera.position, { 
            x: 4, y: 6, z: 8, 
            duration: 2, 
            ease: "power2.inOut" 
          })
          .to(camera.position, { 
            x: -2, z: 6, 
            duration: 3, 
            ease: "sine.inOut",
            onUpdate: () => camera.lookAt(0, 1, 0)
          })
          .to(camera.position, { 
            x: 1, y: 2, z: 4, 
            duration: 2, 
            ease: "power2.out",
            onUpdate: () => camera.lookAt(0, 1, 0)
          })
        break

      case 'epic':
        // Dramatic zoom and tilt
        timeline
          .to(camera.position, { 
            y: 4, z: 6, 
            duration: 1.5, 
            ease: "power2.inOut",
            onUpdate: () => camera.lookAt(0, 1, 0)
          })
          .to(camera.rotation, {
            z: 0.1,
            duration: 0.5,
            yoyo: true,
            repeat: 1,
            ease: "sine.inOut"
          }, "-=0.5")
          .to(camera.position, { 
            x: 2, y: 3, z: 5, 
            duration: 1.5, 
            ease: "power1.out",
            onUpdate: () => camera.lookAt(0, 1, 0)
          })
        break

      case 'rare':
        // Smooth approach
        timeline
          .to(camera.position, { 
            x: 1, y: 3, z: 6, 
            duration: 2, 
            ease: "power1.inOut",
            onUpdate: () => camera.lookAt(0, 0.5, 0)
          })
        break

      default:
        // Subtle movement for common/uncommon
        timeline
          .to(camera.position, { 
            y: 2.5, z: 7, 
            duration: 1, 
            ease: "power1.inOut",
            onUpdate: () => camera.lookAt(0, 0, 0)
          })
    }

    // Auto-reset after sequence
    timeline.call(() => {
      setTimeout(() => {
        resetCamera()
      }, 3000)
    })

    return () => {
      timeline.kill()
    }
  }, [stage, rarity, isActive, camera])

  // Reset camera to original position
  const resetCamera = () => {
    if (timelineRef.current) {
      timelineRef.current.kill()
    }

    const resetTimeline = gsap.timeline()
    timelineRef.current = resetTimeline

    resetTimeline
      .to(camera.position, {
        x: originalPosition.current.x,
        y: originalPosition.current.y,
        z: originalPosition.current.z,
        duration: 2,
        ease: "power2.inOut",
        onUpdate: () => camera.lookAt(originalTarget.current)
      })
      .to(camera.rotation, {
        x: 0, y: 0, z: 0,
        duration: 1,
        ease: "power1.out"
      }, "-=1")
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill()
      }
    }
  }, [])

  return null // This component only controls camera, no visual output
}

// Hook for easier camera control
export const useCinematicCamera = () => {
  const { camera } = useThree()
  const timelineRef = useRef<gsap.core.Timeline | null>(null)

  const startSequence = (rarity: string, customSequence?: (camera: THREE.Camera) => gsap.core.Timeline) => {
    // Kill existing timeline
    if (timelineRef.current) {
      timelineRef.current.kill()
    }

    if (customSequence) {
      timelineRef.current = customSequence(camera)
    } else {
      // Default sequences
      const timeline = gsap.timeline()
      timelineRef.current = timeline

      switch (rarity) {
        case 'legendary':
          timeline
            .to(camera.position, { x: 3, y: 4, z: 6, duration: 2 })
            .to(camera.position, { x: -1, z: 5, duration: 2 }, "-=0.5")
          break
        case 'epic':
          timeline.to(camera.position, { y: 3, z: 5, duration: 1.5 })
          break
        default:
          timeline.to(camera.position, { y: 2.5, duration: 1 })
      }
    }

    return timelineRef.current
  }

  const resetCamera = (originalPos = new THREE.Vector3(0, 2, 8), duration = 2) => {
    if (timelineRef.current) {
      timelineRef.current.kill()
    }

    const timeline = gsap.timeline()
    timelineRef.current = timeline

    timeline.to(camera.position, {
      x: originalPos.x,
      y: originalPos.y,
      z: originalPos.z,
      duration,
      ease: "power2.inOut"
    })

    return timeline
  }

  const cleanup = () => {
    if (timelineRef.current) {
      timelineRef.current.kill()
      timelineRef.current = null
    }
  }

  return {
    startSequence,
    resetCamera,
    cleanup,
    isActive: !!timelineRef.current
  }
}

export default CinematicCamera 