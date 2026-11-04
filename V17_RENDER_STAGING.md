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

Validation before packaging: 67 Node tests, TypeScript check, Render database adapter tests, and Render build pass. The startup migration snapshots only prior status rows within its transaction; it is not a full database backup. Render Free Postgres does not provide point-in-time restore, so full-database backup/restore remains unverified. Trigger a manual Render deploy only after this commit is pushed to the service's staging branch; automatic deploy remains disabled. After deployment, verify the exact source SHA, `/health`, static assets, the two pages, brand directory, per-game states, and ticket-based bonus request in staging.
