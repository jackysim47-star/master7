# MASTER7 V17.139 rollback rehearsal

**Result:** PASS

The exact V17.139 release archive was started against a fresh isolated
PostgreSQL 18 database, replaced by the exact V17.138 release archive, and
then restored to V17.139. Both production builds passed before the rehearsal.

All three phases reported `database=ready`, 37 provider positions, 41 required
profiles, zero accepted, live, or playable profiles, `liveGames=false`,
`productionReady=false`, and closed deposit, game-launch, and payout switches.

The database contained 76 tables and 135 rows in every phase. Its stable
business-data fingerprint remained
`9befba0b27366971dc2c8bdb71cdfd4a4eeafe30b2f9fb0d723eda02b8e69981`
before rollback, after rollback, and after restoration. The fingerprint covers
every data statement and sequence state. Normalization removed only pg_dump
comments, `SET` and `set_config` boilerplate, blank lines, and PostgreSQL 18's
new random `\restrict` and `\unrestrict` session guards. It did not exclude a
table, row, release field, health field, or business value.

For transparency, the unnormalized data-only pg_dump digests were:

- V17.139 initial: `4c028cff82c6fe08c9a92f7ce7b4a5d745af22833e2a04d4fe05f0bbda458810`
- V17.138 rollback: `a3eda50ba6b09b2fee0bcbc2d002bc029820ba1ed3e80b3642b1b4810741ae10`
- V17.139 restored: `e238ce9924883d17dfd713cfcfeaa02d04c9251c3ebe01737c20127931d1c204`

Those raw digests differ only because PostgreSQL 18 generates a new random
session guard for each pg_dump invocation. After removing that documented
non-data wrapper, all three complete data dumps were byte-identical.

Both releases use the same Render schema SHA-256
`56c35a4f8c3460e91c57b1918fa5718009d2e3874a73c58b25f8004f65315085`
and dependency-lock SHA-256
`6a276f81aab504274390bfd485a4b514abfb6b508cb5a4d64d38c864d1f8fc2d`.

The tested V17.139 archive SHA-256 is
`7f5bda11f277d00a3e46ff5a11b9d7fe559059e3e727b2d8c769b35eb5341965`.
The exact V17.138 rollback archive SHA-256 is
`6e55339a4be4ca8200a4c928169886fdda1c24f63249b5adef27aa775f2796cf`.
V17.139 contains the release-bound rollback subject
`rollback_rehearsal_17.0.0-selfbuilt.139-profile-status-consistency`.

The application processes used a sanitized environment with no provider
credentials. The database port was bound to loopback, its storage was tmpfs,
and no provider, real-money, production-service, or production-database request
was made. The container, temporary credential, and extracted source trees were
removed after the rehearsal.

This evidence verifies the isolated application and schema rollback path. It
does not record owner or operations approval, provider or real-money
acceptance, official DNS acceptance, or a Render control-plane rollback.
