# 1MPay non-terminal query observations

Staging source baseline: `840057b73074bea9684a012e2a102fbb971e8a0b`.

## Problem and compatibility decision

An independently bound historical Staging query returned provider status `fail`
while its stored order remained `unknown`. Inspection of the actual settlement
path and existing regression tests established that this retention is deliberate:
the recovered 1MPay v1.3 mapping documents late status correction, while terminal
failure finality for the active merchant is not established.

This release does **not** force `fail`, `failed` or `timeout` into a terminal
platform status. It closes an observability gap: previously the scheduled
non-success query retained no durable sanitized observation for Owner review.

## Implementation

- After all existing query signature, merchant, customer, amount, currency,
  order and provider-reference bindings pass, append one
  `1mpay_query_observed` audit event per order/reference/allowlisted status.
- Allowed status observations are pending/fail/failed/timeout/unrecognized.
  Unknown upstream strings are discarded. Signing material, merchant secrets,
  raw responses and full provider references are not recorded in the event.
- The transaction rechecks the order/member/amount/currency/reference bindings
  before appending; a stale observation cannot attach to a rebound reference.
- Event finality is always false. Owner trace and the read-only incident
  reader disclose the observation with `requiresReconciliation=true`, without
  calling it payment success, callback success or provider acceptance.
- Existing Owner trace UI displays the historical observed status and directs
  reconciliation against the current order state and provider report.
- Repeat and concurrent queries do not duplicate observations. A later
  independently confirmed success retains the existing exactly-once credit path.

No customer route, callback contract, merchant credentials, feature flag,
schema migration, member identifier or balance policy changes. The existing
Owner trace diagnostics array gains a sanitized observation variant; old
consumers remain compatible. The VPay isolation changes from the baseline are
preserved byte-for-byte.

## Verification

- Focused recovery/trace/incident tests: 57/57 PASS.
- Full core regression: 1562/1562 PASS.
- TypeScript, ESLint and Render build: PASS.
- Isolated loopback PostgreSQL: real transaction/SQL checks pass for duplicate
  observations, concurrent claims, Owner trace reading and late successful
  exactly-once balanced credit. Zero external provider requests were made.

The initial red tests demonstrate missing observations. Two new test fixtures
initially used a stale virtual eligibility timestamp relative to settlement's
real clock; the fixtures were corrected, without changing production time
semantics or protections. First-run and final logs are retained.

These are local synthetic and isolated SQL checks, not official UAT.

## Deployment and rollback

Deploy only the Staging candidate branch
`codex/v174-onempay-query-observations-20261116`, with auto-deploy off and the
existing environment unchanged. Production and both Gateways remain untouched.
Do not manually create, approve, credit or cancel an order to manufacture a
runtime observation; the existing restricted recovery worker can append it on
its next authenticated lookup.

To roll back source, restore Staging branch
`codex/v174-vpay-uat-isolation-20261116` and pin baseline
`840057b73074bea9684a012e2a102fbb971e8a0b`. Preserve appended audit events.
No database rollback or credential restoration is required. A rollback does
not erase provider transactions or funds; none are authorized by this patch.

Payment Acceptance remains 0/3, Supplier Acceptance 0/43, Live Connections 0,
Production Signoff NO, and Production NO-GO until independent evidence changes.
