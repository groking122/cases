'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingButton } from '@/components/LoadingButton';
import toast from 'react-hot-toast';
import { playCaseOpeningSequence, playSound } from '@/lib/soundManager';
import { SpinningReelCarousel } from './SpinningReelCarousel';
// Removed hardcoded symbols - using database data instead

interface Reward {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  value: number;
  image_url?: string;
  description?: string;
}

interface Case {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  description?: string;
  symbols?: Array<{ symbolId: string; weight: number; symbol: { key: string; name: string; imageUrl: string | null; rarity: string } }>
}

interface EnhancedCaseOpeningProps {
  selectedCase: Case | null;
  wallet: any;
  connected: boolean;
  userId: string | null;
  onCaseOpened?: (reward: Reward) => void;
  userCredits?: number;
}

// Rarity configurations
const RARITY_CONFIG = {
  common: {
    color: '#9CA3AF',
    bgGradient: 'from-gray-400 to-gray-600',
    glowColor: '#9CA3AF50',
    emoji: '⚪',
    label: 'Common'
  },
  uncommon: {
    color: '#10B981',
    bgGradient: 'from-green-400 to-green-600',
    glowColor: '#10B98150',
    emoji: '🟢',
    label: 'Uncommon'
  },
  rare: {
    color: '#3B82F6',
    bgGradient: 'from-blue-400 to-blue-600',
    glowColor: '#3B82F650',
    emoji: '🔵',
    label: 'Rare'
  },
  epic: {
    color: '#8B5CF6',
    bgGradient: 'from-purple-400 to-purple-600',
    glowColor: '#8B5CF650',
    emoji: '🟣',
    label: 'Epic'
  },
  legendary: {
    color: '#F59E0B',
    bgGradient: 'from-yellow-400 to-orange-500',
    glowColor: '#F59E0B50',
    emoji: '🟡',
    label: 'Legendary'
  },
  mythic: {
    color: '#EF4444',
    bgGradient: 'from-red-500 to-pink-600',
    glowColor: '#EF444450',
    emoji: '🔴',
    label: 'Mythic'
  }
};

