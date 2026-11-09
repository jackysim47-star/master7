# MASTER7 V17.140 cloud scaling

The Render web service uses the `2c-4g` compute plan in Singapore. Its bound
PostgreSQL 18 database uses the `0.5c-1g` plan in the same region and workspace.

Render's current official compute-plan reference states that `0.5c-1g`
PostgreSQL permits at most 100 connections. MASTER7 bounds each application
instance to five pooled connections. One elected scheduler holds one additional
connection. With a maximum of five web instances, the steady application
budget is therefore 26 connections.

The Blueprint now configures:

- minimum instances: 1;
- maximum instances: 5;
- CPU target: 70%; and
- memory target: 75%.

This cap replaces the earlier unsafe transition that retained 28 instances and
exhausted PostgreSQL with SQLSTATE `53300`. It does not enable deposits, game
launches, payouts, real payments, live games or production readiness.

Reference: <https://render.com/docs/compute-plans.md>
