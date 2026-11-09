# MASTER7 V17.140 cloud capacity guardrail

The Render web service uses the `1c-2g` compute plan in Singapore. Its bound
PostgreSQL 18 database uses the `0.5c-1g` plan in the same region and workspace.

Render's current official compute-plan reference states that `0.5c-1g`
PostgreSQL permits at most 100 connections. MASTER7 bounds each application
instance to five pooled connections. One elected scheduler holds one additional
connection. With a maximum of five web instances, the steady application
budget is therefore 26 connections.

The intended Blueprint configuration was:

- minimum instances: 1;
- maximum instances: 5;
- CPU target: 70%; and
- memory target: 75%.

Render planned those exact values, but the service detail returned autoscaling
enabled with `min=5`, `max=100`, and CPU/memory targets of 80%. That result did
not match the reviewed plan and could create unexpected cost. The Blueprint was
therefore rolled back to exactly one fixed instance. Autoscaling remains
disabled until Render can apply and report the requested limits correctly.

This guardrail also prevents the earlier unsafe transition that retained 28
instances and exhausted PostgreSQL with SQLSTATE `53300`. It does not enable
deposits, game launches, payouts, real payments, live games or production
readiness.

Reference: <https://render.com/docs/compute-plans.md>

## Applied result

- Autoscaling preview: `exe-dbp1c0rm8hqs73drc45g`
- Cost-guardrail rollback: `exe-dbp1cle1egvs739ql1q0`
- Final service plan: `1c-2g`
- Final running instances: 1
- Final autoscaling state: disabled
- Health check: `/health/live` returned HTTP 200
- Database state: ready
- Backup and isolated restore evidence: ready
- Provider catalogue: 37 brands
- Transaction controls: deposits, launches, payouts, real payments and live
  games remain disabled

The post-change smoke load sent 120 requests at concurrency 10. All 120
returned HTTP 200. Throughput was 21.8 requests per second, average latency was
425.3 ms, p95 latency was 887.7 ms, and maximum latency was 964.5 ms. Render
reported no application errors and no HTTP 5xx responses between the V17.140
deployment and the end of this check.
