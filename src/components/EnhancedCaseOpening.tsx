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
  symbols?: Array<{ 
    symbolId: string; 
    weight: number; 
    symbol: { 
      key: string; 
      name: string; 
      emoji?: string;
      imageUrl: string | null; 
      rarity: string 
    } 
  }>
}

interface EnhancedCaseOpeningProps {
  selectedCase: Case | null;
  wallet: any;
  connected: boolean;
  userId: string | null;
  onCaseOpened?: (reward: Reward) => void;
  userCredits?: number;
}

// Rarity configurations with improved colors and professional styling
const RARITY_CONFIG = {
  common: {
    color: '#9CA3AF',
    bgGradient: 'from-gray-500 to-gray-600',
    glowColor: '#9CA3AF80',
    borderColor: '#6B7280',
    label: 'Common'
  },
  uncommon: {
    color: '#10B981',
    bgGradient: 'from-green-500 to-emerald-600',
    glowColor: '#10B98180',
    borderColor: '#059669',
    label: 'Uncommon'
  },
  rare: {
    color: '#3B82F6',
    bgGradient: 'from-blue-500 to-blue-600',
    glowColor: '#3B82F680',
    borderColor: '#2563EB',
    label: 'Rare'
  },
  epic: {
    color: '#8B5CF6',
    bgGradient: 'from-purple-500 to-violet-600',
    glowColor: '#8B5CF680',
    borderColor: '#7C3AED',
    label: 'Epic'
  },
  legendary: {
    color: '#F59E0B',
    bgGradient: 'from-orange-500 to-amber-500',
    glowColor: '#F59E0B80',
    borderColor: '#D97706',
    label: 'Legendary'
  },
  mythic: {
    color: '#EF4444',
    bgGradient: 'from-red-500 to-rose-600',
    glowColor: '#EF444480',
    borderColor: '#DC2626',
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
    <div className="flex flex-col items-center justify-center min-h-[700px] p-12 bg-black/40 backdrop-blur-md rounded-3xl border border-orange-500/30 shadow-2xl max-w-6xl mx-auto">
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
            <div className="w-full max-w-7xl mx-auto px-16">
              <SpinningReelCarousel 
                isSpinning={true}
                winningItem={reward ? {
                  symbol: {
                    key: reward.id,
                    name: reward.name,
                    emoji: 'S',
                    imageUrl: reward.image_url || null
                  },
                  rarity: reward.rarity,
                  isWinning: true
                } : null}
                seed={`case-${selectedCase?.id}-${userId || 'guest'}-${Date.now()}`}
                fillerPool={(selectedCase?.symbols || []).map(s => {
                  console.log('🎨 Mapping symbol for filler pool:', s)
                  return {
                    key: s.symbol.key,
                    name: s.symbol.name,
                    emoji: s.symbol.emoji || s.symbol.name.charAt(0).toUpperCase(),
                    imageUrl: s.symbol.imageUrl || null,
                    rarity: s.symbol.rarity
                  }
                })}
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
                        
                        // Show success toast with professional styling
                        const rarityConfig = RARITY_CONFIG[currentReward.rarity as keyof typeof RARITY_CONFIG] || RARITY_CONFIG.common;
                        toast.success(`Reward Unlocked: ${currentReward.name} (+${currentReward.value} credits)`, {
                          duration: 5000,
                          style: {
                            background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.9), rgba(251, 146, 60, 0.8))',
                            border: '1px solid #f97316',
                            color: '#fff',
                            fontWeight: '600',
                            borderRadius: '12px',
                            boxShadow: '0 10px 25px rgba(249, 115, 22, 0.3)'
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

      {/* Professional Action Button */}
      <div className="w-full max-w-lg">
        <LoadingButton
          isLoading={isProcessing}
          loadingText={getLoadingText(stage)}
          onClick={handleOpenCase}
          disabled={isDisabled}
          className={`w-full h-18 text-xl font-bold transition-all duration-300 relative overflow-hidden rounded-2xl ${
            isDisabled 
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed border-2 border-gray-600' 
              : 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white shadow-xl hover:shadow-2xl border-2 border-orange-500/50 hover:border-orange-400 transform hover:scale-[1.02] active:scale-[0.98]'
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
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-orange-400/60 rounded-full"
                  style={{
                    left: `${15 + i * 20}%`,
                    top: '25%',
                  }}
                  animate={{
                    y: [0, -15, 0],
                    opacity: [0.6, 1, 0.6],
                    scale: [0.8, 1.2, 0.8]
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    delay: i * 0.4,
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


    </div>
  );
};

// Case Display Component
const CaseDisplay: React.FC<{ selectedCase: Case | null }> = ({ selectedCase }) => (
  <motion.div
    className="relative w-80 h-80 sm:w-96 sm:h-96 rounded-3xl bg-gradient-to-br from-orange-900/40 to-orange-700/40 border-3 border-orange-500/50 flex items-center justify-center shadow-2xl overflow-hidden"
    whileHover={{ scale: 1.02, borderColor: '#f97316' }}
    whileTap={{ scale: 0.98 }}
    transition={{ duration: 0.3 }}
  >
    {selectedCase?.image_url ? (
      <motion.img
        src={selectedCase.image_url}
        alt={selectedCase.name}
        className="w-full h-full object-contain rounded-2xl p-4"
        initial={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.3 }}
      />
    ) : (
      <div className="text-center">
        <div className="w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-6 bg-gradient-to-br from-orange-600/30 to-orange-800/30 rounded-2xl border-2 border-orange-500/50 flex items-center justify-center">
          <div className="text-4xl sm:text-5xl font-bold text-orange-300">CASE</div>
        </div>
        {selectedCase && (
          <div className="text-orange-200 font-bold text-lg sm:text-xl px-6">
            {selectedCase.name}
          </div>
        )}
      </div>
    )}
    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
    <motion.div
      className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/20 to-amber-500/20"
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 2, repeat: Infinity }}
    />
  </motion.div>
);

// Shaking Case Component
const ShakingCase: React.FC<{ selectedCase: Case | null }> = ({ selectedCase }) => (
  <motion.div
    className="relative w-80 h-80 sm:w-96 sm:h-96 rounded-3xl bg-gradient-to-br from-orange-900/40 to-orange-700/40 border-3 border-orange-400 flex items-center justify-center shadow-2xl overflow-hidden"
    animate={{
      x: [0, -3, 3, -3, 3, 0],
      y: [0, -2, 2, -2, 2, 0],
      rotate: [0, -1, 1, -1, 1, 0]
    }}
    transition={{
      duration: 0.3,
      repeat: Infinity,
      repeatType: "loop"
    }}
  >
    {selectedCase?.image_url ? (
      <motion.img
        src={selectedCase.image_url}
        alt={selectedCase.name}
        className="w-full h-full object-contain rounded-2xl p-4"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      />
    ) : (
      <div className="text-center">
        <div className="w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-6 bg-gradient-to-br from-orange-600/30 to-orange-800/30 rounded-2xl border-2 border-orange-500/50 flex items-center justify-center">
          <div className="text-4xl sm:text-5xl font-bold text-orange-300">CASE</div>
        </div>
        {selectedCase && (
          <div className="text-orange-200 font-bold text-lg sm:text-xl px-6">
            {selectedCase.name}
          </div>
        )}
      </div>
    )}
    <motion.div
      className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/40 to-amber-500/40"
      animate={{ opacity: [0.3, 0.8, 0.3] }}
      transition={{ duration: 0.4, repeat: Infinity }}
    />
  </motion.div>
);

// Opening Case Component
const OpeningCase: React.FC<{ selectedCase: Case | null }> = ({ selectedCase }) => (
  <motion.div
    className="relative w-80 h-80 sm:w-96 sm:h-96 rounded-3xl flex items-center justify-center overflow-hidden"
    initial={{ scale: 1 }}
    animate={{ scale: [1, 1.1, 1] }}
    transition={{ duration: 1.2, repeat: Infinity }}
  >
    <motion.div
      className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500"
      animate={{
        opacity: [0.4, 0.9, 0.4],
        scale: [1, 1.05, 1]
      }}
      transition={{ duration: 0.8, repeat: Infinity }}
    />
          <div className="relative text-center text-white z-10">
      <motion.div
        className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-6 rounded-full border-4 border-orange-300/50"
        animate={{ rotate: [0, 180, 360] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        style={{
          background: 'linear-gradient(45deg, #f97316, #fb923c, #f97316)',
          boxShadow: '0 0 30px rgba(249, 115, 22, 0.5)'
        }}
      />
      <div className="font-bold text-lg sm:text-xl text-orange-100">Opening...</div>
    </div>
  </motion.div>
);

// Reward Reveal Component  
const RewardReveal: React.FC<{ reward: Reward | null; stage: OpeningStage; isMobile: boolean }> = ({ reward, stage, isMobile }) => {
  if (!reward) return null;

  const rarityConfig = RARITY_CONFIG[reward.rarity] || RARITY_CONFIG.common;

  return (
    <motion.div
      className="relative w-96 h-96 sm:w-[28rem] sm:h-[28rem] rounded-3xl flex items-center justify-center overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${rarityConfig.color}30, ${rarityConfig.color}50)`,
        border: `3px solid ${rarityConfig.borderColor}`,
        boxShadow: `0 0 30px ${rarityConfig.glowColor}, 0 0 60px ${rarityConfig.glowColor}`
      }}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, ease: "backOut" }}
    >
      {/* Background Effect */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle, ${rarityConfig.color}40 0%, transparent 70%)`
        }}
        animate={stage === 'celebration' ? {
          scale: [1, 1.3, 1],
          opacity: [0.6, 0.9, 0.6]
        } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      />

      {/* Reward Content */}
      <div className="relative text-center z-10 px-4">
        {/* Symbol Image or Icon */}
        <motion.div
          className="mb-4"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5, ease: "backOut" }}
        >
          <div className="w-40 h-40 sm:w-48 sm:h-48 mx-auto">
            {reward.image_url ? (
              <img 
                src={reward.image_url} 
                alt={reward.name}
                className="w-full h-full rounded-3xl object-contain border-3 p-2"
                style={{ 
                  borderColor: rarityConfig.borderColor,
                  backgroundColor: `${rarityConfig.color}20`
                }}
              />
            ) : (
              <div 
                className="w-full h-full rounded-3xl flex items-center justify-center border-3"
                style={{ 
                  backgroundColor: `${rarityConfig.color}40`,
                  borderColor: rarityConfig.borderColor,
                  background: `linear-gradient(45deg, ${rarityConfig.color}40, ${rarityConfig.color}60)`
                }}
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl" style={{ 
                  background: `linear-gradient(135deg, ${rarityConfig.color}, ${rarityConfig.borderColor})`,
                  boxShadow: `0 0 20px ${rarityConfig.glowColor}`
                }} />
              </div>
            )}
          </div>
        </motion.div>
        
        <motion.div
          className="text-white font-bold text-lg sm:text-2xl mb-2 leading-tight"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {reward.name}
        </motion.div>
        

        
        <motion.div
          className="text-orange-200 font-semibold text-base sm:text-xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          +{reward.value} Credits
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