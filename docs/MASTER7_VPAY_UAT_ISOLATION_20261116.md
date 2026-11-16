# VPay isolated UAT Gateway: source and deployment scope

Staging baseline: `27984d07656a2bd0e85957f8912f553d176570d4`.
The actual Render archive is patched, rather than the unrelated root application.
The package manifest records the baseline/candidate SHA-256 and the three changed
archive members. Every other archive member is byte-identical.

## Implemented behavior

- The legacy Gateway keeps its previous behavior.
- `https://master7-payment-uat.onrender.com` is the only additional allowed
  Gateway. It is accepted only with `mode=uat`, the exact Staging return URL,
  and a Staging-only portal origin context. Arbitrary hosts, credentials in URLs,
  ports, paths and production or mixed portal origins fail closed.
- Configuration, order creation, queries and callback contract checks use the
  selected, validated Gateway. A response redirected to another origin is rejected.
- No public API, schema, member keys, wallet arithmetic, payout implementation,
  production settings or acceptance records change.
- The separate payout implementation remains closed for the new UAT origin.

## Live resource

New service: `master7-payment-uat` (`srv-dbtg1q1srm7s73b6tf00`).
Singapore, one instance, `1c-2g`, authorized US$25/month, auto-deploy off.
Gateway code: `313a73c05d1142b488c1f4220e13b71c40275498`.
Payment-only role, `/health`, no database or persistent disk.
Fresh, independent machine credentials are stored through Render secrets.
Return and forwarding URLs point exclusively to Staging.
Provider credentials are deliberately absent pending official UAT authorization.
New orders and payouts remain disabled.

## Cutover blocker discovered from database evidence

Read-only Render job `job-dbtg2de1egvs73ahv2m0` ran a `BEGIN READ ONLY`
transaction and rolled it back. At `2026-11-16T13:12:50.961872505Z`, Staging
contained one failed VPay order and **seven unknown VPay orders**.

Therefore this release deploys compatible source only. It does **not** change
Staging Gateway URL or peer credentials, cancel unknown orders, mark them paid,
write a ledger entry or release funds. The previous Staging wiring is preserved
until those orders are independently reconciled. Their financial significance
is unverified; no assumption is made that they are paid, unpaid or test-only.

Official UAT provider authorization, credentials, whitelist and test funds are
also missing evidence. The new service being healthy is not payment readiness.

## Verification

Local synthetic checks: full regression 1554/1554, VPay 125/125 (included in full
regression), Gateway 158/158, Render DB compatibility 3/3; TypeScript, ESLint and
Render build pass. A local real-HTTP Gateway-to-portal callback test produces one
balanced two-entry credit from repeated signed synthetic notifications, with
zero provider order submissions and zero acceptance records.

These results are not official UAT, provider acceptance or production approval.

## Rollback and later cutover

Before rollback, inspect current Staging settings and order state again. For
this source-only release, restore Staging's original branch
`codex/v174-uat-all-profiles`, keep auto-deploy off, and deploy the pinned baseline
`27984d07656a2bd0e85957f8912f553d176570d4`. Current Staging credentials and
Gateway URL are unchanged by this release; no database rollback is necessary.

Do not restore old credentials over a later live UAT session. Configuration
snapshots are encrypted locally outside Git and require the authenticated Render
CLI credential used by the execution. Never put secret values into the report.

Only after independent provider evidence resolves all unknown orders may the
Staging URL and peer credentials be switched to the separate Gateway. Reconfirm
database isolation and official UAT credentials before doing so. All production
and real-money gates remain closed. Pending or unknown funds stay held for review.
