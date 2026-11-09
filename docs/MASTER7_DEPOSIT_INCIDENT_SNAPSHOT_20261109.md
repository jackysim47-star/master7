# MASTER7 .127 — Production deposit evidence snapshot

Release: `17.0.0-selfbuilt.127-deposit-evidence`.

## Purpose

Investigate stored deposit orders, payment diagnostics and wallet ledger rows through the application's current PostgreSQL connection. This avoids changing the database external IP allowlist or moving credentials outside Render. It does not call payment providers, resubmit orders, post money or modify existing data.

`GET /api/internal/deposit-incidents` is disabled unless both `PORTAL_DEPOSIT_FORENSICS_TOKEN_HASH` and `PORTAL_DEPOSIT_FORENSICS_EXPIRES_AT` are valid. The bearer is a dedicated random 32-byte value, compared by SHA-256 digest in constant time. Expiry must be in the next hour; expired/missing/malformed credentials fail before database access. No other payment, admin or recovery token is accepted. POST and query parameters are rejected.

The endpoint uses fixed SELECT statements in a PostgreSQL REPEATABLE READ READ ONLY transaction, with a five-second per-statement timeout and guaranteed rollback/client cleanup. Orders are limited to 1000, audit candidates to 10000; any truncation is explicit. There is no caller-supplied SQL, member selector or write operation.

The response contains original order/provider IDs, amounts, timestamps, statuses, redacted diagnostics, ledger legs and hashed member references. It excludes usernames, phone numbers, bank details, receipt images, raw callback bodies, checkout query strings and credentials. Manual review records are reported without reviewer identity. Evidence may still be financially sensitive and is for authorized incident review only.

## Interpretation

- An explicit latest provider business rejection with no provider reference, checkout or ledger is classified at B.
- A credited order with exactly matching balanced ledger legs proves a stored wallet credit. Frontend display and external payment remain separately unverified.
- Partial, wrong-owner, wrong-currency or wrong-amount ledger rows are reported as mismatches, never repaired.
- Existing credit audit events do not distinguish callback from query/recovery. Missing dedicated callback evidence never proves no callback arrived.
- Other databases and earlier production versions are outside this snapshot. Provider transaction references and payment receipts remain necessary where local evidence is insufficient.

## Validation

23 focused tests cover access control, expiry, no unauthorized database/provider requests, bounded scope, redaction, evidence classification, incomplete data and cleanup errors. Fresh loopback PostgreSQL 18 tests verify a consistent snapshot across a concurrent credit, actual database write rejection, and redacted provider rejection evidence (4 tests including parent).

Full regression: 1108/1108. Maintenance: 12/12. Release probes: 25/25. SQL compatibility: 3/3. TypeScript, lint and Render build passed. No schema migration or real-money activation is included.

## Operation and retirement

Store only the one-off token digest and expiry in Render; keep the random bearer transient and do not write it to source, logs or local files. After the authorized read, clear both configuration values and redeploy to confirm the endpoint rejects the retired bearer. The expiry also bounds its lifetime independently. Blueprint sync remains manual, and omitted service variables are preserved.
