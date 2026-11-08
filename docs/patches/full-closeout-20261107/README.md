# MASTER7 full source candidate — 8 November 2026

The unified patch reconstructs `17.0.0-selfbuilt.98-customer-cashier` from the immutable .94 archive at e3faa8ddc6b6fe87768e9e71f466ce48538bfad7. It includes the prior .95–.97 repairs, automatic API capability, preserved original vendor contracts and MYT deposit reporting.

This candidate replaces the old mixed deposit interaction with independent VPay, GSPAY+ and 1MPAY cashiers. Each loads its own status and opens its validated payment URL in the same tab. Explicit failures, unknown results, same-key recovery and cross-member response isolation are covered by behavior tests. An independently reproduced matured deposit-limit error is fixed without changing the saved limits or effective-time rules. Safe 409 diagnostics identify local conflicts without customer or secret data.

It removes unused reserved game/editor surfaces, preview-only reward/event controls, duplicate admin help and a disabled marketing placeholder while preserving stored configuration, actual functions, all 34 vendor brands and all three payment brands. Staff/owner visibility and financial-report period races are corrected.

The guarded candidate branch does not deploy to Vercel or Render. Every test, including hosted identity boundaries, and the actual Render build must pass before the narrowly scoped publisher retains the archive. No simulated response is represented as a live payment or game settlement. See source docs/MASTER7_CUSTOMER_CASHIER_20261108.md for behavior and evidence limits.
