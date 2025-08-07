import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not configured')
}

if (!supabaseAnonKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured')
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not configured')
}

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Server-side client (for API routes)
export const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

// Database types
export interface User {
  id: string
  email: string
  username: string
  balance: number
  total_opened: number
  created_at: string
  updated_at: string
}

export interface CaseOpening {
  id: string
  user_id: string
  case_type: string
  reward_id: string
  reward_name: string
  reward_rarity: string
  reward_value: number
  opened_at: string
}

export interface Reward {
  id: string
  name: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
  value: number
  image: string
  description: string
  drop_rate: number
}

// Database functions
export async function getUserProfile(userId: string): Promise<User | null> {
  if (!supabase) {
    console.error('Supabase not configured')
    return null
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return data
}

export async function updateUserBalance(userId: string, newBalance: number): Promise<boolean> {
  if (!supabase) {
    console.error('Supabase not configured')
    return false
  }

  const { error } = await supabase
    .from('users')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) {
    console.error('Error updating user balance:', error)
    return false
  }

  return true
}

export async function recordCaseOpening(opening: Omit<CaseOpening, 'id' | 'opened_at'>): Promise<boolean> {
  if (!supabase) {
    console.error('Supabase not configured')
    return false
  }

  const { error } = await supabase
    .from('case_openings')
    .insert({
      ...opening,
      opened_at: new Date().toISOString()
    })

  if (error) {
    console.error('Error recording case opening:', error)
    return false
  }

  return true
}

export async function getUserStats(userId: string) {
  if (!supabase) {
    console.error('Supabase not configured')
    return { totalOpened: 0, totalValue: 0, bestReward: null }
  }

  const { data: openings, error } = await supabase
    .from('case_openings')
    .select('*')
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching user stats:', error)
    return { totalOpened: 0, totalValue: 0, bestReward: null }
  }

  const totalOpened = openings.length
  const totalValue = openings.reduce((sum, opening) => sum + opening.reward_value, 0)
  const bestReward = openings.reduce((best, opening) => 
    opening.reward_value > (best?.reward_value || 0) ? opening : best, 
    null
  )

  return { totalOpened, totalValue, bestReward }
} 