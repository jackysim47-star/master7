# MASTER7 v163 Post-deploy Evidence

- Observed: `2026-11-10T11:22:33.450Z`
- Deploy: `dep-dbpfq2jncjis738plndg` — **LIVE**
- Publication commit: `260656ae08d209f4cf57eb78cd7d274099ccb608`
- Release: `17.0.0-selfbuilt.163-coba8-front-end-registered`

## HTTP and runtime

- `/health/live`: 200; `/health`: 200; `/`: 303 to `/signin`
- `/signin`, `/register`, `/admin`, `/api/games`: 200
- `/api/games?profileId=coba8_myr`: 200
- `/assets/providers/coba8.webp`: 200
- Database: ready
- Render logs since deployment: 0 app error/critical, 0 warning, 0 request 5xx

## COBA8 front-end

- Game catalogue: 38 brands / 43 profiles / 6 implemented adapters
- COBA8 appears exactly once as provider position 38 and exactly once as `coba8_myr` profile position 43
- 393px browser rendered exactly one COBA8 tile: `Coming soon`, pending class, `MYR · Provider contract pending`
- COBA8 tile has no Play label or launch control
- Selected COBA8 API result: zero games, `playable=false`, `liveReady=false`, `launchProvider=null`
- COBA8 is `implemented=false`, `status=unavailable`, `capabilityReason=contract_missing`
- Neutral 800×600 WebP artwork served with SHA-256 `3d94e16cc81db2c83c71067e023e537d386ffcf3974c7b91dd09ca6faa9a51ed`
- All 43 profiles remain unavailable; 0 launch-ready and 0 verified

## Credential delivery scan

- Scanned 34 delivered HTML, JavaScript, CSS, service-worker, manifest and game-API text files (1,395,513 bytes)
- COBA8 credential/token literal hits: 0
- Forbidden credential-shaped keys in default and selected COBA8 API responses: 0
- No username, password, API key, secret or token value was found in delivered COBA8 client content

## Mobile audit

- 393px viewport and 393px document width; no horizontal overflow
- 0 console errors, 0 page errors, 0 HTTP >=400 responses
- 0 non-empty broken image URLs
- Public GET-only lobby render was used without a session or write; the ordinary anonymous route remains `/signin`
- One optional guide video request was browser-aborted without an HTTP error or lobby impact

## Control state

- Provider order submission remains disabled for all payment profiles
- Transactions and real payments are false; game launches and payouts remain disabled
- Production readiness remains false
- v163 backup is present; release-bound restore acceptance remains pending in this immediate sample

All production checks were read-only. No account, payment, payout, provider, game-launch, wallet, configuration or acceptance write was made.
