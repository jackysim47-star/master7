# MASTER7 v160 Backup and Restore Evidence

- Release: `17.0.0-selfbuilt.160-meta-gaming-adapter`
- Backup captured: `2026-11-10T10:01:49.629Z`
- PostgreSQL rehearsal verified: `2026-11-10T10:05:18.022Z`
- Backup SHA-256: `1dd6e6f95ddc457b0816e300e6bc1fc144f03dde703fcabc3e517b0c5cf3fc14`
- Schema: `0120-provider-wallet-sweeps` / `5cbc5cd93db13ecf862ffac30bcbb38d9a2f2f90d75e2ae1550299b22bc7e3eb`
- Read consistency: `transaction_snapshot`
- Durable tables / records: `71` / `492`
- SQLite verification: PASS; coverage complete; 0 foreign-key violations
- Isolated PostgreSQL rehearsal: PASS; rollback-only; 0 persistent writes; 0 foreign-key violations
- Production readiness after evidence recording: `backupReady=true`, `restoreReady=true`, `productionReady=false`
- Targeted backup regression: 23/23 passed

The restore ran against a disposable local PostgreSQL 18 database whose name included `restore`. The rehearsal created a random schema inside an outer transaction and rolled back. A post-run query found zero user tables, and the disposable container was removed after verification. No payment, provider, game-launch or game-wallet operation was invoked.
