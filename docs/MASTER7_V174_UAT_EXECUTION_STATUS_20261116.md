# MASTER7 V174 UAT execution status

Observed: 2026-11-16 16:43 MYT
Release branch baseline: `ee7da3cc9b4cc9602d012b471a27d0269fcdeac1`
Render package SHA-256: `4e1874b01ae7ddfa7826ac14a02e39593d8caf602be653f2d6578bde5f6477e5`

## Fresh internal verification

- Full regression: exit code 0.
- Identity, OTP, Manual Bank, withdrawal, wallet, payment safety, supplier
  acceptance ledger, reconciliation and recovery focus: 278/278 PASS.
- Maintenance: 12/12 PASS.
- Release probe tests: 27/27 PASS.
- Render D1/PostgreSQL compatibility: 3/3 PASS.
- TypeScript, ESLint and Render/Vinext production build: PASS.

These checks use synthetic or isolated evidence. They are not Official UAT,
provider acceptance, live operation or production sign-off.

## Current public/runtime observation

- `www.master7.best`: customer entry, `/health` and `/health/live` respond over
  HTTPS; the root redirects to the customer sign-in page.
- `www.master7.site`: Owner entry, `/admin`, `/health` and `/health/live`
  respond over HTTPS; the root redirects to `/admin`.
- The Node entry probe now passes for both official domains with
  `NODE_USE_ENV_PROXY=1 pnpm probe:entries`. Earlier `ECONNREFUSED`/timeout
  results were reproduced when Node bypassed this workspace's required proxy.
  TLS verification remains enabled. The runtime domain acceptance record still
  requires Owner evidence; a successful transport probe does not write it.
- Runtime release: `17.0.0-selfbuilt.174-uat-preview`.
- Database: ready.
- SMS OTP configuration is present; handset delivery and one-use verification
  remain unverified.
- Anonymous Manual Bank, withdrawal and Owner finance reads return HTTP 401.
- Core, Payment Gateway and Game Gateway remain separate Render services.
  Payment and Game gateways report version `1.21.0`, mode `uat`,
  `productionQa=not_verified` and `liveReady=false`.

## 2026-11-16 16:24 MYT follow-up

- With the correct proxy, the public maintenance probe completed 49/50 checks.
  The remaining check is `providerStatuses.closed`: VPay reports
  `queryReady=false` and `callbacksReady=false`. The probe additionally requires
  both capabilities to be configured even when new deposits are closed. All
  observed money and game controls remain disabled.
- `/api/auth/options` reports `ownerSetupComplete=false`,
  `ownerSetupAvailable=false` and `ownerResetAvailable=false`. This is a current
  Owner onboarding blocker, beyond the previously missing login UAT evidence.
- The account holder confirmed readiness to set the Owner password personally.
  Only `OWNER_SETUP_TOKEN_HASH` and `OWNER_SETUP_EXPIRES_AT` were merged into
  Core configuration. The generated token expires after one hour; no password,
  raw token, API secret or database URL is stored in this report or repository.
- Render automatically triggered Core deploy `dep-dbtbr3c9v7es73a5ucp0`, still
  using release commit `ee7da3cc9b4cc9602d012b471a27d0269fcdeac1`.
- Payment Gateway readiness identifies
  `platform_callback_url_missing_or_invalid` for VPay payment forwarding.
  `VPAY_PAYMENT_FORWARD_URL` was merged with the fixed existing endpoint
  `https://www.master7.best/api/payment-callbacks/vpay/payment`.
  No order, payout or supplier flag was enabled.
- Render automatically triggered Payment Gateway deploy
  `dep-dbtbrjuk1f9s73beroh0` at commit
  `ac03e00bec68f612d62cdf1cd8041eec57626a32`.
- The direct read-only database metadata query was refused because external
  connections are blocked. The network policy was preserved; no private rows
  were obtained and no database contents were changed.
- Core deployment reached `live` at 16:25:22 MYT; Payment Gateway reached
  `live` at 16:25:15 MYT. Post-deploy checks at 16:25:49 MYT confirm
  `ownerSetupAvailable=true`, `ownerSetupComplete=false`,
  `callbackForwardingConfigured=true` and a ready database on V174.
  VPay forwarding now has only the expected `transaction_switch_off` blocker.
  Every observed new-deposit, new-game, new-payout, transaction, real-payment,
  payout and production-ready flag remains false.
- The account holder reported completing activation. At 16:30:31 MYT both
  official origins returned `ownerSetupComplete=true` and
  `ownerSetupAvailable=false`, confirming that the one-use setup marker was
  saved and the original activation is no longer available. No Owner password
  was collected or submitted by the agent. Owner login, logout and recovery
  remain separate acceptance items until executed.

