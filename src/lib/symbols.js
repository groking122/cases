// SYMBOL MAPPING SYSTEM
// Maps database symbols to frontend visuals, animations, and effects

export const SYMBOL_CONFIG = {
  // Common Symbols (60.04% total)
  coin: {
    key: 'coin',
    name: 'Copper Coin',
    rarity: 'common',
    multiplier: 0.1,
    probability: 0.3502,
    color: '#B87333',
    gradient: 'from-amber-600 to-amber-800',
    icon: 'COIN',
    imageUrl: null, // Will use emoji until image is added
    description: 'A simple copper coin, common but valuable',
    animation: {
      type: 'flip',
      duration: 1000,
      particles: false,
      glow: false,
      confetti: false
    }
  },
  
  clover: {
    key: 'clover',
    name: 'Lucky Clover',
    rarity: 'common',
    multiplier: 0.3,
    probability: 0.2502,
    color: '#2E8B57',
    gradient: 'from-green-600 to-green-800',
    icon: 'CLOVER',
    imageUrl: null, // Will use emoji until image is added
    description: 'A four-leaf clover bringing modest luck',
    animation: {
      type: 'flip',
      duration: 1000,
      particles: false,
      glow: true,
      glowColor: '#2E8B57',
      confetti: false
    }
  },

  // Uncommon Symbols (15%)
  rabbit: {
    key: 'rabbit',
    name: 'Swift Rabbit',
    rarity: 'uncommon',
    multiplier: 0.8,
    probability: 0.15,
    color: '#A9A9A9',
    gradient: 'from-gray-400 to-gray-600',
    icon: 'RABBIT',
    imageUrl: null, // Will use emoji until image is added
    description: 'Quick and agile, brings decent fortune',
    animation: {
      type: 'bounce',
      duration: 1200,
      particles: true,
      particleCount: 20,
      glow: true,
      glowColor: '#A9A9A9',
      confetti: false
    }
  },

  // Rare Symbols (18% total)
  diamond: {
    key: 'diamond',
    name: 'Silver Diamond',
    rarity: 'rare',
    multiplier: 1.5,
    probability: 0.1,
    color: '#C0C0C0',
    gradient: 'from-blue-400 to-blue-600',
    icon: 'DIAMOND',
    imageUrl: null, // Will use emoji until image is added
    description: 'A pristine diamond with silver brilliance',
    animation: {
      type: 'shine',
      duration: 1500,
      particles: true,
      particleCount: 30,
      glow: true,
      glowColor: '#C0C0C0',
      confetti: false,
      sparkle: true
    }
  },

  crown: {
    key: 'crown',
    name: 'Golden Crown',
    rarity: 'rare',
    multiplier: 2.0,
    probability: 0.08,
    color: '#FFD700',
    gradient: 'from-yellow-400 to-yellow-600',
    icon: 'CROWN',
    imageUrl: null, // Will use emoji until image is added
    description: 'Majestic crown of ancient royalty',
    animation: {
      type: 'pulse',
      duration: 1500,
      particles: true,
      particleCount: 40,
      glow: true,
      glowColor: '#FFD700',
      confetti: false,
      sparkle: true
    }
  },

  // Epic Symbols (6.8% total)
  dragon: {
    key: 'dragon',
    name: 'Ruby Dragon',
    rarity: 'epic',
    multiplier: 3.5,
    probability: 0.04,
    color: '#FF4500',
    gradient: 'from-red-500 to-red-700',
    icon: 'DRAGON',
    imageUrl: null, // Will use emoji until image is added
    description: 'Fierce dragon of immense power',
    animation: {
      type: 'explosion',
      duration: 2000,
      particles: true,
      particleCount: 60,
      glow: true,
      glowColor: '#FF4500',
      confetti: true,
      confettiColors: ['#FF4500', '#FF6B47', '#FFD700'],
      fire: true
    }
  },

  moon: {
    key: 'moon',
    name: 'Sapphire Moon',
    rarity: 'epic',
    multiplier: 4.0,
    probability: 0.02,
    color: '#1E90FF',
    gradient: 'from-blue-500 to-purple-600',
    icon: 'MOON',
    imageUrl: null, // Will use emoji until image is added
    description: 'Mystical moon of sapphire light',
    animation: {
      type: 'orbital',
      duration: 2000,
      particles: true,
      particleCount: 50,
      glow: true,
      glowColor: '#1E90FF',
      confetti: true,
      confettiColors: ['#1E90FF', '#4169E1', '#9370DB'],
      stardust: true
    }
  },

  phoenix: {
    key: 'phoenix',
    name: 'Phoenix Feather',
    rarity: 'epic',
    multiplier: 5.0,
    probability: 0.008,
    color: '#FF8C00',
    gradient: 'from-orange-500 to-red-600',
    icon: 'PHOENIX',
    imageUrl: null, // Will use emoji until image is added
    description: 'Legendary feather of rebirth',
    animation: {
      type: 'phoenix',
      duration: 2500,
      particles: true,
      particleCount: 80,
      glow: true,
      glowColor: '#FF8C00',
      confetti: true,
      confettiColors: ['#FF8C00', '#FF4500', '#FFD700'],
      fire: true,
      resurrection: true
    }
  },

  // Legendary Symbols (0.16% total)
  unicorn: {
    key: 'unicorn',
    name: 'Unicorn Horn',
    rarity: 'legendary',
    multiplier: 8.0,
    probability: 0.001,
    color: '#9370DB',
    gradient: 'from-purple-500 to-pink-600',
    icon: 'UNICORN',
    imageUrl: null, // Will use emoji until image is added
    description: 'Mystical horn of pure magic',
    animation: {
      type: 'legendary',
      duration: 3000,
      particles: true,
      particleCount: 100,
      glow: true,
      glowColor: '#9370DB',
      confetti: true,
      confettiColors: ['#9370DB', '#DDA0DD', '#FF69B4'],
      rainbow: true,
      screenShake: true
    }
  },

  dogecoin: {
    key: 'dogecoin',
    name: 'Dogecoin King',
    rarity: 'legendary',
    multiplier: 15.0,
    probability: 0.0005,
    color: '#C2A633',
    gradient: 'from-yellow-500 to-orange-600',
    icon: 'DOGE',
    imageUrl: null, // Will use emoji until image is added
    description: 'The royal doge of crypto fortune',
    animation: {
      type: 'legendary',
      duration: 3000,
      particles: true,
      particleCount: 120,
      glow: true,
      glowColor: '#C2A633',
      confetti: true,
      confettiColors: ['#C2A633', '#FFD700', '#FFA500'],
      meme: true,
      screenShake: true
    }
  },

  bitcoin: {
    key: 'bitcoin',
    name: 'Bitcoin Legend',
    rarity: 'legendary',
    multiplier: 25.0,
    probability: 0.0001,
    color: '#F7931A',
    gradient: 'from-orange-500 to-yellow-600',
    icon: 'BTC',
    imageUrl: null, // Will use emoji until image is added
    description: 'The ultimate symbol of digital wealth',
    animation: {
      type: 'ultimate',
      duration: 4000,
      particles: true,
      particleCount: 150,
      glow: true,
      glowColor: '#F7931A',
      confetti: true,
      confettiColors: ['#F7931A', '#FFD700', '#FFA500'],
      lightning: true,
      screenShake: true,
      goldRain: true
    }
  }
};

