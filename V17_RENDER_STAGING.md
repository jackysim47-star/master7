# MASTER7 V17 Render staging package

This branch carries the isolated SEVEN customer portal and shared backoffice for Render staging. It is not production and does not change either official domain or import legacy customer data.

Staging source bundle SHA-256: `7892fa06aea5fcaa9fe36f6f55a8fbf65f95fdd8090dffe9f1456652e0c83652`
Release: `17.0.0-selfbuilt.12`
Source archive is expanded by the Render build command into `.render-v17/`.

The package now includes backoffice-managed lobby ads (1200x360, rotating every five minutes), configurable benefit display rules, individually managed provider game cards and up to five separately displayed SEVEN mini-game cards (800x600 artwork). Malaysian member phone numbers are collected and normalized; account passwords require at least eight characters. Owner/staff sign-in remains ID and password at `/admin`.

Important staging limits: SMS OTP is not connected, so customer SMS verification is not complete. Provider games and platform mini-game cards are catalogue/display entries only and cannot launch or settle. Deposits, withdrawals, wallet changes and real-money play remain disabled. Do not connect production DNS or import legacy data based on this package.

The VPay wallet path is now mounted for isolated staging UAT: MYR deposit intents, idempotent order creation, a callback accepted only from the gateway peer, independent provider order-query before credit, and balanced double-entry ledger rows. The service reports VPay disabled unless isolated UAT configuration is complete; the explicit order switch defaults off. No provider order is created by build or health checks, and production mode is rejected. Synthetic tests cover disabled-by-default, query-before-credit, amount matching, and duplicate callback idempotency. SMS, withdrawals, provider authorization/real UAT, and production settlement remain unverified and disabled.


## 2026-11-04 staging update · wallet UI

The member lobby now reads the MYR wallet balance, VPay status, and the member's own deposit records. The owner backoffice has a read-only deposit record panel; employee access remains denied by the API. The VPay status endpoint performs a read-only gateway readiness check and returns only verified UAT trade codes. A UAT request form is shown only when the status endpoint confirms UAT readiness; payment status still advertises `realPayments=false` and `liveReady=false`. With the current staging switch off or provider configuration unverified, the form remains hidden and no order is created. This change does not enable live payment, withdrawals, SMS OTP, or game play.

Validation: `node --test tests/api.test.mjs tests/password-auth.test.mjs tests/render-d1.test.mjs` (44 passing), `npx tsc --noEmit`, `node --check public/assets/app.js`, and `npm run build:render`.

## Registration URL and management sign-in repair candidate

This candidate is not deployed. The current live baseline is a159a8e25796b0df3ae2d11ed3edc98595d69ce9 / 17.0.0-selfbuilt.11.

- Add GET /register using the existing portal response and open the member registration dialog.
- Remove an unconditional visibility assignment that exposed member registration on management sign-in.
- Keep existing authentication and approval rules.
- Correct the existing UI test fixture to explicitly use Chinese, support section navigation, and expect owner activation/recovery to return to /admin. These fixture mismatches were reproduced on the unchanged baseline.
- Add regression cases for direct member registration entry and management sign-in controls.

Validation: 55/55 local tests pass across api, password-auth, render-d1 and activation-ui suites. JavaScript syntax check passes. The archive hash was independently checked after repacking. No dependency versions, migration files, startup scripts, environment variables or real transaction switches changed. Full hosted build and browser verification are pending.

The readable patch is docs/V17_register_route_fix_20261104.patch. Existing service configuration and old data must be preserved when scheduling this candidate for deployment.
