"use client"

import { useState } from 'react'

export default function MontyPage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [revealDoor, setRevealDoor] = useState<number | null>(null)
  const [firstPick, setFirstPick] = useState<number | null>(null)
  const [result, setResult] = useState<any>(null)

  const start = async () => {
    setResult(null)
    setRevealDoor(null)
    setFirstPick(null)
    const r = await fetch('/api/monty/start', { method: 'POST' })
    const j = await r.json()
    if (r.ok) setSessionId(j.sessionId)
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
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-h2 font-bold">Monty Hall</h1>
        <button onClick={start} className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-xl font-semibold">Play (100)</button>
        <div className="grid grid-cols-3 gap-4">
          {[0,1,2].map((d) => (
            <button
              key={d}
              disabled={!sessionId || revealDoor !== null || !!result}
              onClick={() => pick(d)}
              className={`p-6 rounded-xl border ${revealDoor === d ? 'border-red-500 bg-red-500/10' : 'border-border bg-card/60'}`}
            >
              Door {d + 1}
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


