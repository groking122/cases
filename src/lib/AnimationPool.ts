/**
 * Casino-Grade Animation Resource Pool
 * Inspired by high-performance gambling platforms like Aviator
 * Recycles animation objects to prevent memory leaks and maintain 60fps
 */

interface Particle {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  opacity: number
  life: number
  maxLife: number
  reset(): void
  update(): boolean
  destroy(): void
}

interface AnimationMesh {
  id: string
  element: HTMLElement | null
  isActive: boolean
  reset(): void
  destroy(): void
}

interface TextureCache {
  [key: string]: HTMLImageElement | ImageBitmap
}

class ParticleObject implements Particle {
  id: string
  x = 0
  y = 0
  vx = 0
  vy = 0
  size = 1
  color = '#ffffff'
  opacity = 1
  life = 0
  maxLife = 1000

  constructor(id: string) {
    this.id = id
  }

  reset() {
    this.x = 0
    this.y = 0
    this.vx = 0
    this.vy = 0
    this.size = 1
    this.color = '#ffffff'
    this.opacity = 1
    this.life = 0
    this.maxLife = 1000
  }

  update(): boolean {
    this.life += 16 // ~60fps
    this.x += this.vx
    this.y += this.vy
    this.opacity = Math.max(0, 1 - (this.life / this.maxLife))
    
    return this.life < this.maxLife
  }

  destroy() {
    // Cleanup any DOM references
    this.reset()
  }
}

class MeshObject implements AnimationMesh {
  id: string
  element: HTMLElement | null = null
  isActive = false

  constructor(id: string) {
    this.id = id
  }

  reset() {
    if (this.element) {
      this.element.style.transform = ''
      this.element.style.opacity = '1'
      this.element.style.visibility = 'hidden'
    }
    this.isActive = false
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element)
    }
    this.element = null
    this.isActive = false
  }
}

export class AnimationPool {
  private static particles: Particle[] = []
  private static meshes: AnimationMesh[] = []
  private static textureCache: TextureCache = {}
  private static soundCache: { [key: string]: HTMLAudioElement } = {}
  private static maxPoolSize = 500
  private static stats = {
    particlesCreated: 0,
    particlesReused: 0,
    meshesCreated: 0,
    meshesReused: 0,
    texturesCached: 0
  }

  // Particle Management
  static acquireParticle(): Particle {
    if (this.particles.length > 0) {
      const particle = this.particles.pop()!
      particle.reset()
      this.stats.particlesReused++
      return particle
    }
    
    const newParticle = new ParticleObject(`particle_${this.stats.particlesCreated}`)
    this.stats.particlesCreated++
    return newParticle
  }

  static releaseParticle(particle: Particle) {
    if (this.particles.length < this.maxPoolSize) {
      particle.reset()
      this.particles.push(particle)
    } else {
      particle.destroy()
    }
  }

  static acquireParticles(count: number): Particle[] {
    const particles: Particle[] = []
    for (let i = 0; i < count; i++) {
      particles.push(this.acquireParticle())
    }
    return particles
  }

  static releaseParticles(particles: Particle[]) {
    particles.forEach(particle => this.releaseParticle(particle))
  }

  // Mesh Management
  static acquireMesh(): AnimationMesh {
    if (this.meshes.length > 0) {
      const mesh = this.meshes.pop()!
      mesh.reset()
      this.stats.meshesReused++
      return mesh
    }
    
    const newMesh = new MeshObject(`mesh_${this.stats.meshesCreated}`)
    this.stats.meshesCreated++
    return newMesh
  }

  static releaseMesh(mesh: AnimationMesh) {
    if (this.meshes.length < this.maxPoolSize) {
      mesh.reset()
      this.meshes.push(mesh)
    } else {
      mesh.destroy()
    }
  }

