# MASTER7 .99 payment settlement deployment review

## Purpose and scope

Release `17.0.0-selfbuilt.99-payment-settlement` repairs ordinary GSPAY Payment reconciliation so incomplete or unsigned status hints and local elapsed time cannot falsely terminate an order. A provider-confirmed result must pass the existing signature, order, payer, amount and known provider-reference binding checks. Recovery queries the original merchant transaction ID even when the creation response was lost.

The delta is based on the exact live `.98-customer-cashier` source and contains only `lib/gspay.ts`, its regression tests, this release's documentation, release identifiers and the two matching asset-version assertions. The parked game-interface changes are not included. VPay, GSPAY+ and 1MPAY retain their independent member cashier entries and original vendor protocols.

## Confirmed behavior

- Ordinary Payment callbacks independently query GetPayment before confirming a terminal outcome. The callback signature does not cover the success/completed flags.
- Missing or malformed query fields and temporary query failures remain unconfirmed. The DuitNow ten-minute rule is not applied to ordinary Payment.
- A missing create response can be recovered using its original merchant transaction ID without creating another order.
- Settlement obtains the deposit-order row lock in the same database transaction as its terminal-state decision, balanced ledger writes and audit.
- If a confirmed failure has already won, a later successful result becomes review without automatic credit. If successful credit wins first, a later failure cannot downgrade it.
- Repeated successful notifications retain exactly one balanced ledger pair.
- Existing failed/review history is not bulk modified. Member approval, CSRF/Origin, wallet ownership, idempotency, signing, payout behavior and ledger constraints remain enforced.

There are no database migrations, secret changes, vendor-endpoint changes or payout enablement in this release.

## Verification and provenance

| Item | Evidence |
| --- | --- |
| Reviewed local source | `1535bbda403d7ca3c3a373e4dd77088b7360a822` |
| CI source commit | `2b7ce2486b4a7d6bac4e818ea1fcbb02f2aa7f08` |
| Candidate publisher commit | `73c7579413b558d65e561ea21949102a10ad5e56` |
| Full verification | [GitHub Actions 42459437080](https://github.com/jackysim47-star/master7/actions/runs/42459437080), success |
| Test result | 86 test files; 582 passed, 0 failed, cancelled, skipped or todo |
| Build | Actual Render build completed inside the isolated network namespace |
| Test isolation | 0 external-network attempts; no production credentials injected; identity-boundary tests included |
| Node / pnpm | v24.22.1 / 11.25.0 |
| Locked package count | 889 |
| Source file count | 496 |
| Patch SHA-256 | `3300e94845d434b2529023778cd003bdbb48d8ec6b531dc692da2b863d2bab4f` |
| Source manifest SHA-256 | `b7d9bc1b95ae6bdc103baca6a8a52625501b3e4188c304f149c02f210b1867a0` |
| Archive SHA-256 | `de155383a1970a28a01f08010ae8b5816aa06b7cbb6334bc1c2420e93aa3ade5` |
| Archive size / Git blob | 3,681,756 bytes / `e840b61723cf3f4c0fe7e2cad9fd578fc26444ee` |

The independent reconstruction matched every source file byte and mode to the reviewed release worktree before CI. The successful publisher changed only the archive and its unchanged verification receipt on the candidate branch. This production promotion changes only those same two files and this review.

Local regression evidence also includes 72/72 GSPAY portal/recovery/payout tests after the final concurrency repair, and the concurrency reproduction failed before the fix. An independent reviewer checked the final code. Synthetic tests are not a real payment or a production PostgreSQL concurrency acceptance test.

## Deployment and rollback

Production branch: `codex/v17-render-staging-20261104`.
Expected previous head: `7fe425bb784ffb6918e957245a3bc7b906bcf59d`.
Render service: `master7-v17-staging` / `srv-dbl0iv7f3r2c73848ei0`.
Auto-deploy is disabled; promote with an expected-head lease and request one deploy. A live deploy and a fresh `/health` check for the exact release are required before claiming this repair is online.

Rollback baseline is the previous head above and archive SHA-256 `db877f7ee1d709cce5e8a1afbc8452aa1b053a7c375ffb99e9ea86edf4371be4`. Revert the release archive through a normal forward commit if rollback becomes necessary.

## Acceptance boundary

No live deposit order, real payment, payout, game launch or wager was submitted by this validation. The three providers' real settlement acceptance remains unverified. Frontend deposits require an approved member session; Admin and Staff sessions are for management and reporting. The account holder must complete any actual payment and its resulting provider status, single wallet credit and financial report must agree before declaring that provider accepted.

Source receipt: `docs/MASTER7_FULL_REPAIR_CANDIDATE_20261107.json`. Its cumulative candidate-scope wording is retained verbatim; the incremental scope relative to the deployed .98 release is the payment-only scope above.
