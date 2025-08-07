"use client"

import { MeshProvider } from '@meshsdk/react'
import { ReactNode } from 'react'

interface MeshWalletProviderProps {
  children: ReactNode
}

export function MeshWalletProvider({ children }: MeshWalletProviderProps) {
  return (
    <MeshProvider>
      {children}
    </MeshProvider>
  )
} 