"use client"

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
// Removed hardcoded symbols import - using database data instead
import Image from 'next/image';

interface CaseOpenerProps {
  caseData: {
    id: string;
    name: string;
    price: number;
    image_url: string;
    description?: string;
  };
  userId: string;
  userBalance: number;
  onBalanceUpdate: (newBalance: number) => void;
  onOpeningComplete?: (result: any) => void;
}

interface OpeningResult {
  success: boolean;
  symbol: {
    key: string;
    name: string;
    rarity: string;
    multiplier: number;
    color: string;
    effect: string;
    image: string;
  };
  winnings: number;
  netResult: number;
  isProfit: boolean;
  newBalance: number;
  achievements?: string[];
  streakInfo?: {
    streakCount: number;
    streakType: string;
    bonus: number;
  };
}

export function CaseOpener({ 
  caseData, 
  userId, 
  userBalance, 
  onBalanceUpdate,
  onOpeningComplete 
}: CaseOpenerProps) {
  const [isOpening, setIsOpening] = useState(false);
  const [result, setResult] = useState<OpeningResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [animations, setAnimations] = useState({
    shake: false,
    glow: false,
    particles: false
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canAfford = userBalance >= caseData.price;

  // Cleanup result after showing
  useEffect(() => {
    if (showResult && result) {
      const timer = setTimeout(() => {
        setShowResult(false);
        setResult(null);
      }, 10000); // Show for 10 seconds

      return () => clearTimeout(timer);
    }
  }, [showResult, result]);

  const playSound = (soundPath: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.src = soundPath;
        audioRef.current.play().catch(console.warn);
      }
    } catch (error) {
      console.warn('Could not play sound:', error);
    }
  };

  const triggerConfetti = () => {
    // For now, we'll use a simple CSS animation
    // In a real implementation, you might use canvas-confetti library
    const confettiEvent = new CustomEvent('confetti');
    window.dispatchEvent(confettiEvent);
  };

  const openCase = async () => {
    if (isOpening || !canAfford) return;
    
    setIsOpening(true);
    setResult(null);
    setShowResult(false);
    
    // Start case animation
    setAnimations({ shake: true, glow: false, particles: false });
    
    try {
      const clientSeed = Math.random().toString(36).substring(2, 15);
      
      const response = await fetch('/api/open-case-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId,
          caseId: caseData.id,
          clientSeed
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to open case');
      }
      
      const data: OpeningResult = await response.json();
      
      // Simulate opening animation delay
      setTimeout(() => {
        setResult(data);
        setShowResult(true);
        onBalanceUpdate(data.newBalance);
        
        // Trigger appropriate effects based on database symbol rarity
        if (data.symbol) {
          // Trigger visual effects based on rarity
          switch (data.symbol.rarity) {
            case 'legendary':
            case 'epic':
              triggerConfetti();
              setAnimations({ shake: true, glow: true, particles: true });
              break;
            case 'rare':
              setAnimations({ shake: false, glow: true, particles: true });
              break;
            case 'uncommon':
              setAnimations({ shake: false, glow: true, particles: false });
              break;
            default:
              setAnimations({ shake: false, glow: false, particles: false });
          }
        }
        
        // Call completion callback
        if (onOpeningComplete) {
          onOpeningComplete(data);
        }
        
      }, 2000); // 2 second animation
      
    } catch (error) {
      console.error('Case opening failed:', error);
      setResult({
        success: false,
        symbol: { key: '', name: 'Error', rarity: 'common', multiplier: 0, color: '#ff0000', effect: 'none', image: '' },
        winnings: 0,
        netResult: 0,
        isProfit: false,
        newBalance: userBalance
      });
      setShowResult(true);
    } finally {
      setTimeout(() => {
        setIsOpening(false);
        setAnimations({ shake: false, glow: false, particles: false });
      }, 2500);
    }
  };

  const getRarityStyles = (rarity: string) => {
    const config = RARITY_CONFIG[rarity as keyof typeof RARITY_CONFIG];
    return config || RARITY_CONFIG.common;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat().format(amount);
  };

  return (
    <div className="relative max-w-md mx-auto p-6 bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl border border-gray-700">
      {/* Audio element for sound effects */}
      <audio ref={audioRef} preload="none" />
      
      {/* Balance Display */}
      <div className="text-center mb-6">
        <div className="text-2xl font-bold text-white mb-2">
          Credits: {formatCurrency(userBalance)}
        </div>
        <div className="text-sm text-gray-400">
          Case Cost: {formatCurrency(caseData.price)}
        </div>
      </div>
      
      {/* Case Display */}
      <div className="relative mb-8">
        <motion.div
          animate={animations.shake ? { 
            rotate: [0, -5, 5, -5, 5, 0],
            y: [0, -10, 0, -5, 0],
            scale: [1, 1.05, 1]
          } : {}}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className={`relative w-64 h-64 mx-auto cursor-pointer transition-all duration-300 ${
            animations.glow ? 'drop-shadow-2xl' : ''
          }`}
          onClick={openCase}
        >
          {caseData.image_url ? (
            <Image
              src={caseData.image_url}
              alt={caseData.name}
              fill
              className="object-contain rounded-lg"
              sizes="256px"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-700 rounded-lg border-2 border-dashed border-gray-500">
              <div className="text-center text-gray-400">
                <div className="text-4xl mb-2">📦</div>
                <div className="text-sm">Case Image</div>
              </div>
            </div>
          )}
          
          {/* Glow effect */}
          {animations.glow && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg opacity-50 blur-xl"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
          
          {/* Particles effect */}
          {animations.particles && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                  initial={{ 
                    x: Math.random() * 256, 
                    y: Math.random() * 256,
                    opacity: 0,
                    scale: 0
                  }}
                  animate={{ 
                    y: -50,
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    delay: i * 0.1,
                    ease: "easeOut"
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>
        
        <div className="text-center mt-4">
          <h3 className="text-xl font-bold text-white">{caseData.name}</h3>
          {caseData.description && (
            <p className="text-sm text-gray-400 mt-1">{caseData.description}</p>
          )}
        </div>
      </div>

      {/* Open Button */}
      <Button
        onClick={openCase}
        disabled={isOpening || !canAfford}
        className={`w-full h-12 text-lg font-bold transition-all duration-300 ${
          isOpening 
            ? 'bg-gray-600 cursor-not-allowed' 
            : canAfford
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-105'
              : 'bg-gray-600 cursor-not-allowed opacity-50'
        }`}
      >
        {isOpening ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Opening...
          </div>
        ) : !canAfford ? (
          'Insufficient Credits'
        ) : (
          `Open Case (${formatCurrency(caseData.price)} credits)`
        )}
      </Button>

      {/* Result Display */}
      <AnimatePresence>
        {showResult && result && result.success && (
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: -20 }}
            transition={{ type: "spring", damping: 15 }}
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
            onClick={() => setShowResult(false)}
          >
            <motion.div
              className={`relative p-8 rounded-2xl border-4 max-w-sm mx-4 ${
                getRarityStyles(result.symbol.rarity).border
              } bg-gradient-to-br ${getRarityStyles(result.symbol.rarity).gradient}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button 
                onClick={() => setShowResult(false)}
                className="absolute top-2 right-2 text-white hover:text-gray-300 text-2xl"
              >
                ×
              </button>
              
              <div className="text-center text-white">
                <div className="text-2xl font-bold mb-4">
                  {result.symbol.name}
                </div>
                
                <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
                  {result.symbol.image_url ? (
                    <img 
                      src={result.symbol.image_url} 
                      alt={result.symbol.name}
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="text-8xl">
                      {result.symbol.image || '❓'}
                    </div>
                  )}
                </div>
                
                <div className="text-4xl font-bold text-yellow-300 mb-4">
                  ×{result.symbol.multiplier}
                </div>
                
                <div className="space-y-1 text-base">
                  <div className={`text-2xl font-bold ${result.isProfit ? 'text-green-400' : 'text-red-400'}`}>
                    {result.isProfit ? '+' : ''}{formatCurrency(result.netResult)}
                  </div>
                  <div className="text-gray-400 text-sm">Balance: {formatCurrency(result.newBalance)}</div>
                </div>
                
                {/* Simplified achievements - only show major ones */}
                {result.achievements && result.achievements.length > 0 && (
                  <div className="mt-3 flex justify-center">
                    <div className="text-yellow-400 text-sm">
                      🏆 {result.achievements[0]}
                    </div>
                  </div>
                )}
                    <div className="text-sm font-bold text-blue-300">
                      {result.streakInfo.streakType === 'win' ? '🔥' : '💪'} 
                      {result.streakInfo.streakCount} {result.streakInfo.streakType} streak!
                    </div>
                    {result.streakInfo.bonus > 0 && (
                      <div className="text-xs text-blue-200">
                        Bonus: +{result.streakInfo.bonus} credits
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 