# VPay API completion for Production

VPay merchant balance queries were missing from the Production portal and gateway. This release adds a separate read-only balance peer, owner-only portal access, and exact amount normalization, and carries forward completed VPay provider reference handling without replacing member recovery or other services.

## API coverage

- `TRADER_ORDER`: create a MYR order through the configured provider channels; bind member, amount, idempotency key, and provider reference.
- `ORDER_GET`: query an existing merchant order; only confirmed provider payment can credit the member wallet once.
- Payment notification: verify provider signature at gateway, authenticate forwarding to portal, independently query and reconcile; acknowledge plain `SUCCESS` when accepted.
- `MONEY_OUT` / `MONEY_GET`: retain owner approval, distinct merchant/provider IDs, held funds, finality and recovery logic. Reply amounts accept exact integer, one-decimal or two-decimal strings; excess precision is rejected without rounding. Current documented RYT/KRYT bank codes are allowed by the gateway.
- Withdrawal notification: validate provider and merchant IDs and amount; query independently, settle once, keep contradictions under review.
- `TRADER_BALANCE`: query available merchant balance with an independent credential; no balance/settlement verification claim is created.
- Member/owner deposit and withdrawal records retain existing role checks. Automatic e-wallet payouts remain unavailable.

## Deployment scope

- Portal release: `17.0.0-selfbuilt.181-vpay-api-complete` on `release/v17.3-production`.
- Main payment gateway branch: `codex/v174-gateway-role-split-20261116`.
- New environment settings only: portal `VPAY_BALANCE_TOKEN`, gateway `PLATFORM_BALANCE_TOKEN`, and `VPAY_BALANCE_QUERY_ENABLED=true` on both. Tokens are distinct from order/query/callback/payout peers and never printed.
- Existing Production deposit order switches remain enabled. Payout submission switches remain disabled. No Staging/UAT configuration changes.
- Official provider contract: https://zxc.vpayonline.asia/api/doc/trader_en (read 2026-11-18); canonical gateway documentation also checked.

## Validation

- Gateway: 168 synthetic tests passed.
- Portal VPay, withdrawal, environment mapping, migrations and Render adapter: 201 tests passed.
- Fresh local PostgreSQL: 12 payout, callback race, migration and reference tests passed.
- Render TypeScript check and Production build passed.
- No real order, payment, withdrawal or callback replay is used for this release. The earlier successful Staging QR payment is historical evidence only; it does not establish all Production channel acceptance.
- Publication receipts separately record the actual deploy IDs, public health, readiness, configuration preservation and one read-only supplier balance query.

## Rollback

Redeploy the previous recorded commit for each service. The new nullable provider ID column/index are additive and need not be removed. New balance settings can be removed independently; they do not authorize new payments or payouts.
