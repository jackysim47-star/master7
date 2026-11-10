# MASTER7 v173 rollback technical preflight

Evidence date: 2026-11-11 MYT

Classification: Technical preflight complete; production rollback not approved

Production go-live: Not approved

## Scope

This record covers a no-impact rollback and recovery preflight for
`17.0.0-selfbuilt.173-staff-setup-route`. Immutable release archives were
rebuilt and switched against an isolated PostgreSQL 18 database. The live
Render service, its database, domains and operational controls were not
changed.

The evidence file is stored at
`/workspace/master7-production-backups/v173-rollback-preflight-20261111T043403318MYT.json`
with SHA-256
`b2f14355c34e384c9b9a6d83173e37abff2eb5b7eb528967445bcd1be6f2956b`.
It has mode 0600 and contains no provider or platform credential.

## Immutable artifacts

| Release | Publication commit | Archive SHA-256 | Entries | Decision |
| --- | --- | --- | ---: | --- |
| v172 | `1f07f2c70423de8b28c7482bf5270291fa545103` | `87c6a2378200ef062fdf2b69441be110f0c5ae7e245fe3aef0036f7ebe6994b5` | 789 | NO-GO rollback target |
| v173 | `bca27aee28de007fe7bfe58c0999054c59e4e7ce` | `43198cd4b40a72b957d34c6cfafba784d63b44e75a1947797696d97883594629` | 792 | Verified recovery checkpoint |

The independent v173 checkpoint completed a frozen-lockfile install, Render
database compatibility tests 3/3 and the Render production build. Its isolated
startup reported a ready database, guards 9/9, guard functions 5/5, migration
0125 present, and GET and HEAD `/staff-setup` responses of HTTP 200. Deposits,
game launches, payouts, real payments, live games and production readiness
remained closed.

## Isolated PostgreSQL 18 switch cycle

The same disposable database was used for the complete switch sequence:

1. v172 started with a ready database, guards 9/9 and functions 5/5.
2. v173 started against the same database and returned HTTP 200 for GET and
   HEAD `/staff-setup`.
3. A v173-to-v172 rollback booted successfully, but GET and HEAD
   `/staff-setup` both returned HTTP 404.
4. v173 was restored and returned health HTTP 200 plus GET and HEAD
   `/staff-setup` HTTP 200, while all business and production switches stayed
   closed.

The disposable service, process, database container and extracted work area
were removed after the checks.

## Decision

V172 is not an acceptable rollback target for v173. It can open the database,
but it restores the known staff-setup routing defect and would make newly
issued privileged setup links unusable. Database boot compatibility alone is
not enough to approve that rollback.

The immutable v173 artifact is accepted as a technical recovery checkpoint.
Redeploying that exact artifact is the safe recovery path for a failed v173
instance. This preflight does not claim that a production Render rollback was
performed and does not record
`signoff:rollback_rehearsal_17.0.0-selfbuilt.173-staff-setup-route:approved`.

## Completion boundary

A true release rollback rehearsal requires a compatible successor to be live.
During an approved maintenance window, operations must preserve closed business
switches and current recovery evidence, deploy the successor, roll back to the
immutable v173 checkpoint, verify health, database guards, staff setup and
business controls, restore the successor, and then record separate Owner and
operations approval. Until that exercise occurs, the release-bound production
rollback sign-off remains blocked and MASTER7 remains in integration/UAT.
