import { NextRequest, NextResponse } from 'next/server'

// Disabled in production: do not trust raw walletAddress without signature
export async function POST(_request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ error: 'Disabled. Use /api/auth/wallet/nonce and /api/auth/wallet/verify.' }, { status: 400 })
}


