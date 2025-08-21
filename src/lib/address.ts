export function isLikelyBech32(addr: string): boolean {
  if (typeof addr !== 'string') return false
  // Quick bech32 gate for Cardano mainnet/testnet (addr1... or addr_test1...)
  return /^addr(_test)?1[0-9a-z]{20,}$/i.test(addr)
}


