# MASTER7 V17: current deployment and UI repair candidate

## Deposit rejection recovery live — 2026-11-07 MYT

- Live release: `17.0.0-selfbuilt.75-deposit-rejection-recovery`.
- Source commit: `9d5ad7661897b02e5c6d753fd69783b28708399e`.
- Publication commit: `0448c33397ea765149830f8bc8b222d81115d4d9`.
- Render deploy: `dep-dbn0ds6417fc739vnq90` (`live` at
  2026-11-07 00:58:44 MYT).
- Bundle SHA-256: `93f669935a59e3745cfe4717862df639c6af58bd129b6f0508294a94575f71e3`.
- A completed upstream response with a nonzero provider code, no provider
  reference and no checkout URL is now an explicit rejection. The API returns
  HTTP 422 with `PROVIDER_REJECTED` and stores the order as `failed`.
- Network failures, timeouts and malformed or otherwise ambiguous responses
  remain `unknown`. If an ambiguous response contains a valid provider
  reference, it is preserved for later query and reconciliation without
  automatically resubmitting the deposit.
- The member UI clears its saved attempt only for terminal states or the exact
  provider-rejected response. It keeps the same idempotency key for uncertain
  outcomes and now waits up to 35 seconds for the provider path.
- Historical `unknown` orders are changed to `failed` only when a sanitized
  audit record for the same member proves the matching explicit rejection and
  the order has neither a provider reference nor a checkout URL.
- The existing payment switches and credentials are unchanged. VPay still
  requires the supplier to correct its API credential or allowlist before it
  can return a real checkout URL.
- Validation: 284/284 portal tests, 3/3 Render database adapter tests,
  TypeScript, lint, JavaScript syntax and the Render production build pass.
- Online acceptance: `/health` and `/api/version` report runtime/source `.75`,
  database ready and SMS OTP ready. The `.75` CSS and JavaScript assets return
  HTTP 200; `master7.best` reaches member sign-in and `master7.site` reaches the
  management route. The public lobby retains 34 provider positions and exposes
  no internal game list.
- VPay and 1MPay remain Active with order/query configured, while `liveReady`
  and `settlementVerified` remain false. No real deposit was submitted as a
  release probe. The acceptance window contains zero application error/fatal
  logs and zero request 5xx logs; automatic accounting completed its close
  check on the new instance.

## WhatsApp Business queue live — 2026-11-07 MYT

- Live release: `17.0.0-selfbuilt.74-whatsapp-business-queue`.
- Source commit: `440a096da78322a23a11cb8fb2d6cf5a7098aaab`.
- Publication commit: `f2f4f27e76dc99a3f5f880ada717f97ae1f40d87`.
- Render deploy: `dep-dbn00gijnfac73bk1fag` (`live` at
  2026-11-07 00:30:28 MYT).
- Bundle SHA-256: `fc65dc0e3084edb50c33414dc143bf01ad572147bb9b128db1240d993abb3c64`.
- Adds a guarded Meta WhatsApp Business Cloud API queue for the fixed business
  number `+601166336686`, an owner campaign view, signed webhook processing,
  delivery status tracking, inbound opt-out suppression and an inert-by-default
  internal worker.
- The application can store at most 1,000,000 contacts, but a campaign cannot
  launch above the recipient tier actually verified in WhatsApp Manager.
- The supplied CSV contains 123,676 valid unique Malaysian mobile numbers. It
  remains outside this repository and was not imported or sent because it has
  no consent source, proof or suppression fields.
- Production Meta credentials, the approved template and recipient tier are
  absent. `WHATSAPP_SENDING_ENABLED` therefore remains false, the UI must show
  `Waiting`, and this release sends no messages.
- VPay, 1MPay, GSPAY, game, settlement and production-ready switches are not
  changed by this release. Online checks retain VPay and 1MPay Active, GSPAY
  Closed, payouts disabled and payment settlement unverified.
- Validation: 278/278 portal tests, 23/23 WhatsApp-focused tests, 3/3 Render
  database adapter tests, TypeScript, lint, archive comparison and the Render
  production build pass.
