# MASTER7 V17.134 rollback rehearsal

**Result:** PASS

**Scope:** Isolated application release rollback. The production Render service and production database were not changed.

## Sequence

1. Extracted and built the exact V17.134 release archive from commit `5f98ee8aa10b3115ac5c8d4af5ddca58eb185f24`.
2. Extracted and built the exact V17.133 release archive from commit `59b853593af94a8e8ef57ecacd6d0a7da919cd56`.
3. Started V17.134 against a PostgreSQL 18 database held entirely in Docker tmpfs.
4. Stopped V17.134 and started V17.133 against the same database.
5. Stopped V17.133 and restored V17.134 against the same database.
6. Removed the isolated PostgreSQL container.

## Evidence

- Both production builds passed.
- The two releases have the same `render-schema.sql` SHA-256: `56c35a4efcd4f9bed867841e3b459716e3eccf19afcdf87af9e695411b4c831f`.
- The two releases have the same `pnpm-lock.yaml` SHA-256: `6a276f81aab504274390bfd485a4b514abfb6b508cb5a4d64d38c864d1f8fc2d`.
- V17.134, V17.133, and restored V17.134 each reported the expected release, `database=ready`, 37 provider positions, zero playable providers, and all transaction flags closed.
- The database contained 74 tables and 134 rows. The normalized row-count and row-content fingerprint remained `f27f54e2129a66bb2d0eabbccf721e53b4d9b6bf0896c2e3334d32fc334306a6` in every phase.
- Restored V17.134 acquired exactly one PostgreSQL advisory scheduler-leader lock.
- No provider credential, provider transaction, real-money transaction, persistent container volume, or production data write was used.

## Production state after the rehearsal

- Render service: `master7-v17-staging`
- Live deploy: `dep-dboqpk7f3r2c73c1pj1g`
- Release served: `17.0.0-selfbuilt.134-scheduler-leader`
- Plan: `2c-4g`
- Instances: 1
- Autoscaling: disabled

The available Render connector cannot select an older deploy. Rewriting the service branch just to exercise the control plane would add avoidable risk, so this rehearsal proves release and schema rollback compatibility in an isolated environment while leaving production untouched.