type OpeningStage = 'idle' | 'shaking' | 'opening' | 'spinning' | 'revealing' | 'celebration' | 'complete';
type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export const EnhancedCaseOpening: React.FC<EnhancedCaseOpeningProps> = ({
  selectedCase,
  wallet,
  connected,
  userId,
  onCaseOpened,
  userCredits = 0
}) => {
  const [stage, setStage] = useState<OpeningStage>('idle');
  const [reward, setReward] = useState<Reward | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile devices for performance optimization
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleOpenCase = useCallback(async () => {
    if (!selectedCase || !connected) {
      toast.error('Please connect your wallet and select a case');
      return;
    }

    if (!userId) {
      toast.error('User not found. Please refresh and reconnect your wallet.');
      return;
    }

    if (userCredits < selectedCase.price) {
      toast.error(`Insufficient credits! You need ${selectedCase.price} credits but only have ${userCredits}.`);
      return;
    }

    setIsProcessing(true);
    
    try {
      // Play button click sound
      await playSound('buttonClick');
      
      // Stage 1: Shaking animation (build anticipation)
      setStage('shaking');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Call the API
      const response = await fetch('/api/open-case-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          caseId: selectedCase.id,
          clientSeed: 'user_seed_' + Date.now()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open case');
      }

      // Validate API response structure
      if (!data.symbol) {
        console.error('Invalid API response:', data);
        throw new Error('Invalid response from server');
      }

      // Stage 2: Opening animation
      setStage('opening');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Convert API response to reward format
      console.log('API symbol data:', data.symbol);
      
      // Normalize rarity to match our config
      const normalizedRarity = data.symbol.rarity?.toLowerCase() || 'common';
      const validRarity = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].includes(normalizedRarity) 
        ? normalizedRarity as Rarity 
        : 'common';
      
      const reward: Reward = {
        id: data.symbol.key || 'unknown',
        name: data.symbol.name,
        rarity: validRarity,
        value: data.winnings || 0,
        image_url: data.symbol.image,
        description: `${validRarity} symbol with ${data.symbol.multiplier}x multiplier`
      };

      // Stage 3: Spinning reel animation - Let the SpinningReelCarousel handle its own timing
      setReward(reward); // Set reward early for SpinningReel component
      setStage('spinning');
      // Removed hardcoded timeout - let SpinningReelCarousel control the flow

      // The rest will be handled by the SpinningReelCarousel onComplete callback

    } catch (error: any) {
      console.error('Case opening failed:', error);
      toast.error(error.message || 'Failed to open case');
      setStage('idle');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedCase, wallet, connected, userId, onCaseOpened, userCredits]);

  const isDisabled = !selectedCase || !connected || isProcessing || (selectedCase && userCredits < selectedCase.price);

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] p-6 bg-black/95 backdrop-blur-xl rounded-2xl border border-gray-800/30">
      <AnimatePresence mode="wait">
        {/* Case Display */}
        <motion.div
          key={stage}
          className="relative mb-6 sm:mb-8"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {stage === 'idle' || stage === 'complete' ? (
            <CaseDisplay selectedCase={selectedCase} />
          ) : stage === 'shaking' ? (
            <ShakingCase selectedCase={selectedCase} />
          ) : stage === 'opening' ? (
            <OpeningCase selectedCase={selectedCase} />
          ) : stage === 'spinning' ? (
            <div className="w-full max-w-4xl mx-auto">
              <SpinningReelCarousel 
                isSpinning={true}
                winningItem={reward ? {
                  symbol: {
                    key: reward.id,
                    name: reward.name,
                    emoji: '⭐',
                    imageUrl: reward.image_url || null
                  },
                  rarity: reward.rarity,
                  isWinning: true
                } : null}
                seed={`case-${selectedCase?.id}-${userId || 'guest'}-${Date.now()}`}
                fillerPool={(selectedCase?.symbols || []).map(s => ({
                  key: s.symbol.key,
                  name: s.symbol.name,
                  emoji: '⭐',
                  imageUrl: s.symbol.imageUrl || null,
                  rarity: s.symbol.rarity
                }))}
                onComplete={() => {
                  console.log('🎰 Reel animation completed, transitioning to revealing')
                  
                  // Capture reward value to avoid null reference issues in setTimeout
                  const currentReward = reward;
                  
                  // Stage 4: Revealing the final reward (longer duration)
                  setTimeout(() => {
                    console.log('🎰 Setting stage to revealing')
                    setStage('revealing')
                    
                    // After revealing, go to celebration
                    setTimeout(() => {
                      console.log('🎰 Setting stage to celebration')
                      setStage('celebration')
                      
                      // Ensure reward is still available
                      if (currentReward) {
                        // Play rarity-specific sound sequence
                        playCaseOpeningSequence(currentReward.rarity as Rarity);
                        
                        // Show success toast with rarity info
                        const rarityConfig = RARITY_CONFIG[currentReward.rarity as keyof typeof RARITY_CONFIG] || RARITY_CONFIG.common;
                        toast.success(`🎉 ${rarityConfig.emoji} ${rarityConfig.label} Reward! +${currentReward.value} credits`, {
                          duration: 8000, // Longer toast duration
                          style: {
                            background: `linear-gradient(135deg, ${rarityConfig.color}20, ${rarityConfig.color}10)`,
                            border: `1px solid ${rarityConfig.color}`,
                            color: rarityConfig.color
                          }
                        });

                        // Notify parent component
                        onCaseOpened?.(currentReward);
                      }

                      // Stage 5: Complete (reset after much longer celebration)
                      setTimeout(() => {
                        setStage('complete');
                        setTimeout(() => {
                          setStage('idle');
                          setReward(null);
                        }, 2000); // Longer idle transition
                      }, 5000); // 5 seconds celebration
                      
                    }, 2000); // 2 seconds for revealing stage
                  }, 1000) // 1 second before revealing
                }}
                spinDuration={3500} // 3.5 seconds anticipation phase
                stopDuration={2500} // 2.5 seconds near-miss phase
              />
            </div>
          ) : stage === 'revealing' || stage === 'celebration' ? (
            <RewardReveal reward={reward} stage={stage} isMobile={isMobile} />
          ) : null}
        </motion.div>
      </AnimatePresence>

      {/* Enhanced Action Button with micro-interactions */}
      <div className="w-full max-w-xs sm:max-w-sm">
        <LoadingButton
          isLoading={isProcessing}
          loadingText={getLoadingText(stage)}
          onClick={handleOpenCase}
          disabled={isDisabled}
          className={`w-full h-12 sm:h-14 text-base sm:text-lg font-bold transition-all duration-200 relative overflow-hidden ${
            isDisabled 
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:from-purple-800 active:to-pink-800 text-white shadow-lg hover:shadow-xl active:shadow-md transform hover:scale-105 active:scale-95 hover:-translate-y-0.5'
          }`}
        >
          {/* Shimmer effect on hover */}
          {!isDisabled && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            />
          )}
          
          {/* Floating particles around button when active */}
          {!isDisabled && stage === 'idle' && (
            <div className="absolute inset-0">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-white/40 rounded-full"
                  style={{
                    left: `${20 + i * 30}%`,
                    top: '20%',
                  }}
                  animate={{
                    y: [0, -10, 0],
                    opacity: [0.4, 0.8, 0.4],
                    scale: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.5,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
          )}
          
          <span className="relative z-10">
            {getButtonText(stage, selectedCase, connected, userCredits)}
          </span>
        </LoadingButton>
      </div>

      {/* Stage Info */}
      {stage !== 'idle' && stage !== 'complete' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 sm:mt-4 text-center text-gray-400 text-xs sm:text-sm"
        >
          {getStageDescription(stage)}
        </motion.div>
      )}
    </div>
  );
};

