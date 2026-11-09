# MASTER7 V17.137 backup lock fix

Release `17.0.0-selfbuilt.137-backup-lock-fix` corrects the backup-operation
lease identifier used by PostgreSQL.

## Incident and fix

The first V17.136 online backup request failed before reading backup records or
writing an audit event because a random eight-hex-digit lease claim could exceed
PostgreSQL's signed `INTEGER` maximum. V17.137 maps the complete 32-bit hash
prefix into the inclusive range `1..2,147,483,647` before inserting it into
`rate_limits.count`.

The backup endpoint fixture now enforces the same signed-integer boundary as
PostgreSQL and includes a deterministic seed that would overflow under the
former calculation.

## Operational boundary

- The failed V17.136 attempt produced no backup artifact or acceptance record.
- The fix changes only the internal backup lease claim and release identifiers.
- It does not enable deposits, payouts, game launches, real payments or live
  games, and it does not change provider credentials.
- Production backup and restore readiness require a new V17.137 encrypted
  backup, a PostgreSQL isolation rehearsal, and a matching recorded receipt.
