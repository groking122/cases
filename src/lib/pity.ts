export function verifyPityTable(table: { payout: number; p: number }[], cost = 100, evCap = 126) {
  const sumP = table.reduce((a, s) => a + s.p, 0)
  if (Math.abs(sumP - 1) > 1e-6) throw new Error('pity probs not normalized')
  const ev = table.reduce((a, s) => a + s.p * s.payout, 0)
  if (ev > evCap) throw new Error(`pity EV too high: ${ev}`)
  return ev
}

export function samplePity(table: { payout: number; p: number }[], u: number) {
  let acc = 0
  for (const t of table) {
    acc += t.p
    if (u < acc) return t.payout
  }
  return table[table.length - 1].payout
}


