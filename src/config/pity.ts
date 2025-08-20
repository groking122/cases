// Centralized pity configuration per case

export type PityEntry = { payout: number; p: number };
export type PityConfig = {
  threshold: number; // consecutive strict losses required
  cooldownSpins: number; // window to enforce max 1 pity
  minSinceLast: number; // additional guard: min spins since last pity
  evCap?: number; // optional safety cap for EV (default applied in API)
  table: PityEntry[]; // probabilities must sum to 1
};

// Default pity config used if no per-case override exists
export const pityDefaults: PityConfig = {
  threshold: 22,
  cooldownSpins: 50,
  minSinceLast: 10,
  evCap: 126,
  table: [
    { payout: 60,   p: 0.35 },
    { payout: 100,  p: 0.47 },
    { payout: 150,  p: 0.16 },
    { payout: 800,  p: 0.019 },
    { payout: 6000, p: 0.001 },
  ],
};

// Per-case overrides (by case id)
export const pityOverrides: Record<string, Partial<PityConfig>> = {
  // Example override:
  // 'case-id-here': {
  //   threshold: 20,
  //   cooldownSpins: 50,
  //   minSinceLast: 10,
  //   table: [ ... ]
  // }
  // caseA/B/C examples:
  // caseA: {},
  // caseB: { threshold: 20, table: [
  //   { payout: 30, p: 0.30 },
  //   { payout: 60, p: 0.45 },
  //   { payout: 100, p: 0.20 },
  //   { payout: 150, p: 0.045 },
  //   { payout: 800, p: 0.005 },
  // ]},
  // caseC: { threshold: 25, table: [
  //   { payout: 20, p: 0.25 },
  //   { payout: 50, p: 0.45 },
  //   { payout: 100, p: 0.20 },
  //   { payout: 250, p: 0.08 },
  //   { payout: 1500, p: 0.019 },
  //   { payout: 20000, p: 0.001 },
  // ]},
};

export function getPityConfigForCase(caseId: string | null | undefined): PityConfig {
  const base = pityDefaults;
  if (!caseId) return base;
  const override = pityOverrides[caseId] || {};
  return {
    threshold: override.threshold ?? base.threshold,
    cooldownSpins: override.cooldownSpins ?? base.cooldownSpins,
    minSinceLast: override.minSinceLast ?? base.minSinceLast,
    evCap: override.evCap ?? base.evCap,
    table: override.table ?? base.table,
  };
}


