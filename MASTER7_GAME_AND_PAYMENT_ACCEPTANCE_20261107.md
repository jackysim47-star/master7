# MASTER7 game and payment acceptance — 2026-11-07

This note records verified production behaviour only. Credentials, player data,
bank details and provider response bodies are intentionally excluded.

## VPay

- The portal and gateway have the merchant configuration, signed order route,
  independent order query and authenticated callback forwarding in place.
- Three observed production order attempts reached VPay. VPay returned HTTP 200
  with provider business code `-1`; therefore no checkout URL was accepted and
  no wallet entry was created. The public VPay documentation defines only code
  `0` as success and does not define `-1`.
- The gateway's observed Render egress IP is not the IP in the merchant handover
  and is not guaranteed to remain a single address. VPay must confirm the
  meaning of `-1`, the purpose of the handed-over IP, the accepted outbound
  allowlist and the enabled MYR trade codes.
- New VPay orders remain disabled. Query and callback reconciliation stay
  configured so an existing order can still be checked without resubmission.
- The callback implementation verifies the VPay signature and order binding,
  performs an independent provider query, commits one balanced wallet ledger,
  and returns the exact uppercase `SUCCESS` acknowledgement only after that
  durable result.

## 1MPay

- Merchant configuration, order creation and order query reached the provider.
- One provider-style callback was accepted and independently queried. This
  proves callback reachability and validation, but the query was not shown to
  be successfully paid and no balanced member-wallet settlement was proven.
- New 1MPay orders are therefore disabled in the Render environment. Existing
  orders and reconciliation records remain available; they are not recreated or
  deleted.
- The customer portal identifies the channel as awaiting provider payment and
  wallet acceptance instead of describing it as an available deposit channel.

Acceptance requires one authorized real payment to produce all of the following:

1. a provider checkout completion;
2. an authenticated callback bound to the original order, member and amount;
3. an independent successful provider query;
4. exactly one balanced member and provider-clearing ledger pair;
5. a matching wallet and accounting record.

## GSPAY+ MYR

- The customer flow, idempotent platform order, provider-order binding, HTTPS
  checkout-host validation, authenticated callback, independent status query
  and single balanced wallet settlement are implemented and covered by local
  contract tests.
- The supplied successful create example proves only the create response shape:
  outer code `200` with a JSON string containing `payment_id` and an HTTPS URL
  on `secured.gspay.online`. It is not settlement evidence.
- The production portal channel is closed and the current portal configuration
  is incomplete. Customer order creation therefore remains unavailable and the
  lobby must show maintenance.
- Production acceptance still requires the supplier's final query-success
  response, callback acknowledgement and retry contract, plus one reconciled
  payment across the supplier order, MASTER7 order, wallet ledger and accounts.
- DuitNow, USDT and payout are outside this MYR deposit acceptance and remain
  separately disabled.

## Game catalogues

- MegaH5, JILI and 918KISS H5 have successful read-only catalogue responses.
- JDB and RSGHub read-only adapters are deployed. The current production calls
  reach the suppliers but are rejected (`JDB 9001`, `RSGHub HTTP 403`). They stay
  in maintenance and are not represented as playable.
- Pragmatic Play now has a pinned, read-only `getCasinoGames` catalogue adapter.
  It stays in maintenance until the assigned production endpoint accepts the
  Render request; no player, free-round, wallet or launch method is called.
- The public ATG supplier ID now maps to the existing assigned direct catalogue
  contract. The former internal Godee label is no longer exposed as a separate
  supplier.
- A catalogue response is not game-launch or wallet-settlement acceptance. Every
  supplier remains non-playable until its own launch, wallet and settlement flow
  passes an end-to-end acceptance run.

## Release guard

- The lobby keeps the fixed 34 supplier inventory.
- Supplier failures retain the last trusted snapshot and display maintenance.
- Unknown supplier IDs, arbitrary artwork hosts and unverified launch routes fail
  closed.
- No test in this release creates a player, transfers funds, places a wager or
  submits a payout.

## Release `.87` package

- Source commit: `9b8af5ee47d8db8922d49edcbde7adad0945a979`.
- Archive SHA-256: `92d6066a8fcb8176a8fddf2c47437e83827c4dab400a881e21a23cea00d7d995`.
- The archive contains one root and no Git metadata, dependency directory,
  generated build, runtime database, non-template environment file or known
  credential value.
- Full suite: 391/391 passed. Render DB adapter: 3/3 passed. A clean extracted
  archive installed from its frozen lockfile, repeated the full suite and
  completed the Render production build.
- Production payment and game switches are unchanged by this release.

## Release `.88` payment-preview truth package

- Source commit: `680e1c240011f740e68394764df39b54ea4b5fb4`.
- Archive SHA-256: `de6c8a12ebe7eef6545355438d1a1d3ac01ca726dc17d1a21c4e0fbd62473553`.
- The customer VPay, GSPAY+ and 1MPay cards now require both the owner channel
  control and the provider status API `orderReady=true` before they display
  **Available**. An active database control cannot advertise a disabled
  new-order route.
