"use client"

import { useState, useEffect } from 'react'
import { authFetch } from '@/lib/authFetch'

export default function MontyPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [revealDoor, setRevealDoor] = useState<number | null>(null)
  const [firstPick, setFirstPick] = useState<number | null>(null)
  const [result, setResult] = useState<any>(null)
  const [assets, setAssets] = useState<{[k:string]: string}>({})
  const [autoPick, setAutoPick] = useState<boolean>(false)
  const [lastPaidCost, setLastPaidCost] = useState<number | null>(null)
  const [credits, setCredits] = useState<number | null>(null)
  const [assetsReady, setAssetsReady] = useState<boolean>(false)
  const [rehydrated, setRehydrated] = useState<boolean>(false)

  // Load assets + toggle on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/monty/assets', { cache: 'no-store' })
        const j = await res.json()
        if (res.ok && j?.assets) {
          setAssets(j.assets)
          // Preload images to avoid flicker
          const urls: string[] = ['closed','open','goat','car']
            .map(k => j.assets?.[k])
            .filter((u: string) => typeof u === 'string' && u.length > 0)
          if (urls.length) {
            await Promise.all(urls.map(u => new Promise<void>((resolve) => {
              const img = new Image()
              img.onload = () => resolve()
              img.onerror = () => resolve()
              img.src = u
              img.decoding = 'async'
            })))
          }
          setAssetsReady(true)
        } else {
          setAssetsReady(true)
        }
      } catch {}
      // Force True Monty behavior: no UI toggle
      setAutoPick(false)
    })()
  }, [])

  useEffect(() => { refreshCredits() }, [])

  // Rehydrate active session on mount to prevent losing a paid game on refresh
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/monty/active', { method: 'GET', cache: 'no-store' })
        const j = await r.json()
        if (r.ok && j?.session) {
          setSessionId(j.session.id)
          setFirstPick(j.session.first_pick)
          setRevealDoor(j.session.reveal_door)
        }
      } catch {}
      setRehydrated(true)
    })()
  }, [])

  const refreshCredits = async () => {
    try {
      const res = await authFetch('/api/get-credits', { method: 'POST' })
      if (res.ok) {
        const j = await res.json()
        if (typeof j.credits === 'number') {
          setCredits(j.credits)
          try { (window as any).updateWalletCredits?.(j.credits) } catch {}
        }
      }
    } catch {}
  }

  const start = async () => {
    setResult(null)
    setRevealDoor(null)
    setFirstPick(null)
    const r = await fetch('/api/monty/start', { method: 'POST' })
    const j = await r.json()
    if (r.ok) {
      setSessionId(j.sessionId)
      if (typeof j.cost === 'number') setLastPaidCost(j.cost)
      refreshCredits()
      if (autoPick) {
        // auto-pick random door
        const door = Math.floor(Math.random() * 3)
        await pick(door)
      }
    }
  }
  const pick = async (door: number) => {
    if (!sessionId) return
    setFirstPick(door)
    const r = await fetch('/api/monty/pick', { method: 'POST', body: JSON.stringify({ sessionId, firstPick: door }) })
    const j = await r.json()
    if (r.ok) setRevealDoor(j.revealDoor)
  }
  const decide = async (doSwitch: boolean) => {
    if (!sessionId) return
    const r = await fetch('/api/monty/decide', { method: 'POST', body: JSON.stringify({ sessionId, switch: doSwitch }) })
    const j = await r.json()
    if (r.ok) {
      setResult(j)
      refreshCredits()
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top bar: balance prominent + play button */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="text-sm uppercase tracking-wide text-foreground/70">Balance</span>
            <span className="text-3xl font-bold">{credits ?? '—'}</span>
            <span className="text-sm text-foreground/50">credits</span>
          </div>
          <button
            onClick={start}
            disabled={!rehydrated || (!!sessionId && !result)}
            className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-8 py-4 rounded-xl font-semibold shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {lastPaidCost ? `Play (${lastPaidCost})` : 'Play (100)'}
          </button>
        </div>
        {!!sessionId && !result && (
          <div className="text-xs text-foreground/60">Finish your current round to play again.</div>
        )}
        {sessionId && (
          <div className="text-sm text-foreground/70 flex flex-col sm:flex-row sm:items-center gap-1">
            <span>Paid: {lastPaidCost ?? 100} credits</span>
            <span className="sm:mx-2 opacity-50 hidden sm:inline">•</span>
            <span>Session: {sessionId.slice(0,8)}…</span>
          </div>
        )}
        <div className="grid grid-cols-3 gap-6">
          {[0,1,2].map((d) => (
            <button
              key={d}
              disabled={!rehydrated || !sessionId || revealDoor !== null || !!result || !assetsReady}
              onClick={() => pick(d)}
              className={`p-6 rounded-2xl border shadow-xl transition-transform ${revealDoor === d ? 'border-red-500 bg-red-500/10' : 'border-border bg-card/60'} ${sessionId ? 'hover:scale-[1.02]' : ''} ${result && d === (result as any).finalDoor && (Number((result as any).payout) >= (lastPaidCost ?? 100) ? 'border-green-500 bg-green-500/10' : '')}`}
            >
              {/* Before reveal: show closed (no text fallback to avoid flicker) */}
              {!result && revealDoor == null && (
                assetsReady && assets.closed ? (
                  <img src={assets.closed} alt="Closed" className="w-full h-64 sm:h-72 object-cover rounded-2xl" loading="eager" decoding="async" />
                ) : (
                  <div className="w-full h-64 sm:h-72 rounded-2xl bg-foreground/10 animate-pulse" />
                )
              )}
              {/* After reveal dud: if this is the revealed door, show goat; else keep closed */}
              {revealDoor !== null && !result && (
                d === revealDoor
                  ? (assets.goat ? <img src={assets.goat} alt="Goat" className="w-full h-64 sm:h-72 object-cover rounded-2xl" loading="eager" decoding="async"/> : <div className="h-64 sm:h-72 flex items-center justify-center text-4xl">🐐</div>)
                  : (assets.closed ? <img src={assets.closed} alt="Closed" className="w-full h-64 sm:h-72 object-cover rounded-2xl" loading="eager" decoding="async"/> : <div className="w-full h-64 sm:h-72 rounded-2xl bg-foreground/10" />)
              )}
              {/* Final: show car for winning door, goat otherwise */}
              {result && (
                d === result.finalDoor
                  ? (result.payout >= (lastPaidCost ?? 100)
                      ? (assets.car ? <img src={assets.car} alt="Car" className="w-full h-64 sm:h-72 object-cover rounded-2xl"/> : <div className="h-64 sm:h-72 flex items-center justify-center text-4xl">🚗</div>)
                      : (assets.goat ? <img src={assets.goat} alt="Goat" className="w-full h-64 sm:h-72 object-cover rounded-2xl"/> : <div className="h-64 sm:h-72 flex items-center justify-center text-4xl">🐐</div>)
                    )
                  : (assets.open ? <img src={assets.open} alt="Open" className="w-full h-64 sm:h-72 object-cover rounded-2xl"/> : <div className="w-full h-64 sm:h-72" />)
              )}
            </button>
          ))}
        </div>
        {revealDoor !== null && !result && (
          <div className="flex gap-4">
            <button onClick={() => decide(true)} className="px-6 py-3 rounded-xl border border-border font-semibold">Switch</button>
            <button onClick={() => decide(false)} className="px-6 py-3 rounded-xl border border-border font-semibold">Stay</button>
          </div>
        )}
        {!result && sessionId && rehydrated && revealDoor == null && (
          <div className="text-sm text-foreground/70">Pick a door to continue your active game.</div>
        )}
        {result && (
          Number(result.payout) >= (lastPaidCost ?? 100) ? (
            <div className="p-6 rounded-2xl border bg-gradient-to-r from-emerald-600/20 to-lime-500/20 border-emerald-500">
              <div className="text-lg font-semibold text-emerald-400">You won!</div>
              <div className="text-3xl font-bold">+{Number(result.payout)} credits</div>
              <div className="text-sm text-foreground/70 mb-3">Final door: {Number(result.finalDoor) + 1}</div>
              <div className="flex gap-3">
                <button onClick={start} className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold">Play again</button>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl border border-border bg-card/60">
              <div className="text-lg font-semibold text-foreground/80">Round finished</div>
              <div className="text-2xl font-bold">Payout: {Number(result.payout)}</div>
              <div className="text-sm text-foreground/70 mb-3">Final door: {Number(result.finalDoor) + 1}</div>
              <div className="flex gap-3">
                <button onClick={start} className="px-6 py-3 rounded-xl border border-border font-semibold">Play again</button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}


