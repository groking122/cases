import { supabaseAdmin } from '@/lib/supabase'

export async function applyCredit(userId: string, delta: bigint, reason: string, key?: string): Promise<bigint> {
  if (!supabaseAdmin) {
    throw new Error('Database not configured')
  }

  const { data, error } = await supabaseAdmin.rpc('credit_apply_and_log', {
    p_user_id: userId,
    p_delta: delta.toString(),
    p_reason: reason,
    p_key: key ?? null
  })
  if (error) throw error
  return BigInt(String(data ?? 0))
}


