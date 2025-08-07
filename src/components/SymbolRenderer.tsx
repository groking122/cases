"use client"

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useState } from 'react'

interface SymbolRendererProps {
  symbol: {
    id: string
    name: string
    emoji: string
    imageUrl?: string | null
    rarity: string
  }
  size?: number
  revealAnimation?: boolean
  className?: string
}

const SymbolRenderer = ({ 
  symbol, 
  size = 100,
  revealAnimation = false,
  className = ""
}: SymbolRendererProps) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  // Rarity-based styles - Dark minimal theme
  const rarityStyles = {
    common: 'border-gray-600 bg-black/60 shadow-lg shadow-gray-500/20',
    uncommon: 'border-green-400 bg-black/70 shadow-lg shadow-green-400/30',
    rare: 'border-blue-400 bg-black/70 shadow-lg shadow-blue-400/30',
    epic: 'border-purple-400 border-2 bg-black/80 shadow-xl shadow-purple-400/40',
    legendary: 'border-yellow-400 border-2 bg-black/90 shadow-2xl shadow-yellow-400/50'
  }

  // Animation variants
  const revealVariants = {
    hidden: { 
      scale: 0.5, 
      opacity: 0, 
      rotate: -30,
      y: 20
    },
    visible: { 
      scale: 1, 
      opacity: 1, 
      rotate: 0,
      y: 0
    }
  }

  const revealTransition = { 
    type: "spring" as const, 
    stiffness: 300, 
    damping: 15,
    duration: 0.6
  }

  // Preload image if available
  useEffect(() => {
    if (symbol.imageUrl && !imageError) {
      setIsLoaded(false)
      const img = document.createElement('img')
      img.src = symbol.imageUrl
      img.onload = () => setIsLoaded(true)
      img.onerror = () => setImageError(true)
    }
  }, [symbol.imageUrl, imageError])

  const shouldUseImage = symbol.imageUrl && symbol.imageUrl.trim() !== '' && isLoaded && !imageError

  return (
    <motion.div
      className={`relative flex items-center justify-center rounded-xl p-4 transition-all duration-500 ${
        rarityStyles[symbol.rarity as keyof typeof rarityStyles] || rarityStyles.common
      } ${className} backdrop-blur-sm`}
      style={{ width: size, height: size }}
      variants={revealAnimation ? revealVariants : undefined}
      initial={revealAnimation ? "hidden" : undefined}
      animate={revealAnimation ? "visible" : undefined}
      transition={revealAnimation ? revealTransition : undefined}
      whileHover={{ scale: 1.08, y: -4, rotateY: 5 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Main content */}
      <div className="relative w-full h-full flex items-center justify-center">
        {shouldUseImage ? (
          <div className="relative w-full h-full overflow-hidden rounded-lg">
            <Image 
              src={symbol.imageUrl!}
              alt={symbol.name}
              fill
              className="symbol-image"
              quality={100}
              sizes={`${size}px`}
            />
          </div>
        ) : (
          <motion.div 
            className="text-center select-none"
            style={{ fontSize: size * 0.4 }}
            animate={
              symbol.rarity === 'legendary' 
                ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }
                : symbol.rarity === 'epic'
                ? { scale: [1, 1.05, 1] }
                : {}
            }
            transition={{ duration: 2, repeat: Infinity }}
          >
            {symbol.icon || symbol.name.charAt(0)}
          </motion.div>
        )}
      </div>
      
      {/* Rarity indicator */}
      <motion.div 
        className={`absolute bottom-1 left-1 text-xs font-bold px-2 py-1 rounded-full ${
          symbol.rarity === 'legendary' ? 'text-yellow-300 bg-yellow-900/50' : 
          symbol.rarity === 'epic' ? 'text-purple-300 bg-purple-900/50' : 
          symbol.rarity === 'rare' ? 'text-blue-300 bg-blue-900/50' :
          symbol.rarity === 'uncommon' ? 'text-green-300 bg-green-900/50' :
          'text-gray-300 bg-gray-900/50'
        }`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: revealAnimation ? 0.3 : 0 }}
      >
        {symbol.rarity.slice(0, 3).toUpperCase()}
      </motion.div>

      {/* Special effects for high rarities */}
      {symbol.rarity === 'legendary' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent rounded-lg"
          animate={{
            x: [-size, size],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      )}

      {symbol.rarity === 'epic' && (
        <motion.div
          className="absolute inset-0 bg-purple-500/10 rounded-lg"
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Loading indicator for images */}
      {symbol.imageUrl && !isLoaded && !imageError && (
        <motion.div
          className="absolute inset-0 bg-gray-900/80 rounded-lg flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      )}
    </motion.div>
  )
}

export default SymbolRenderer 