- Online acceptance: `/health` reports runtime/source `.74`, database ready and
  SMS OTP ready. `/api/games` retains 34 unique positions, platform-only output,
  no internal game list and anonymous `playable=false`. Invalid webhook and
  worker requests fail closed with 401/403. The acceptance window contains zero
  application error/fatal logs and zero request 5xx logs.

## Management login copy live — 2026-11-06 MYT

- Live release: `17.0.0-selfbuilt.73-management-login-copy`.
- Source commit: `d7e9b02261a3de9e5af90e2433cd4f68651b4011`.
- Publication commit: `6abfeefbffe564903a441147fb01f5e059d8d35f`.
- Render deploy: `dep-dbmvekdbedkc73dk1u10` (`live` at
  2026-11-06 23:52:20 MYT).
- Bundle SHA-256: `024fb30a5927209320427e6797b238d02965033e5ee5d188640bbea0d158efac`.
- `/admin` keeps its password-only owner/staff authentication and now labels the
  dialog `Management sign-in`, with an owner-or-staff ID and password notice.
  The verified mobile dialog contains only ID and password controls, no member
  OTP copy, and generated no console errors.
- `/health` is HTTP 200 and reports runtime/source `.73`, database ready and SMS
  OTP ready. `/api/games` retains the accepted 34 unique positions, no internal
  game list, `playable=false` and zero launch-ready providers.
- VPay and 1MPay order switches remain enabled; GSPAY and GSPAY+ remain disabled.
  `productionReady=false` and `settlementVerified=false` remain unchanged.
- Validation: 257/257 portal tests, 3/3 Render database adapter tests,
  TypeScript, lint, JavaScript syntax and the Render production build pass.

## White-label 34-platform lobby live — 2026-11-06 MYT

- Live release: `17.0.0-selfbuilt.72-white-label-platform`.
- Source commit: `931a4ef51d2054dc3c8c177d9b0899019c75e7ce`.
- Publication commit: `47afc025d6ec8ce39f1c18108aa387a9b72cc67b`.
- Render deploy: `dep-dbmv92gm7kps73ce7j90` (`live` at
  2026-11-06 23:40:18 MYT).
- Bundle SHA-256: `170cebbd34a833841c75a1b8c1d8d6fa0cb3da849e895209a232a3815044f2a6`.
- The public `/api/games` response contains exactly 34 provider/platform summaries,
  sets `platformsOnly=true`, and returns `games: []`; internal game titles and IDs
  remain in the protected backoffice catalogue.
- The lobby has three separate sponsored positions and independent artwork for
  all 34 providers. Category buttons filter provider cards rather than expanding
  hundreds of internal titles.
- Provider launch adapters are still pending acceptance. Every unverified
  platform remains `playable=false` and is shown as waiting/maintenance.
- Benefits support the fixed provider list for configuration and preview. Wallet
  payout, claim settlement and Turnover enforcement remain disabled until
  verified wager APIs and ledger controls are connected.
- The built-in customer assistant is available. Telegram remains `Waiting` until
  real server-side bot token and chat ID are supplied.
- Existing payment and game environment settings are unchanged. This release
  does not activate, close or modify any connected channel.
- Automatic accounting was already active on the live service and is not changed
  by this bundle.
- Validation: 257/257 portal tests, 3/3 Render database adapter tests,
  TypeScript, lint, JavaScript syntax and the Render production build pass.
- Online acceptance passed: `/health` and `/signin` return HTTP 200; runtime and
  source report `.72`; database and SMS OTP report ready. `/api/games` returns
  34 unique positions, `platformsOnly=true`, `games: []`, `playable=false` and
  zero launch-ready providers. Current truthful states are 30 `awaiting_api`
  and four `awaiting_platform_adapter`.
- Post-deploy evidence shows zero application error/fatal logs and zero request
  5xx logs. Automatic accounting completed a close check on the new instance.
- `productionReady=false` and `settlementVerified=false` remain unchanged.
  VPay and 1MPay order switches remain enabled; GSPAY remains disabled.
- `master7.best` routes member entry, sign-in and health checks to the portal;
  `master7.site` root routes staff to `/admin`.

