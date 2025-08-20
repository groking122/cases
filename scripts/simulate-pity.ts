/*
  Quick simulation for pity RTP and frequency.
  Usage:
    npx ts-node scripts/simulate-pity.ts --spins=1000000 --cost=100
*/

import { getPityConfigForCase } from '../src/config/pity';

type SymbolDef = { name: string; value: number; weight: number };

function parseArgs() {
  const args = process.argv.slice(2);
  const map: Record<string, string> = {};
  for (const a of args) {
    const [k, v] = a.replace(/^--/, '').split('=');
    map[k] = v ?? 'true';
  }
  return map;
}

function weightedSample(symbols: SymbolDef[], r: number): SymbolDef {
  const total = symbols.reduce((a, s) => a + s.weight, 0);
  let t = 0;
  const pick = r * total;
  for (const s of symbols) {
    t += s.weight;
    if (pick <= t) return s;
  }
  return symbols[symbols.length - 1];
}

function sampleFromTable(table: { payout: number; p: number }[], r: number): number {
  let t = 0;
  for (const row of table) {
    t += row.p;
    if (r <= t) return row.payout;
  }
  return table[table.length - 1].payout;
}

async function main() {
  const args = parseArgs();
  const spins = Number(args.spins ?? '100000');
  const cost = Number(args.cost ?? '100');
  const caseId = String(args.caseId ?? 'default');

  // Example symbol set (adjust to your case A)
  const symbols: SymbolDef[] = [
    { name: 'Small', value: 30, weight: 28 },
    { name: 'Uncommon', value: 60, weight: 36.55 },
    { name: 'BreakEven', value: 100, weight: 8 },
    { name: 'Rare', value: 150, weight: 4.35 },
    { name: 'Epic', value: 800, weight: 4.5 },
    { name: 'Legendary', value: 6000, weight: 0.15 },
    { name: 'Other', value: 30, weight: 18.45 },
  ];

  const pity = getPityConfigForCase(caseId);
  const probsSum = pity.table.reduce((a, s) => a + s.p, 0);
  if (Math.abs(probsSum - 1) > 1e-6) throw new Error('Pity probs must sum to 1');

  let totalSpent = 0;
  let totalWon = 0;
  let pityCount = 0;
  let lossStreak = 0;
  let spinsSinceLastPity = Infinity;

  for (let i = 0; i < spins; i++) {
    totalSpent += cost;
    let r = Math.random();
    let sym = weightedSample(symbols, r);
    let wouldLose = sym.value < cost;

    const pityEligible = wouldLose && lossStreak >= pity.threshold && (spinsSinceLastPity >= pity.minSinceLast) && pityCount === 0 /* per 50-window simulated in batches */;
    if (pityEligible) {
      const payout = sampleFromTable(pity.table, Math.random());
      // snap to closest symbol value for realism
      let best = symbols[0];
      let bestDiff = Math.abs(best.value - payout);
      for (const s of symbols) {
        const d = Math.abs(s.value - payout);
        if (d < bestDiff) { best = s; bestDiff = d; }
      }
      sym = best;
      pityCount += 1;
      spinsSinceLastPity = 0;
    }

    totalWon += sym.value;
    if (sym.value < cost) {
      lossStreak += 1;
    } else {
      lossStreak = 0;
    }
    spinsSinceLastPity += 1;

    // naive rolling window for per-50 limit: reset every 50 spins
    if ((i + 1) % pity.cooldownSpins === 0) {
      pityCount = 0;
    }
  }

  const rtp = totalWon / totalSpent; // 0..1
  const pityRate = pityCount / spins; // 0..1
  const result = { spins, cost, rtp, pityRate, totalSpent, totalWon };
  console.log(JSON.stringify(result, null, 2));
  // Acceptance gates (tune per case)
  const RTP_MAX = 0.935; // 93.5%
  const PITY_MAX = 0.022; // 2.2%
  if (rtp > RTP_MAX || pityRate > PITY_MAX) {
    console.error('Simulation failed acceptance gates', { rtp, pityRate });
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


