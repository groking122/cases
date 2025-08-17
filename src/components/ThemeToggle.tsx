"use client"

import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null
    const startDark = saved ? saved === 'dark' : true
    setIsDark(startDark)
    document.documentElement.classList.toggle('dark', startDark)
  }, [])

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch {}
  }

  return (
    <button
      onClick={toggle}
      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-700 text-gray-200 dark:text-gray-100 bg-white/5 dark:bg-black/40"
      aria-label="Toggle theme"
    >
      {isDark ? '🌙' : '☀️'}
    </button>
  )
}