// Case Display Component
const CaseDisplay: React.FC<{ selectedCase: Case | null }> = ({ selectedCase }) => (
  <motion.div
    className="relative w-32 h-32 sm:w-48 sm:h-48 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 flex items-center justify-center shadow-2xl"
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    transition={{ duration: 0.2 }}
  >
    <div className="text-center">
      <div className="text-4xl sm:text-6xl mb-1 sm:mb-2">📦</div>
      {selectedCase && (
        <div className="text-white font-semibold text-xs sm:text-sm px-2">
          {selectedCase.name}
        </div>
      )}
    </div>
    <motion.div
      className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20"
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 2, repeat: Infinity }}
    />
  </motion.div>
);

// Shaking Case Component
const ShakingCase: React.FC<{ selectedCase: Case | null }> = ({ selectedCase }) => (
  <motion.div
    className="relative w-32 h-32 sm:w-48 sm:h-48 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 flex items-center justify-center shadow-2xl"
    animate={{
      x: [0, -2, 2, -2, 2, 0],
      y: [0, -1, 1, -1, 1, 0],
      rotate: [0, -0.5, 0.5, -0.5, 0.5, 0]
    }}
    transition={{
      duration: 0.3,
      repeat: Infinity,
      repeatType: "loop"
    }}
  >
    <div className="text-center">
      <div className="text-4xl sm:text-6xl mb-1 sm:mb-2">📦</div>
      {selectedCase && (
        <div className="text-white font-semibold text-xs sm:text-sm px-2">
          {selectedCase.name}
        </div>
      )}
    </div>
    <motion.div
      className="absolute inset-0 rounded-lg bg-gradient-to-r from-yellow-500/30 to-orange-500/30"
      animate={{ opacity: [0.3, 0.7, 0.3] }}
      transition={{ duration: 0.5, repeat: Infinity }}
    />
  </motion.div>
);

