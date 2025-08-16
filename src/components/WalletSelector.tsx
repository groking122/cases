"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useWallet } from '@meshsdk/react'

interface WalletInfo {
  key: string
  name: string
  icon: string
  installed: boolean
  api?: any
}

const SUPPORTED_WALLETS = [
  { key: 'nami', name: 'Nami', icon: '/icons/wallets/nami.png' },
  { key: 'eternl', name: 'Eternl', icon: '/icons/wallets/eternl.png' },
  { key: 'flint', name: 'Flint', icon: '/icons/wallets/flint.jpg' },
  { key: 'typhon', name: 'Typhon', icon: '/icons/wallets/typhon.svg' },
  { key: 'yoroi', name: 'Yoroi', icon: '/icons/wallets/yoroi.png' },
  { key: 'gero', name: 'Gero', icon: '/icons/wallets/gero.jpg' },
  { key: 'lace', name: 'Lace', icon: '/icons/wallets/lace.png' },
  { key: 'vespr', name: 'Vespr', icon: '/icons/wallets/vespr.png' },
  { key: 'nufi', name: 'NuFi', icon: '/icons/wallets/nufi.ico' },
  { key: 'begin', name: 'Begin', icon: '/icons/wallets/begin.png' }
]

interface WalletSelectorProps {
  onWalletSelect: (walletKey: string) => void
  onError: (error: string) => void
  connecting: boolean
}

