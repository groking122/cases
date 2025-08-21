"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { authFetch } from '@/lib/authFetch'

type Quote = {
  credits: number
  cashoutRate: number
  grossAda: number
  fees: { platformFee: number; networkFee: number }
  netAda: number
}

export function WithdrawDialog({ open, onClose, maxWithdrawable, userId, defaultAddress }: {
  open: boolean
  onClose: () => void
  maxWithdrawable: number
  userId: string
  defaultAddress?: string
}) {
  const [credits, setCredits] = useState<number>(0)
  const [addr, setAddr] = useState<string>(defaultAddress || '')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  if (!open) return null

  const getQuote = async () => {
    setLoading(true); setError(null); setSuccessMsg(null)
    try {
      const res = await authFetch('/api/withdraw/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, credits })
      })
      const j = await res.json()
      if (!res.ok) { setError(j.error || 'Failed to get quote'); setQuote(null) }
      else setQuote(j)
    } catch (e: any) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const submit = async () => {
    setLoading(true); setError(null); setSuccessMsg(null)
    try {
      const res = await authFetch('/api/withdraw/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, credits, toAddress: addr })
      })
      const j = await res.json()
      if (!res.ok) { setError(j.error || 'Withdraw failed') }
      else {
        setSuccessMsg('Withdrawal submitted successfully!')
        setQuote(null)
        setCredits(0)
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg"
      >
        <div className="text-xl font-bold mb-2">Withdraw to Cardano</div>
        <div className="text-sm mb-3 text-foreground/70">Withdrawable credits: <b>{maxWithdrawable.toLocaleString()}</b></div>

        <div className="grid gap-3 mb-4">
          <input
            type="number"
            min={0}
            max={maxWithdrawable}
            value={credits}
            onChange={(e) => setCredits(parseInt(e.target.value) || 0)}
            className="w-full rounded-lg px-3 py-2 bg-background border border-border"
            placeholder="Credits to withdraw"
          />
          <input
            type="text"
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            className="w-full rounded-lg px-3 py-2 bg-background border border-border"
            placeholder="Your ADA address (addr1...)"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={getQuote}
            disabled={!credits || !addr || loading}
            className="flex-1 rounded-lg py-2 bg-amber-500 text-black font-semibold disabled:opacity-60"
          >
            {loading ? 'Please wait...' : 'Get Quote'}
          </button>
          <button onClick={onClose} className="px-4 rounded-lg border border-border">Close</button>
        </div>

        {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
        {successMsg && <div className="mt-3 text-sm text-green-400">{successMsg}</div>}

        {quote && (
          <div className="mt-4 text-sm space-y-1">
            <div className="flex justify-between"><span>Cashout rate</span><b>{quote.cashoutRate.toFixed(6)} ADA/credit</b></div>
            <div className="flex justify-between"><span>Gross</span><b>{quote.grossAda.toFixed(6)} ADA</b></div>
            <div className="flex justify-between"><span>Platform fee</span><b>-{quote.fees.platformFee.toFixed(6)} ADA</b></div>
            <div className="flex justify-between"><span>Network fee</span><b>-{quote.fees.networkFee.toFixed(6)} ADA</b></div>
            <div className="flex justify-between text-lg"><span>Net payout</span><b>{quote.netAda.toFixed(6)} ADA</b></div>
            <button
              onClick={submit}
              disabled={loading}
              className="w-full rounded-lg py-2 bg-green-600 font-semibold mt-2 disabled:opacity-60"
            >
              {loading ? 'Submitting...' : 'Confirm Withdraw'}
            </button>
            <p className="text-xs text-foreground/60 mt-2">
              Cash-out rate includes a 3% spread. A 1% platform fee and Cardano network fee apply. Bonus credits are not withdrawable.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}


