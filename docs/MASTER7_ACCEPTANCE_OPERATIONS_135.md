# MASTER7 V17 `.135` acceptance and operations

Release: `17.0.0-selfbuilt.135-acceptance-operations`

This release closes four internal operations gaps without enabling real-money transactions or unaccepted games.

## Production acceptance console

- Adds append-only evidence for official-domain DNS/TLS, credential rotation, VPay MYR, GSPAY MYR, GSPAY USDT, 1MPay MYR real-payment steps, and owner/operations sign-off.
- Keeps Manual Bank on its stricter linked real-deposit and real-withdrawal proof workflow; generic evidence cannot substitute for those checks.
- Exposes the existing per-profile game acceptance flow in the owner UI.
- Evidence files are SHA-256 hashed in the browser and are not uploaded. The server stores only the digest, non-secret reference, actor, timestamps, result, and revision.
- Owner writes and staff reads are enforced. Server-owned requirements remain fail closed.
- Evidence is necessary but never sufficient: payment configuration, maintenance switches, provider capability, payout readiness, game runtime capability, backup and restore gates must also pass.

## Payment recovery hardening

- Replaces unlimited one-minute recovery claims with deterministic exponential backoff from 60 seconds to a six-hour cap.
- Limits VPay/GSPAY automatic queries to 12 claims per order.
- Creates one idempotent `payment_recovery_manual_review` audit event after exhaustion without changing the financial order state.
- Local escalation still runs when provider querying is unavailable; it performs no network or wallet write.
- Authenticated late callbacks and existing-order queries remain valid and retain exactly-once balanced wallet posting.
- Owner trace and Operations Intelligence expose safe recovery counts and manual-review state without claim tokens or provider errors.

## Operations Intelligence

- Adds read-only metrics for excessive/stale recovery leases and the latest accounting job.
- Raises high-priority manual recommendations for recovery exhaustion and failed/stalled accounting jobs.
- Performs no automatic rerun, provider request, callback reconstruction, or wallet credit.

## Privileged passwords

- Owner activation/reset and owner/staff password changes now require 12–128 characters.
- Member registration and member password changes remain 6–128 characters.
- Existing privileged logins remain usable. A successful password change continues to revoke prior sessions.

## Activation boundary

This release does not create acceptance evidence and does not open any maintenance switch. The expected post-deploy state remains:

```text
newDepositsEnabled      = false
newGameLaunchesEnabled  = false
newPayoutsEnabled       = false
realPayments            = false
liveGames               = false
productionReady         = false
```

Real payment, payout and game-provider acceptance still require external evidence and provider authorization.
