'use client'

import { useEffect, useState } from 'react'
import { setSoundEnabled, setSoundVolume, soundManager, playSound } from '@/lib/soundManager'

interface Props {
  compact?: boolean
}

export default function SoundControls({ compact = false }: Props) {
  const [enabled, setEnabled] = useState<boolean>(true)
  // store 0-100 for better slider UX, map to 0..1 for engine
  const [volumePct, setVolumePct] = useState<number>(70)

  useEffect(() => {
    try {
      const e = localStorage.getItem('sound_enabled')
      const v = localStorage.getItem('sound_volume')
      if (e != null) {
        const val = e === 'true'
        setEnabled(val)
        setSoundEnabled(val)
      }
      if (v != null) {
        const vol = Math.max(0, Math.min(1, parseFloat(v)))
        const pct = Math.round(vol * 100)
        setVolumePct(pct)
        setSoundVolume(vol)
      }
    } catch {}
  }, [])

  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    setSoundEnabled(next)
    try { localStorage.setItem('sound_enabled', String(next)) } catch {}
    // Initialize audio context and give feedback
    soundManager.initializeOnUserGesture()
    if (next) { try { playSound('buttonClick') } catch {} }
  }

  const onVolume = (pct: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(pct)))
    setVolumePct(clamped)
    const vol = clamped / 100
    setSoundVolume(vol)
    try { localStorage.setItem('sound_volume', String(vol)) } catch {}
    soundManager.initializeOnUserGesture()
    if (enabled) { try { playSound('buttonClick') } catch {} }
  }

  return (
    <div className={`flex items-center gap-3 ${compact ? 'text-xs' : 'text-sm'}`}>
      <button
        onClick={toggle}
        className={`h-9 px-3 rounded-lg border transition-colors ${enabled ? 'border-emerald-500/70 text-emerald-400 hover:border-emerald-400' : 'border-gray-600 text-gray-400 hover:border-gray-500'}`}
        title={enabled ? 'Mute' : 'Unmute'}
      >
        {enabled ? '🔊' : '🔇'}
      </button>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={volumePct}
          onChange={(e) => onVolume(parseInt(e.target.value, 10))}
          className="w-28 accent-orange-500"
          title="Volume"
        />
        <span className="w-8 text-center tabular-nums text-foreground/70">{volumePct}%</span>
      </div>
    </div>
  )
}


