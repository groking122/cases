# Final pre-live checklist (Mainnet)

Yep—you’re good to ship. Do these last tiny things and you’re solid:

## Prod envs

- `CARDANO_NETWORK=mainnet` (or `preprod` while testing)
- `USER_JWT_SECRET` & `ADMIN_JWT_SECRET` (long & different)
- `NODE_ENV=production`
- Blockfrost/other chain keys set for the same network

## Admin

- Change admin email/username + password, TOTP enabled, admin JWT TTL ≈ 60m
- `ADMIN_DEV_BYPASS` off

## DB

- `credit_apply_and_log(uuid,bigint,text,text)` present (verified)
- `balances` exists (PK `user_id`), `credit_events` + `key` UNIQUE, helpful indexes in place

## App

- All credit paths use `applyCredit(...)` (migrated)
- Kill-switch on writes (`DISABLE_WRITES`) tested (503) then off
- Rate limits on `request-withdrawal`, `auth/nonce`, `auth/verify`
- Network enforcement check uses `CARDANO_NETWORK`

## Security/ops

- CORS restricted to your domain, HTTPS on
- Reverse proxy passes `x-forwarded-for` (limiter uses it)
- Basic error logging (Sentry or logs) on wallet-verify/credits/withdrawals

---

# Quick test plan (run on preprod first)

1. Deposit/credit path → `add-credits` with a unique key → balance +X, repeat same key → no double.
2. Bet debit → insufficient funds → 400; with funds → ok; optional win credit with unique key.
3. Withdrawal request → debit with `withdraw:req:<id>`; simulate failure → refund with `withdraw:refund:<id>`.
4. Concurrency → 20 parallel `delta:-1` from small balance → never negative.
5. Rate limits → burst `request-withdrawal` / `auth/nonce` → 429 shows up.
6. Wrong network → try `addr_test1…` while `CARDANO_NETWORK=mainnet` → 400/403.
7. JWT expiry → after 2h (or shorten locally), API returns 401 → client re-auth works.
8. Kill switch → set `DISABLE_WRITES=true` → writes 503; unset → normal.

---

# Domain + mainnet cutover

- Point DNS → deploy, get HTTPS.
- Update CORS allowlist/origins.
- Reconfirm `CARDANO_NETWORK=mainnet` and mainnet keys.
- Run the same smoke tests on mainnet with tiny amounts.
- Watch the new `/admin/dashboard` for: net 24h, pending withdrawals, top movers, expired nonces.
- Run the drift query after a few hours (should be 0 rows).

---

# About making more cases

- bet: `applyCredit(userId, -cost,  "bet:case:<caseId>", "bet:<roundId>")`
- win: `applyCredit(userId, +payout, "win:case:<caseId>", "win:<roundId>")`

Idempotency keys must be unique per round.

---

# Optional (nice win)

- Move admin token to an httpOnly cookie (less XSS risk) when you have time; user JWT via header is fine.

If you check those boxes, you’re ready. Run on preprod for a short soak, then flip to mainnet.
