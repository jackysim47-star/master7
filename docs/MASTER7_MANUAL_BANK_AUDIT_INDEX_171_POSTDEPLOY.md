# MASTER7 v171 Post-Deployment and Recovery Receipt

**Release:** `17.0.0-selfbuilt.171-manual-bank-audit-index`  
**Environment:** Render staging  
**Deployment:** `dep-dbpltb3l550s73do1h3g`  
**Publication commit:** `7a2fb1836e9eec66906d0dcc99d600d00508a9ae`  
**Source commit:** `9a827f618ce4a346592d830e9280589fd4979408`  
**Source tree:** `cdd1127111f311aefbee3fb6a25167bf8b4fe0d8`  
**Evidence time:** 2026-11-10 UTC

## Result

The v171 staging deployment is live and passed its ordered startup migration, database guards, read-only maintenance-safety, mobile navigation, encrypted-backup, and isolated recovery checks. The new manual-bank audit lookup index changes query performance only. New deposits, payouts, game launches, real-money processing and live games remain closed. This receipt does not declare production go-live.

| Area | Result | Evidence |
|---|---:|---|
| Render deployment | PASS | Correct publication commit deployed; Render database tests 3/3 |
| Migration 0124 | PASS | Ordered startup completed before database-ready and 9/9 + 5/5 guard attestation |
| Audit evidence index | PASS | Partial, non-unique, `target,user_id,created_at`; duplicate evidence remains detectable |
| Runtime health | PASS | Release matches; database ready; backup and restore ready |
| Startup guard attestation | PASS | `database guards 9/9 ready; guard functions 5/5 attested` |
| Runtime guard monitor | PASS | Independent runtime receipt confirms 9/9 triggers and 5/5 functions |
| Runtime logs | PASS | Guard receipts are `info`; application critical, error, warning and HTTP 5xx counts are 0 |
| Maintenance safety | PASS | 49/49 read-only checks after recovery registration |
| Mobile navigation | PASS | Home, Games, Promotions and Support each expose one correct current state |
| Mobile lobby | PASS | 393px, 38 provider tiles, no horizontal overflow or broken images |
| Encrypted backup | PASS | Transaction snapshot, 76 tables, 521 records |
| SQLite restore verification | PASS | Complete coverage; 0 foreign-key violations |
| PostgreSQL 18 restore rehearsal | PASS | Rollback-only; 0 persistent writes |
| Official domains | BLOCKED | DNS and registrar forwarding remain incorrect |
| Production acceptance | BLOCKED | Real-money and live-provider acceptance are incomplete |

## Manual-Bank Audit Evidence Index

Migration `0124-manual-bank-audit-evidence-index` adds the non-unique partial index `audit_manual_bank_payout_paid_evidence` on `audit(target,user_id,created_at)` where `event='manual_bank_payout_paid'`. The index covers the paid-evidence count and exact-timestamp lookups without indexing unrelated audit events.

The index is deliberately non-unique. Duplicate paid evidence must remain representable so the v170 integrity checks can detect it and fail closed for review. The change adds no table or column, does not change an audit row, payout state, wallet reservation, balance or ledger, and does not open a payment or game control.

SQLite query-plan checks verified covering-index use, and isolated PostgreSQL 18 catalog checks verified the same partial, non-unique column contract and idempotent migration. In the deployed environment, the ordered startup transaction completed before the release reported database ready and before the 9/9 trigger plus 5/5 function attestation. This receipt did not perform a direct live catalog query.

## Verification and Runtime Controls

Predeployment verification passed: full regression 1,414/1,414; maintenance 12/12; release probe 27/27; targeted migration, readiness and index checks 23/23; SQLite manual-bank 19/19; isolated PostgreSQL 18 manual-bank 6/6; backup/report 19/19; and Render database compatibility 3/3. TypeScript, lint, diff checks and the Render build also passed.

The following runtime controls were verified closed after deployment and again after recovery registration:

- New deposits: disabled
- New game launches: disabled
- New payouts: disabled
- Provider order submissions: disabled
- Provider payout submissions: disabled
- Real-money transactions: disabled
- Live games: disabled
- Any game playable: false
- Play buttons: 0
- Production ready: false
- Manual bank configured: false
- Manual bank mode: closed

The lobby exposes 38 provider brands and the acceptance registry contains 43 profiles. Six profiles have internal adapters, but launch-ready, verified and live profile counts remain zero. The JDB tile correctly shows `Coming soon` and exposes no Play action.

## Recovery and External Boundaries

The encrypted backup uses schema `0122-acceptance-ledger-integrity` with complete coverage of 76 tables and 521 records. Its SHA-256 is `2af64c270b2aa89a52d9bf1cc0919127351b60263f53bf9176c5356a18824b00`. SQLite verification and an isolated PostgreSQL 18 transaction restore both passed with zero foreign-key violations. The PostgreSQL rehearsal rolled back completely and made no persistent writes. The encrypted backup and private recovery material are not included in this receipt.

No live payment-provider call, game-provider call, customer transaction, wallet write, wallet credit, payout, or real-money acceptance event was performed.

- `www.master7.best` does not resolve.
- `www.master7.site` resolves to registrar forwarding at `15.197.162.184` and redirects to `https://master7-v17-staging.onrender.com/admin` instead of serving the Render origin directly.
- Real-money deposit, callback, wallet-credit, reconciliation, withdrawal and settlement acceptance are incomplete.
- Game-provider launch, wallet, settlement, recovery and final provider certification are incomplete.
- Final operations and owner sign-off are incomplete.

**Classification:** staging deployment verified; production go-live blocked.