// Helper functions for symbol operations
export const getSymbolByKey = (key) => {
  return SYMBOL_CONFIG[key] || null;
};

export const getAllSymbols = () => {
  return Object.values(SYMBOL_CONFIG);
};

export const getSymbolsByRarity = (rarity) => {
  return Object.values(SYMBOL_CONFIG).filter(symbol => symbol.rarity === rarity);
};

export const selectRandomSymbol = (randomValue) => {
  let cumulativeProbability = 0;
  
  for (const [symbolKey, symbol] of Object.entries(SYMBOL_CONFIG)) {
    cumulativeProbability += symbol.probability;
    if (randomValue <= cumulativeProbability) {
      return { ...symbol, key: symbolKey };
    }
  }
  
  // Fallback to most common symbol
  return { ...SYMBOL_CONFIG.coin, key: 'coin' };
};

// Enhanced Rarity Configuration with Animation Tiers
export const RARITY_CONFIG = {
  common: {
    name: 'Common',
    color: '#9CA3AF',
    gradient: 'from-gray-600 to-gray-700',
    border: 'border-gray-500',
    glow: '#9CA3AF',
    textColor: 'text-gray-300',
    // Animation Tier 1: Simple & Fast
    animation: {
      duration: 800,
      type: 'simple-fade',
      particles: {
        enabled: true,
        count: 20,
        colors: ['#9CA3AF', '#D1D5DB'],
        size: 'small',
        spread: 30
      },
      effects: {
        glow: false,
        shake: false,
        confetti: false,
        sparkle: false,
        flash: false
      },
      sound: {
        enabled: true,
        volume: 0.3,
        pitch: 1.0
      },
      haptic: {
        enabled: false
      }
    }
  },
  
  uncommon: {
    name: 'Uncommon',
    color: '#10B981',
    gradient: 'from-green-600 to-green-700', 
    border: 'border-green-500',
    glow: '#10B981',
    textColor: 'text-green-300',
    // Animation Tier 2: Enhanced with Particles
    animation: {
      duration: 1000,
      type: 'bounce-scale',
      particles: {
        enabled: true,
        count: 30,
        colors: ['#10B981', '#34D399', '#6EE7B7'],
        size: 'medium',
        spread: 40
      },
      effects: {
        glow: true,
        glowIntensity: 0.6,
        shake: false,
        confetti: false,
        sparkle: true,
        sparkleCount: 15,
        flash: false
      },
      sound: {
        enabled: true,
        volume: 0.4,
        pitch: 1.1
      },
      haptic: {
        enabled: true,
        pattern: 'light'
      }
    }
  },
  
  rare: {
    name: 'Rare',
    color: '#3B82F6',
    gradient: 'from-blue-600 to-blue-700',
    border: 'border-blue-500',
    glow: '#3B82F6',
    textColor: 'text-blue-300',
    // Animation Tier 3: Particle Burst + Effects
    animation: {
      duration: 1200,
      type: 'burst-reveal',
      particles: {
        enabled: true,
        count: 50,
        colors: ['#3B82F6', '#60A5FA', '#93C5FD'],
        size: 'medium',
        spread: 50
      },
      effects: {
        glow: true,
        glowIntensity: 0.8,
        shake: false,
        confetti: true,
        confettiCount: 40,
        sparkle: true,
        sparkleCount: 25,
        flash: true,
        flashColor: '#3B82F6'
      },
      sound: {
        enabled: true,
        volume: 0.5,
        pitch: 1.2
      },
      haptic: {
        enabled: true,
        pattern: 'medium'
      }
    }
  },
  
  epic: {
    name: 'Epic',
    color: '#9333EA',
    gradient: 'from-purple-600 to-purple-700',
    border: 'border-purple-500',
    glow: '#9333EA',
    textColor: 'text-purple-300',
    // Animation Tier 4: 3D Effects + Advanced Animations
    animation: {
      duration: 1800,
      type: '3d-flip-reveal',
      particles: {
        enabled: true,
        count: 75,
        colors: ['#9333EA', '#A855F7', '#C084FC'],
        size: 'large',
        spread: 60,
        physics: true // Enable physics-based particles
      },
      effects: {
        glow: true,
        glowIntensity: 1.0,
        shake: true,
        shakeIntensity: 'medium',
        confetti: true,
        confettiCount: 60,
        sparkle: true,
        sparkleCount: 40,
        flash: true,
        flashColor: '#9333EA',
        pulse: true,
        pulseCount: 3,
        '3d': true,
        flipDegrees: 360
      },
      sound: {
        enabled: true,
        volume: 0.6,
        pitch: 1.3,
        echo: true
      },
      haptic: {
        enabled: true,
        pattern: 'strong'
      }
    }
  },
  
  legendary: {
    name: 'Legendary',
    color: '#FFD700',
    gradient: 'from-yellow-500 to-orange-600',
    border: 'border-yellow-500',
    glow: '#FFD700',
    textColor: 'text-yellow-300',
    // Animation Tier 5: Full-Screen Spectacular
    animation: {
      duration: 3000,
      type: 'cosmic-ultimate',
      particles: {
        enabled: true,
        count: 150,
        colors: ['#FFD700', '#FFA500', '#FF8C00', '#FF6B47'],
        size: 'extra-large',
        spread: 360,
        physics: true,
        gravity: true,
        lifetime: 4000
      },
      effects: {
        glow: true,
        glowIntensity: 1.5,
        shake: true,
        shakeIntensity: 'strong',
        confetti: true,
        confettiCount: 120,
        sparkle: true,
        sparkleCount: 80,
        flash: true,
        flashColor: '#FFD700',
        pulse: true,
        pulseCount: 5,
        '3d': true,
        flipDegrees: 720,
        cosmic: true,
        screenTakeover: true,
        rainbow: true,
        goldRain: true,
        lightning: true
      },
      sound: {
        enabled: true,
        volume: 0.8,
        pitch: 1.5,
        echo: true,
        reverb: true,
        layered: true
      },
      haptic: {
        enabled: true,
        pattern: 'celebration',
        duration: 2000
      }
    }
  }
}

