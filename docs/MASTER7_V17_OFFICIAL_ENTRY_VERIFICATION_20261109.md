# MASTER7 V17 official entry verification

Release: `17.0.0-selfbuilt.123-official-entry-verification`

This release corrects the backoffice readiness display and adds a read-only operational probe. It does not change DNS, attach custom domains, enable transactions, or reconcile historical deposits.

## Changes

- Official customer and staff domains remain `pending_verification` in `/api/admin/system-readiness`. An implemented `/admin` route no longer implies a verified external staff domain.
- The canonical staff domain is `admin.master7.best`; `www.master7.site` is explicitly an alias.
- `probe:production` reports `scope=maintenance_safety_only`, `maintenanceVerified`, and `productionReady=false`. A successful closed-switch check is not a production go-live decision.
- `probe:entries` checks fixed official HTTPS origins with GET only. It omits credentials, refuses cross-origin forwarding, requires a direct matching `/health/live` response, bounds redirects, response size and timeout, and never submits callbacks, orders or wallet operations.
- The entry probe keeps callback delivery, real payment, wallet credit and production acceptance unverified even if transport succeeds. It validates the execution environment's TLS trust chain, not an independent source-certificate inspection.

## Run

```sh
pnpm run probe:entries
pnpm run probe:production -- --base-url https://master7-v17-staging.onrender.com
```

In a managed environment using Node 24 with inherited HTTP proxy settings, prefix the command with `NODE_USE_ENV_PROXY=1`. Do not bypass the proxy or disable TLS verification.

## Callback topology

The current gateway health response publishes VPay and GSPAY callback URLs on `master7-integration-gateway.onrender.com`. The gateway forwards validated events to the Portal using internal authentication. 1MPay's configured callback is a Portal URL. Therefore a customer-domain DNS problem alone does not establish why any historical payment was not credited. Provider transaction, callback-forwarding and wallet records must be matched per order.

## Validation

- Full automated suite: 1030/1030 passed.
- Maintenance tests: 12/12 passed.
- Release probe tests, including official-entry checks: 25/25 passed.
- Render database adapter: 3/3 passed.
- TypeScript, ESLint and Render production build passed.

External DNS/TLS, real-money deposits, callbacks, credits, payouts, provider settlement and owner sign-off remain separate acceptance requirements.
