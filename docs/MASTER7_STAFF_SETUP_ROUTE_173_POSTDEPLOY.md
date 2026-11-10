# MASTER7 v173 staff-setup post-deployment evidence

Evidence date: 2026-11-10 UTC

Classification: Integration/UAT

Production go-live: Not approved

## Release identity

| Item | Evidence |
| --- | --- |
| Release | `17.0.0-selfbuilt.173-staff-setup-route` |
| Render deployment | `dep-dbpn9ugm7kps7381nvcg` (`live`) |
| Portal service | `srv-dbl0iv7f3r2c73848ei0` |
| Local source commit | `c826624` |
| Remote source commit | `42ee462c5452c7a216f44bfef94595969437439d` |
| Remote tar publication commit | `bca27aee28de007fe7bfe58c0999054c59e4e7ce` |
| Published tar SHA-256 | `43198cd4b40a72b957d34c6cfafba784d63b44e75a1947797696d97883594629` |

## Verification result

- Post-deployment online assertions: 21/21 passed.
- Full regression: 1,426/1,426 passed.
- Maintenance validation: 12/12 passed.
- Release probes: 27/27 passed.
- Render database compatibility: 3/3 passed.
- TypeScript, lint, production build and diff checks passed.
- `/health/live` reported the exact v173 release and a ready database.
- `/staff-setup` returned HTTP 200 for GET and HEAD.
- The HEAD response body was empty.
- The GET response referenced the v173 application and style assets.
- The service worker used the v173 cache identity.
- Runtime responses retained `no-store` cache protection.

Post-deployment Render logs recorded the database as ready, with database
guards 9/9 ready and guard functions 5/5 attested. Queries covering the v173
deployment window found no error or critical application log and no HTTP 5xx
request log.

## Operational controls

The release did not enable customer-money or game operations:

```text
newDepositsEnabled     = false
newGameLaunchesEnabled = false
newPayoutsEnabled      = false
```

After this deployment check, the release-bound v173 encrypted backup and
rollback-only isolated PostgreSQL 18 restore rehearsal passed. Current health
reports `backupReady=true` and `restoreReady=true`; see
`MASTER7_V173_BACKUP_RESTORE_ACCEPTANCE.md`. The custom production domains,
game-provider acceptance, live game launches, real-money deposit acceptance,
real-money payout acceptance and final owner sign-off remain outstanding.

## Conclusion

The v173 staff-setup routing defect is repaired and deployed. This evidence
supports acceptance of that routing repair only. It does not establish that
the full platform, a payment channel or a game provider is production-ready.
MASTER7 remains in integration/UAT until the outstanding operational and
external-provider acceptance items have durable passing evidence.
