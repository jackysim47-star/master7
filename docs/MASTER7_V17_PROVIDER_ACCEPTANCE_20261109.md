# MASTER7 V17 · Provider Acceptance Evidence

Release: `17.0.0-selfbuilt.122-provider-acceptance`

This release adds a durable, fail-closed acceptance record for every registered game profile. It does not enable deposits, payouts, game launches, or any provider.

## Acceptance model

- Each game profile records `catalogue`, `launch`, `wallet`, `settlement`, and `recovery` separately.
- Production and UAT evidence remain separate.
- Evidence history is append-only. The current projection uses optimistic concurrency so a stale owner update cannot replace newer evidence.
- Owner may record evidence; owner and staff may read it.
- Evidence references are bounded identifiers and SHA-256 digests. Credentials and provider payloads are not stored.
- A profile becomes effectively ready only when production evidence passes, its adapter is implemented, and current runtime capability is present.

## User interface

The backoffice shows 41 independent game profiles and five payment profiles. Contract, adapter, catalogue, runtime, settlement, recovery, and real-money acceptance are displayed independently. Configuration or API availability alone never produces a green acceptance state.

## Catalogue reporting

The root `/api/games` response remains a provider index with `games: []`. It now reports safe database-cache counts and freshness so the backoffice can distinguish cached catalogue evidence from playable games. This summary performs no provider request.

## Validation

- Maintenance controls: 12/12 passed
- Release probes: 16/16 passed
- Full automated suite: 1021/1021 passed
- Render database adapter: 3/3 passed
- TypeScript, ESLint, and Render production build passed

Production acceptance remains closed until actual provider, payment, payout, backup/restore, DNS/TLS, and owner sign-off evidence exists.
