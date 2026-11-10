# MASTER7 V17.144 sponsor, withdrawal and lobby candidate

Release `17.0.0-selfbuilt.144-sponsor-withdrawal-lobby` packages the premium
member lobby, promotions, three sponsored-provider presentations, independent
artwork for all 37 registered game brands, Company Bank withdrawal destinations
for bank accounts and approved Malaysian E-Wallets, and the additive
`0119-withdrawal-destination-methods` migration.

The exact current live `.142` database was protected before publication. Its
encrypted transaction-snapshot backup contains 71 tables and 446 records.
SQLite and isolated PostgreSQL 18 restore rehearsals verified all records with
zero foreign-key violations and no production restore writes.

The deterministic archive rebuilt byte-for-byte, replayed exactly, and passed
12/12 maintenance tests, 27/27 release probes, 1,246/1,246 regression tests,
3/3 Render database tests, TypeScript, ESLint and the Render production build.

This is a deployment candidate. It does not assert that `.144` is live, enable
money or game switches, or certify JDB, GSPAY MYR or 1MPay MYR external
production acceptance. The Render deploy ID and post-deploy evidence must be
recorded only after the candidate is deployed and observed.
