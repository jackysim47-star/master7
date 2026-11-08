# MASTER7 V17: two official entries

Release: `17.0.0-selfbuilt.124-two-official-entries`

The owner selected exactly two public entries:

- Customer frontend: `https://www.master7.best`
- Shared owner/staff backoffice: `https://www.master7.site`

Customer admin links and old staff page addresses redirect to `www.master7.site`. Referral, campaign, registration and unsubscribe links use `www.master7.best`. Old hostnames are not listed as independent official entries. API, callback and state-changing requests are never redirected by the page routing rule.

The backoffice readiness list and `probe:entries` contain only the two public entries. The technical Render address remains an internal deployment/testing address. Pending DNS, TLS and direct application routing are still shown as pending; no transaction or acceptance flag is enabled by choosing domains.

Render's explicit browser-origin configuration should contain the two public HTTPS origins. `PUBLIC_ORIGIN`, payment return URLs and 1MPay callback origin must not switch to an unreachable domain before DNS/TLS verification. The Render runtime already adds its technical service origin for internal testing. VPay/GSPAY provider callbacks continue using their separate, authenticated integration-gateway route.

Validation: 1031/1031 full tests; 12/12 maintenance; 25/25 release probes; 3/3 Render DB adapter; TypeScript, ESLint and production build. The domain routing tests assert the one shared staff destination and protect API/callback non-redirection.
