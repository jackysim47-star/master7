# MASTER7 V17.136 backup automation

## Release scope

Release `17.0.0-selfbuilt.136-backup-automation` adds a machine-authenticated
backup job without changing the existing owner backup workflow. Both entry
points call the same backup and restore-rehearsal handlers, so they enforce the
same release, schema, manifest and hash checks.

This release does not enable deposits, payouts, game launches, real payments or
live games. Those controls remain fail closed until their separate production
acceptance evidence is recorded.

## Entry points

- The existing owner route remains available at `POST /api/admin/backup` and
  continues to require an authenticated owner session, trusted origin and CSRF
  token.
- The automated route is `POST /api/jobs/backup`. It accepts only JSON and an
  exact `Authorization: Bearer ...` credential supplied through the service
  environment.
- The machine credential must be 32 to 1,024 bytes. Missing, malformed,
  undersized, oversized and incorrect credentials fail closed. Comparison is
  length checked and constant time.
- The credential is never returned by the endpoint or stored in backup or audit
  output. Machine activity is attributed to `system:backup-job`; it does not
  impersonate an owner account.
- Responses use `Cache-Control: no-store`.

The automated route supports two actions:

1. `create` produces the release-bound encrypted backup envelope and records
   the encrypted-backup audit evidence.
2. `record_rehearsal` records a successful isolated restore only after the
   receipt matches the latest backup, current release and schema, ordered table
   manifest, content hashes, public-key fingerprint, record count, snapshot
   consistency and zero foreign-key violations.

## Coverage and concurrency

- The current schema contains 71 durable tables.
- Five transient synchronization or authentication tables are intentionally
  empty after restore: `password_sessions`, `otp_challenges`, `rate_limits`,
  `responsible_play_locks` and `member_wallet_guards`.
- Capture on Render uses one PostgreSQL repeatable-read, read-only transaction
  and reports `readConsistency: "transaction_snapshot"`.
- A 30-minute atomic lease in the excluded `rate_limits` table prevents two
  backup or receipt-recording operations from running concurrently. The lease
  is released in `finally`; an expired lease can be reclaimed.
- Replaying the same valid restore receipt is idempotent and does not add a
  second audit event.
- A valid rehearsal must target an explicitly isolated PostgreSQL transaction,
  report `persistentWrites: false`, cover all 71 durable tables, and match the
  latest encrypted backup hashes and record count.

## Security and operational boundaries

- The service receives only the public encryption key. The matching private key
  and its passphrase stay outside the application service in the controlled
  restore environment.
- The machine credential is stored as a service secret and is not placed in
  source control, artifacts, logs, URLs or query parameters.
- Backup operations do not read or modify payment, payout, game-launch or
  provider-acceptance switches.
- An encrypted file and a locally passing test do not establish production
  recovery readiness. Readiness requires a backup from the deployed release,
  a successful restore into an isolated PostgreSQL target, a matching receipt
  recorded online, and a subsequent health check.

## Validation completed before deployment

- Backup endpoint and shared-handler focused tests passed.
- Authentication rejection, JSON-only handling, concurrent-operation rejection,
  valid backup creation, invalid receipt rejection, idempotent receipt replay,
  owner-route regression and closed money/game controls are covered.
- Maintenance tests passed: 12 of 12.
- Release probe tests passed: 27 of 27.
- Full regression, TypeScript validation, ESLint, Render database compatibility
  checks and the production build completed successfully.
- `git diff --check` completed without errors.

## Production acceptance status

Code and build validation are complete for this release. Production backup and
restore acceptance remains pending until the deployed V17.136 service creates
the current encrypted backup and the same file passes the PostgreSQL isolation
rehearsal. Payment, game-provider, domain, credential-rotation and final owner
sign-off remain independent acceptance requirements.
