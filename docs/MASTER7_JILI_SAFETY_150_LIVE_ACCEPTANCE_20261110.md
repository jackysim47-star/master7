# MASTER7 JILI v150 live acceptance

Date: 2026-11-10 UTC

## Release evidence

- Portal release: `17.0.0-selfbuilt.150-jili-safety`
- Portal source commit: `52b60da36b33b5900b7f82c5514d1d8a2c18fd85`
- Portal publication commit: `6aed6a0eb0ba7b9af4893c1712310313be2a61c9`
- Portal deploy: `dep-dbpbei8m7kps73aejtrg`
- Gateway implementation commit: `bd9f255b497c6c5932fafb0bb4714c7ecc0d3211`
- Gateway deploy: `dep-dbpb97bbc2fs73bcb27g`
- Portal regression: 1,314 / 1,314 passed
- Gateway regression: 122 / 122 passed
- TypeScript, lint, Render database adapter and Render build: passed

## Live result

- Portal liveness returned HTTP 200 with `database=ready` and the v150 release.
- Customer and management entries returned HTTP 200.
- `jili_myr_1to1` returned 297 catalogue entries, scale 1, `launchReady=false`, `playable=false`.
- `jili_my1_1to100` returned 297 catalogue entries, scale 100, `launchReady=false`, `playable=false`.
- Production launch-ready profiles: 0.
- Production-verified profiles: 0.
- Gateway catalogue validation found no empty IDs, duplicate IDs or empty English names.
- Portal and gateway request logs after deployment contained no HTTP 5xx; application error logs were empty.

## Safety changes

- Malformed or duplicate JILI catalogue rows now fail closed.
- The two JILI account catalogues remain isolated.
- A missing customer return origin blocks a launch before wallet reservation or supplier submission.
- Every unverified nonzero transfer-submit response remains unknown. Recovery keeps the reservation, queries the original transaction ID and never resubmits the money action.
- Signed wager-report amounts remain fail-closed until the merchant confirms their sign and ledger meaning.

## Acceptance decision

The v150 safety release is accepted for production fail-closed behavior. JILI production play is not accepted. The supplier must confirm the account-bound transfer-wallet contract, four amount units, approved launch origins, session closure, late-round finality and signed report semantics, then complete separate controlled acceptance for the 1:1 and 1:100 profiles.

Payment providers were not changed by this release.
