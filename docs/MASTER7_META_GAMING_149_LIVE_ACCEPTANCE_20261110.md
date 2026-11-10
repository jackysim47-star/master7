# MASTER7 META GAMING v149 Live Acceptance

Date: 2026-11-10 UTC

## Release evidence

- Portal release: `17.0.0-selfbuilt.149-meta-catalogue-isolation`
- Portal deploy: `dep-dbpado142hec73c2rpqg`
- Portal commit: `f4a1ed036496cc85ea99568e8de773f1ff67ba0f`
- Gateway version: `1.14.0`
- Gateway implementation commit: `13cab36f0416c07ce36e3e02d91a351e5c4c99bd`
- Full portal regression: 1,309 / 1,309 passed
- Full gateway regression: 120 / 120 passed

## Live result

The portal liveness endpoint returned HTTP 200 with the database ready. META GAMING Normal MYR and Free Credit MYR resolved to separate profiles, accounts and cache namespaces. Both profiles returned HTTP 200 from the portal with zero games and remained `playable=false` and `liveReady=false`.

The production supplier API returned HTTP 403 for both META accounts. The gateway converted both results to the sanitized `metagaming_catalogue_invalid` response. No privileged META player, launch, balance, transfer, query, kick, unfinished-round, report or FlagLog route is enabled or implemented. Legacy MegaH5 operations remain closed because the historical account-to-brand mapping has not been verified.

Existing catalogue reads remained available after the release: JILI 297 games, 918KISS H5 Free 88 games and the legacy Mega catalogue 166 games. These catalogue counts are read-only evidence and do not establish launch, wallet or settlement acceptance.

## Runtime observations

- Portal inventory: 42 profiles across 37 brands
- Production launch-ready profiles: 0
- Production-verified profiles: 0
- Portal request logs after deployment: no HTTP 5xx
- Portal application logs after deployment: no error or critical entries
- Current gateway egress IPv4 observed during acceptance: `74.220.52.216`

## Acceptance decision

Release v149 is accepted for safe catalogue isolation and fail-closed behavior. META GAMING production play is not accepted. Supplier authorization of the Render egress address and a complete privileged-operation contract are required before controlled UAT can start.
