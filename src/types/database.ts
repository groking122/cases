export interface User {
  id: string
  wallet_address?: string
  email?: string
  username?: string
  credits: number
  total_spent: number
  total_won: number
  cases_opened: number
  created_at: string
  updated_at: string
}

export interface Case {
  id: string
  name: string
  description?: string
  price: number
  image_url?: string
  is_active: boolean
  created_at: string
}

export interface Skin {
  id: string
  name: string
  description?: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
  value: number
  image_url?: string
  collection?: string
  drop_rate: number
  case_id: string
  created_at: string
}

export interface CaseOpening {
  id: string
  user_id: string
  case_id: string
  skin_id: string
  credits_spent: number
  credits_won: number
  server_seed: string
  client_seed: string
  nonce: number
  random_value: number
  is_withdrawn: boolean
  withdrawal_type?: 'credits' | 'nft'
  nft_token_id?: string
  created_at: string
}

export interface UserInventory {
  id: string
  user_id: string
  skin_id: string
  case_opening_id: string
  is_nft: boolean
  nft_token_id?: string
  nft_contract_address?: string
  opensea_url?: string
  created_at: string
} 