## Frontend route compatibility and domain cleanup live — 2026-11-06 MYT

- Live release: `17.0.0-selfbuilt.71-frontend-route-compat`.
- Source commit: `524bab01fcdfe52dee189a9972afbf9f27bef070`.
- Bundle SHA-256: `b40efb291f25e5fc156ffeae91cdf895356ac6c89bbd55db8258202b6321d874`.
- The release archive excludes the checkout-local `node_modules` link, avoiding
  extraction conflicts with Render build cache directories.
- The member primary entry is `https://www.master7.best/`; the staff entry is
  `https://www.master7.site/`. The www member hostname still requires DNS/TLS.
- The server now corrects copied URLs ending in a backtick (`/%60` and
  `/admin/%60`) and redirects old `/games`, `/player/games`, `/home`, `/lobby`,
  `/player` and `/index.html` entries to a working frontend route.
- The current source and release archive contain no retired `.admin` or `.vip`
  domain links. The `/admin` backoffice route and VIP benefit features remain.
- Full validation: 239/239 portal tests, TypeScript, lint, 3/3 Render database
  adapter tests and the Render production build pass.
- The compatibility redirect uses a relative `Location`, so the external HTTPS
  origin is preserved behind Render proxying. Render deploy
  `dep-dbmu1cdbedkc73dgl8s0` reached `live` at 22:15:38 MYT. Health/database,
  normal routes, compatibility redirects and favicon all passed online checks.

## Full-platform handover live — 2026-11-06 MYT

- Live release: `17.0.0-selfbuilt.61-full-platform-follow-up`.
- Deployment bundle SHA-256: `2b81c0130b0f2b2b973f8d747d665b852cbbd0940826eedc1ccffd80a386e75a`.
- Adds `/admin/admin` → `/admin` canonical redirect for the current staff-domain
  redirect edge case, preserving query parameters and disabling redirect cache.
- Standardizes financial and commission timestamps to `Asia/Kuching`.
- Adds the received requirements baseline and all requested handover
  deliverables: current deployment, F01–F28 status, 80-row game acceptance,
  18-row payment acceptance, recovery receipt and owner handover.
- Owner-authenticated read-only evidence confirms 76 directory brands, 769 game
  entries, four payment controls and the current fail-closed provider states.
- Verification: 165/165 full tests, 3/3 Render database adapter tests and the
  Render production build pass.
- Integrates the 6 November three-gateway handover. The new
  `docs/PAYMENT_SOURCE_TRACE.md` maps VPay, GSPAY and 1MPay contracts to the
  exact deployed modules, functions and tests.
- 1MPay API 1.3 deposit signatures, double-Base64 query, late-success and
  once-only ledger behavior are implemented and tested offline. GSPAY query
  and callback settlement remain fail-closed pending the exact supplier
  contract.
- Money and supplier launch controls remain unchanged and disabled pending
  production acceptance.
- Final runtime: commit `ec09115c1ec528952c7beeb044fba61b6e35cefc`,
  Render deploy `dep-dbmocd6c6qcc73e2mv4g` (`live`).
- Post-deploy checks verified health/database, owner login, MYR/Asia-Kuching
  accounting, HTTPS canonical admin redirect, zero app error/fatal logs and
  zero HTTP 5xx logs in the acceptance window.
- GSPAY evidence correction: the previously cited supplier ticket does not
  belong to MASTER7. Gateway `1.10.1` removes it from acceptance evidence and
  forces `createProgramReady=false` / `orderReady=false` until the supplier
  issues merchant-specific create-response evidence for `MASTER7VIPMYR+`.

## Full Update All follow-up — 2026-11-06 MYT

- Live portal remains `17.0.0-selfbuilt.58-payment-startup-guard`, commit
  `479ac1559f8e573be549a1e5f0fd299a8eb2bba3`, Render deploy
  `dep-dbmn2cff3r2c73b4q6d0` (`live`).
- The complete read-only production audit is stored in
  `docs/MASTER7_FULL_UPDATE_ALL_FOLLOWUP_20261106.md`; its sanitized machine
  record is `docs/MASTER7_FULL_UPDATE_ALL_STATUS_20261106.json`.
