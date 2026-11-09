# MASTER7 V17 .126 — Generic game wallet consistency

Release: `17.0.0-selfbuilt.126-generic-wallet-consistency`.

## Corrected behavior

A terminal generic game session must not release cash while its provider transfer is still unknown, in flight, confirmed without ledger reconciliation, or internally inconsistent. The previous check considered only an open session missing its reservation. This is a synthetic regression finding; it is not evidence of the cause of any historical paid deposit.

The member balance reader and transactional spend guard now share static consistency predicates. They check session, player, profile, currency, reservation ownership and principal, transfer lifecycle, and generic postings that the canonical MYR balance does not yet project. A mismatch makes available cash zero and requires reconciliation. Original balances, reservations, historical orders and ledgers are preserved. Safe legacy cleanup is prevented while generic funds require review.

The authorized staff game-wallet read includes consistency flags. No repair endpoint or provider activation is introduced. Existing authenticated deposit callbacks and recovery paths remain available; verified callbacks still credit once even if an unrelated game balance needs review.

## Database and rollback

Migration `0114-generic-game-wallet-risk-indexes` adds three indexes only. It does not rewrite financial data or change table/column contracts. The database readiness gate now requires 25 migration markers. Backup schema remains 0113 because only indexes changed; restoration initializes current indexes separately.

Returning to .125 is schema-compatible but removes this financial safeguard. Keep deposits, games and payouts closed during any rollback. Retain the additive indexes. A documented rollback path is not a completed production rollback rehearsal.

## Validation

- Full regression: 1085/1085, including 31 new SQLite consistency assertions/subtests.
- Maintenance suite: 12/12; release probes: 25/25; SQL compatibility: 3/3.
- TypeScript, ESLint and Render build passed.
- Fresh loopback-only PostgreSQL 18: 7/7 generic wallet checks, including a verified database lock wait followed by re-evaluation of newly committed inconsistent funds.
- Existing MegaH5 isolated PostgreSQL settlement/recovery suite preserved: 4/4.
- PostgreSQL fixtures contain synthetic data only. They do not certify production payments, game providers, backups or real settlements.

Run the generic PostgreSQL script only against the exact fresh local database confirmed by its environment guards. The script refuses other hosts, credentials, names and nonempty databases.

## Production limitations

This release does not implement the remaining provider wallet engines or GSPAY USDT adapter, enable new real-money activity, credit historical claims, change DNS, or complete owner signoff. Those require independent production evidence.
