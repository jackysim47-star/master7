# MASTER7 V17.134 security and go-live recheck

Checked: 2026-11-09 11:28–11:30 UTC

Release: `17.0.0-selfbuilt.134-scheduler-leader`

Scope: repository/release archive and public Render runtime. No configuration, database, transaction, DNS, secret or deployment mutation was performed.

## PASS

- HTTPS certificate verification succeeded (`ssl_verify_result=0`) and the runtime negotiated HTTP/2. Plain HTTP redirects to HTTPS.
- HTML responses carry HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Permitted-Cross-Domain-Policies`, `Cache-Control: no-store`, and a restrictive CSP.
- JSON APIs carry the baseline transport headers and `Cache-Control: no-store`.
- A hostile `Origin` received no `Access-Control-Allow-Origin`; preflight returned no CORS grant.
- Anonymous access to `/api/admin/summary`, `/api/admin/export`, `/api/admin/security`, and `/api/internal/deposit-incidents` returned HTTP 401. No administrative data was returned.
- Owner one-time setup is complete. Public setup and reset availability are both false. SMS OTP readiness is true.
- Common sensitive/static paths (`/.env`, `/.env.example`, `/.git/config`, `/package.json`, `/render.yaml`, the release archive path, source maps and debug paths) return 404.
- The V17.134 archive contains no PEM private key marker, common cloud token prefix, or hard-coded live secret assignment. `.env.example` contains variable names/placeholders only. Credential-shaped constants found by the scanner are test fixtures, field names, hashes or server-side types.
- Public status/health responses expose readiness booleans and release metadata, not provider credentials, member data or wallet records.
- Authentication uses server-side sessions, `__Host-` Secure/HttpOnly/SameSite=Strict cookies, CSRF validation, exact-origin validation, throttling, single-use OTP, salted scrypt password hashes and session revocation after credential changes.
- Targeted security regression: **85/85 passed** (`runtime-hardening`, `password-auth`, `payment-public-origin`, `api`).

## Operational items required before real-money activation

1. **Rotate every payment/provider credential previously pasted into chat or screenshots.** The runtime does not expose environment values, so rotation cannot be proved by this audit. Update only Render Secret/Secret File and the corresponding provider portal; keep all transaction switches closed until both sides use the new values.
2. The current hosted password policy permits six-character passwords. Existing hashing, throttling and session protections work, but owner/staff production accounts should use randomly generated long passwords; adding owner/staff MFA and enforcing at least 12 characters is recommended before commercial go-live.
3. Add `includeSubDomains` to HSTS only after both official domains and every required subdomain are correctly attached and HTTPS verified; doing it before DNS completion could lock out an unresolved host.
4. Retain `PORTAL_NEW_DEPOSITS_ENABLED=false`, `PORTAL_NEW_GAME_LAUNCHES_ENABLED=false`, and `PORTAL_NEW_PAYOUTS_ENABLED=false` until real provider acceptance is recorded.

## Decision

Code and public-runtime security controls reviewed here: **PASS**.

Credential rotation evidence: **NOT VERIFIED**.

Real-money production activation: **NOT APPROVED until credential rotation and provider/payment acceptance are complete**.
