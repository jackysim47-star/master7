# MASTER7 v173 backup and restore acceptance

Evidence date: 2026-11-10 UTC

Classification: Recovery control accepted for v173; platform remains in UAT

Production go-live: Not approved

## Scope

This record covers the release-bound encrypted backup and rollback-only
restore rehearsal for `17.0.0-selfbuilt.173-staff-setup-route`. It does not
enable or accept a payment channel, payout channel, live game provider,
production domain or commercial launch.

## Run identity

| Item | Evidence |
| --- | --- |
| Run | `v173-20261110T201006676Z` |
| Backup contract | `0122-acceptance-ledger-integrity` |
| Backup tables | 76 |
| Backup records | 526 |
| Backup SHA-256 | `d38f9d0d13ff3775c420758fd1c7b4accc4b25b4c8805c11d0375a84ec39ffa8` |
| Backup created | `2026-11-10T20:10:11.391Z` |
| Restore verified | `2026-11-10T20:10:18.889Z` |

The encrypted backup, receipts, pre/post health captures, recovery-test log,
rollback count and checksum manifest are stored under
`/workspace/master7-production-backups/`. Secret material is stored separately
and is not included in this report.

## Verification

- Focused backup and restore regression: 26/26 passed.
- The live machine-authenticated backup request returned HTTP 200.
- The envelope was bound to v173 and used a transaction snapshot.
- SQLite verification restored all 76 durable tables and found no missing
  tables or foreign-key violation.
- PostgreSQL 18 verification restored all 76 tables in an isolated transaction,
  matched all 526 records and reported `persistentWrites=false`.
- The transaction rolled back completely; the post-rehearsal user-table count
  was zero.
- Recording the matching online rehearsal receipt returned HTTP 200 and
  `verified=true`.
- All evidence files had mode 0600 and every checksum in the manifest passed.
- The temporary PostgreSQL container was removed; no rehearsal container
  remained.
- The Render observation window contained no error or critical application log
  and no HTTP 5xx request log.

## Online readiness

The final online health assertions passed 10/10:

```text
database               = ready
backupReady             = true
restoreReady            = true
newDepositsEnabled      = false
newGameLaunchesEnabled  = false
newPayoutsEnabled       = false
realPayments            = false
liveGames               = false
productionReady         = false
```

The two backup-job requests and the surrounding health requests returned HTTP
200. No payment, payout, provider-wallet or live-game request was made during
this recovery rehearsal.

## Conclusion

The v173 recovery control is accepted: a current encrypted snapshot can be
decrypted and fully restored to an isolated PostgreSQL 18 transaction, its
business data and foreign keys validate, and the rehearsal leaves no persistent
database write. MASTER7 remains in integration/UAT because official domain and
TLS acceptance, provider acceptance, real-money deposit and payout acceptance,
credential-rotation acceptance and final owner/operations sign-off remain
outstanding.
