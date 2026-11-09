# MASTER7 V17 `.134` scheduler leadership

Release: `17.0.0-selfbuilt.134-scheduler-leader`

This release ensures that catalogue synchronization, accounting close, payment recovery, and approved WhatsApp dispatch are started by only one web instance at a time.

## Leadership

- Each instance may contend for a fixed PostgreSQL advisory lock.
- Only the session that owns the lock starts the four background schedulers.
- Standby instances close their contender connection and retry without starting timers.
- If the leader connection fails, every scheduler timer is stopped before leadership is retried.
- Existing catalogue leases, accounting uniqueness, payment recovery leases, and WhatsApp delivery claims remain in force during handover.
- Connection errors log only a bounded error code; database URLs and credentials are never logged.

The leader uses one dedicated PostgreSQL connection. This removes duplicate scheduler polling without creating a separately billed Render worker.

## Readiness probe

The production probe now accepts either truthful backup state:

- backup and restore are still pending, with both blockers present; or
- the current encrypted backup and its matching isolated restore rehearsal are verified, with those blockers absent.

Restore readiness without matching backup readiness is rejected.

## Scaling boundary

The live service remains fixed at one 2c/4g instance. With five web instances, capped application pools would use at most 25 connections and the leader one more. A blue/green handover can temporarily double that budget. Autoscaling must remain disabled until a controlled five-instance load and deployment-overlap rehearsal proves the current PostgreSQL plan can sustain the workload.

## Verification

- Scheduler leadership: 5/5
- Maintenance controls: 12/12
- Release probes: 27/27
- Regression: full suite required after integration
- Render database adapter: 3/3
- TypeScript, lint, and Render build: required after integration

This release does not open new deposits, game launches, payouts, or unaccepted providers.
