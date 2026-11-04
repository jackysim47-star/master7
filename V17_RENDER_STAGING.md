# MASTER7 V17 Render staging package

This branch carries the isolated SEVEN customer portal and shared backoffice for Render staging. It is not production and does not change either official domain or import legacy customer data.

Staging source bundle SHA-256: `90b1142fb4a412a121d4495250143e55d3896e131fe4e4bd688ec54aeab30049`
Release: `17.0.0-selfbuilt.11`
Source archive is expanded by the Render build command into `.render-v17/`.

The package now includes backoffice-managed lobby ads (1200x360, rotating every five minutes), configurable benefit display rules, individually managed provider game cards and up to five separately displayed SEVEN mini-game cards (800x600 artwork). Malaysian member phone numbers are collected and normalized; account passwords require at least eight characters. Owner/staff sign-in remains ID and password at `/admin`.

Important staging limits: SMS OTP is not connected, so customer SMS verification is not complete. Provider games and platform mini-game cards are catalogue/display entries only and cannot launch or settle. Deposits, withdrawals, wallet changes and real-money play remain disabled. Do not connect production DNS or import legacy data based on this package.

The VPay wallet path is now mounted for isolated staging UAT: MYR deposit intents, idempotent order creation, a callback accepted only from the gateway peer, independent provider order-query before credit, and balanced double-entry ledger rows. The service reports VPay disabled unless isolated UAT configuration is complete; the explicit order switch defaults off. No provider order is created by build or health checks, and production mode is rejected. Synthetic tests cover disabled-by-default, query-before-credit, amount matching, and duplicate callback idempotency. SMS, withdrawals, provider authorization/real UAT, and production settlement remain unverified and disabled.


## 2026-11-04 staging update · wallet UI

The member lobby now reads the MYR wallet balance, VPay status, and the member's own deposit records. The owner backoffice has a read-only deposit record panel; employee access remains denied by the API. The VPay status endpoint performs a read-only gateway readiness check and returns only verified UAT trade codes. A UAT request form is shown only when the status endpoint confirms UAT readiness; payment status still advertises `realPayments=false` and `liveReady=false`. With the current staging switch off or provider configuration unverified, the form remains hidden and no order is created. This change does not enable live payment, withdrawals, SMS OTP, or game play.

Validation: `node --test tests/api.test.mjs tests/password-auth.test.mjs tests/render-d1.test.mjs` (44 passing), `npx tsc --noEmit`, `node --check public/assets/app.js`, and `npm run build:render`.