export default function WalletSelector({ onWalletSelect, onError, connecting }: WalletSelectorProps) {
  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([])
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    detectWallets()
    
    // Multiple detection attempts with increasing delays for slow-loading extensions
    const timers = [
      setTimeout(() => detectWallets(), 500),   // Quick retry
      setTimeout(() => detectWallets(), 1500),  // Medium delay
      setTimeout(() => detectWallets(), 3000),  // Long delay for very slow extensions
    ]
    
    // Re-detect when window gains focus (user might have installed a wallet)
    const handleFocus = () => {
      console.log('🔄 Window focused, re-detecting wallets...')
      detectWallets()
    }
    
    window.addEventListener('focus', handleFocus)
    
    return () => {
      timers.forEach(timer => clearTimeout(timer))
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const detectWallets = () => {
    if (typeof window === 'undefined') return

    // Add debugging to see what's actually available
    console.log('🔍 Checking for Cardano wallets...')
    console.log('window.cardano:', window.cardano)
    
    if (window.cardano) {
      console.log('Available wallets:', Object.keys(window.cardano))
    }

    const detected: WalletInfo[] = []

    SUPPORTED_WALLETS.forEach(wallet => {
      try {
        // More robust wallet detection with error handling
        let isInstalled = false
        let api = null
        
        if (window.cardano && window.cardano[wallet.key]) {
          const walletApi = window.cardano[wallet.key]
          
          // Check if it's a proper wallet object with required properties
          isInstalled = !!(
            typeof walletApi === 'object' &&
            walletApi !== null &&
            (typeof walletApi.enable === 'function' || typeof walletApi.isEnabled === 'function')
          )
          
          if (isInstalled) {
            api = walletApi
          }
        }
        
        console.log(`${wallet.name} (${wallet.key}): ${isInstalled ? '✅ Found' : '❌ Not found'}`)
        
        detected.push({
          ...wallet,
          installed: isInstalled,
          api: api
        })
      } catch (error) {
        console.warn(`Error detecting ${wallet.name} wallet:`, error)
        // Still add wallet as not installed if there's an error
        detected.push({
          ...wallet,
          installed: false,
          api: null
        })
      }
    })

    // Sort by installed first, then alphabetically
    detected.sort((a, b) => {
      if (a.installed && !b.installed) return -1
      if (!a.installed && b.installed) return 1
      return a.name.localeCompare(b.name)
    })

    const installedCount = detected.filter(w => w.installed).length
    console.log(`📊 Detection complete: ${installedCount} wallets found`)

    setAvailableWallets(detected)
  }

  const handleWalletClick = async (wallet: WalletInfo) => {
    if (!wallet.installed) {
      onError(`${wallet.name} wallet is not installed. Please install it first.`)
      return
    }

    try {
      // Add a small delay for Eternl wallet to properly initialize DOM elements
      if (wallet.key === 'eternl') {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // Verify the wallet API is still available before connecting
      if (!window.cardano || !window.cardano[wallet.key]) {
        throw new Error(`${wallet.name} wallet API is not available. Try refreshing the page.`)
      }
      
      onWalletSelect(wallet.key)
    } catch (error: any) {
      console.error(`Wallet connection error for ${wallet.name}:`, error)
      onError(`Failed to connect to ${wallet.name}: ${error.message || 'Unknown error'}`)
    }
  }

  const getInstallUrl = (walletKey: string) => {
    const urls: Record<string, string> = {
      nami: 'https://namiwallet.io/',
      eternl: 'https://eternl.io/',
      flint: 'https://flint-wallet.com/',
      typhon: 'https://typhonwallet.io/',
      yoroi: 'https://yoroi-wallet.com/',
      gero: 'https://gerowallet.io/',
      lace: 'https://www.lace.io/',
      vespr: 'https://vespr.xyz/',
      nufi: 'https://nu.fi/',
      begin: 'https://begin.is/'
    }
    return urls[walletKey] || '#'
  }

  const installedWallets = availableWallets.filter(w => w.installed)
  const notInstalledWallets = availableWallets.filter(w => !w.installed)
  const walletsToShow = showAll ? availableWallets : availableWallets.slice(0, 6)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="mb-4">
          <h3 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h3>
          <p className="text-gray-400 text-sm">
            {installedWallets.length > 0 
              ? `${installedWallets.length} wallet${installedWallets.length > 1 ? 's' : ''} detected`
              : 'Please install a Cardano wallet to continue'
            }
          </p>
        </div>
        
        {/* Single Refresh Button - styled with orange theme */}
        <button
          onClick={detectWallets}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-orange-200 hover:text-white bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 hover:border-orange-500/50 rounded-lg transition-all duration-200"
          title="Refresh wallet detection"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Detection
        </button>
      </div>

      {/* Installed Wallets */}
      {installedWallets.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-orange-400 uppercase tracking-wide text-center">
            ✅ Available Wallets
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {installedWallets.map((wallet, index) => (
              <motion.div
                key={wallet.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Button
                  onClick={() => handleWalletClick(wallet)}
                  disabled={connecting}
                  className="w-full h-16 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 border border-orange-500/50 hover:border-orange-400 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-lg bg-white/10 p-1 flex items-center justify-center">
                      <img src={wallet.icon} alt={wallet.name} className="w-8 h-8 object-contain" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-white text-base">{wallet.name}</div>
                      <div className="text-xs text-orange-100">Ready to connect</div>
                    </div>
                  </div>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Not Installed Wallets */}
      {notInstalledWallets.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-orange-300/70 uppercase tracking-wide text-center">
            📥 Install More Wallets
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {notInstalledWallets.slice(0, showAll ? undefined : 4).map((wallet, index) => (
              <motion.div
                key={wallet.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (installedWallets.length + index) * 0.1 }}
              >
                <Button
                  onClick={() => window.open(getInstallUrl(wallet.key), '_blank')}
                  className="w-full h-14 bg-gray-800/50 hover:bg-orange-600/20 border border-gray-600 hover:border-orange-500/30 transition-all duration-300"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-700/50 p-1 flex items-center justify-center">
                      <img src={wallet.icon} alt={wallet.name} className="w-6 h-6 object-contain opacity-60 hover:opacity-80 transition-opacity" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-300 hover:text-orange-200 transition-colors">{wallet.name}</div>
                      <div className="text-xs text-gray-500 hover:text-orange-300 transition-colors">Click to install</div>
                    </div>
                  </div>
                </Button>
              </motion.div>
            ))}
          </div>
          
          {notInstalledWallets.length > 4 && (
            <Button
              onClick={() => setShowAll(!showAll)}
              variant="outline"
              className="w-full text-orange-300 border-orange-500/30 hover:bg-orange-600/20 hover:border-orange-500/50 hover:text-orange-200 transition-all duration-200"
            >
              {showAll ? 'Show Less' : `Show All ${notInstalledWallets.length} Wallets`}
            </Button>
          )}
        </div>
      )}



      {/* Help Text */}
      <div className="text-center text-xs text-gray-400 space-y-2 pt-4 border-t border-gray-700/50">
        <div className="flex items-center justify-center space-x-2">
          <span>💡</span>
          <span>Don't see your wallet? Make sure it's installed and unlocked</span>
        </div>
        <div className="flex items-center justify-center space-x-2">
          <span>🔒</span>
          <span className="text-orange-300/80">Your private keys never leave your wallet</span>
        </div>
      </div>
    </div>
  )
} 