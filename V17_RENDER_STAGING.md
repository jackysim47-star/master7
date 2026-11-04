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
