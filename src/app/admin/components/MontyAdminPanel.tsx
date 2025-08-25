"use client"

import { useEffect, useState } from 'react'
import { ImageUpload } from '@/components/ImageUpload'

export default function MontyAdminPanel() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assets, setAssets] = useState<{ closed: string; open: string; goat: string; car: string }>({ closed: '', open: '', goat: '', car: '' })
  const [autoPick, setAutoPick] = useState<boolean>(false)
  const [isTrue, setIsTrue] = useState<boolean>(true)
  const [cost, setCost] = useState<number>(100)
  const [win, setWin] = useState<number>(118)
  const [lose, setLose] = useState<number>(40)
  const [rtp, setRtp] = useState<number | null>(null)

  const authHeader = { 'Authorization': `Bearer ${localStorage.getItem('adminToken') || ''}` }

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const [aRes, sRes] = await Promise.all([
          fetch('/api/admin/monty-assets', { headers: authHeader }),
          fetch('/api/admin/monty-settings', { headers: authHeader }),
        ])
        const aJ = await aRes.json().catch(() => ({}))
        if (aRes.ok && Array.isArray(aJ.data)) {
          const map: any = { closed: '', open: '', goat: '', car: '' }
          for (const row of aJ.data) map[row.key] = row.url
          setAssets(map)
        }
        const sJ = await sRes.json().catch(() => ({}))
        if (sRes.ok && sJ?.data) {
          const d = sJ.data
          setIsTrue(Boolean(d.is_true_monty))
          setCost(Number(d.cost || 100))
          setWin(Number(d.payout_win || 118))
          setLose(Number(d.payout_lose || 40))
          if (typeof sJ.rtp === 'number') setRtp(Number(sJ.rtp))
        }
        try { setAutoPick(localStorage.getItem('monty:autoPick') === 'true') } catch {}
      } catch (e: any) {
        setError(e?.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Monty Hall</h2>
        {rtp !== null && (
          <div className="text-sm text-foreground/70">Current RTP: {(rtp*100).toFixed(2)}%</div>
        )}
      </div>
      {loading && <div className="text-sm text-foreground/60">Loading…</div>}
      {error && <div className="text-sm text-red-400">{error}</div>}

      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-lg font-semibold mb-3">Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <label className="text-sm">True Monty (switch matters)
            <input type="checkbox" className="ml-2" checked={isTrue} onChange={(e)=> setIsTrue(e.target.checked)} />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-foreground/60">Cost</div>
              <input type="number" value={cost} onChange={(e)=> setCost(Number(e.target.value)||0)} className="w-full bg-background border border-border rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <div className="text-xs text-foreground/60">Win (car)</div>
              <input type="number" value={win} onChange={(e)=> setWin(Number(e.target.value)||0)} className="w-full bg-background border border-border rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <div className="text-xs text-foreground/60">Lose (goat)</div>
              <input type="number" value={lose} onChange={(e)=> setLose(Number(e.target.value)||0)} className="w-full bg-background border border-border rounded px-2 py-1 text-sm" />
            </div>
          </div>
          <label className="text-sm">Use auto-pick
            <input type="checkbox" className="ml-2" checked={autoPick} onChange={(e)=> { setAutoPick(e.target.checked); try { localStorage.setItem('monty:autoPick', String(e.target.checked)) } catch {} }} />
          </label>
        </div>
        <button
          onClick={async () => {
            try {
              const res = await fetch('/api/admin/monty-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader },
                body: JSON.stringify({ is_true_monty: isTrue, cost, payout_win: win, payout_lose: lose })
              })
              const j = await res.json()
              if (res.ok && j.success) {
                if (typeof j.rtp === 'number') setRtp(Number(j.rtp))
                alert(`Settings saved. RTP: ${(Number(j.rtp||0)*100).toFixed(2)}%`)
              } else {
                alert(`Failed: ${j.error || res.statusText}`)
              }
            } catch (e: any) {
              alert(e?.message || 'Failed')
            }
          }}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
        >
          Save Settings
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-lg font-semibold mb-3">Assets</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['closed','open','goat','car'] as const).map((k) => (
            <div key={k} className="border border-border rounded-lg p-4">
              <div className="text-sm font-medium mb-2 capitalize">{k} image</div>
              <ImageUpload
                onUpload={(url) => setAssets(prev => ({ ...prev, [k]: url }))}
                folder="icons"
                isAdmin={true}
                currentImage={assets[k]}
                buttonText="Upload"
              />
            </div>
          ))}
        </div>
        <button
          onClick={async () => {
            try {
              const items = Object.entries(assets).filter(([,u]) => !!u).map(([key, url]) => ({ key, url }))
              const res = await fetch('/api/admin/monty-assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader },
                body: JSON.stringify({ items })
              })
              const j = await res.json()
              if (res.ok && j.success) alert('Assets saved')
              else alert(`Failed: ${j.error || res.statusText}`)
            } catch (e: any) {
              alert(e?.message || 'Failed')
            }
          }}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Save Assets
        </button>
      </div>
    </div>
  )
}


