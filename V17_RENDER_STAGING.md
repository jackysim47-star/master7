# MASTER7 V17: current deployment and UI repair candidate

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
- www.master7.admin still returned NXDOMAIN; smsOtpReady remained false.

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
