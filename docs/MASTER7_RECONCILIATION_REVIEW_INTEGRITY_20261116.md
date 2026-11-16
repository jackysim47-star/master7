# Reconciliation Owner review integrity

Baseline: Staging commit `103e40f104e72f930896654def3f6ff878e24f6c`.
The packaged source is the target; the unrelated root application is unchanged.
See the companion package manifest for archive SHA-256 and member comparison.

## Problem and behavior

Reconciliation detail reads rejected corrupted report bytes or inconsistent
metadata, but review submission and idempotent review replay did not perform
that validation. An Owner could therefore acknowledge a report whose integrity
could not be verified. Five new checks reproduce the failure on the baseline.

Review submission now validates the stored report before creating or replaying
an annotation. The insert also compares the complete validated report snapshot
in the same SQL statement as the existing revision guard. A report changed
between validation and insertion cannot produce a review or its audit event.
Concurrent review conflicts and legitimate idempotent retries retain the
existing behavior. Corrupted evidence returns the existing HTTP 409
`RECONCILIATION_INTEGRITY_ERROR` error.

Only these archive members change:

- `lib/reconciliation-review.ts`
- `tests/reconciliation-review.test.mjs`

There is no schema migration or new endpoint. Report formats, Owner/staff/member
permissions, money posting, provider adapters, configuration, acceptance records
and production controls retain their previous behavior.

## Verification

- Baseline with new integrity checks: five expected failures.
- Final focused finance/reconciliation checks: 29/29.
- Final full regression: 1567/1567.
- TypeScript, ESLint, Render DB compatibility 3/3, Render build: pass.
- Isolated PostgreSQL: valid review/replay; invalid bytes; invalid metadata;
  concurrent report mutation; concurrent reviews; a new process reading the
  persisted report; audit linkage; zero money or acceptance mutations: pass.
- Temporary PostgreSQL container and its generated credential are removed.

The complete logs include the initial TypeScript check failure and the
corrected final run; failures are not hidden. An initial Docker auto-port
collision was resolved by using an available loopback port. Neither involved
Render databases or any live financial operation.

## Rollback

For Staging, first verify that no later deployment or configuration change has
superseded this patch. Restore the previous Staging branch
`codex/v174-onempay-query-observations-20261116` and pin commit
`103e40f104e72f930896654def3f6ff878e24f6c`; keep auto-deploy disabled. Confirm
the previous package hash from the manifest. No database rollback is required;
preserve all existing reports, review annotations and audit events. Do not
restore old configuration over a later approved UAT session.

Rollback removes this integrity protection. Inspect affected report evidence
before allowing further Owner review. Production is outside this patch's
deployment scope. No unknown-state funds may be released by this procedure.

## Acceptance boundary

This patch completes a specific code defect and isolated verification only.
It is not official Payment UAT, Supplier UAT, business acceptance, a live
connection or production approval. Payment 0/3 and Supplier 0/43 remain the
current acceptance baseline; Production remains NO-GO.
