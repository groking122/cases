import { Howl } from 'howler';

// Enhanced sound configuration with more variety
const SOUND_CONFIG = {
  // Case interaction sounds
  caseShake: {
    volume: 0.3,
    frequency: 150,
    duration: 0.2
  },
  caseOpen: {
    volume: 0.5,
    frequency: 800,
    duration: 0.3
  },
  
  // Spinning reel sounds
  spinStart: {
    volume: 0.4,
    frequency: 400,
    duration: 0.2
  },
  reelTick: {
    volume: 0.2,
    frequency: 600,
    duration: 0.05
  },
  reelSlowing: {
    volume: 0.3,
    frequency: 300,
    duration: 0.1
  },
  reelStop: {
    volume: 0.4,
    frequency: 200,
    duration: 0.3
  },
  
  // Rarity-based reveal sounds
  common: {
    volume: 0.4,
    frequency: 440,
    duration: 0.5
  },
  uncommon: {
    volume: 0.45,
    frequency: 494,
    duration: 0.55
  },
  rare: {
    volume: 0.5,
    frequency: 587,
    duration: 0.6
  },
  epic: {
    volume: 0.6,
    frequency: 698,
    duration: 0.7
  },
  legendary: {
    volume: 0.7,
    frequency: 880,
    duration: 0.8
  },
  mythic: {
    volume: 0.8,
    frequency: 1047,
    duration: 1.0
  },
  
  // UI sounds
  buttonClick: {
    volume: 0.2,
    frequency: 800,
    duration: 0.1
  },
  success: {
    volume: 0.4,
    frequency: 523,
    duration: 0.4
  },
  error: {
    volume: 0.3,
    frequency: 220,
    duration: 0.3
  },
  
  // Celebration sounds
  confetti: {
    volume: 0.5,
    frequency: 1200,
    duration: 0.2
  },
  fanfare: {
    volume: 0.6,
    frequency: 659,
    duration: 1.0
  }
};

type SoundName = keyof typeof SOUND_CONFIG;
type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

class SoundManager {
  private audioContext: AudioContext | null = null;
  private isEnabled: boolean = true;
  private masterVolume: number = 0.7;
  private isLoaded: boolean = false;

  constructor() {
    this.initializeAudioContext();
  }

  private async initializeAudioContext() {
    try {
      // Create AudioContext on user interaction
      if (typeof window !== 'undefined' && window.AudioContext) {
        this.audioContext = new AudioContext();
        this.isLoaded = true;
      }
    } catch (error) {
      console.warn('Failed to initialize AudioContext:', error);
      this.isLoaded = false;
    }
  }

  private async createBeep(frequency: number, duration: number, volume: number): Promise<void> {
    if (!this.audioContext || !this.isEnabled) return;

    try {
      // Resume AudioContext if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume * this.masterVolume, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (error) {
      console.warn('Error creating beep:', error);
    }
  }

  // Main play method
  async play(soundName: SoundName): Promise<void> {
    if (!this.isEnabled || !this.isLoaded) return;

    try {
      const config = SOUND_CONFIG[soundName];
      if (config) {
        await this.createBeep(config.frequency, config.duration, config.volume);
      }
    } catch (error) {
      console.warn(`Error playing sound ${soundName}:`, error);
    }
  }

  // Play rarity-specific reveal sound
  async playRevealSound(rarity: Rarity): Promise<void> {
    await this.play(rarity);
  }

  // Enhanced case opening sequence with progressive audio
  async playCaseOpeningSequence(rarity: Rarity): Promise<void> {
    await this.initializeOnUserGesture();
    
    // Phase 1: Initial spin start
    await this.play('spinStart');
    
    // Phase 2: Fast spinning with ticks (800ms)
    const fastTickInterval = setInterval(() => {
      this.play('reelTick');
    }, 100);
    
    await new Promise(resolve => setTimeout(resolve, 800));
    clearInterval(fastTickInterval);
    
    // Phase 3: Slowing down with fewer ticks (600ms)
    await this.play('reelSlowing');
    const slowTickInterval = setInterval(() => {
      this.play('reelTick');
    }, 200);
    
    await new Promise(resolve => setTimeout(resolve, 600));
    clearInterval(slowTickInterval);
    
    // Phase 4: Final slowdown (600ms)
    const finalTickInterval = setInterval(() => {
      this.play('reelTick');
    }, 400);
    
    await new Promise(resolve => setTimeout(resolve, 600));
    clearInterval(finalTickInterval);
    
    // Phase 5: Stop and reveal
    await this.play('reelStop');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Phase 6: Rarity reveal
    await this.play(rarity);
    
    // Phase 7: Celebration based on rarity
    if (['epic', 'legendary', 'mythic'].includes(rarity)) {
      await new Promise(resolve => setTimeout(resolve, 500));
      await this.play('confetti');
      
      if (['legendary', 'mythic'].includes(rarity)) {
        await new Promise(resolve => setTimeout(resolve, 300));
        await this.play('fanfare');
      }
    }
    
    // Final success sound
    await new Promise(resolve => setTimeout(resolve, 200));
    await this.play('success');
  }

  // Play success sound with chord
  async playSuccessChord(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      // Play a major chord (C-E-G)
      const frequencies = [523, 659, 784]; // C5, E5, G5
      
      for (const freq of frequencies) {
        this.createBeep(freq, 0.8, 0.3);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.warn('Error playing success chord:', error);
    }
  }

  // Settings
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  // Getters
  getEnabled(): boolean {
    return this.isEnabled;
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  // Initialize on first user interaction
  async initializeOnUserGesture(): Promise<void> {
    if (!this.audioContext && typeof window !== 'undefined') {
      try {
        this.audioContext = new AudioContext();
        this.isLoaded = true;
        
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
      } catch (error) {
        console.warn('Failed to initialize audio on user gesture:', error);
      }
    }
  }

  // Test method to check if sounds are working
  async testSounds(): Promise<void> {
    console.log('🔊 Testing sound system...');
    
    // Initialize audio context
    await this.initializeOnUserGesture();
    
    // Test each rarity sound
    const rarities: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];
    for (let i = 0; i < rarities.length; i++) {
      const rarity = rarities[i];
      setTimeout(async () => {
        console.log(`Testing ${rarity} sound...`);
        await this.playRevealSound(rarity);
      }, i * 1000);
    }

    // Test UI sounds
    setTimeout(async () => {
      console.log('Testing button click...');
      await this.play('buttonClick');
    }, 5500);

    setTimeout(async () => {
      console.log('Testing success sound...');
      await this.playSuccessChord();
    }, 6000);
  }
}

// Create global instance
export const soundManager = new SoundManager();

// Helper functions for easy use in components
export const playSound = async (name: SoundName) => {
  await soundManager.initializeOnUserGesture();
  return soundManager.play(name);
};

export const playRevealSound = async (rarity: Rarity) => {
  await soundManager.initializeOnUserGesture();
  return soundManager.playRevealSound(rarity);
};

export const playCaseOpeningSequence = async (rarity: Rarity) => {
  await soundManager.initializeOnUserGesture();
  return soundManager.playCaseOpeningSequence(rarity);
};

export const setSoundEnabled = (enabled: boolean) => soundManager.setEnabled(enabled);
export const setSoundVolume = (volume: number) => soundManager.setMasterVolume(volume);

export default soundManager;