// Opening Case Component
const OpeningCase: React.FC<{ selectedCase: Case | null }> = ({ selectedCase }) => (
  <motion.div
    className="relative w-32 h-32 sm:w-48 sm:h-48 rounded-lg flex items-center justify-center"
    initial={{ scale: 1 }}
    animate={{ scale: [1, 1.2, 1] }}
    transition={{ duration: 1.5, repeat: Infinity }}
  >
    <motion.div
      className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500"
      animate={{
        opacity: [0.3, 0.8, 0.3],
        scale: [1, 1.1, 1]
      }}
      transition={{ duration: 0.8, repeat: Infinity }}
    />
    <div className="relative text-center text-white z-10">
      <motion.div
        className="text-4xl sm:text-6xl mb-1 sm:mb-2"
        animate={{ rotate: [0, 180, 360] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        ✨
      </motion.div>
      <div className="font-semibold text-xs sm:text-sm">Opening...</div>
    </div>
  </motion.div>
);

// Reward Reveal Component
const RewardReveal: React.FC<{ reward: Reward | null; stage: OpeningStage; isMobile: boolean }> = ({ reward, stage, isMobile }) => {
  if (!reward) return null;

  const rarityConfig = RARITY_CONFIG[reward.rarity] || RARITY_CONFIG.common;

  return (
    <motion.div
      className="relative w-32 h-32 sm:w-48 sm:h-48 rounded-lg flex items-center justify-center overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${rarityConfig.color}20, ${rarityConfig.color}40)`,
        border: `2px solid ${rarityConfig.color}`,
        boxShadow: `0 0 20px ${rarityConfig.glowColor}, 0 0 40px ${rarityConfig.glowColor}50`
      }}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, ease: "backOut" }}
    >
      {/* Background Effect */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle, ${rarityConfig.color}30 0%, transparent 70%)`
        }}
        animate={stage === 'celebration' ? {
          scale: [1, 1.5, 1],
          opacity: [0.5, 0.8, 0.5]
        } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      />

      {/* Reward Content */}
      <div className="relative text-center z-10 px-2">
        <motion.div
          className="text-3xl sm:text-5xl mb-1 sm:mb-2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5, ease: "backOut" }}
        >
          {rarityConfig.emoji}
        </motion.div>
        <motion.div
          className="text-white font-bold text-xs sm:text-sm mb-1 leading-tight"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {reward.name}
        </motion.div>
        <motion.div
          className="text-xs sm:text-xs opacity-80 leading-tight"
          style={{ color: rarityConfig.color }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          {rarityConfig.label} • {reward.value} Credits
        </motion.div>
      </div>

      {/* Enhanced Celebration Particles with rarity-based intensity */}
      {stage === 'celebration' && (
        <div className="absolute inset-0">
          {/* Base particles for all rarities */}
          {[...Array(isMobile ? 4 : 6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{ backgroundColor: rarityConfig.color }}
              initial={{
                x: '50%',
                y: '50%',
                scale: 0
              }}
              animate={{
                x: `${50 + (Math.cos(i * Math.PI / 3) * 80)}%`,
                y: `${50 + (Math.sin(i * Math.PI / 3) * 80)}%`,
                scale: [0, 1, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.1
              }}
            />
          ))}

          {/* Epic+ rarity: Add sparkle ring */}
          {['epic', 'legendary', 'mythic'].includes(reward?.rarity || '') && (
            <motion.div
              className="absolute inset-0 border-2 rounded-full"
              style={{ borderColor: `${rarityConfig.color}60` }}
              animate={{
                scale: [1, 1.3, 1],
                rotate: [0, 360],
                opacity: [0.3, 0.8, 0.3]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}

          {/* Legendary+ rarity: Add golden sparkles */}
          {['legendary', 'mythic'].includes(reward?.rarity || '') && (
            <>
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={`sparkle-${i}`}
                  className="absolute w-2 h-2"
                  style={{
                    left: '50%',
                    top: '50%',
                    background: `linear-gradient(45deg, ${rarityConfig.color}, #FFD700)`
                  }}
                  animate={{
                    x: Math.cos(i * Math.PI / 4) * 120,
                    y: Math.sin(i * Math.PI / 4) * 120,
                    rotate: [0, 360],
                    scale: [0, 1.5, 0],
                    opacity: [0, 1, 0]
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeOut"
                  }}
                />
              ))}
            </>
          )}

          {/* Mythic rarity: Screen flash effect */}
          {reward?.rarity === 'mythic' && (
            <motion.div
              className="absolute -inset-10 bg-gradient-radial from-white/20 to-transparent"
              animate={{
                scale: [0, 3, 0],
                opacity: [0, 0.4, 0]
              }}
              transition={{
                duration: 0.8,
                repeat: 3,
                repeatDelay: 0.5
              }}
            />
          )}
        </div>
      )}
    </motion.div>
  );
};



// Helper Functions
function getButtonText(stage: OpeningStage, selectedCase: Case | null, connected: boolean, userCredits: number = 0): string {
  if (!connected) return 'Connect Wallet';
  if (!selectedCase) return 'Select a Case';
  if (selectedCase && userCredits < selectedCase.price) return `Need ${selectedCase.price - userCredits} More Credits`;
  if (stage === 'idle' || stage === 'complete') return `Open Case (${selectedCase.price} Credits)`;
  return 'Opening...';
}

function getLoadingText(stage: OpeningStage): string {
  switch (stage) {
    case 'shaking': return 'Preparing...';
    case 'opening': return 'Opening...';
    case 'spinning': return 'Spinning...';
    case 'revealing': return 'Revealing...';
    case 'celebration': return 'Celebrating...';
    default: return 'Processing...';
  }
}

function getStageDescription(stage: OpeningStage): string {
  switch (stage) {
    case 'shaking': return 'Building anticipation...';
    case 'opening': return 'Unlocking your mystery box...';
    case 'spinning': return 'The reel is spinning...';
    case 'revealing': return 'Your reward is...';
    case 'celebration': return 'Congratulations!';
    default: return '';
  }
} 