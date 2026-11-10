# MASTER7 V17.160 rollback rehearsal

**Result:** PASS

The exact deterministic V17.160 publication archive was started against a fresh
isolated PostgreSQL 18 database, replaced by the exact V17.159 publication
archive, and then restored to V17.160. All three production builds passed. Each
measured runtime used the relevant archive and its exact release identity was
confirmed through `/health/live` before the phase was accepted.

All three phases reported `database=ready`, 37 provider positions, 42 required
profiles, zero launch-ready, verified, live, or playable profiles,
`liveGames=false`, `productionReady=false`, and closed deposit, game-launch,
payout, provider-order, provider-payout, transaction, real-payment, and
settlement switches. Implemented adapter metadata correctly changed from six
profiles in V17.160 to four in V17.159 and returned to six after restoring
V17.160; this metadata did not enable a provider or create production
acceptance.

The database contained 76 tables and 137 rows in every phase. Its stable
business-data fingerprint remained
`8e4f856b22aa1448cf3a30d394b8201644b380690142dd98aa09da6c0d12c6b5`
before rollback, after rollback, and after restoration. The fingerprint covers
every data statement and sequence state. Normalization removed only pg_dump
comments, `SET` and `set_config` boilerplate, blank lines, and PostgreSQL 18's
random `\restrict` and `\unrestrict` session guards. It did not exclude a
table, row, release field, health field, or business value.

The unnormalized data-only pg_dump digests were:

- V17.160 initial: `9c78275c262c6dedd75f5ea6bcfdedf8ba413cb43e03847d8849074f3d0866c4`
- V17.159 rollback: `f09724687fce09b3aecec175fe2fec58cb0fccf514e8e451db5f56f5dddc9799`
- V17.160 restored: `92bfcf7b84cd20ab79e964097ae06eefd5f6aba0177a7bc71114e68b4f421db4`

Both releases use the same Render schema SHA-256
`0480fd1d4b096b0a47973cb25d2ac7239cdc0066f811c9a8b4a382e0c26ba704`
and dependency-lock SHA-256
`6a276f81aab504274390bfd485a4b514abfb6b508cb5a4d64d38c864d1f8fc2d`.

The tested V17.160 archive SHA-256 is
`fab4e395fc338c6346caf7fc62b805a5c2a304c9a4a0b34eefbafc3dcdc5b96b`.
Its publication commit is
`7ea3042bb2b85b8cece80ebeeb493b37be85b217`. The exact V17.159 rollback
archive SHA-256 is
`2cf2c7a61ad6bd35ada6d9be944e94d2a8b4b71b076ddbe602e42a863403aad1`.
It was reproduced byte-for-byte from the recorded deterministic publication
recipe; its publication commit is
`8c5ceb39f2de8a1a9a996a187f927c5017247dc8`. V17.160 contains the
release-bound rollback subject
`rollback_rehearsal_17.0.0-selfbuilt.160-meta-gaming-adapter`.

The application processes used a sanitized environment with no provider or
payment credentials. The PostgreSQL port was bound to loopback, its storage was
tmpfs, and no provider, payment, game-launch, real-money, production-service,
or production-database request was made. The isolated container and temporary
credential were removed after the rehearsal. Every measured phase acquired
exactly one advisory scheduler-leader lock.

This evidence verifies the isolated application, schema, and business-data
rollback path. It does not record owner or operations approval, provider or
real-money acceptance, official DNS acceptance, or a Render control-plane
rollback. The owner still needs to review and record this evidence against the
exact release-bound rollback subject in the acceptance console.
