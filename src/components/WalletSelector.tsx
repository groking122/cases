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
  { key: 'nami', name: 'Nami', icon: '/icons/wallets/nami.svg' },
  { key: 'eternl', name: 'Eternl', icon: '/icons/wallets/eternl.svg' },
  { key: 'flint', name: 'Flint', icon: '/icons/wallets/flint.svg' },
  { key: 'typhon', name: 'Typhon', icon: '/icons/wallets/typhon.svg' },
  { key: 'yoroi', name: 'Yoroi', icon: '/icons/wallets/yoroi.svg' },
  { key: 'gero', name: 'Gero', icon: '/icons/wallets/gero.svg' },
  { key: 'lace', name: 'Lace', icon: '/icons/wallets/lace.svg' },
  { key: 'vespr', name: 'Vespr', icon: '/icons/wallets/vespr.svg' },
  { key: 'nufi', name: 'NuFi', icon: '/icons/wallets/nufi.svg' },
  { key: 'lode', name: 'Lode', icon: '/icons/wallets/lode.svg' },
  { key: 'begin', name: 'Begin', icon: '/icons/wallets/begin.svg' },
  { key: 'cardwallet', name: 'CardWallet', icon: '/icons/wallets/cardwallet.svg' }
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
  }, [])

  const detectWallets = () => {
    if (typeof window === 'undefined') return

    const detected: WalletInfo[] = []

    SUPPORTED_WALLETS.forEach(wallet => {
      const isInstalled = !!(window.cardano && window.cardano[wallet.key])
      detected.push({
        ...wallet,
        installed: isInstalled,
        api: isInstalled ? window.cardano[wallet.key] : null
      })
    })

    // Sort by installed first, then alphabetically
    detected.sort((a, b) => {
      if (a.installed && !b.installed) return -1
      if (!a.installed && b.installed) return 1
      return a.name.localeCompare(b.name)
    })

    setAvailableWallets(detected)
  }

  const handleWalletClick = async (wallet: WalletInfo) => {
    if (!wallet.installed) {
      onError(`${wallet.name} wallet is not installed. Please install it first.`)
      return
    }

    try {
      onWalletSelect(wallet.key)
    } catch (error: any) {
      onError(`Failed to connect to ${wallet.name}: ${error.message}`)
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
      lode: 'https://lodewallet.io/',
      begin: 'https://begin.is/',
      cardwallet: 'https://cardwallet.io/'
    }
    return urls[walletKey] || '#'
  }

  const installedWallets = availableWallets.filter(w => w.installed)
  const notInstalledWallets = availableWallets.filter(w => !w.installed)
  const walletsToShow = showAll ? availableWallets : availableWallets.slice(0, 6)

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-gray-400 text-sm">
          {installedWallets.length > 0 
            ? `${installedWallets.length} wallet${installedWallets.length > 1 ? 's' : ''} detected`
            : 'No wallets detected. Please install a Cardano wallet.'
          }
        </p>
      </div>

      {/* Installed Wallets */}
      {installedWallets.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wide">
            ✅ Installed Wallets
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  className="btn-primary w-full h-14"
                >
                  <div className="flex items-center space-x-3">
                    <img src={wallet.icon} alt={wallet.name} className="w-8 h-8" />
                    <div className="text-left">
                      <div className="font-semibold text-black">{wallet.name}</div>
                      <div className="text-xs text-black/70">Ready to connect</div>
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
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            📥 Available Wallets
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
                  className="w-full h-14 bg-gray-800 hover:bg-gray-700 border border-gray-600 transition-all duration-300"
                >
                  <div className="flex items-center space-x-3">
                    <img src={wallet.icon} alt={wallet.name} className="w-8 h-8 opacity-50" />
                    <div className="text-left">
                      <div className="font-semibold text-gray-300">{wallet.name}</div>
                      <div className="text-xs text-gray-500">Click to install</div>
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
              className="w-full text-gray-400 border-gray-600 hover:bg-gray-800"
            >
              {showAll ? 'Show Less' : `Show All ${notInstalledWallets.length} Wallets`}
            </Button>
          )}
        </div>
      )}

      {/* Refresh Button */}
      <div className="text-center">
        <Button
          onClick={detectWallets}
          variant="outline"
          size="sm"
          className="text-gray-400 border-gray-600 hover:bg-gray-800"
        >
          🔄 Refresh Wallet Detection
        </Button>
      </div>

      {/* Help Text */}
      <div className="text-center text-xs text-gray-500 space-y-1">
        <div>💡 Don't see your wallet? Make sure it's installed and unlocked</div>
        <div>🔒 Your private keys never leave your wallet</div>
      </div>
    </div>
  )
} 