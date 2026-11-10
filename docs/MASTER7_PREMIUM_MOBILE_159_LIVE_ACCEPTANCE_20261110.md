# MASTER7 V17.159 Premium Mobile Live Acceptance

Date: 2026-11-10
Release: `17.0.0-selfbuilt.159-premium-mobile`
Render deploy: `dep-dbpef0tg1s2s73b5umdg` — LIVE
Source commit: `07ad4419b09b7606ee539ddf939ea16c812f0736`
Publication commit: `8c5ceb39f2de8a1a9a996a187f927c5017247dc8`
Archive SHA-256: `2cf2c7a61ad6bd35ada6d9be944e94d2a8b4b71b076ddbe602e42a863403aad1`

## Delivered

- Premium water-blue, deep-blue and white member frontend.
- Larger Deposit, Withdraw, Games and Support actions.
- Clear four-item mobile dock and readable tap targets.
- Compact premium hero, sponsored-provider strip and two-column provider directory.
- English customer fallbacks across member, VIP, Rewards, Events, verification and play-settings surfaces.
- No APK promotion, `0 CONNECTED` claim or `API PENDING` claim on the member page.

## Verification

- Maintenance: 12 / 12 PASS
- Release probes: 27 / 27 PASS
- Full regression: 1,332 / 1,332 PASS
- Render database compatibility: 3 / 3 PASS
- TypeScript, ESLint and Render production build: PASS
- Live `/health/live` and `/health`: HTTP 200, exact v159, database ready
- Live customer entry, sign-in, registration, admin route and `/api/games`: HTTP 200
- 393px live sign-in audit: viewport 393, scroll width 393, no JavaScript errors
- 393px member layout audit: no horizontal overflow; 37 provider cards in a two-column grid
- Post-deploy Render app error/critical logs: 0
- Post-deploy Render request 5xx logs: 0

## Recovery evidence

- Exact-v159 encrypted production backup: PASS
- SQLite restore verification: PASS
- Isolated PostgreSQL 18 rollback-only restore: PASS
- 71 durable tables, 490 records, 0 foreign-key violations, 0 persistent restore writes
- Live `backupReady=true`, `restoreReady=true`

## Runtime truth retained

The release does not enable unaccepted production capabilities. The read-only game audit reports 37 brands, 42 profiles, 4 implemented adapters, 0 launch-ready and 0 verified/playable profiles. `transactionsEnabled`, `realPayments`, `liveGames`, `newGameLaunchesEnabled` and `newPayoutsEnabled` remain false. `productionReady` remains false.

No payment order, payout, game launch or game-wallet operation was invoked during this acceptance.
