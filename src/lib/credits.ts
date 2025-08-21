import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

function getClient() {
  if (!supabaseUrl || !supabaseServiceKey) throw new Error('Supabase not configured')
  return createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
}

export async function getUserBalances(userId: string) {
  const sb = getClient()
  const { data, error } = await sb
    .from('balances')
    .select('purchased_credits,winnings_credits,bonus_credits,last_purchase_at')
    .eq('user_id', userId)
    .single()
  if (error || !data) throw new Error(error?.message || 'no balance')
  return data as {
    purchased_credits: number
    winnings_credits: number
    bonus_credits: number
    last_purchase_at: string | null
  }
}

/** Consume withdrawable credits: first winnings, then purchased above turnover requirement */
export async function decrementWithdrawable(userId: string, credits: number) {
  const sb = getClient()
  const { data: bal, error: balErr } = await sb
    .from('balances')
    .select('purchased_credits,winnings_credits')
    .eq('user_id', userId)
    .single()
  if (balErr || !bal) throw new Error(balErr?.message || 'no balance')

  let fromWinnings = Math.min(credits, bal.winnings_credits)
  let remaining = credits - fromWinnings

  if (remaining > bal.purchased_credits) throw new Error('not enough withdrawable credits')
  const fromPurchased = remaining

  const total = fromWinnings + fromPurchased
  const { error } = await sb.rpc('apply_withdraw_delta', {
    p_user_id: userId,
    p_total_credits: total
  })
  if (error) throw new Error(error.message)
}

export async function estimateCardanoFee(_adaAmount: number) {
  // Simple fixed estimate; replace with an SDK-based estimator for precision
  return 0.17
}


