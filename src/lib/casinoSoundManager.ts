/**
 * Casino-Grade Sound Manager
 * Professional audio system for case opening animations
 */

export type SoundEffect = 
  | 'anticipation'
  | 'nearMiss' 
  | 'resolution'
  | 'revealHold'
  | 'celebration'
  | 'claim'
  | 'hover'
  | 'click'

export interface SoundConfig {
  volume: number
  loop?: boolean
  fadeIn?: number
  fadeOut?: number
}

class CasinoSoundManager {
  private audioContext: AudioContext | null = null
  private sounds: Map<SoundEffect, AudioBuffer> = new Map()
  private activeSources: Set<AudioBufferSourceNode> = new Set()
  private masterVolume = 0.7
  private isInitialized = false

  // Sound effect configurations
  private soundConfigs: Record<SoundEffect, SoundConfig> = {
    anticipation: { volume: 0.4, loop: true, fadeIn: 500 },
    nearMiss: { volume: 0.6, fadeIn: 200, fadeOut: 800 },
    resolution: { volume: 0.8, fadeIn: 100 },
    revealHold: { volume: 0.5, fadeIn: 200 },
    celebration: { volume: 0.9, fadeIn: 300 },
    claim: { volume: 0.7 },
    hover: { volume: 0.3 },
    click: { volume: 0.5 }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Create AudioContext (requires user interaction)
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Generate procedural sound effects
      await this.generateSoundEffects()
      
      this.isInitialized = true
      console.log('🔊 Casino Sound Manager initialized')
    } catch (error) {
      console.warn('🔇 Audio not available:', error)
    }
  }

  private async generateSoundEffects(): Promise<void> {
    if (!this.audioContext) return

    // Generate each sound effect procedurally
    const effects: Array<[SoundEffect, () => AudioBuffer]> = [
      ['anticipation', () => this.generateAnticipationSound()],
      ['nearMiss', () => this.generateNearMissSound()],
      ['resolution', () => this.generateResolutionSound()],
      ['revealHold', () => this.generateRevealHoldSound()],
      ['celebration', () => this.generateCelebrationSound()],
      ['claim', () => this.generateClaimSound()],
      ['hover', () => this.generateHoverSound()],
      ['click', () => this.generateClickSound()]
    ]

    for (const [effect, generator] of effects) {
      try {
        this.sounds.set(effect, generator())
      } catch (error) {
        console.warn(`Failed to generate ${effect} sound:`, error)
      }
    }
  }

  private generateAnticipationSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not available')
    
    const duration = 2.0
    const sampleRate = this.audioContext.sampleRate
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate)
    const data = buffer.getChannelData(0)

    // Generate building tension sound with rising frequency
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      const progress = t / duration
      
      // Rising oscillator with some noise
      const freq = 200 + (progress * 100) // 200Hz to 300Hz
      const oscillator = Math.sin(2 * Math.PI * freq * t)
      const noise = (Math.random() - 0.5) * 0.1
      const envelope = Math.sin(Math.PI * progress) * 0.3
      
      data[i] = (oscillator + noise) * envelope
    }

    return buffer
  }

  private generateNearMissSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not available')
    
    const duration = 1.5
    const sampleRate = this.audioContext.sampleRate
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate)
    const data = buffer.getChannelData(0)

    // Generate tension-building drums with irregular rhythm
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      const progress = t / duration
      
      // Drum-like percussion with increasing intensity
      const drumHit = Math.exp(-t * 8) * Math.sin(2 * Math.PI * 60 * t)
      const irregularRhythm = Math.sin(2 * Math.PI * 3 * t) > 0.5 ? 1 : 0
      const envelope = progress * 0.4
      
      data[i] = drumHit * irregularRhythm * envelope
    }

    return buffer
  }

  private generateResolutionSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not available')
    
    const duration = 0.8
    const sampleRate = this.audioContext.sampleRate
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate)
    const data = buffer.getChannelData(0)

    // Generate satisfying "thock" magnetic snap sound
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      
      // Sharp attack, quick decay (like a mechanical click)
      const envelope = Math.exp(-t * 10)
      const freq = 800 + (400 * Math.exp(-t * 15)) // Frequency sweep down
      const oscillator = Math.sin(2 * Math.PI * freq * t)
      
      data[i] = oscillator * envelope * 0.5
    }

    return buffer
  }

  private generateRevealHoldSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not available')
    
    const duration = 0.6
    const sampleRate = this.audioContext.sampleRate
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate)
    const data = buffer.getChannelData(0)

    // Generate magical shimmer/sparkle sound
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      const progress = t / duration
      
      // High-frequency sparkles with gentle fade
      const freq1 = 1200 + Math.sin(t * 20) * 200
      const freq2 = 1800 + Math.sin(t * 30) * 100
      const sparkle = (Math.sin(2 * Math.PI * freq1 * t) + Math.sin(2 * Math.PI * freq2 * t)) * 0.3
      const envelope = Math.sin(Math.PI * progress) * 0.2
      
      data[i] = sparkle * envelope
    }

    return buffer
  }

  private generateCelebrationSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not available')
    
    const duration = 2.0
    const sampleRate = this.audioContext.sampleRate
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate)
    const data = buffer.getChannelData(0)

    // Generate triumphant fanfare
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      const progress = t / duration
      
      // Multiple harmonious frequencies for fanfare effect
      const freq1 = 440 // A
      const freq2 = 554.37 // C#
      const freq3 = 659.25 // E
      
      const note1 = Math.sin(2 * Math.PI * freq1 * t) * 0.3
      const note2 = Math.sin(2 * Math.PI * freq2 * t) * 0.25
      const note3 = Math.sin(2 * Math.PI * freq3 * t) * 0.2
      
      const envelope = Math.sin(Math.PI * progress) * 0.4
      
      data[i] = (note1 + note2 + note3) * envelope
    }

    return buffer
  }

  private generateClaimSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not available')
    
    const duration = 0.4
    const sampleRate = this.audioContext.sampleRate
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate)
    const data = buffer.getChannelData(0)

    // Generate satisfying claim/success sound
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      
      // Rising pitch with pleasant harmony
      const freq = 523.25 + (t / duration) * 261.63 // C to C octave
      const oscillator = Math.sin(2 * Math.PI * freq * t)
      const envelope = Math.exp(-t * 3) * 0.4
      
      data[i] = oscillator * envelope
    }

    return buffer
  }

  private generateHoverSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not available')
    
    const duration = 0.1
    const sampleRate = this.audioContext.sampleRate
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate)
    const data = buffer.getChannelData(0)

    // Generate subtle hover feedback
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      const freq = 800
      const oscillator = Math.sin(2 * Math.PI * freq * t)
      const envelope = Math.exp(-t * 20) * 0.1
      
      data[i] = oscillator * envelope
    }

    return buffer
  }

  private generateClickSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not available')
    
    const duration = 0.05
    const sampleRate = this.audioContext.sampleRate
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate)
    const data = buffer.getChannelData(0)

    // Generate crisp click sound
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      const freq = 1000
      const oscillator = Math.sin(2 * Math.PI * freq * t)
      const envelope = Math.exp(-t * 50) * 0.3
      
      data[i] = oscillator * envelope
    }

    return buffer
  }

  async playSound(effect: SoundEffect, config?: Partial<SoundConfig>): Promise<void> {
    if (!this.audioContext || !this.isInitialized) {
      await this.initialize()
    }

    if (!this.audioContext || this.audioContext.state === 'suspended') {
      await this.audioContext?.resume()
    }

    const buffer = this.sounds.get(effect)
    if (!buffer || !this.audioContext) return

    const effectConfig = { ...this.soundConfigs[effect], ...config }
    const source = this.audioContext.createBufferSource()
    const gainNode = this.audioContext.createGain()

    source.buffer = buffer
    source.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    // Set volume
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime)
    const targetVolume = effectConfig.volume * this.masterVolume

    if (effectConfig.fadeIn) {
      gainNode.gain.linearRampToValueAtTime(
        targetVolume,
        this.audioContext.currentTime + (effectConfig.fadeIn / 1000)
      )
    } else {
      gainNode.gain.setValueAtTime(targetVolume, this.audioContext.currentTime)
    }

    // Handle fade out
    if (effectConfig.fadeOut) {
      const fadeOutStart = this.audioContext.currentTime + buffer.duration - (effectConfig.fadeOut / 1000)
      gainNode.gain.setValueAtTime(targetVolume, fadeOutStart)
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + buffer.duration)
    }

    source.loop = effectConfig.loop || false
    source.start(0)

    this.activeSources.add(source)

    source.onended = () => {
      this.activeSources.delete(source)
    }

    if (!effectConfig.loop) {
      setTimeout(() => {
        try {
          source.stop()
        } catch (e) {
          // Source might already be stopped
        }
      }, buffer.duration * 1000 + 100)
    }
  }

  stopSound(effect: SoundEffect): void {
    // Stop specific sound type (useful for looped sounds)
    this.activeSources.forEach(source => {
      if (source.buffer === this.sounds.get(effect)) {
        try {
          source.stop()
        } catch (e) {
          // Source might already be stopped
        }
      }
    })
  }

  stopAllSounds(): void {
    this.activeSources.forEach(source => {
      try {
        source.stop()
      } catch (e) {
        // Source might already be stopped
      }
    })
    this.activeSources.clear()
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume))
  }

  getMasterVolume(): number {
    return this.masterVolume
  }

  isAvailable(): boolean {
    return this.isInitialized && !!this.audioContext
  }
}

// Export singleton instance
export const casinoSoundManager = new CasinoSoundManager()

// Auto-initialize on first user interaction
let hasUserInteracted = false
const initializeOnInteraction = async () => {
  if (!hasUserInteracted) {
    hasUserInteracted = true
    await casinoSoundManager.initialize()
    document.removeEventListener('click', initializeOnInteraction)
    document.removeEventListener('touchstart', initializeOnInteraction)
  }
}

if (typeof window !== 'undefined') {
  document.addEventListener('click', initializeOnInteraction)
  document.addEventListener('touchstart', initializeOnInteraction)
}