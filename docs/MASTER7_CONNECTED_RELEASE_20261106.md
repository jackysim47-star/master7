# MASTER7 `.68` Connected Services Release Receipt

- Release: `17.0.0-selfbuilt.68-connected`
- Source commit: `23f6f6d26a3f1b91d79b16c43c85899945ea1e41`
- Bundle SHA-256: `08030fde94a8e0813d94d08b79387aeac330c8f7a1a79811926fc7452aa72cc0`
- Prepared: 2026-11-06 MYT
- Publication commit: `49c5afb909c9fae58bdabdb32ec9dde01292aea1`
- Render deploy: `dep-dbmsjuuc6qcc73cf2710` (`live`)
- Live at: 2026-11-06 20:39:16 MYT

This release keeps every `.67` feature and adds one-time activation of an explicitly enabled, strictly validated Deposit connection:

- VPay, 1MPay and GSPAY each have an independent migration marker and pre-change snapshot.
- A channel becomes Active only when its own `ORDERS_ENABLED=true` and its pinned production URL, credentials and callback/return configuration all pass validation.
- A later Owner choice of Active, Maintenance or Close survives service restarts; startup will not reopen a channel after its one-time marker exists.
- VPay UAT and incomplete GSPAY credentials cannot activate production Deposit.
- Payout remains independent and is not enabled or changed by this migration.

Verification: full Portal tests 229/229, TypeScript pass, ESLint pass, Render DB 3/3, production build pass, and activation-focused tests 6/6.

Render environment values were merged rather than replaced. The deployment reached `live`; `/health` and `/api/version` return HTTP 200, `.68-connected` and `database=ready`. New-instance application error/critical/fatal and request 5xx counts are zero.

Current verified state after deployment:

- MegaH5 wallet is configured, enabled and live-ready; the member route still requires an approved signed-in account and an Active game.
- 1MPay Deposit is configured and enabled.
- VPay is Active locally but still reports `gateway_contract_not_ready`, so its program blocks an order before provider submission.
- GSPAY stays unavailable because the supplied Operator Authentication Key has 31 hexadecimal characters; the strict vendor contract requires at least 32.
- Payout is unchanged and cannot be submitted by this release.

