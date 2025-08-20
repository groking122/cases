// scripts/peek-metrics.ts
// Small harness to fetch the metrics endpoint and print a compact table

type AnyJson = any;

const METRICS_URL = process.env.METRICS_URL || 'http://localhost:3000/api/metrics/pity?hours=24';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'dummy'; // use real token in prod; keep ADMIN_DEV_BYPASS=true locally

function pct(x: number) {
  return (x * 100).toFixed(2) + '%';
}

async function main() {
  const fetchFn: typeof fetch = (globalThis as any).fetch;
  if (!fetchFn) {
    throw new Error('Global fetch is not available. Use Node 18+ or set METRICS_URL to a compatible runtime.');
  }

  const res = await fetchFn(METRICS_URL, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  } as any);
  if (!res.ok) {
    const text = await (res as any).text?.();
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  const json: AnyJson = await (res as any).json?.();

  const windowLabel = json.window ?? (json.windowHours ? `last_${json.windowHours}h` : 'unknown');
  console.log(`Window: ${windowLabel}`);
  console.log('Per case:');
  console.log('caseId'.padEnd(20), 'spins'.padStart(8), 'RTP'.padStart(8), 'Edge'.padStart(8), 'Pity'.padStart(8));

  for (const r of json.perCase || []) {
    const id = String(r.caseId ?? '').padEnd(20);
    const spins = String(r.spins ?? 0).padStart(8);
    const rtp = Number(r.rtp ?? 0).toFixed(4).padStart(8);
    const edge = Number(r.houseEdge ?? 0).toFixed(4).padStart(8);
    const pity = Number(r.pityRate ?? 0).toFixed(4).padStart(8);
    console.log(id, spins, rtp, edge, pity);
  }

  const o = json.overall || {};
  console.log('\nOverall:');
  console.log('spins'.padEnd(8), 'RTP'.padStart(8), 'Edge'.padStart(8), 'Pity'.padStart(8));
  console.log(
    String(o.spins ?? 0).padEnd(8),
    Number(o.rtp ?? 0).toFixed(4).padStart(8),
    Number(o.houseEdge ?? 0).toFixed(4).padStart(8),
    Number(o.pityRate ?? 0).toFixed(4).padStart(8),
  );

  // Acceptance gates (same as sim:ci, adjustable)
  const offenders = (json.perCase || []).filter((r: any) => Number(r.rtp) > 0.935 || Number(r.pityRate) > 0.022);
  if (offenders.length) {
    console.error('\n\u26A0\uFE0F  Bounds exceeded:');
    for (const r of offenders) {
      console.error(`- ${r.caseId}: RTP ${pct(Number(r.rtp))}, Pity ${pct(Number(r.pityRate))}, Spins ${r.spins}`);
    }
    process.exit(1);
  } else {
    console.log('\n\u2705 Metrics within bounds.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


