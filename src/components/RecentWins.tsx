"use client"

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SYMBOL_CONFIG, RARITY_CONFIG } from '@/lib/symbols.js';
import Image from 'next/image';

interface RecentWin {
  id: string;
  user_id: string;
  username: string;
  symbol_key: string;
  symbol_name: string;
  symbol_rarity: string;
  reward_value: number;
  multiplier: number;
  created_at: string;
  case_name?: string;
}

interface RecentWinsProps {
  maxItems?: number;
  refreshInterval?: number;
  showAnimation?: boolean;
  className?: string;
}

export function RecentWins({ 
  maxItems = 10, 
  refreshInterval = 30000, // 30 seconds
  showAnimation = true,
  className = ""
}: RecentWinsProps) {
  const [wins, setWins] = useState<RecentWin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newWinIndex, setNewWinIndex] = useState<number | null>(null);

  const fetchRecentWins = async () => {
    try {
      const response = await fetch('/api/recent-wins');
      if (!response.ok) {
        throw new Error('Failed to fetch recent wins');
      }
      
      const data = await response.json();
      
      // Check for new wins (animate new entries)
      if (wins.length > 0 && data.length > 0 && data[0].id !== wins[0]?.id) {
        setNewWinIndex(0);
        setTimeout(() => setNewWinIndex(null), 3000);
      }
      
      setWins(data.slice(0, maxItems));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recent wins');
      console.error('Error fetching recent wins:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentWins();
    
    const interval = setInterval(fetchRecentWins, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, maxItems]);

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const winTime = new Date(dateString);
    const diffInMs = now.getTime() - winTime.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat().format(amount);
  };

  const getRarityStyles = (rarity: string) => {
    const config = RARITY_CONFIG[rarity as keyof typeof RARITY_CONFIG];
    return config || RARITY_CONFIG.common;
  };

  const maskUsername = (username: string) => {
    if (username.length <= 4) return username;
    return `***${username.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-xl p-4 ${className}`}>
        <h3 className="font-bold text-lg text-white mb-4 flex items-center">
                                <span className="mr-2 text-orange-400 font-bold font-jetbrains">HOT</span>
          Recent Wins
        </h3>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center bg-gray-700 p-3 rounded-lg">
                <div className="w-10 h-10 bg-gray-600 rounded-lg mr-3"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-600 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-800 rounded-xl p-4 ${className}`}>
        <h3 className="font-bold text-lg text-white mb-4 flex items-center">
                                <span className="mr-2 text-orange-400 font-bold font-jetbrains">HOT</span>
          Recent Wins
        </h3>
        <div className="text-center text-gray-400 py-8">
          <div className="text-sm">Failed to load recent wins</div>
          <button 
            onClick={fetchRecentWins}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg text-white flex items-center">
                                <span className="mr-2 text-orange-400 font-bold font-jetbrains">HOT</span>
          Recent Wins
        </h3>
        <button 
          onClick={fetchRecentWins}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          ↻ Refresh
        </button>
      </div>
      
      {wins.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          <div className="text-sm">No recent wins yet</div>
          <div className="text-xs mt-1">Be the first to win big!</div>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {wins.map((win, index) => {
              const symbolConfig = SYMBOL_CONFIG[win.symbol_key as keyof typeof SYMBOL_CONFIG];
              const rarityStyles = getRarityStyles(win.symbol_rarity);
              const isNewWin = newWinIndex === index;
              
              return (
                <motion.div
                  key={win.id}
                  initial={showAnimation && isNewWin ? { 
                    opacity: 0, 
                    y: -20,
                    scale: 0.9,
                    backgroundColor: 'rgba(34, 197, 94, 0.3)'
                  } : false}
                  animate={showAnimation && isNewWin ? { 
                    opacity: 1, 
                    y: 0,
                    scale: 1,
                    backgroundColor: 'rgba(34, 197, 94, 0)'
                  } : {}}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={`flex items-center bg-gray-700 hover:bg-gray-600 p-3 rounded-lg transition-all duration-200 ${
                    isNewWin ? 'ring-2 ring-green-500' : ''
                  }`}
                >
                  {/* Symbol Image */}
                  <div className={`relative w-10 h-10 mr-3 rounded-lg overflow-hidden border-2 ${rarityStyles.border}`}>
                    {symbolConfig?.icon ? (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold font-jetbrains">
                        {symbolConfig.icon}
                      </div>
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${rarityStyles.gradient} flex items-center justify-center text-white text-xs font-bold`}>
                        {win.symbol_key.charAt(0).toUpperCase()}
                      </div>
                    )}
                    
                    {/* Rarity glow effect */}
                    {['epic', 'legendary'].includes(win.symbol_rarity) && (
                      <div 
                        className="absolute inset-0 rounded-lg opacity-30 blur-sm"
                        style={{ backgroundColor: rarityStyles.color }}
                      />
                    )}
                  </div>
                  
                  {/* Win Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-white text-sm truncate">
                          {maskUsername(win.username)}
                        </span>
                        {isNewWin && (
                          <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full font-bold animate-pulse">
                            NEW!
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className={`text-sm font-bold`} style={{ color: rarityStyles.color }}>
                          ×{win.multiplier || (symbolConfig?.multiplier || 1)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-300 truncate">
                          {win.symbol_name}
                        </span>
                        {win.case_name && (
                          <span className="text-xs text-gray-400">
                            • {win.case_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-yellow-400 font-medium">
                          {formatCurrency(win.reward_value)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(win.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
      
      {/* Auto-refresh indicator */}
      <div className="mt-4 text-center">
        <div className="text-xs text-gray-500">
          Auto-refreshes every {Math.floor(refreshInterval / 1000)}s
        </div>
      </div>
    </div>
  );
} 