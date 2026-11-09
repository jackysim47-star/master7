# MASTER7 V17.140 rollback rehearsal

**Result:** PASS

The exact V17.140 release archive was started against a fresh isolated
PostgreSQL 18 database, replaced by the exact V17.139 release archive, and
then restored to V17.140. Both production builds passed before the rehearsal.

All three phases reported `database=ready`, 37 provider positions, 41 required
profiles, zero accepted, live, or playable profiles, `liveGames=false`,
`productionReady=false`, and closed deposit, game-launch, and payout switches.

The database contained 76 tables and 135 rows in every phase. Its stable
business-data fingerprint remained
`a8f5d75ec0cf771947fa8edaa70ca0f890712994e0012fb6b6cdc5d1b05c0ff6`
before rollback, after rollback, and after restoration. The fingerprint covers
every data statement and sequence state. Normalization removed only pg_dump
comments, `SET` and `set_config` boilerplate, blank lines, and PostgreSQL 18's
new random `\restrict` and `\unrestrict` session guards. It did not exclude a
table, row, release field, health field, or business value.

For transparency, the unnormalized data-only pg_dump digests were:

- V17.140 initial: `0fde51f05b329c7a151e8ebbc32b234634236e0713d9bbb4e030727cd3a18875`
- V17.139 rollback: `8e82430796fc9813c55d89566e59e4a2bffdd2d921bf5f86071e42013936882c`
- V17.140 restored: `4a47743434c48fc424d51fcd1662032a140c2d62310edf9228f8f0d66e167a71`

The raw digests differ because PostgreSQL 18 generates a new random session
guard for each pg_dump invocation. After removing documented non-data dump
scaffolding, all three complete data dumps were byte-identical.

Both releases use the same Render schema SHA-256
`56c35a4f8c3460e91c57b1918fa5718009d2e3874a73c58b25f8004f65315085`
and dependency-lock SHA-256
`6a276f81aab504274390bfd485a4b514abfb6b508cb5a4d64d38c864d1f8fc2d`.

The tested V17.140 archive SHA-256 is
`cde3b4b1902503cd0d3661e9a689f740cc2f2988ef2116468414988fbf1816e7`.
The exact V17.139 rollback archive SHA-256 is
`7f5bda11f277d00a3e46ff5a11b9d7fe559059e3e727b2d8c769b35eb5341965`.
V17.140 contains the release-bound rollback subject
`rollback_rehearsal_17.0.0-selfbuilt.140-profile-catalogue-count`.

The application processes used a sanitized environment with no provider
credentials. The database port was bound to loopback, its storage was tmpfs,
and no provider, real-money, production-service, or production-database request
was made. The container, temporary credential, and extracted source trees were
removed after the rehearsal.

This evidence verifies the isolated application and schema rollback path. It
does not record owner or operations approval, provider or real-money
acceptance, official DNS acceptance, or a Render control-plane rollback.
