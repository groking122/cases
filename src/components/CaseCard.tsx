"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import Image from "next/image"

interface CaseCardProps {
  id: string
  name: string
  description?: string
  imageUrl: string
  price: number
  maxRewards: number
  isPremiumOnly: boolean
  isActive: boolean
  onOpenCase: (caseId: string) => void
  className?: string
}

export function CaseCard({
  id,
  name,
  description,
  imageUrl,
  price,
  maxRewards,
  isPremiumOnly,
  isActive,
  onOpenCase,
  className,
}: CaseCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300 ${className}`}
    >
      {isPremiumOnly && (
        <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
          PREMIUM
        </div>
      )}
      
      <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden">
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover transition-transform duration-300 hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-bold text-white">{name}</h3>
          {description && (
            <p className="text-sm text-gray-400 mt-1">{description}</p>
          )}
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <div>
            <span className="text-gray-400">Price:</span>
            <span className="text-green-400 font-semibold ml-1">
              {formatCurrency(price, "ETH")}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Max Rewards:</span>
            <span className="text-blue-400 font-semibold ml-1">
              {formatCurrency(maxRewards, "ETH")}
            </span>
          </div>
        </div>
        
        <Button
          variant={isPremiumOnly ? "premium" : "case"}
          size="lg"
          className="w-full"
          disabled={!isActive}
          onClick={() => onOpenCase(id)}
        >
          {!isActive ? "Coming Soon" : "Open Case"}
        </Button>
      </div>
    </motion.div>
  )
} 