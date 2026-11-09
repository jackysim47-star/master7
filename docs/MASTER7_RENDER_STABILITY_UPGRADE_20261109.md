# MASTER7 Render stability upgrade

Workspace: `ahbi` (Singapore)

Authorized target:

- V17 web: `1c-2g`, one fixed instance;
- integration gateway: `1c-2g` (already applied);
- PostgreSQL 18: `1c-2g`, storage autoscaling retained, HA enabled;
- Key Value: `1g`, `noeviction`, journal/snapshot persistence; and
- no duplicate services, databases, or Key Value instances.

The PostgreSQL and Key Value plan changes require brief downtime. Deposits,
game launches, payouts, real payments, and live games remain disabled during
the change. The database has current encrypted backup and isolated restore
evidence. After the change, health, database connectivity, catalogue access,
concurrent request handling, and Render error logs must be rechecked.

## Applied result

- Data Blueprint: `exs-dbp1lnrm8hqs73dsc7l0`
- Applied sync: `exe-dbp1lnrm8hqs73dsc7v0`
- PostgreSQL: `1c-2g`, PostgreSQL 18, HA enabled, status available
- Key Value: `1g`, status available
- Integration Gateway: `1c-2g`, root, health and readiness HTTP 200
- V17 web: `1c-2g`, one fixed instance, autoscaling disabled
- V17 release: `17.0.0-selfbuilt.140-profile-catalogue-count`

The PostgreSQL restart temporarily returned HTTP 502 as expected. The
application's connection retry and Render restart path recovered automatically.
After recovery, `/admin`, `/signin`, `/register`, `/health`, `/health/live`, and
`/api/games` all returned HTTP 200. The game-provider catalogue contained 37
brands. Database, backup, and restore readiness were all true.

The post-upgrade load check sent 300 requests at concurrency 20. All 300
returned HTTP 200, with no client errors, 48.4 requests per second, 401.6 ms
average latency, 958.3 ms p95 latency, and 1253.5 ms maximum latency. Render
reported no application errors and no HTTP 5xx responses after recovery.

Deposits, game launches, payouts, real payments, live games, and production
readiness remained disabled throughout the change.
