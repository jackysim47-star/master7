# MASTER7 .128 — VPay historical order evidence

Release: `17.0.0-selfbuilt.128-vpay-evidence`.

The existing expiring incident authorization now also protects `GET /api/internal/deposit-incidents/vpay-query`. It queries up to ten already-stored VPay orders using the existing dedicated gateway query token and documented order-query operation. Missing provider transaction numbers do not cause a new order: the stored platform ID is used for query only.

Two workers bound concurrency. Stored provider references must match the reply. Paid evidence requires a successful query envelope, exact platform order, supplier reference, amount, merchant and matching MYR currency when supplied. Unknown, pending, failed, reversed, incomplete or conflicting replies never count as wallet credit. No reference, status, audit, recovery lease or wallet row is written by this observer. No transfer or order-create endpoint is called.

The same endpoint controls apply: absent or expired separate incident credential fails before access, GET only, no query parameters, expiry at most one hour. Existing payment and recovery tokens cannot authorize the incident endpoints. Temporary incident authorization must be retired after collection and its rejection confirmed after the applicable deploy.

Validation: 14 new tests, including missing-reference query, exact binding, redaction, bad configuration, bounded concurrency, truncation and unauthorized requests. Full regression 1137/1137; maintenance 12/12; release probes 25/25; SQL compatibility 3/3; typecheck, lint and Render build passed. Synthetic tests do not certify supplier settlement or real-money go-live.

Historical incident results belong in the separate production evidence files, not in code-level readiness flags. New deposits, game launches and payouts remain closed.
