'use client'

import { useEffect, useState } from 'react'
import { setSoundEnabled, setSoundVolume, soundManager } from '@/lib/soundManager'

interface Props {
  compact?: boolean
}

export default function SoundControls({ compact = false }: Props) {
  const [enabled, setEnabled] = useState<boolean>(true)
  const [volume, setVolume] = useState<number>(0.7)

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
        setVolume(vol)
        setSoundVolume(vol)
      }
    } catch {}
  }, [])

  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    setSoundEnabled(next)
    try { localStorage.setItem('sound_enabled', String(next)) } catch {}
  }

  const onVolume = (val: number) => {
    const vol = Math.max(0, Math.min(1, val))
    setVolume(vol)
    setSoundVolume(vol)
    try { localStorage.setItem('sound_volume', String(vol)) } catch {}
  }

  return (
    <div className={`flex items-center gap-3 ${compact ? 'text-xs' : 'text-sm'}`}>
      <button
        onClick={toggle}
        className={`px-3 py-1 rounded-lg border ${enabled ? 'border-emerald-500 text-emerald-400' : 'border-gray-600 text-gray-400'}`}
        title={enabled ? 'Mute' : 'Unmute'}
      >
        {enabled ? '🔊' : '🔇'}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => onVolume(parseFloat(e.target.value))}
        className="w-28 accent-orange-500"
        title="Volume"
      />
    </div>
  )
}


