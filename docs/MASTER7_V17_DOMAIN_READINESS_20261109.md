# MASTER7 V17 `.121` domain readiness

Release: `17.0.0-selfbuilt.121-domain-readiness`

This release removes the staging-only payment-return assumption while keeping
all transaction switches closed. Payment destinations are accepted only when
they use one of these exact HTTPS customer origins:

- `https://master7-v17-staging.onrender.com`
- `https://master7.best`
- `https://www.master7.best`

VPay and GSPAY+ require the fixed `/payment/return` path. 1MPay additionally
requires its callback and return URLs to use the same approved origin and the
fixed `/api/payment-callbacks/1mpay/payment` callback path. GSPAY+ validates a
provider checkout return against the request context before returning it to a
member. Invalid schemes, suffix domains, credentials, ports, paths, queries,
fragments, or mixed origins fail closed.

The customer and staff entry points now use fixed host routing. Customer
`GET`/`HEAD` requests for `/admin` and `/admin/...` redirect to the same path on
`https://admin.master7.best`. Approved `.site` and admin host aliases route
their root page to `/admin`. API routes, callbacks, state-changing methods,
malformed hosts, and explicit-port hosts are never redirected.

Validation completed before packaging:

- maintenance controls: 12/12 passed
- release probes: 16/16 passed
- complete test suite: 1006/1006 passed
- Render database adapter: 3/3 passed
- independent focused security review: 104/104 passed
- TypeScript, ESLint, and Render production build passed
- clean deployment archive reproduced twice with SHA-256
  `7399660ed320672a9df36aeb7f488c498bb6f8ef6555d691fd289d7ffb9387ba`

The archive excludes dependencies, build output, local environment files,
caches, certificates, and private keys. `.env.example` is the only environment
template included.

This release does not modify DNS, Render environment values, databases,
credentials, payment records, wallet balances, or provider accounts. It does
not enable deposits, game launches, or payouts. The previous portal release
commit `2c7596704fc1835b85decdd7aa0f5ad2079610a` remains the code rollback point.
