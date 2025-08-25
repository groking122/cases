"use client"

import { useState, useEffect } from 'react'

export default function MontyPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [revealDoor, setRevealDoor] = useState<number | null>(null)
  const [firstPick, setFirstPick] = useState<number | null>(null)
  const [result, setResult] = useState<any>(null)
  const [assets, setAssets] = useState<{[k:string]: string}>({})
  const [autoPick, setAutoPick] = useState<boolean>(false)
  const [lastPaidCost, setLastPaidCost] = useState<number | null>(null)

  // Load assets + toggle on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/monty/assets', { cache: 'no-store' })
        const j = await res.json()
        if (res.ok && j?.assets) setAssets(j.assets)
      } catch {}
      // Force True Monty behavior: no UI toggle
      setAutoPick(false)
    })()
  }, [])

  const start = async () => {
    setResult(null)
    setRevealDoor(null)
    setFirstPick(null)
    const r = await fetch('/api/monty/start', { method: 'POST' })
    const j = await r.json()
    if (r.ok) {
      setSessionId(j.sessionId)
      if (typeof j.cost === 'number') setLastPaidCost(j.cost)
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
    if (r.ok) setResult(j)
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-h2 font-bold">Monty Hall</h1>
        <button onClick={start} className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-8 py-4 rounded-xl font-semibold shadow-lg">{lastPaidCost ? `Play (${lastPaidCost})` : 'Play (100)'}</button>
        {sessionId && (
          <div className="text-sm text-foreground/70">Paid: {lastPaidCost ?? 100} credits • Session: {sessionId.slice(0,8)}…</div>
        )}
        <div className="grid grid-cols-3 gap-6">
          {[0,1,2].map((d) => (
            <button
              key={d}
              disabled={!sessionId || revealDoor !== null || !!result}
              onClick={() => pick(d)}
              className={`p-6 rounded-2xl border shadow-xl transition-transform ${revealDoor === d ? 'border-red-500 bg-red-500/10' : 'border-border bg-card/60'} ${sessionId ? 'hover:scale-[1.02]' : ''}`}
            >
              {/* Before reveal: show closed */}
              {!result && revealDoor == null && (
                assets.closed ? (
                  <img src={assets.closed} alt={`Door ${d+1}`} className="w-full h-48 sm:h-56 object-cover rounded-xl" />
                ) : (
                  <div className="h-48 sm:h-56 flex items-center justify-center text-2xl">Door {d + 1}</div>
                )
              )}
              {/* After reveal dud: if this is the revealed door, show goat; else keep closed */}
              {revealDoor !== null && !result && (
                d === revealDoor
                  ? (assets.goat ? <img src={assets.goat} alt="Goat" className="w-full h-48 sm:h-56 object-cover rounded-xl"/> : <div className="h-48 sm:h-56 flex items-center justify-center text-4xl">🐐</div>)
                  : (assets.closed ? <img src={assets.closed} alt="Closed" className="w-full h-48 sm:h-56 object-cover rounded-xl"/> : <div className="h-48 sm:h-56 flex items-center justify-center text-2xl">Door {d+1}</div>)
              )}
              {/* Final: show car for winning door, goat otherwise */}
              {result && (
                d === result.finalDoor
                  ? (result.payout >= (lastPaidCost ?? 100)
                      ? (assets.car ? <img src={assets.car} alt="Car" className="w-full h-48 sm:h-56 object-cover rounded-xl"/> : <div className="h-48 sm:h-56 flex items-center justify-center text-4xl">🚗</div>)
                      : (assets.goat ? <img src={assets.goat} alt="Goat" className="w-full h-48 sm:h-56 object-cover rounded-xl"/> : <div className="h-48 sm:h-56 flex items-center justify-center text-4xl">🐐</div>)
                    )
                  : (assets.open ? <img src={assets.open} alt="Open" className="w-full h-48 sm:h-56 object-cover rounded-xl"/> : <div className="h-48 sm:h-56" />)
              )}
            </button>
          ))}
        </div>
        {revealDoor !== null && !result && (
          <div className="flex gap-3">
            <button onClick={() => decide(true)} className="px-5 py-2 rounded-lg border border-border">Switch</button>
            <button onClick={() => decide(false)} className="px-5 py-2 rounded-lg border border-border">Stay</button>
          </div>
        )}
        {result && (
          <div className="p-4 rounded-xl border border-border bg-card/60">
            <div>Final door: {Number(result.finalDoor) + 1}</div>
            <div>Payout: {result.payout}</div>
            {/* pity disabled */}
          </div>
        )}
      </div>
    </div>
  )
}


