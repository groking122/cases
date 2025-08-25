'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingButton } from '@/components/LoadingButton';
import toast from 'react-hot-toast';
import { playCaseOpeningSequence, playSound } from '@/lib/soundManager';
import SoundControls from '@/components/SoundControls';
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

// Rarity configurations - color-only display
const RARITY_CONFIG = {
  common: {
    color: '#9CA3AF',
    bgGradient: 'from-gray-500 to-gray-600',
    glowColor: '#9CA3AF80',
    borderColor: '#6B7280'
  },
  uncommon: {
    color: '#10B981',
    bgGradient: 'from-green-500 to-emerald-600',
    glowColor: '#10B98180',
    borderColor: '#059669'
  },
  rare: {
    color: '#3B82F6',
    bgGradient: 'from-blue-500 to-blue-600',
    glowColor: '#3B82F680',
    borderColor: '#2563EB'
  },
  epic: {
    color: '#EC4899',
    bgGradient: 'from-pink-500 to-purple-500',
    glowColor: '#EC489980',
    borderColor: '#DB2777'
  },
  legendary: {
    color: '#F59E0B',
    bgGradient: 'from-orange-500 to-amber-500',
    glowColor: '#F59E0B80',
    borderColor: '#D97706'
  },
  mythic: {
    color: '#EF4444',
    bgGradient: 'from-red-500 to-rose-600',
    glowColor: '#EF444480',
    borderColor: '#DC2626'
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
  const runIdRef = useRef(0)
  const timeoutsRef = useRef<number[]>([])
  const completionHandledRef = useRef<boolean>(false)

  const clearPendingTimeouts = () => {
    for (const id of timeoutsRef.current) {
      clearTimeout(id)
    }
    timeoutsRef.current = []
  }

  // Detect mobile devices for performance optimization
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile)
      clearPendingTimeouts()
    };
  }, []);

  const handleOpenCase = useCallback(async () => {
    if (isProcessing) return;
    if (!selectedCase || !connected) {
      toast.error('Please connect your wallet and select a case');
      return;
    }

    // Resolve userId on the fly if missing
    let effectiveUserId = userId as string | null
    if (!effectiveUserId) {
      try {
        const addresses = await wallet.getUsedAddresses()
        const walletAddress = addresses?.[0]
        if (walletAddress) {
          const userResponse = await fetch('/api/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress, walletType: 'mesh_connected' })
          })
          if (userResponse.ok) {
            const userData = await userResponse.json()
            effectiveUserId = userData.user?.id || null
          }
        }
      } catch (e) {
        console.error('Failed to resolve user automatically:', e)
      }
    }
    if (!effectiveUserId) {
      toast.error('User not found. Please refresh and reconnect your wallet.')
      return
    }

    if (userCredits < selectedCase.price) {
      toast.error(`Insufficient credits! You need ${selectedCase.price} credits but only have ${userCredits}.`);
      return;
    }

    // Start a fresh animation run and cancel any lingering timers
    clearPendingTimeouts()
    runIdRef.current += 1
    const thisRunId = runIdRef.current
    completionHandledRef.current = false
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken') || ''}` },
        body: JSON.stringify({
          userId: effectiveUserId,
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
      setIsProcessing(false);
    }
  }, [selectedCase, wallet, connected, userId, onCaseOpened, userCredits]);

  const isDisabled = !selectedCase || !connected || isProcessing || (selectedCase && userCredits < selectedCase.price);

  return (
    <div className="flex flex-col items-center justify-center min-h-[360px] sm:min-h-[500px] p-4 sm:p-8 bg-gradient-to-br from-gray-900 via-black to-gray-800 backdrop-blur-md rounded-2xl border border-orange-500/50 shadow-2xl">
      <div className="w-full flex justify-end mb-2">
        <SoundControls compact />
      </div>
      <AnimatePresence mode="wait">
        {/* Case Display */}
        <motion.div
          key={stage}
          className="relative mb-4 sm:mb-8"
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
            <div className="w-full max-w-lg sm:max-w-5xl mx-auto">
              <SpinningReelCarousel 
                isSpinning={true}
                winningItem={reward ? {
                  symbol: {
                    key: reward.id,
                    name: reward.name,
                    emoji: reward.name.charAt(0).toUpperCase(),
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
                  // Ensure onComplete pipeline runs only once per run
                  if (completionHandledRef.current) return
                  completionHandledRef.current = true
                  const myRun = runIdRef.current
                  console.log('🎰 Reel animation completed, transitioning to revealing')
                  
                  // Capture reward value to avoid null reference issues in setTimeout
                  const currentReward = reward;
                  
                  // Stage 4: Revealing the final reward (longer duration)
                  const t1 = window.setTimeout(() => {
                    if (runIdRef.current !== myRun) return
                    console.log('🎰 Setting stage to revealing')
                    setStage('revealing')
                    
                    // After revealing, go to celebration
                    const t2 = window.setTimeout(() => {
                      if (runIdRef.current !== myRun) return
                      console.log('🎰 Setting stage to celebration')
                      setStage('celebration')
                      // Allow opening another case without waiting the full timeout
                      setIsProcessing(false)
                      
                      // Ensure reward is still available
                      if (currentReward) {
                        // Play rarity-specific sound sequence
                        playCaseOpeningSequence(currentReward.rarity as Rarity);
                        
                        // Show success toast with clean styling
                        const rarityConfig = RARITY_CONFIG[currentReward.rarity as keyof typeof RARITY_CONFIG] || RARITY_CONFIG.common;
                        toast.success(`Reward Unlocked: ${currentReward.name} (+${currentReward.value} credits)`, {
                          id: `reward-toast-${myRun}`,
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
                      const t3 = window.setTimeout(() => {
                        if (runIdRef.current !== myRun) return
                        setStage('complete');
                        const t4 = window.setTimeout(() => {
                          if (runIdRef.current !== myRun) return
                          setStage('idle');
                          setReward(null);
                          // Re-enable after the full flow completes (safety)
                          setIsProcessing(false);
                        }, 2000); // Longer idle transition
                        timeoutsRef.current.push(t4)
                      }, 5000); // 5 seconds celebration
                      timeoutsRef.current.push(t3)
                      
                    }, 2000); // 2 seconds for revealing stage
                    timeoutsRef.current.push(t2)
                  }, 1000) // 1 second before revealing
                  timeoutsRef.current.push(t1)
                }}
                spinDuration={3500}
                stopDuration={2500}
                compact={isMobile}
              />
            </div>
          ) : stage === 'revealing' || stage === 'celebration' ? (
            <RewardReveal reward={reward} stage={stage} isMobile={isMobile} />
          ) : null}
        </motion.div>
      </AnimatePresence>

      {/* Action Button with hero CTA sizing */}
      <div className="w-full max-w-sm sm:max-w-md">
        <LoadingButton
          isLoading={isProcessing}
          loadingText={getLoadingText(stage)}
          onClick={handleOpenCase}
          disabled={isDisabled}
          className={`w-full rounded-xl font-rubik font-bold text-[clamp(1rem,0.5vw+0.9rem,1.125rem)] px-8 sm:px-10 py-3 sm:py-3.5 transition-all duration-300 relative overflow-hidden ${
            isDisabled 
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed border border-gray-600' 
              : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-2xl hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] border border-orange-500/50 transform hover:scale-[1.02] active:scale-[0.98]'
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
              {[...Array(4)].map((_, i) => (
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
    className="relative w-40 h-40 sm:w-56 sm:h-56 rounded-xl bg-gradient-to-br from-gray-800/80 to-black/80 border-2 border-orange-500/40 flex items-center justify-center shadow-xl overflow-hidden"
    whileHover={{ scale: 1.05, borderColor: '#f97316' }}
    whileTap={{ scale: 0.95 }}
    transition={{ duration: 0.3 }}
  >
    {selectedCase?.image_url ? (
      <motion.img
        src={selectedCase.image_url}
        alt={selectedCase.name}
        className="w-full h-full object-cover rounded-lg"
        initial={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        transition={{ duration: 0.3 }}
      />
    ) : (
      <div className="text-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 bg-gradient-to-br from-orange-600/40 to-orange-800/60 rounded-lg border border-orange-500/50 flex items-center justify-center">
          <div className="text-2xl sm:text-3xl">📦</div>
        </div>
        {selectedCase && (
          <div className="text-white font-semibold text-sm sm:text-base px-2">
            {selectedCase.name}
          </div>
        )}
      </div>
    )}
    <motion.div
      className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/20 to-orange-600/20"
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 2, repeat: Infinity }}
    />
  </motion.div>
);

// Shaking Case Component
const ShakingCase: React.FC<{ selectedCase: Case | null }> = ({ selectedCase }) => (
  <motion.div
    className="relative w-40 h-40 sm:w-56 sm:h-56 rounded-xl bg-gradient-to-br from-gray-800/80 to-black/80 border-2 border-orange-400 flex items-center justify-center shadow-xl overflow-hidden"
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
        className="w-full h-full object-cover rounded-lg"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      />
    ) : (
      <div className="text-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 bg-gradient-to-br from-orange-600/40 to-orange-800/60 rounded-lg border border-orange-500/50 flex items-center justify-center">
          <div className="text-2xl sm:text-3xl">📦</div>
        </div>
        {selectedCase && (
          <div className="text-white font-semibold text-sm sm:text-base px-2">
            {selectedCase.name}
          </div>
        )}
      </div>
    )}
    <motion.div
      className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/40 to-orange-600/40"
      animate={{ opacity: [0.3, 0.8, 0.3] }}
      transition={{ duration: 0.4, repeat: Infinity }}
    />
  </motion.div>
);

// Opening Case Component
const OpeningCase: React.FC<{ selectedCase: Case | null }> = ({ selectedCase }) => (
  <motion.div
    className="relative w-40 h-40 sm:w-56 sm:h-56 rounded-xl flex items-center justify-center overflow-hidden"
    initial={{ scale: 1 }}
    animate={{ scale: [1, 1.1, 1] }}
    transition={{ duration: 1.2, repeat: Infinity }}
  >
    <motion.div
      className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600"
      animate={{
        opacity: [0.4, 0.9, 0.4],
        scale: [1, 1.05, 1]
      }}
      transition={{ duration: 0.8, repeat: Infinity }}
    />
    <div className="relative text-center text-white z-10">
      <motion.div
        className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 rounded-full border-4 border-orange-300/50 bg-gradient-to-br from-orange-600/40 to-orange-800/60 flex items-center justify-center"
        animate={{ rotate: [0, 180, 360] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        style={{
          boxShadow: '0 0 30px rgba(249, 115, 22, 0.5)'
        }}
      >
        <div className="text-2xl sm:text-3xl">⚡</div>
      </motion.div>
      <div className="font-bold text-sm sm:text-base text-orange-100">Opening...</div>
    </div>
  </motion.div>
);

// Reward Reveal Component
const RewardReveal: React.FC<{ reward: Reward | null; stage: OpeningStage; isMobile: boolean }> = ({ reward, stage, isMobile }) => {
  if (!reward) return null;

  const rarityConfig = RARITY_CONFIG[reward.rarity] || RARITY_CONFIG.common;

  return (
    <motion.div
      className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-2xl flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-800/90 to-black/90"
      style={{
        border: `3px solid ${rarityConfig.color}`,
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
          background: `radial-gradient(circle, ${rarityConfig.color}20 0%, transparent 70%)`
        }}
        animate={stage === 'celebration' ? {
          scale: [1, 1.3, 1],
          opacity: [0.6, 0.9, 0.6]
        } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      />

      {/* Reward Content */}
      <div className="relative text-center z-10 px-4">
        {/* Symbol Image Container */}
        <motion.div
          className="mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5, ease: "backOut" }}
        >
          <div className="w-32 h-32 sm:w-40 sm:h-40 mx-auto rounded-2xl border-3 overflow-hidden" style={{ 
            borderColor: rarityConfig.color,
            backgroundColor: `${rarityConfig.color}10`
          }}>
            {reward.image_url ? (
              <img 
                src={reward.image_url} 
                alt={reward.name}
                className="w-full h-full object-contain p-2"
                style={{ 
                  filter: `drop-shadow(0 0 10px ${rarityConfig.glowColor})`
                }}
              />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center text-4xl sm:text-5xl font-bold"
                style={{ 
                  background: `linear-gradient(135deg, ${rarityConfig.color}40, ${rarityConfig.color}60)`,
                  color: '#ffffff'
                }}
              >
                {reward.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </motion.div>
        
        <motion.div
          className="text-white font-bold text-xl sm:text-2xl mb-1 leading-tight"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {reward.name}
        </motion.div>
        
        <motion.div
          className="w-20 h-6 sm:w-24 sm:h-7 mx-auto rounded-full mb-3 flex items-center justify-center text-[10px] sm:text-xs font-semibold"
          style={{ 
            background: `linear-gradient(to right, ${rarityConfig.color}, ${rarityConfig.borderColor})`,
            boxShadow: `0 0 15px ${rarityConfig.glowColor}`,
            color: '#ffffff'
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          {reward.rarity.charAt(0).toUpperCase() + reward.rarity.slice(1)}
        </motion.div>
        
        <motion.div
          className="text-orange-200 font-semibold text-base sm:text-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          +{reward.value} Credits
        </motion.div>
      </div>

      {/* Simple Celebration Effects */}
      {stage === 'celebration' && (
        <div className="absolute inset-0">
          {/* Subtle glow effect */}
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: `radial-gradient(circle, ${rarityConfig.color}40 0%, transparent 60%)`,
              border: `2px solid ${rarityConfig.color}`
            }}
            animate={{
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.05, 1]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Corner sparkles for higher rarities */}
          {['rare', 'epic', 'legendary', 'mythic'].includes(reward?.rarity || '') && (
            <>
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={`corner-${i}`}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: rarityConfig.color,
                    left: i % 2 === 0 ? '10%' : '90%',
                    top: i < 2 ? '10%' : '90%'
                  }}
                  animate={{
                    scale: [0, 1.5, 0],
                    opacity: [0, 1, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.3
                  }}
                />
              ))}
            </>
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
    case 'shaking': return '';
    case 'opening': return 'Unlocking your mystery box...';
    case 'spinning': return 'The reel is spinning...';
    case 'revealing': return 'Your reward is...';
    case 'celebration': return 'Congratulations!';
    default: return '';
  }
} 