# MASTER7 v152 918KISS catalogue safety live acceptance

Observed: 2026-11-10 15:11 MYT

## Deployment

- Gateway release: `1.16.0`
- Gateway commit: `1a682dfa9de3013ff44c7fd9364103134f95a44c`
- Gateway deployment: `dep-dbpc4du7bikc73ddh1f0` (live)
- Portal release: `17.0.0-selfbuilt.152-918kiss-catalogue-safety`
- Portal source commit: `c59c6ba83c6d651d6dbb294f3d6f8fe056293fb2`
- Publication commit: `0d818b1dc829a82c251715f3f62a4d88c498916c`
- Portal deployment: `dep-dbpc5og8v5cc73drg1r0` (live)
- Source archive SHA-256: `941240970673ac478ef2bac7ff74eea8b65c10e2263264428cb6baf44e92ee15`

## Read-only live evidence

| Profile | Currency | Games | Unique codes | Maintenance | Playable |
|---|---:|---:|---:|---:|---:|
| Normal MYR | MYR | 92 | 92 | 92 | 0 |
| Normal MY1 | MY1 | 92 | 92 | 92 | 0 |
| Free MYR | MYR | 88 | 88 | 88 | 0 |

All returned artwork was pinned to `gth.kissh5.com/thumbs/`. Empty and duplicate
game codes were zero. The Portal showed all three profiles as
`adapter_unimplemented`, with launch, wallet and recovery readiness false.

The gateway does not receive a contract-bound availability field that proves a
title can be launched. Version 1.16 therefore reports every current title as
maintenance instead of inferring availability. Portal v152 maps these titles to
`suspended` and keeps `playable=false`.

## Validation

- Gateway regression: 135 / 135
- Portal regression: 1,319 / 1,319
- Maintenance suite: 12 / 12
- Release probes: 27 / 27
- Focused 918KISS portal checks: 94 / 94
- Render database compatibility: 3 / 3
- TypeScript, lint and Render production build: passed
- Portal post-deploy request 5xx: zero
- Portal post-deploy application errors: zero
- Gateway post-deploy application errors: zero
- 918KISS live read-only requests: HTTP 200

## Acceptance boundary

This release accepts the three read-only catalogues and their account/cache
isolation. It does not accept player creation, GameLogin, wallet transfer,
transfer-status query, exit/finality, settlement, recovery, reconciliation or
the MY1 1:100 supplier money contract. No game or money operation was executed.

Other supplier catalogue failures observed during the Portal refresh are
outside this 918KISS acceptance and remain separate platform blockers. Payment
providers, payment switches, credentials, service plans and DNS were unchanged.
