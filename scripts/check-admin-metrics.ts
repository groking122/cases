// tsx scripts/check-admin-metrics.ts --hours=24
const METRICS_URL = process.env.METRICS_URL || "http://localhost:3000/api/admin/metrics";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "dummy"; // real token in prod

function fmt(n: number, d = 4) { return (Number(n) || 0).toFixed(d); }
function pct(n: number) { return (100 * (Number(n) || 0)).toFixed(2) + "%"; }

async function main() {
	const hoursArg = process.argv.find(a => a.startsWith("--hours="));
	const hours = hoursArg ? Number(hoursArg.split("=")[1]) : 24;

	const url = `${METRICS_URL}?hours=${hours}`;
	const res = await fetch(url, { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } as any });
	if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
	const json: any = await res.json();

	console.log(`Window: ${json.window || `last_${hours}h`}\n`);

	// RTP table
	console.log("Cases (RTP/Edge):");
	console.log("caseId".padEnd(12), "spins".padStart(8), "rtp".padStart(8), "edge".padStart(8));
	for (const r of json.rtp || json.rtpByCase || []) {
		console.log(
			String(r.caseId || r.case_id).slice(0,10).padEnd(12),
			String(r.spins ?? 0).padStart(8),
			fmt(r.rtp ?? r.RTP).padStart(8),
			fmt((r.houseEdge ?? r.edge) ?? (1 - (r.rtp ?? 0))).padStart(8)
		);
	}

	// Pity
	console.log("\nPity (rate / rtp):");
	console.log("caseId".padEnd(12), "spins".padStart(8), "pity".padStart(8), "rtp".padStart(8));
	for (const r of json.pity || []) {
		console.log(
			String(r.caseId || r.case_id).slice(0,10).padEnd(12),
			String(r.spins ?? 0).padStart(8),
			fmt(r.pityRate ?? r.pity_rate ?? 0).padStart(8),
			fmt(r.rtp ?? 0).padStart(8)
		);
	}

	// Credit flow
	const f = json.flow || {};
	console.log("\nCredit Flow (ADA):");
	console.log("purchases:", fmt(f.purchases ?? 0, 2),
	          "| withdrawals_net:", fmt(f.withdrawals_net ?? 0, 2),
	          "| platform_fees:", fmt(f.platform_fees ?? 0, 2));

	// Withdraw ops
	const w = json.withdrawals || json.withdrawalsOps || {};
	console.log("\nWithdrawals:");
	console.log(`pending=${w.pending ?? 0} processing=${w.processing ?? 0} sent=${w.sent ?? 0} failed=${w.failed ?? 0}`);
	console.log(`median_payout_min=${fmt(w.median_payout_minutes ?? 0, 2)} avg_payout_min=${fmt(w.avg_payout_minutes ?? 0, 2)}`);

	// Acceptance gates (tune as you like)
	const offenders: string[] = [];
	for (const r of (json.pity || [])) {
		const pr = r.pityRate ?? r.pity_rate ?? 0;
		if (Number(pr) > 0.022) offenders.push(`pity>2.2% case=${r.caseId || r.case_id}`);
	}
	for (const r of (json.rtp || json.rtpByCase || [])) {
		const rtp = r.rtp ?? r.RTP ?? 0;
		if (Number(rtp) > 0.935) offenders.push(`rtp>93.5% case=${r.caseId || r.case_id}`);
	}
	if (offenders.length) {
		console.error("\n⚠️ Bounds exceeded:\n" + offenders.map(x => "- " + x).join("\n"));
		process.exit(1);
	} else {
		console.log("\n✅ Metrics within bounds.");
	}
}

main().catch(e => { console.error(e); process.exit(1); });
