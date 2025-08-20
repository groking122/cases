"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, mfaCode: mfaCode || undefined }),
      })

      const data = await response.json()

      if (data.success && data.data) {
        // Store the token
        localStorage.setItem('adminToken', data.data.token)
        localStorage.setItem('adminUser', JSON.stringify(data.data.user))
        
        // Redirect to admin dashboard
        router.push('/admin')
      } else if (data.error === 'MFA code required' || data.message === 'Please provide your MFA code') {
        setError('Enter your 6‑digit MFA code to continue')
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl shadow-2xl p-8 w-full max-w-md border border-border"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🎰</div>
          <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-foreground/70">Sign in to manage your case opening site</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-900/50 border border-red-600 rounded-lg p-3"
            >
              <div className="text-red-400 text-sm">⚠️ {error}</div>
            </motion.div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-4 py-3 placeholder-foreground/40 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              placeholder="admin@yoursite.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-4 py-3 placeholder-foreground/40 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              placeholder="Enter your password"
              required
            />
          </div>

          <div>
            <label htmlFor="mfa" className="block text-sm font-medium mb-2">MFA Code (if enabled)</label>
            <input
              id="mfa"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-4 py-3 placeholder-foreground/40 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              placeholder="6‑digit code"
            />
          </div>

          <motion.button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                Signing in...
              </div>
            ) : (
              'Sign In'
            )}
          </motion.button>
        </form>

        {/* No hardcoded credentials in UI */}

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Secure admin access • JWT authentication • Audit logging
          </p>
        </div>
      </motion.div>
    </div>
  )
}