- Customer and staff entries, OTP configuration, Android APK, iPhone Web App,
  roles, reports, referral calculations and encrypted recovery are ready.
- Current catalogue: 769 entries. MegaH5 166, JILI 297, 918KISS H5 92 and
  Rectangle 64 are current; EVO888H5 retains 150 stale cached entries.
- Payment programs are present for VPay, GSPAY and 1MPAY. Real payments,
  settlement, game launch and game wallet remain unverified and off.
- Business content still requires real owner data: company banks 0, benefits 0,
  lobby ads 0 and marketing contacts 0.
- The accompanying SHA-256 manifest covers every uploaded public handover file.

## Payment startup guard candidate — 2026-11-06 MYT

- Candidate portal release: `17.0.0-selfbuilt.58-payment-startup-guard`.
- Legacy startup migrations no longer turn VPay or 1MPAY Active when credentials
  are present. They may record program configuration while every money route
  remains fail-closed.
- A one-time guard snapshots the four payment controls, sets VPay and 1MPAY to
  Suspended, and sets GSPAY and GSPAY+ to Close.
- The `.57` five-step VPay / GSPAY / 1MPAY checklist and cyan status lights are
  included unchanged.
- Verification: portal 164/164 and Render database 3/3 tests; JavaScript syntax
  and the Render production build pass.
- Candidate bundle SHA-256:
  `40721727b2a9295f49b0f3ae024521f449ad70120ecd162b8ab64743ed27ff8e`.

## Payment gateway checks candidate — 2026-11-06 MYT

- Candidate portal release: `17.0.0-selfbuilt.57-payment-checks`.
- Backoffice Payment channels now has one compact VPay / GSPAY / 1MPAY table
  with Connected, Order, Query, Callback and Wallet results.
- Every result is a simple ✅ or ❌. Passed checks have the requested slow cyan
  status light; the table is horizontally scrollable on small phones.
- The table reads secret-free provider status endpoints. Wallet is ✅ only when
  both settlement verification and live readiness are true.
- This release does not enable orders, callbacks, settlement, withdrawals or
  wallet credit. All unaccepted real-money paths remain off.
- Verification: portal 164/164 and Render database 3/3 tests; JavaScript syntax
  and the Render production build pass.
- Candidate bundle SHA-256:
  `d5b5731e1a5c5b54a3ca2108a815aadbcc0f217850dc53d6ec8ba54de31b2499`.

## GSPAY complete program candidate — 2026-11-06 MYT

- Candidate portal release: `17.0.0-selfbuilt.56-gspay-complete-program`.
- Candidate gateway release: `1.10.0`.
- GSPAY MYR has a guarded member-wallet entry, idempotent order record, pinned
  checkout URL, isolated platform capability tokens and backoffice records.
- This historical candidate relied on a create-response example later found
  not to be merchant-specific evidence for MASTER7. Gateway `1.10.1`
  supersedes that claim; order, query, callback and wallet-credit switches
  remain false.
- Game checks now shows separate Connected, Catalog, Launch and Wallet columns.
- The 1MPAY follow-up remains pending formal provider API and end-to-end
  acceptance; VPay stays in its existing UAT/disabled-money state.
- Verification: gateway 84/84, portal 163/163 and Render database 3/3 tests;
  JavaScript syntax and the Render production build pass.
- Candidate bundle SHA-256:
  `606a6e541f07896522a98058c3bc1c4f1630fcbeff67a6d0cef087dc58f6ff3e`.

## Simple access candidate — 2026-11-05 MYT

- Candidate runtime release: `17.0.0-selfbuilt.27-simple-access`.
- Customer front: casino-style copy and compact MASTER7 ID + Malaysian mobile + SMS OTP access.
- Owner backoffice: ID + password with six-character minimum.
- Unverified games and payments remain visibly unavailable without customer-facing API/UAT/staging terminology. UAT VPay cannot appear as a live customer order form.
- Full local suite: 88 passed, 0 failed, 0 skipped; JavaScript syntax and Render production build passed.
- Bundle SHA-256: `3108b6de7564a122df6b1f7c246ba5bac112e6b2581b7a37b1d287d4d2beddc0`.
- Reviewable diff: `docs/patches/MASTER7_SIMPLE_ACCESS_CASINO_COPY_20261105.patch`.
- Domain allocation: `master7.best` customer front; `master7.site` owner backoffice.


