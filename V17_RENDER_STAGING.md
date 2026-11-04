# MASTER7 V17 Render staging package

The staging build serves the new SEVEN customer portal and shared backoffice on Render. It uses a dedicated database and does not import or delete legacy customer records. It does not change production DNS.

- Render service: `master7-v17-staging` (`https://master7-v17-staging.onrender.com`)
- Render branch: `codex/v17-render-staging-20261104`; automatic deploy is off.
- Release: `17.0.0-selfbuilt.15`
- Source bundle SHA-256: `e4660cca6406db90809588918839e57b825366b5ec9afab6f58eae0a2b4dd503`
- The Render build unpacks `master7-v17-render-staging.tar.gz` to `.render-v17/` and builds the Node service from that source bundle.

## Staging changes in release 17.0.0-selfbuilt.15

The first customer page is the game lobby; the second is Deposit. The three sponsored provider tiles (JILI, MEGAH5 and 918KISS) sit above the provider catalogue. Each provider has a separate 800 × 600 (4:3) sponsor-art upload field and separate View games and Claim Bonus actions. Each provider-supplied game is listed separately and grouped by category and provider; backoffice controls each title with Maintenance, Active or Close and accepts a separate 800 × 600 game cover.

Backoffice benefits can be scoped to one sponsor or all three. Claim Bonus shows the matching published offer and its terms. A member's request creates a support ticket for staff review; it does not credit a wallet or trigger a provider reward. Legacy platform mini-game records remain stored but no longer appear in the customer API or backoffice page.

## Limits

This is still staging. Real SMS OTP, provider game launches and settlement, and formal payment/withdrawal UAT have not passed. The portal reports `liveGames=false`, `realPayments=false`, and `productionReady=false`; Active is a display/control state, not approval for real-money operation. The new image and benefit settings use the isolated portal database. No legacy customer data or production domains were changed.

Validation before packaging: 62 Node tests, TypeScript check, Render database adapter checks, and Render build. Trigger a manual Render deploy only after this commit is pushed to the service's staging branch; automatic deploy remains disabled. After deployment, verify the exact source SHA, `/health`, static assets, the two pages, provider artwork, per-game states, and ticket-based bonus request in staging.
