# MASTER7 V17.138 rollback rehearsal

**Result:** PASS

The V17.138 candidate was started against an isolated PostgreSQL 18 database,
replaced by the exact V17.137 release, and then restored to V17.138. All three
phases reported `database=ready`, 37 provider positions, 41 required profiles,
zero playable providers, `productionReady=false`, and closed deposit,
game-launch, and payout switches.

The database contained 76 tables and 135 rows. Its normalized data fingerprint
remained `f32caa58aee317bda078995a21d54ea9ae0a917fea57baf295b3f59bd7dd1e1f`
before rollback, after rollback, and after restoration. Both releases use the
same Render schema and dependency lock. The V17.138 production build passed.

The tested final V17.138 archive SHA-256 is
`6e55339a4be4ca8200a4c928169886fdda1c24f63249b5adef27aa775f2796cf`.
The candidate contains the release-bound rollback subject
`rollback_rehearsal_17.0.0-selfbuilt.138-signoff-gates`, so evidence recorded
for an earlier release cannot satisfy this release's production sign-off gate.

No provider credential, provider request, real-money transaction, persistent
volume, Render service, or production database was used. The isolated
container and temporary database credential were removed after the rehearsal.

This evidence verifies the candidate's isolated rollback path. It does not
record owner approval, operations approval, monitoring acceptance, official
DNS/TLS, credential rotation, payment acceptance, payout acceptance, or game
provider acceptance.