- Full suite: 392/392 passed. Render DB adapter: 3/3 passed. Focused payment UI
  tests and the Render production build passed.
- This release changes only truthful customer presentation and cache versioning.
  It does not enable a payment, payout, game, wallet or settlement switch.

## Release `.89` game-check truth package

- Source commit: `6bf4110ad12d1b2733c9ab3dbcbf1cba4e4ad226`.
- Archive SHA-256: `70fd1a348dcebcfc12e30b11f5fdcb38fabe6c6a7cde8c9c230a81523fe2b59f`.
- Archive members: 529 under one `master7-v17-render-staging/` root.
- The 34-provider backoffice check now separates completed checks, acceptance
  pending, vendor/maintenance waiting and explicit supplier errors. Catalogue
  counts and the current blocker are shown per provider; a retained catalogue
  never implies launch or wallet acceptance.
- System-readiness entries for payment and game production flows now say
  **Acceptance pending / 待生产验收** instead of the ambiguous **Maintenance**.
- A clean extracted archive installed from the frozen lockfile, passed the full
  398/398 suite and Render DB adapter 3/3, and completed the Render production
  build. Focused game-check presentation tests passed 6/6.
- This release changes read-only status presentation and cache versioning. It
  does not enable a payment, payout, game, wallet or settlement switch.

## Release `.90` callback-route readiness package

- Release: `17.0.0-selfbuilt.90-callback-route-readiness`.
- Source commit: `4fd55d63d6f433167074166e92468bc7fa56c2e2`.
- Archive SHA-256:
  `a98bfc88723556b2b33c3c22a9830ede441d980b63dff9e10130db4bbdbda7f6`.
- GSPAY customer return now uses the direct Render application route
  `https://master7-v17-staging.onrender.com/payment/return`. The legacy
  forwarding-domain return is rejected because its HTTP 302 can change a POST
  request into a GET request or rewrite the path.
- Source acceptance and a clean extraction of the published archive each passed
  399/399 Portal tests, 3/3 Render database-adapter tests and the Render
  production build.
- Integration gateway `1.12.1` is live from commit
  `4ebe8fe9141f9ee6a24b7a61902d7b50f734de84`, Render deploy
  `dep-dbnd0e3m8hqs73bsaug0`. Its current Portal origin and redirect defaults
  use the direct Render service; the retired `.vip` origins are no longer
  accepted by default. Gateway tests passed 102/102.
- This package does not enable a real payment, payout, live game, wallet
  transfer or settlement switch. Those controls remain closed until separate
  provider acceptance is complete.

## Live verification · release `.90`

- Render service: `master7-v17-staging`
  (`srv-dbl0iv7f3r2c73848ei0`, Singapore).
- Publication commit:
  `021c5735ccd57ac5e750a049f5f758dbfb45dc03`.
- Render deploy: `dep-dbnd4a3l550s73eso8ag`, `live` at
  2026-11-07 15:26:05 MYT.
- Live release and source release:
  `17.0.0-selfbuilt.90-callback-route-readiness`.
- `/health` is HTTP 200 with PostgreSQL and SMS OTP ready. `/signin`,
  `/register`, `/admin` and `/payment/return` are HTTP 200.
- The GSPAY callback check is HTTP 200 and truthfully reports `active=false`;
  its public status reports an incomplete program, closed channel and
  `orderReady=false`. VPay and 1MPay query/callback reconciliation remain
  configured while both new-order paths report `orderReady=false`.
- Live HTML references 21 exact `.90-callback-route-readiness` release assets
  and no `.84` through `.89` release asset. The legacy
  `www.master7.best/payment/return` URL is absent from the live assets.
- The public lobby has exactly 34 supplier positions and 766 retained catalogue
  titles: MegaH5 166, JILI 297, 918KISS H5 91, Rectangle 64 and EVO888H5 148.
  All returned game cards remain `playable=false`; production-playable titles
  remain 0.
- Global controls remain fail-closed: `productionReady=false`,
  `transactionsEnabled=false`, `realPayments=false`, `payoutsEnabled=false`,
  `settlementVerified=false` and `liveGames=false`.
- The deployment window contains zero application error/critical/fatal logs
  and zero HTTP 5xx request logs.
- Integration gateway `1.12.1` permits the current direct Portal origin and no
  longer permits the retired `.vip` origin. It remains truthful at `mode=uat`,
  `productionQa=not_verified` and `liveReady=false`.
- Autoscaling remains enabled at minimum 1, maximum 3, CPU 75% and memory 75%.

## Live verification · release `.89`

- Render service: `master7-v17-staging`
  (`srv-dbl0iv7f3r2c73848ei0`, Singapore).
- Publication commit:
  `67115be2825a2cca3d3ab19af0050a4e92e94e14`.
- Render deploy: `dep-dbncn4h5efls73avifj0`, `live` at
  2026-11-07 14:57:47 MYT.
