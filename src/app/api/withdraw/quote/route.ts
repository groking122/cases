import { NextResponse } from 'next/server'
import { UNIT, SPREAD, PLATFORM_FEE, MIN_WITHDRAW_ADA } from '@/config/withdraw'
import { getUserBalances, estimateCardanoFee } from '@/lib/credits'
import { withUserAuth } from '@/lib/mw/withUserAuth'

async function handler(req: Request) {
  const { userId, credits } = await req.json()
  if (!Number.isFinite(credits) || credits <= 0) {
    return NextResponse.json({ error: 'Invalid credits' }, { status: 400 })
  }
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  const bal = await getUserBalances(userId)
  const withdrawable = bal.winnings_credits + bal.purchased_credits
  if (credits > withdrawable) {
    return NextResponse.json({ error: 'Not enough withdrawable credits' }, { status: 400 })
  }

  const cashoutRate = UNIT * (1 - SPREAD)
  const grossAda = credits * cashoutRate
  const platformFee = grossAda * PLATFORM_FEE
  const networkFee = await estimateCardanoFee(grossAda)
  const netAda = grossAda - platformFee - networkFee

  if (netAda < MIN_WITHDRAW_ADA) {
    return NextResponse.json({ error: 'Below minimum withdrawal' }, { status: 400 })
  }

  return NextResponse.json({
    credits,
    cashoutRate,
    grossAda: +grossAda.toFixed(6),
    fees: { platformFee: +platformFee.toFixed(6), networkFee: +networkFee.toFixed(6) },
    netAda: +netAda.toFixed(6)
  })
}

export const POST = withUserAuth(handler as any)