Rollback before Owner activation: set `OWNER_SETUP_EXPIRES_AT=0` and redeploy
the same Core commit. This disables the unused activation token without changing
users. After activation, preserve the Owner credential and use the existing
authenticated recovery process. To withdraw the new VPay forwarding setting,
set `VPAY_PAYMENT_FORWARD_URL` to an empty value and redeploy the same Gateway
commit; do not substitute an unverified destination or change transaction flags.

## Fixed fail-closed state

The public runtime continues to report all new deposit, game launch, payout,
transaction, real-payment and production-ready controls as disabled.

```text
Payment Acceptance   0 / 3
Supplier Acceptance  0 / 43
Live Connections     0
Production Signoff   NO
Production Status    NO-GO
```

## PostgreSQL closeout implementation

Fresh loopback-only PostgreSQL 18.6 execution passed 13/13 suites and 91/91
tests. The first execution exposed three stale test fixtures; original failure
logs are retained. Production protections were preserved:

- Acceptance integrity now first proves production acceptance is rejected
  without matching UAT evidence. A synthetic UAT prerequisite is then recorded
  only inside the isolated test database before the production evidence race.
  Restore coverage includes that additional immutable event.
- Wallet-guard fixtures now supply the required game-origin allowlist. A member
  withdrawal request must remain pending with a prepared, unsubmitted payout;
  the test asserts no provider submission before Owner approval.
- Payout cancellation-race fixtures include the request audit marker and
  synthetic compliance review. They call the actual Owner review and approval
  service before testing submission against concurrent cancellation. The suite
  has an explicit 60-second timeout.
- Targeted Owner/withdrawal and acceptance regression: 32/32 PASS. ESLint on
  all three modified scripts: PASS.
- Statement comparison generated the expected synthetic payment and provider
  differences. `owner_review.json` remains pending with `financialActions=[]`.

The candidate archive SHA-256 is
`ae4e53a809bc20ba22d02913a4bc984bf51cb4be70c86e24afb842808694bc13`.
Exactly three test-script members differ from the baseline archive. All other
member contents, including production code, schema, permissions and links, are
unchanged. The candidate has not been deployed. The readable patch is
`docs/patches/V174_POSTGRES_FIXTURE_RECOVERY.patch`.
It uses zero-context hunks; apply to the baseline source with
`git apply --unidiff-zero` after checking the baseline package hash.

Reproduction requires fresh, empty loopback-only databases and the existing
explicit confirmation variables in each `verify-isolated-postgres-*.mjs`
script. Do not point these test scripts at a production database.

Raw TAP logs, first-run failures, retest results, package member comparison and
reconciliation artifacts are in
`/workspace/output/MASTER7_V174_UAT_EXECUTION_20261116_9RWKQ6`.
These are synthetic verification records, not official vendor acceptance.

At 16:41 MYT the official-entry probe again passed both domains over verified
HTTPS with same-origin redirects and the expected V174 release. At 16:42 MYT
the maintenance probe still passed 49/50 checks: `providerStatuses.closed`
remains false because VPay query/callback readiness is false. The Payment
Gateway reports its payment/withdrawal channels blocked by
`transaction_switch_off`; this blocker was not bypassed to make the probe pass.
At 16:43 MYT both Owner activation and VPay forwarding configuration remained
confirmed. Actual Owner authentication, handset OTP, payment, bank and supplier
execution are still unverified.

Candidate rollback: restore the baseline archive and remove the test patch;
there are no database migrations, member-key changes or API changes to undo.

## Remaining external acceptance

1. Consented test handset OTP delivery, registration and login evidence.
2. Owner login, logout, recovery and session-revocation evidence; activation is
   already confirmed separately.
3. QA-only Manual Bank-In and Bank-Out evidence with bank reference and balanced
   ledger proof.
4. Independent Official UAT for VPay MYR, GSPAY MYR and 1MPay MYR.
5. Independent Official UAT for all 43 Supplier Profiles.
6. Current encrypted backup, isolated restore receipt, external statement
   reconciliation, provider credential rotation/revocation, IP allowlists,
   alert delivery, rollback rehearsal and Owner/independent sign-off.

No additional Render service is required for the current background jobs. The
application already elects one scheduler leader with a PostgreSQL advisory lock
for catalogue sync, accounting close, payment recovery and approved messaging.
Splitting 43 Supplier Profiles into 43 Render services would not replace vendor
contracts, credentials, allowlists or independent acceptance evidence.
