"use client"

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import * as THREE from 'three'

// Import our custom shaders
const rarityBloomVertex = `
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

void main() {
  vUv = uv;
  vPosition = position;
  vNormal = normalize(normalMatrix * normal);
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const rarityBloomFragment = `
uniform float uTime;
uniform float uRarityIntensity;
uniform vec3 uRarityColor;
uniform float uBloomStrength;
uniform vec2 uResolution;

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

vec3 calculateBloom(vec2 uv, float intensity, vec3 color) {
  vec3 bloom = vec3(0.0);
  
  float samples = 12.0;
  float radius = 0.01 * intensity;
  
  for(float i = 0.0; i < samples; i++) {
    float angle = (i / samples) * 6.28318;
    vec2 offset = vec2(cos(angle), sin(angle)) * radius;
    
    float falloff = 1.0 - (length(offset) / radius);
    bloom += color * falloff * intensity * 0.1;
  }
  
  return bloom;
}

float getPulseIntensity(float time, float rarity) {
  float baseFreq = 2.0;
  float pulseFreq = baseFreq + (rarity * 4.0);
  
  return 0.5 + 0.5 * sin(time * pulseFreq);
}

vec3 createGlow(vec2 center, vec2 uv, vec3 color, float intensity, float size) {
  float dist = length(uv - center);
  float glow = exp(-dist * (10.0 / size)) * intensity;
  
  return color * glow;
}

void main() {
  vec2 center = vec2(0.5, 0.5);
  
  vec3 baseColor = uRarityColor;
  
  float pulseIntensity = getPulseIntensity(uTime, uRarityIntensity);
  
  vec3 bloom = calculateBloom(vUv, uRarityIntensity * pulseIntensity, uRarityColor);
  vec3 centralGlow = createGlow(center, vUv, uRarityColor, uRarityIntensity * 0.8, 0.5);
  
  vec3 rimGlow = vec3(0.0);
  if(uRarityIntensity > 0.8) {
    float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
    rimGlow = uRarityColor * rim * rim * pulseIntensity * 0.5;
  }
  
  vec3 finalColor = baseColor + bloom + centralGlow + rimGlow;
  
  finalColor = finalColor / (finalColor + 1.0);
  finalColor = pow(finalColor, vec3(1.0/2.2));
  
  gl_FragColor = vec4(finalColor, 1.0);
}
`

// Create the shader material
const RarityBloomMaterialImpl = shaderMaterial(
  // Uniforms
  {
    uTime: 0,
    uRarityIntensity: 0.0,
    uRarityColor: new THREE.Color('#ffffff'),
    uBloomStrength: 1.0,
    uResolution: new THREE.Vector2(1024, 1024)
  },
  // Vertex shader
  rarityBloomVertex,
  // Fragment shader
  rarityBloomFragment
)

// Extend the material for use in JSX
extend({ RarityBloomMaterialImpl })

// TypeScript declaration
declare module '@react-three/fiber' {
  interface ThreeElements {
    rarityBloomMaterialImpl: any
  }
}

// Rarity color mapping for professional casino look
const RARITY_COLORS: Record<string, THREE.Color> = {
  common: new THREE.Color('#9CA3AF'),
  uncommon: new THREE.Color('#10B981'),
  rare: new THREE.Color('#3B82F6'),
  epic: new THREE.Color('#8B5CF6'),
  legendary: new THREE.Color('#F59E0B')
}

// Rarity intensity mapping
const RARITY_INTENSITY: Record<string, number> = {
  common: 0.1,
  uncommon: 0.3,
  rare: 0.5,
  epic: 0.7,
  legendary: 1.0
}

interface RarityBloomMaterialProps {
  rarity?: string
  intensity?: number
  bloomStrength?: number
}

export const RarityBloomMaterial = ({ 
  rarity = 'common',
  intensity,
  bloomStrength = 1.0
}: RarityBloomMaterialProps) => {
  const materialRef = useRef<any>()

  // Get rarity-based settings
  const rarityColor = RARITY_COLORS[rarity] || RARITY_COLORS.common
  const rarityIntensity = intensity ?? RARITY_INTENSITY[rarity] ?? 0.1

  // Animate the shader uniforms
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.getElapsedTime()
      materialRef.current.uRarityColor = rarityColor
      materialRef.current.uRarityIntensity = rarityIntensity
      materialRef.current.uBloomStrength = bloomStrength
    }
  })

  return (
    <rarityBloomMaterialImpl
      ref={materialRef}
      transparent
      side={THREE.DoubleSide}
    />
  )
}

// Particle Bloom Material for GPU particles
const particleBloomVertex = `
attribute float aSize;
attribute vec3 aColor;
attribute float aOpacity;

uniform float uTime;
uniform float uPixelRatio;

varying vec3 vColor;
varying float vOpacity;

void main() {
  vColor = aColor;
  vOpacity = aOpacity;
  
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  
  gl_PointSize = aSize * uPixelRatio * (300.0 / -mvPosition.z);
  
  gl_Position = projectionMatrix * mvPosition;
}
`

const particleBloomFragment = `
uniform float uTime;

varying vec3 vColor;
varying float vOpacity;

void main() {
  vec2 center = vec2(0.5, 0.5);
  float dist = length(gl_PointCoord - center);
  
  float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
  float bloom = exp(-dist * 4.0) * 0.5;
  float pulse = 0.8 + 0.2 * sin(uTime * 3.0);
  
  vec3 finalColor = vColor * (1.0 + bloom) * pulse;
  float finalAlpha = alpha * vOpacity;
  
  gl_FragColor = vec4(finalColor, finalAlpha);
}
`

const ParticleBloomMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uPixelRatio: 1
  },
  particleBloomVertex,
  particleBloomFragment
)

extend({ ParticleBloomMaterialImpl })

declare module '@react-three/fiber' {
  interface ThreeElements {
    particleBloomMaterialImpl: any
  }
}

interface ParticleBloomMaterialProps {
  pixelRatio?: number
}

export const ParticleBloomMaterial = ({ 
  pixelRatio = 1 
}: ParticleBloomMaterialProps) => {
  const materialRef = useRef<any>()

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.getElapsedTime()
      materialRef.current.uPixelRatio = pixelRatio
    }
  })

  return (
    <particleBloomMaterialImpl
      ref={materialRef}
      transparent
      depthWrite={false}
      blending={THREE.AdditiveBlending}
    />
  )
}

export { RarityBloomMaterialImpl, ParticleBloomMaterialImpl } 