# MASTER7 v163 Backup and Restore Evidence

- Release: `17.0.0-selfbuilt.163-coba8-front-end-registered`
- Deploy: `dep-dbpfq2jncjis738plndg` / LIVE
- Publication commit: `260656ae08d209f4cf57eb78cd7d274099ccb608`
- Source commit: `b6f204df8c772cdb270dba069ddb0045d061a3f4`
- Backup captured: `2026-11-10T11:18:47.175Z`
- PostgreSQL rehearsal verified: `2026-11-10T11:19:16.833Z`
- Backup SHA-256: `5f462f487b9e55b8dc412e8a43bbe223eefb6c719d0f73c667f0cf0f5adfab9a`
- Schema: `0120-provider-wallet-sweeps` / `5cbc5cd93db13ecf862ffac30bcbb38d9a2f2f90d75e2ae1550299b22bc7e3eb`
- Read consistency: `transaction_snapshot`
- Durable tables / records: `71` / `497`
- SQLite verification: **PASS**; coverage complete; 0 foreign-key violations
- Isolated PostgreSQL 18 rehearsal: **PASS**; rollback-only; 0 persistent writes; 0 foreign-key violations
- Post-rollback user tables: `0`; disposable container removed
- Targeted recovery regression: `23/23` passed
- Live recovery readiness: `backupReady=true`, `restoreReady=true`
- Overall production readiness remains `false`; money and game runtime controls remain closed

The encrypted backup was created through the authenticated backup job and bound to this exact release. SQLite restored all 71 durable tables in memory. PostgreSQL restored the same 497 records into a random schema inside an outer transaction, validated constraints and counts, then rolled the transaction back. A post-run query found zero user tables and the disposable PostgreSQL 18 container was removed.

Only the backup audit and recovery evidence were written to the production database. No payment, payout, provider, game-launch or game-wallet operation was invoked. The verified recovery state does not change real-money, live-game, DNS, credential-rotation or owner sign-off acceptance.
