"use client"

import { motion, AnimatePresence } from "framer-motion"

type CaseSymbol = {
  symbolId: string
  weight: number
  symbol: {
    key: string
    name: string
    emoji?: string
    imageUrl: string | null
    rarity: string
  }
}

interface CaseOddsModalProps {
  isOpen: boolean
  onClose: () => void
  caseName: string
  symbols: CaseSymbol[]
}

export default function CaseOddsModal({ isOpen, onClose, caseName, symbols }: CaseOddsModalProps) {
  const totalWeight = symbols.reduce((sum, s) => sum + (Number(s.weight) || 0), 0)
  const rows = symbols
    .map(s => ({
      name: s.symbol?.name || "Unknown",
      rarity: s.symbol?.rarity || "common",
      imageUrl: s.symbol?.imageUrl || null,
      weight: Number(s.weight) || 0,
      probability: totalWeight > 0 ? (Number(s.weight) / totalWeight) * 100 : 0,
    }))
    .sort((a, b) => b.probability - a.probability)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="font-semibold text-lg text-foreground">{caseName} — Drop Odds</div>
              <button onClick={onClose} className="text-foreground/60 hover:text-foreground">✕</button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto">
              {totalWeight <= 0 ? (
                <div className="text-foreground/70">No symbols configured for this case.</div>
              ) : (
                <div className="space-y-3">
                  {rows.map((row, idx) => (
                    <div
                      key={`${row.name}-${idx}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/70 bg-background/40"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-border/70 bg-background/60 flex items-center justify-center">
                          {row.imageUrl ? (
                            <img src={row.imageUrl} alt={row.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg">🎲</span>
                          )}
                        </div>
                        <div>
                          <div className="text-foreground font-medium leading-tight">{row.name}</div>
                          <div className="text-xs text-foreground/60 capitalize">{row.rarity}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-foreground font-semibold">
                          {row.probability.toFixed(2)}%
                        </div>
                        <div className="text-[10px] text-foreground/50">weight {row.weight}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-border text-xs text-foreground/60">
              Probabilities are derived from configured weights. If weights sum to 100, these are exact percentages; otherwise they are normalized.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}