  // Texture Management
  static async acquireTexture(key: string, src: string): Promise<HTMLImageElement | ImageBitmap> {
    if (this.textureCache[key]) {
      return this.textureCache[key]
    }

    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      return new Promise((resolve, reject) => {
        img.onload = async () => {
          try {
            // Use ImageBitmap for better performance if supported
            if ('createImageBitmap' in window) {
              const bitmap = await createImageBitmap(img)
              this.textureCache[key] = bitmap
              this.stats.texturesCached++
              resolve(bitmap)
            } else {
              this.textureCache[key] = img
              this.stats.texturesCached++
              resolve(img)
            }
          } catch (error) {
            this.textureCache[key] = img
            this.stats.texturesCached++
            resolve(img)
          }
        }
        
        img.onerror = reject
        img.src = src
      })
    } catch (error) {
      console.warn('Failed to load texture:', key, error)
      throw error
    }
  }

  static releaseTexture(key: string) {
    if (this.textureCache[key]) {
      const texture = this.textureCache[key]
      if (texture instanceof ImageBitmap) {
        texture.close()
      }
      delete this.textureCache[key]
    }
  }

  // Sound Management
  static async acquireSound(key: string, src: string): Promise<HTMLAudioElement> {
    if (this.soundCache[key]) {
      const sound = this.soundCache[key].cloneNode() as HTMLAudioElement
      sound.currentTime = 0
      return sound
    }

    const audio = new Audio(src)
    audio.preload = 'auto'
    
    return new Promise((resolve, reject) => {
      audio.oncanplaythrough = () => {
        this.soundCache[key] = audio
        const cloned = audio.cloneNode() as HTMLAudioElement
        resolve(cloned)
      }
      
      audio.onerror = reject
      audio.load()
    })
  }

  // Performance Monitoring
  static getStats() {
    return {
      ...this.stats,
      activeParticles: this.maxPoolSize - this.particles.length,
      activeMeshes: this.maxPoolSize - this.meshes.length,
      cachedTextures: Object.keys(this.textureCache).length,
      cachedSounds: Object.keys(this.soundCache).length,
      poolEfficiency: {
        particles: this.stats.particlesReused / Math.max(1, this.stats.particlesCreated),
        meshes: this.stats.meshesReused / Math.max(1, this.stats.meshesCreated)
      }
    }
  }

  // Memory Management
  static cleanup() {
    console.log('🧹 Cleaning animation pool...')
    
    // Release all particles
    this.particles.forEach(particle => particle.destroy())
    this.particles = []
    
    // Release all meshes
    this.meshes.forEach(mesh => mesh.destroy())
    this.meshes = []
    
    // Release all textures
    Object.keys(this.textureCache).forEach(key => {
      this.releaseTexture(key)
    })
    
    // Release all sounds
    Object.values(this.soundCache).forEach(audio => {
      audio.pause()
      audio.src = ''
    })
    this.soundCache = {}
    
    console.log('✅ Animation pool cleaned')
  }

  static forceGarbageCollection() {
    // Aggressive cleanup for low memory situations
    const keepParticles = Math.floor(this.particles.length * 0.3)
    const keepMeshes = Math.floor(this.meshes.length * 0.3)
    
    this.particles.splice(keepParticles).forEach(p => p.destroy())
    this.meshes.splice(keepMeshes).forEach(m => m.destroy())
    
    console.log(`🗑️ Forced GC: kept ${keepParticles} particles, ${keepMeshes} meshes`)
  }

  // Quality Settings Based on Performance
  static getOptimalSettings(deviceInfo: {
    hardwareConcurrency: number
    deviceMemory: number
    isMobile: boolean
    thermalState?: string
  }) {
    const { hardwareConcurrency, deviceMemory, isMobile, thermalState } = deviceInfo
    
    let quality: 'low' | 'medium' | 'high' = 'medium'
    
    if (isMobile || hardwareConcurrency < 4 || deviceMemory < 4) {
      quality = 'low'
    } else if (hardwareConcurrency >= 8 && deviceMemory >= 8) {
      quality = 'high'
    }
    
    // Thermal throttling
    if (thermalState === 'serious' || thermalState === 'critical') {
      quality = 'low'
    }
    
    const settings = {
      low: {
        maxParticles: 100,
        particleLifetime: 800,
        textureQuality: 512,
        enableComplexShaders: false,
        enablePostProcessing: false,
        targetFPS: 30
      },
      medium: {
        maxParticles: 300,
        particleLifetime: 1200,
        textureQuality: 1024,
        enableComplexShaders: true,
        enablePostProcessing: false,
        targetFPS: 60
      },
      high: {
        maxParticles: 500,
        particleLifetime: 1500,
        textureQuality: 2048,
        enableComplexShaders: true,
        enablePostProcessing: true,
        targetFPS: 60
      }
    }
    
    return {
      quality,
      ...settings[quality]
    }
  }
}

// Singleton cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    AnimationPool.cleanup()
  })
  
  // Monitor memory pressure
  window.addEventListener('memory', () => {
    AnimationPool.forceGarbageCollection()
  })
} 