# MASTER7 .98 customer cashier deployment review

Reviewed release: `17.0.0-selfbuilt.98-customer-cashier`.

## Reason and behavior

Customer deposits still used a mixed wallet/form interaction in .97. This release gives VPay, GSPAY+ and 1MPAY independent cashiers, reads only the selected provider before showing its form, preserves original API payloads and trusted checkout rules, and opens a valid checkout in the same tab with a fallback link. Explicit rejection, conflict and unconfirmed outcomes are separated. Request keys and delayed responses are isolated by member identity.

The backend now applies an already-saved, matured deposit-limit change before reservation. The original allowance, cooldown, self-exclusion, idempotency, reservation, callback verification and ledger protections remain. Fixed-field 409 diagnostics contain no customer details or secrets. Five earlier VPay create 409 responses were local conflicts; their exact cause is not established by request logs, and this independently reproduced defect is not claimed as their proven cause.

Preview-only event/reward editors, reserved custom-game UI, duplicate admin help/directory and a disabled marketing placeholder are removed or hidden. Stored configurations and all 34 supplier brands remain. Daily check-in, non-cash points, records, real admin actions and all three payment brands remain. Staff visibility, report period races and obsolete controls are corrected.

## Exact validation

- Candidate source commit: [f33d9efa58a4132caa98ed422969df5030639f3b](https://github.com/jackysim47-star/master7/commit/f33d9efa58a4132caa98ed422969df5030639f3b)
- Candidate publisher: [a13e36b67b0c7a2a6fc25363d9a3a57787b648b7](https://github.com/jackysim47-star/master7/commit/a13e36b67b0c7a2a6fc25363d9a3a57787b648b7); its sole parent is the verified source commit and it changes only archive plus receipt.
- Full CI: [42453543861](https://github.com/jackysim47-star/master7/actions/runs/42453543861), completed successfully.
- **542 / 542 tests in 86 files**; zero failures, cancellations, skips or todos. Actual Render build and hosted-identity boundary included.
- Node v24.22.1; pnpm 11.25.0; 889 locked packages. Network namespace isolated, zero test/build network attempts and no production credentials injected.
- Source files: 495; archive bytes: 3677152.
- Archive SHA-256: `db877f7ee1d709cce5e8a1afbc8452aa1b053a7c375ffb99e9ea86edf4371be4`.
- Archive Git blob: `9bc0f017ec5a247f56146ee46439cf1d617d7c10`.
- Patch SHA-256: `6b78d2d8cd75e5405862c9760115015afd8cd048dd8726dada37f8c0c9698eb6`.
- Source manifest SHA-256: `06cf5ee280cb3c4039ad62aecfaf290b162e6c0d42b52be1e749f43d510ce915`.
- Independent local reconstruction from the immutable .94 archive matched every reviewed source path, byte hash and executable mode, then produced the same deterministic archive hash/blob as CI.

## Promotion and rollback

Promote only the archive, its exact CI receipt and this review to `codex/v17-render-staging-20261104`. The reviewed previous production commit is `2367eace70e7d49f4ab122eff6b0967d4c7c4a75` (.97), most recently redeployed manually at 2026-11-08T05:59:34.16609Z. Its archive and history remain available for source rollback.

The Portal service has auto-deploy disabled; trigger one deploy after the branch advances and verify the deploy's exact commit. The separate integration gateway is unchanged. No environment variable or schema change is included. Application startup and existing recovery jobs still perform their normal initialization/reconciliation; this review does not assert zero runtime writes or a new production backup/recovery rehearsal.

## Acceptance limits

No production order, payout, game launch, fund transfer or wallet credit was executed by these tests. Configured payment status is not real settlement acceptance, and fresh catalogues do not prove complete launch/wallet adapters. Local Chromium execution was unavailable due to environment socket/approval restrictions; synthetic interaction tests and later public-page inspection must not be described as an authenticated member payment acceptance. See the source's `docs/MASTER7_CUSTOMER_CASHIER_20261108.md` for full behavior and limits.
