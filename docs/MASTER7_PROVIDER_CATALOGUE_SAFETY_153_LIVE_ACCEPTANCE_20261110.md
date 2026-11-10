# MASTER7 v153 provider catalogue safety live acceptance

Observed: 2026-11-10 15:40 MYT

## Deployment

- Gateway release: `1.17.0`
- Gateway commit: `c4aab70060439469f3c2e6081a57c0b40e630ff4`
- Gateway deployment: `dep-dbpchge417fc739h9b50` (live)
- Portal release: `17.0.0-selfbuilt.153-provider-catalogue-safety`
- Portal source commit: `aeaaeaceb2897911fd7934693f55840ee29fd99c`
- Publication commit: `593a90c87386ca11337ecd23aada65083843117b`
- Portal deployment: `dep-dbpcipbm8hqs73dhl2bg` (live)
- Source archive SHA-256: `38c762a1b209f6a7eafb6d9165c7b4bb951af98e022fc303f5ec01b3639c5ac6`

## Public frontend evidence

The public root, sign-in, registration and management entry pages returned HTTP
200 and carried the v153 release marker. Both health endpoints returned HTTP 200
with the exact v153 release.

The public game API reported:

- 37 provider brands
- 42 listed profiles
- 4 implemented profiles
- 0 launch-ready profiles
- 0 production-verified profiles
- 0 playable profiles
- `liveReady=false`

| Provider profile | Catalogue result | Games | Unique codes | Playable | Runtime state |
|---|---|---:|---:|---:|---|
| EPICWIN Normal MYR | Supplier HTTP 403 / blocked | 0 | 0 | 0 | Adapter unimplemented |
| EPICWIN Free MYR | Supplier HTTP 403 / blocked | 0 | 0 | 0 | Adapter unimplemented |
| META Normal MYR | Supplier HTTP 403 / blocked | 0 | 0 | 0 | Adapter unimplemented |
| META Free Credit MYR | Supplier HTTP 403 / blocked | 0 | 0 | 0 | Adapter unimplemented |
| JDB MYR | Supplier status 9001 / blocked | 0 | 0 | 0 | Connection pending |
| JILI MYR 1:1 | Available read-only catalogue | 297 | 297 | 0 | Contract and acceptance pending |
| JILI MY1 1:100 | Available read-only catalogue | 297 | 297 | 0 | Contract and acceptance pending |

EPICWIN and META profile selections returned their exact independent profile
identities. Neither profile family borrowed the other account's catalogue.
JDB remained blocked. JILI no longer reports its implemented adapters as
unimplemented; both profiles truthfully report an incomplete provider contract
and pending production acceptance.

The cached 37-brand inventory remained fail-closed. MegaH5 and 918KISS titles
were maintenance, EVO retained its stale 150-title snapshot under maintenance,
Rectangle remained catalogue-only, and every provider had
`launchReady=false`.

## Validation

- Gateway regression: 141 / 141
- Portal regression: 1,323 / 1,323
- Maintenance suite: 12 / 12
- Release probes: 27 / 27
- Focused provider safety checks: 104 / 104
- Render database compatibility: 3 / 3
- TypeScript, lint and Render production build: passed
- Deterministic archives: byte-identical
- Clean archive extraction matched 681 tracked source files
- Publication manifest: 681 / 681 hashes matched
- Portal post-deploy request 5xx: zero
- Portal post-deploy application errors: zero
- Gateway post-deploy application errors: zero

Gateway catalogue probes returned the expected safe vendor failures: EPICWIN
HTTP 403 for both accounts, META HTTP 403 for both accounts and JDB status 9001.
These responses contained no credentials or raw provider bodies.

## Acceptance boundary

This release accepts the catalogue isolation, strict public projection,
fail-closed availability and truthful status reporting. It does not accept or
enable player creation, Play, launch, balance, wallet transfer, exit/finality,
settlement, recovery or reconciliation for these suppliers. No player or money
operation was executed.

VPay, GSPAY, 1MPay, payment switches, credentials, service plans and DNS were
unchanged.
