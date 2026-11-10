# V173 staff setup route

Release: `17.0.0-selfbuilt.173-staff-setup-route`

## Problem

V172 implemented the privileged staff password boundary and generated one-time
links for `/staff-setup`, but the Vinext application had no explicit file route
for that path. The deployed service therefore returned HTTP 404 before the
portal JavaScript could consume and clear the setup fragment.

## Repair

- `app/staff-setup/route.ts` exports the root portal `GET`, `HEAD` and dynamic
  handlers.
- The setup page continues to consume the one-time secret only from the URL
  fragment and clears browser history before portal startup or advertising
  scripts.
- A regression test requires the physical file route and its three exports.
- The backend release, all portal asset query versions, the service-worker
  cache and release probes use the same v173 identifier.

## Scope

This release adds one presentation route and advances cache identity. It does
not change the v172 staff credential state machine, migration 0125, a database
schema, role, password or session. It does not enable a payment, payout, game
launch, wallet flow, provider credential or production flag. The encrypted
backup contract remains schema 0122 with 76 durable tables.

## Required deployment verification

- full regression passed 1,426/1,426, maintenance validation passed 12/12,
  release probes passed 27/27 and Render database compatibility passed 3/3;
- TypeScript, lint, production build and diff checks passed;
- Render deploy reaches `live` on the exact publication commit;
- `/staff-setup` returns HTTP 200 for GET and HEAD;
- the returned page references v173 browser assets;
- `/health/live` reports the exact v173 release and a ready database;
- runtime money and game controls remain closed.
