"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import SymbolRenderer from "./SymbolRenderer"

interface Skin {
  id: string
  name: string
  rarity: string
  value: number
  image_url: string
  description: string
  collection?: string
}

interface PrizeRevealModalProps {
  isOpen: boolean
  wonSkin: Skin | null
  onClose: () => void
}

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case "common": return "from-gray-500 to-gray-600"
    case "uncommon": return "from-green-500 to-green-600"
    case "rare": return "from-blue-500 to-blue-600"
    case "epic": return "from-purple-500 to-purple-600"
    case "legendary": return "from-yellow-500 to-orange-500"
    case "mythic": return "from-pink-500 to-red-500"
    default: return "from-gray-500 to-gray-600"
  }
}

const getRarityGlow = (rarity: string) => {
  switch (rarity) {
    case "common": return "shadow-xl shadow-gray-500/30"
    case "uncommon": return "shadow-xl shadow-green-500/50"
    case "rare": return "shadow-xl shadow-blue-500/50"
    case "epic": return "shadow-xl shadow-purple-500/50"
    case "legendary": return "shadow-xl shadow-yellow-500/50"
    case "mythic": return "shadow-xl shadow-pink-500/50"
    default: return "shadow-xl shadow-gray-500/30"
  }
}

const getRarityBorder = (rarity: string) => {
  switch (rarity) {
    case "common": return "border-gray-400"
    case "uncommon": return "border-green-400"
    case "rare": return "border-blue-400"
    case "epic": return "border-purple-400"
    case "legendary": return "border-yellow-400"
    case "mythic": return "border-pink-400"
    default: return "border-gray-400"
  }
}

export function PrizeRevealModal({ 
  isOpen, 
  wonSkin, 
  onClose
}: PrizeRevealModalProps) {
  const [showDetails, setShowDetails] = useState(false)

  if (!isOpen || !wonSkin) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 50 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-8 max-w-lg w-full border border-purple-500/30 relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Background Effects */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Animated gradient background */}
            <motion.div
              className={`absolute inset-0 bg-gradient-to-br ${getRarityColor(wonSkin.rarity)} opacity-5`}
              animate={{ 
                backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] 
              }}
              transition={{ 
                duration: 10, 
                repeat: Infinity, 
                ease: "linear" 
              }}
            />
            
            {/* Floating particles */}
            <div className="absolute inset-0">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-white/20 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -30, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-8"
            >
              <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                🎉 Congratulations! 🎉
              </div>
              <div className="text-gray-400">You've won an amazing prize!</div>
            </motion.div>

            {/* Prize Display */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [0.8, 1.08, 1], opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
              className="text-center mb-8"
            >
              {/* Prize Image/Symbol */}
              <div className={`mx-auto rounded-3xl bg-gradient-to-br ${getRarityColor(wonSkin.rarity)} 
                ${getRarityGlow(wonSkin.rarity)} ${getRarityBorder(wonSkin.rarity)} border-2 
                flex items-center justify-center mb-4 relative overflow-hidden p-3`}>
                <SymbolRenderer
                  symbol={{
                    id: wonSkin.id,
                    name: wonSkin.name,
                    emoji: "🎁",
                    imageUrl: wonSkin.image_url,
                    rarity: wonSkin.rarity
                  }}
                  size={120}
                  revealAnimation
                />
                {/* Sparkles for rare+ */}
                {['rare','epic','legendary','mythic'].includes(wonSkin.rarity) && (
                  <motion.div
                    className="pointer-events-none absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1.6, repeat: 1 }}
                  >
                    {[...Array(10)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-white rounded-full"
                        style={{ left: `${Math.random()*100}%`, top: `${Math.random()*100}%` }}
                        animate={{ scale: [0, 1.6, 0], opacity: [0, 1, 0] }}
                        transition={{ duration: 0.9 + Math.random()*0.6, delay: Math.random()*0.4 }}
                      />
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Prize Details */}
              <h3 className="text-2xl font-bold text-white mb-2">{wonSkin.name}</h3>
              <div className={`inline-block px-4 py-2 rounded-full bg-gradient-to-r ${getRarityColor(wonSkin.rarity)} 
                text-white text-sm font-semibold mb-4 capitalize`}>
                {wonSkin.rarity}
              </div>
              
              <div className="text-3xl font-bold text-yellow-400 mb-2">
                💰 {wonSkin.value} Credits
              </div>
              
              <Button
                onClick={() => setShowDetails(!showDetails)}
                variant="outline"
                size="sm"
                className="text-gray-400 border-gray-600 hover:bg-gray-800"
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Button>
            </motion.div>

            {/* Details Section */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-gray-800/50 rounded-2xl p-4 mb-6 border border-gray-700"
                >
                  <div className="text-sm text-gray-300 space-y-2">
                    <div className="flex justify-between">
                      <span>Description:</span>
                      <span className="text-white">{wonSkin.description}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Collection:</span>
                      <span className="text-white">{wonSkin.collection || 'Mystery Collection'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rarity Score:</span>
                      <span className="text-white">
                        {wonSkin.rarity === 'legendary' ? '95-100' : 
                         wonSkin.rarity === 'epic' ? '80-94' : 
                         wonSkin.rarity === 'rare' ? '60-79' : 
                         wonSkin.rarity === 'uncommon' ? '30-59' : '0-29'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons - No Claim Button Needed Since Credits Already Added */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-4"
            >
              {/* Credits Already Added Notice */}
              <div className="bg-green-900/30 border border-green-500/30 p-4 rounded-2xl text-center">
                <div className="text-2xl mb-2">✅</div>
                <div className="text-lg font-bold text-white mb-1">Credits Added!</div>
                <div className="text-sm text-green-200">
                  +{wonSkin.value} credits have been instantly added to your balance
                </div>
              </div>
              
              {/* Continue Button */}
              <Button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 
                  text-white font-semibold py-4 text-lg transition-all duration-300 transform hover:scale-[1.02]"
              >
                🎮 Continue Playing
              </Button>
              
              <p className="text-xs text-gray-500 text-center">
                Your balance has been updated automatically - ready for more cases!
              </p>
            </motion.div>

            {/* Close Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-6"
            >
              <Button
                onClick={onClose}
                variant="outline"
                size="sm"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Close
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
} 