## Live withdrawal request build — 2026-11-05 02:59 MYT

- Runtime release: `17.0.0-selfbuilt.26-withdrawal-requests`.
- Bundle SHA-256: `aa15f9b78401e28dd88d9cd5eb2ed68cb1eda49dc26a7474cf0bcc514d5df867`.
- Customer Withdraw page: four separate companies, 18 Malaysian banks, account-holder name, account number and MYR amount.
- Owner backoffice: immediate pending notice, full request details and Approved → Processing → Paid / Rejected controls.
- Provider processing remains manual as confirmed by the owner: MASTER7 receives the request first, then the operator processes it in the selected provider backoffice.
- Bank account details are encrypted at rest using server-only `WITHDRAWAL_DATA_KEY`; exports omit encrypted fields.
- Full local suite: 87 passed, 0 failed, 0 skipped. JavaScript syntax and Render production build passed.
- Reviewable diff: `docs/patches/MASTER7_WITHDRAWAL_REQUESTS_20261105.patch`.
- Source commit: `a067d87e1797fdffb69496c008c001fdf215c28d`.
- Render deploy: `dep-dblo0c8ae00c73cfs5sg` — live at 2026-11-05 02:59 MYT.
- Online verification: `/health` 200 and database ready; front and admin pages 200; 18 banks and four withdrawal companies returned; anonymous member/admin withdrawal requests are denied.

## Current live handover build — 2026-11-05 02:40 MYT

- Service: `master7-v17-staging` (`srv-dbl0iv7f3r2c73848ei0`).
- Source commit: `756c815e44a72cb1dbedc855b087e8212bd1496c`.
- Render deploy: `dep-dblnnd1srm7s73f6f3u0` — live at 2026-11-05 02:40 MYT.
- Runtime release: `17.0.0-selfbuilt.25-supplier-art-manager`; database reports ready.
- Bundle SHA-256: `37a331440b01149416155ed5532a2c8b6de9aab1ecb144bc08512a1be4fd4ef3`.
- Customer front, admin and registration pages return HTTP 200. The live assets contain the lively casino lobby, independent 34-supplier image manager and multi-ad display.
- Catalogue check returned MegaH5 166, JILI 297 and 918KISS 92, totaling 555 records. Game launch remains `playable:false`.
- VPay reports enabled in UAT with six trade codes and remains `realPayments:false` / `liveReady:false`. GSPAY, 1MPAY and GSPAY+ remain closed until their exact order/query/callback contracts pass wallet-ledger tests.
- Anchor SMS still reports `smsOtpReady:false`.

The sections below are retained as historical records and do not supersede this live build.

Updated 2026-11-04 MYT. Current production acceptance is not complete.

## Verified running deployment

- Service: master7-v17-staging (srv-dbl0iv7f3r2c73848ei0).
- Deploy: dep-dblkjbuc6qcc73bgl5l0, live at 23:06:51 MYT.
- Source commit: 0e5c5277e8b8ea8cd409acb3391db34fa5d61f00.
- Running bundle SHA-256: 52abcf443349aafe5b58ff834c60eba62607d8f7e75ca6fdb22f17bbe43f559c.
- Runtime release string remained 17.0.0-selfbuilt.19 across multiple template commits. Use commit and deploy IDs to identify this deployment.
- Frontend HTML, admin HTML, app.js and style.css returned 200. Browser inspection found a real JavaScript startup failure despite these 200 responses.
- Supabase project shspbmnghbgyzcsjukui returned ACTIVE_HEALTHY; its role in the portal's historical data remains unverified.
- The retired invalid admin domain still returned NXDOMAIN; smsOtpReady remained false.

## Verified defects and correction in PR #8

