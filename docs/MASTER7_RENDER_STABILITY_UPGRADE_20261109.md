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
