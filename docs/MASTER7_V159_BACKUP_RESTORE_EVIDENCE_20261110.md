# MASTER7 v159 Backup and Restore Evidence

- Release: `17.0.0-selfbuilt.159-premium-mobile`
- Backup captured: `2026-11-10T09:48:11.723Z`
- PostgreSQL rehearsal verified: `2026-11-10T09:48:49.520Z`
- Backup SHA-256: `a59ea42de8213a3eaf935287365bb4f244e0a3460ec5afbb5086bc373f9670fd`
- Schema: `0120-provider-wallet-sweeps` / `5cbc5cd93db13ecf862ffac30bcbb38d9a2f2f90d75e2ae1550299b22bc7e3eb`
- Read consistency: `transaction_snapshot`
- Durable tables / records: `71` / `490`
- SQLite verification: PASS; coverage complete; 0 foreign-key violations
- Isolated PostgreSQL rehearsal: PASS; rollback-only; 0 persistent writes; 0 foreign-key violations
- Production readiness after evidence recording: `backupReady=true`, `restoreReady=true`, `productionReady=false`
- Targeted backup regression: 23/23 passed

The restore ran against a disposable local PostgreSQL 18 database whose name included `restore`. The rehearsal tool created a random schema inside an outer transaction and rolled back. A post-run query found zero user tables, and the disposable container was removed. No payment or game-launch operation was invoked.