1. Browser startup crashes in renderPaymentPreview because state.paymentChannels is undefined before loadPublic executes. applyLang throws, preventing subsequent session and public-content loading. Initialize an empty channel-state map so the existing maintenance fallback can render until data arrives. This does not enable any transaction or game.
2. Owner activation/recovery returns to customer /signin, which requires a mobile number. Return those owner flows to /admin, retain the returned owner ID, clear credentials, and require a separate authenticated sign-in. Customer SMS registration is unchanged.
3. The owner explicitly confirmed the required template palette is water blue, gold and white. Apply that shared palette to front/backoffice surfaces, inputs, dialogs and navigation, and update the browser theme-color. Preserve the existing layout and latest fonts.

Candidate release: 17.0.0-selfbuilt.19-ui-fix.1.  
Candidate bundle SHA-256: 1c0f0a93d7fe59c5729b2990875269218bb066d4b013bfe48c6bf753fcc43d51.  
Base source: 0e5c5277e8b8ea8cd409acb3391db34fa5d61f00.  
Reviewable source diff: docs/patches/MASTER7_UI_REPAIR_20261104.patch.  
PR: https://github.com/jackysim47-star/master7/pull/8

The archive changes exactly seven files: app/portal.html, lib/backend.ts (release constant only), public/assets/app.js, public/assets/style.css, tests/activation-ui.test.mjs, tests/password-auth.test.mjs, and tests/startup-readiness.test.mjs. Authentication implementation, migrations, provider adapters, balances, payment processing, credentials and business switches are unchanged.

## Verification

- Four owner-route assertions reproduced the previous navigation defect.
- Five startup/three-language cases reproduced the actual browser TypeError before the initialization fix.
- Final complete local suite: 79 tests passed, zero failed or skipped.
- A prior full run returned 78/79 because the existing throttle test crossed the real ten-minute rate bucket. The test now fixes Date.now within that test; rate-limit implementation and thresholds are unchanged. The complete suite then passed 79/79.
- node --check public/assets/app.js passed.
- Main palette text/background contrast pairs were measured at 5.04:1 or above; browser rendering of the new palette is still pending.
- Byte comparison limits the archive changes to the seven files above. The original source archive was restored and checksum-verified.
- Tests used isolated databases and mock services; no live customer transactions or credentials were used.
- No production build or live owner sign-in was performed in this repair task.

## Not yet deployed

This candidate is on a separate repair branch. It has not been merged into the active release branch or deployed. The Render startup script runs initializePortalDatabase. The owner previously required recoverable backups and restore verification before upgrades; full database restore evidence is still absent. Source archive restoration is not database restoration.

The source repair is complete and reviewable. The live startup error remains unresolved until an authorized deployment with the required data protection evidence has completed and browser checks are repeated. Keep the current live deploy above as the code rollback reference; code rollback does not restore database data. Check for concurrent implementation changes before integrating an archived bundle.

Formal backend DNS, SMS readiness, historical data recovery and remaining whole-platform acceptance evidence remain open.

## Historical record

The following .16/.17 report is retained for traceability. Its release, brand and not-deployed statements are historical and are superseded by the record above.

# MASTER7 V17 Render staging package

The staging build serves the new SEVEN customer portal and shared backoffice on Render. It uses a dedicated database and does not import or delete legacy customer records. It does not change production DNS.

- Render service: `master7-v17-staging` (`https://master7-v17-staging.onrender.com`)
- Render branch: `codex/v17-render-staging-20261104`; automatic deploy is off.
- Release: `17.0.0-selfbuilt.16`
- Source bundle SHA-256: `09abe11016bc40d41fcc681614008a176cb9e67385e911ea8ed39779c300897e`
- The Render build unpacks `master7-v17-render-staging.tar.gz` to `.render-v17/` and builds the Node service from that source bundle.

## Staging changes in release 17.0.0-selfbuilt.16

The first customer page is the game lobby; the second is Deposit. The three sponsored provider tiles (JILI, MEGAH5 and 918KISS) stay above the provider catalogue. Supplier catalogue titles are individually grouped by category and provider; each title has Maintenance, Active or Close controls and an 800 × 600 cover field. Supplier-supplied titles default to Close, and Active never enables game launch.