// Animation Timing Configuration
export const ANIMATION_TIMING = {
  // Base timing multipliers for different rarities
  multipliers: {
    common: 1.0,
    uncommon: 1.2,
    rare: 1.5,
    epic: 2.0,
    legendary: 2.5
  },
  
  // Phase durations (in milliseconds)
  phases: {
    anticipation: {
      common: 500,
      uncommon: 600,
      rare: 800,
      epic: 1000,
      legendary: 1500
    },
    reveal: {
      common: 800,
      uncommon: 1000,
      rare: 1200,
      epic: 1800,
      legendary: 3000
    },
    celebration: {
      common: 1000,
      uncommon: 1200,
      rare: 1500,
      epic: 2000,
      legendary: 4000
    }
  },
  
  // Transition easing for different effects
  easing: {
    entrance: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Back out
    reveal: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Back in-out
    celebration: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Ease out
    particles: 'cubic-bezier(0.16, 1, 0.3, 1)', // Ease out expo
    legendary: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' // Ease out back
  }
}

// Performance Configuration
export const PERFORMANCE_CONFIG = {
  // Particle limits based on device capability
  particleLimits: {
    mobile: {
      common: 10,
      uncommon: 15,
      rare: 25,
      epic: 40,
      legendary: 60
    },
    desktop: {
      common: 20,
      uncommon: 30,
      rare: 50,
      epic: 75,
      legendary: 150
    }
  },
  
  // Animation quality settings
  quality: {
    low: {
      particles: 0.5,
      effects: 0.6,
      framerate: 30
    },
    medium: {
      particles: 0.8,
      effects: 0.8,
      framerate: 45
    },
    high: {
      particles: 1.0,
      effects: 1.0,
      framerate: 60
    }
  },
  
  // Device detection
  getDeviceCapability: () => {
    const userAgent = navigator.userAgent.toLowerCase()
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent)
    const isLowEnd = /android 4|android 5/.test(userAgent) || /iphone os [5-9]/.test(userAgent)
    
    if (isMobile && isLowEnd) return 'low'
    if (isMobile) return 'medium'
    return 'high'
  }
}

// Animation helper functions
export const getAnimationConfig = (rarity) => {
  switch (rarity) {
    case 'legendary':
      return {
        confetti: true,
        particles: true,
        glow: true,
        screenShake: true,
        duration: 3000
      };
    case 'epic':
      return {
        confetti: true,
        particles: true,
        glow: true,
        duration: 2000
      };
    case 'rare':
      return {
        particles: true,
        glow: true,
        sparkle: true,
        duration: 1500
      };
    case 'uncommon':
      return {
        particles: true,
        glow: true,
        duration: 1200
      };
    default:
      return {
        flip: true,
        duration: 1000
      };
  }
};

export default SYMBOL_CONFIG; 