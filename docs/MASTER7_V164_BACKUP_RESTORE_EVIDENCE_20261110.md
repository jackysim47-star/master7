# MASTER7 v164 Backup and Restore Evidence

- Release: `17.0.0-selfbuilt.164-jdb-wager-coverage-staging`
- Deploy: `dep-dbph4fuc6qcc73al7npg` / LIVE
- Publication commit: `46fe231e896cf657efc5087be482235a7a71a476`
- Source commit: `14fc4fe22d4f96a210274fe2beffdf706ceb5e1a`
- Backup captured: `2026-11-10T12:51:49.473Z`
- PostgreSQL rehearsal verified: `2026-11-10T12:51:52.891Z`
- Backup SHA-256: `035e38fbe699bb55120fde94caa1ed841b5810396064cd90aa5587d018dddb7b`
- Schema: `0121-jdb-wager-coverage-staging` / `56d103a98b0e1d4b664a6a0eee440518769795268675ef5133987d86edafb2e1`
- Read consistency: `transaction_snapshot`
- Durable tables / records: **76 / 502**
- SQLite verification: **PASS**; complete coverage; 0 foreign-key violations
- Isolated PostgreSQL 18 rehearsal: **PASS**; rollback-only; 0 persistent writes; 0 foreign-key violations
- Post-rollback user tables: **0**; disposable database process removed
- Targeted recovery regression: **24/24 passed**
- Live recovery readiness: `backupReady=true`, `restoreReady=true`
- Money, payout and live-game controls remain closed; `productionReady=false`

The release-bound encrypted backup covered all five new JDB wager-coverage tables and the complete 76-table durable manifest. SQLite restored the backup in memory. PostgreSQL restored the same 502 records inside an isolated rollback-only transaction, validated constraints and counts, and left no user tables after rollback.

Only the backup audit and recovery evidence were written to the production database. No payment, payout, supplier, game-launch or game-wallet operation was invoked. The encrypted payload and all sensitive operational material are excluded from these publication-safe files.