The backoffice contains the owner's separate 76-brand directory grouped into SLOT, FAST GAME, LIVE, FISH, SPORT and OTHERS. It preserves the names and category duplicates supplied by the user, stays out of the customer lobby, and allows 800 × 600 brand artwork. Staff can read the directory; only the owner can change statuses or upload artwork.

Backoffice benefits can be scoped to one sponsor or all three. Claim Bonus shows the matching published offer and its terms. A member's request creates a support ticket for staff review; it does not credit a wallet or trigger a provider reward. Legacy platform mini-game records remain stored but are closed and no longer appear in the customer API or backoffice page. Payment channels also start at Close; selecting Active remains a display/control setting and does not turn on real transactions.

## Limits

This is still staging. Real SMS OTP, provider game launches and settlement, and formal payment/withdrawal UAT have not passed. The portal reports `liveGames=false`, `realPayments=false`, and `productionReady=false`; Active is a display/control state, not approval for real-money operation. The new image and benefit settings use the isolated portal database. No legacy customer data or production domains were changed.

Validation before packaging: 67 Node tests, TypeScript check, Render database adapter tests, and Render build pass. The startup migration snapshots only prior status rows within its transaction; it is not a full database backup. Render Free Postgres does not provide point-in-time restore, so full-database backup/restore remains unverified. The manual Render deployment for the staged source commit succeeded; automatic deploy remains disabled. The anonymous HTTP checks below verify service health and fail-closed public APIs. Owner-authenticated backoffice changes still require the owner to sign in for a visual acceptance pass.


## Deployment verification (2026-11-04 UTC)

- Service: `master7-v17-staging` (`srv-dbl0iv7f3r2c73848ei0`)
- Source commit: `55e4421cd7f6ab7a94ab0b5f6ae603452636e203`
- Render deploy: `dep-dblfr18n74is73a16ns0` — live
- `https://master7-v17-staging.onrender.com/health` returns release `17.0.0-selfbuilt.16`, database ready, `smsOtpReady=false`, `realPayments=false`, `liveGames=false`, and `productionReady=false`.
- The public APIs show the three sponsored brands, zero visible supplier titles, zero platform mini-games, and all four payment channels at Close with `transactionsEnabled=false`. Unauthenticated backoffice calls return 401.
- The migration log confirms 76 closed directory entries were seeded. Production DNS and legacy data were not changed. Full database restore and owner-authenticated live UI acceptance remain unverified.

## Local follow-up candidate (not deployed)

Follow-up verification at 18:28 MYT confirmed the running service still uses the .16 deployment above, all payment channels remain Close, VPay remains disabled, and the public game list remains empty. A local .17 candidate forwards the eight server-side VPAY_* settings already consumed by the route through the Render environment adapter. Missing values stay undefined; the mapping does not change channel status or contact the payment gateway. If the required UAT values are configured and an owner later changes the VPay channel to Active, the existing UAT order flow could become available, so keep the channel Close until sandbox testing is explicitly scheduled.

The open PR #4 was compared against this .16 source bundle before changes. Its direct /register route and direct-registration UI tests were already present in .16, so the older PR archive was not merged. One missing fix was still applicable: a redundant auth-mode assignment could reveal the member-registration button on /admin sign-in. The candidate removes that override and adds a regression test that also checks phone and owner-reset controls.

- Candidate release: `17.0.0-selfbuilt.17`
- Candidate source bundle SHA-256: `9eeb05d9ac6e2c5db72c4576d3dcb3c7f46a0bf1bd0a8fef770420b647ef2db4`
- Validation on the extracted source: 70 Node tests passed, TypeScript check passed, and `npm run build:render` passed.
- Candidate is on a separate local branch and has not been pushed or deployed. Render auto-deploy remains off; production DNS, databases, credentials, and transaction settings were not changed. Render environment-variable values were not inspected.
- Provider sandbox UAT and owner-authenticated UI acceptance remain pending; live money operations must remain disabled.