- Live release and source release:
  `17.0.0-selfbuilt.89-game-check-truth`.
- Source commit:
  `6bf4110ad12d1b2733c9ab3dbcbf1cba4e4ad226`.
- Archive SHA-256:
  `70fd1a348dcebcfc12e30b11f5fdcb38fabe6c6a7cde8c9c230a81523fe2b59f`.
- `/health` is HTTP 200 with PostgreSQL and SMS OTP ready. `/signin`,
  `/register` and `/admin` are HTTP 200.
- Live HTML references exactly 21 `.89-game-check-truth` assets and no `.84`,
  `.86`, `.87` or `.88` asset. The app asset contains the new four-state game
  checks and acceptance-pending readiness label; the former generic red-cross
  and maintenance label are absent.
- JS/CSS use one-day browser cache plus stale revalidation. The service worker,
  manifest and offline shell remain no-cache and the service-worker cache is
  `.89`.
- The public lobby still contains exactly 34 suppliers. Read-only catalogues are
  MegaH5 166, JILI 297, 918KISS H5 91 and Rectangle 64; EVO888H5 retains 148
  maintenance titles. JDB, Pragmatic Play and ATG remain `awaiting_api`.
- Production-playable titles remain 0. Payment, payout, settlement and live-game
  gates remain false; the status presentation release did not open them.
- The deployment window contains zero application error/critical/fatal logs and
  zero HTTP 5xx request logs.
- Autoscaling remains enabled at minimum 1, maximum 3, CPU 75% and memory 75%;
  the service currently runs one instance.

## Live verification · release `.88`

- Render service: `master7-v17-staging`
  (`srv-dbl0iv7f3r2c73848ei0`, Singapore).
- Publication commit:
  `c39e0410b0f365ac0cb2ff22d00e938681d2abf9`.
- Render deploy: `dep-dbnc8kajnfac73bvq1ug`, `live` at
  2026-11-07 14:27:13 MYT.
- Live release: `17.0.0-selfbuilt.88-payment-readiness`.
- Source commit:
  `680e1c240011f740e68394764df39b54ea4b5fb4`.
- Archive SHA-256:
  `de6c8a12ebe7eef6545355438d1a1d3ac01ca726dc17d1a21c4e0fbd62473553`.
- A clean archive extraction passed 392/392 complete tests, 3/3 Render
  database-adapter tests and the Render production build.

### Runtime and customer entry

- `/health` returned HTTP 200 with PostgreSQL ready and SMS OTP ready.
- `/signin`, `/register` and `/admin` returned HTTP 200; `/` redirected to the
  canonical `/signin` member entry.
- The live HTML references exactly 21 `.88-payment-readiness` asset URLs and no
  `.84`, `.86` or `.87` release URL.
- JS and CSS return
  `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`.
  The service worker, manifest and offline shell remain no-cache. The live
  service-worker cache name identifies `.88`.

### Payment presentation and controls

- VPay and 1MPay are configured for query/callback but their new-order routes
  report `orderReady=false`. GSPAY+ reports `channelStatus=closed`, incomplete
  production configuration and `orderReady=false`.
- The live public cards read all three provider status APIs and display
  **Available** only when the owner channel is active and that provider reports
  `orderReady=true`. All three currently display maintenance or closed.
- GSPAY+ still uses the current browser tab, validates only the exact HTTPS
  `secured.gspay.online/channel` checkout, displays unknown states as
  **Confirming / 确认中 / Sedang disahkan**, and preserves the member's deposit
  record route for uncertain results.
- No real order, transfer, wallet credit, wager or payout was created during
  this acceptance.

### Game, benefit and production truth

- The lobby contains exactly 34 supplier positions and 766 retained catalogue
  titles: MegaH5 166, JILI 297, 918KISS H5 91, Rectangle 64 and EVO888H5 148.
- Production-playable titles remain 0. EVO888H5 is all-maintenance; JDB,
  Pragmatic Play and ATG remain `awaiting_api` and are not shown launch-ready.
- Customer benefits remain generic, preview-only and manual-review. No fixed
  RM88 promotion is embedded in the member or management UI.
- Global gates remain fail-closed: `productionReady=false`,
  `transactionsEnabled=false`, `realPayments=false`, `payoutsEnabled=false`,
  `settlementVerified=false` and `liveGames=false`.

### Domains, logs and capacity

- `master7.best`, `master7.site` and `www.master7.site` currently use HTTP 302
  forwarding to Render. `www.master7.best` still has no DNS. A 302 forward is
  not an accepted payment callback because POST method/body preservation is not
  proven.
- The `.88` deployment window contains zero application error/critical/fatal
  logs and zero HTTP 5xx request logs. Database startup, port binding and the
  accounting close completed.
- Autoscaling is enabled at minimum 1, maximum 3, CPU 75% and memory 75%.
  Metrics remained at one instance with low resource use. The three-instance
  cap bounds compute cost while preserving a small scale-out allowance.
