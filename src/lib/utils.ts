import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency === "ADA" ? "USD" : currency === "ETH" ? "USD" : currency,
    minimumFractionDigits: currency === "ADA" || currency === "ETH" ? 4 : 2,
  }).format(amount)
}

export function formatPoints(points: number): string {
  if (points >= 1000000) {
    return `${(points / 1000000).toFixed(1)}M`
  } else if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}K`
  }
  return points.toString()
}

export function getRarityColor(rarity: string): string {
  switch (rarity.toLowerCase()) {
    case "common":
      return "text-gray-500"
    case "uncommon":
      return "text-green-500"
    case "rare":
      return "text-blue-500"
    case "epic":
      return "text-purple-500"
    case "legendary":
      return "text-orange-500"
    case "mythic":
      return "text-red-500"
    default:
      return "text-gray-500"
  }
} 