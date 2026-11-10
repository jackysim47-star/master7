# V172 privileged staff role boundary

Release: `17.0.0-selfbuilt.172-privileged-role-boundary`

## Problem

A hosted identity promoted from member to staff could inherit staff authority,
and a pre-v172 staff credential could keep an existing short password and
session. The earlier staff setup flow also lacked a durable proof that the
current credential version had completed privileged setup.

## Enforced boundary

- Hosted identity never grants the `staff` role. Staff operations require a
  local password session.
- `staff_password_ready:<userId>` contains only the accepted credential version.
  Staff login and every staff session require an exact version match.
- Promotion and setup-link reissue replace the prior verifier with a random
  unusable verifier, increment the credential version, revoke sessions, remove
  readiness and write a one-hour one-use pending setup marker atomically.
- Setup requires a 12–128 character password. It updates the credential, writes
  version-bound readiness, removes the pending marker, revokes sessions and
  appends the audit event in one transaction.
- Demotion removes setup and readiness markers and revokes sessions. A staff
  password change advances the readiness version in the same transaction.
- Internal `staff_setup_` placeholder IDs cannot be returned or accepted as a
  permanent login ID.
- The non-login `system-support-assistant` reply author is excluded from staff
  migration and protected from role changes.

## Existing staff migration

Runtime migration `0125-privileged-staff-password-boundary` locks and
quarantines human staff credentials without matching readiness. It rotates each
credential to random unusable values, increments its version, revokes sessions,
removes stale readiness, writes an expired pending setup marker and records
`legacy_staff_password_disabled`. The owner then uses **Reissue setup link** to
create the only raw one-time link. The migration is idempotent and excludes the
system support principal.

## Browser secret handling

The setup token is carried in a URL fragment, consumed only on `/staff-setup`
and removed from browser history before portal startup or advertising scripts.
It is kept only in page memory. The database stores its SHA-256 digest, and
owner export omits both setup and readiness settings. The owner dialog displays
the link before refreshing the member list, so a successful rotation cannot
lose the only response copy. Reissue warns that sessions and older links are
invalidated.

All portal asset query versions, the backend release and the service-worker
cache use the same v172 identifier. This forces clients away from the cached
v171 authentication script.

## Verification

- full regression passed 1,425/1,425;
- maintenance validation passed 12/12;
- release probes passed 27/27;
- Render database compatibility passed 3/3;
- the privileged authentication security suite passed 112/112;
- the legacy D1 migration covers stale next-version readiness and pending
  markers, session revocation, expired replacement setup, audit evidence and
  idempotent replay;
- TypeScript, lint, release build and diff checks passed;
- an independent re-review returned GO with no remaining release blocker.

## Operational scope

This is an authentication and startup-migration release. It does not enable a
payment, payout, game launch, real-money flag, provider credential or custom
domain. Backup schema remains `0122-acceptance-ledger-integrity` with 76 backup
tables; the required runtime migration list adds 0125.
