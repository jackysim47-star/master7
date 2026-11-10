# MASTER7 V160 Monitoring Evidence

- Evidence window: `2026-11-10T09:55:00Z` to `2026-11-10T10:10:30Z`
- Portal: `17.0.0-selfbuilt.160-meta-gaming-adapter` / deploy `dep-dbpelh08v5cc73e20fqg`
- Gateway: `1.20.0` / deploy `dep-dbpek2qvcj2c73d35q60`
- Collection mode: read-only; no payment, payout, game-launch, provider-write or game-wallet calls

## Result

| Area | Result | Evidence |
|---|---|---|
| Portal deploy | PASS | Build and deploy succeeded; no failure or restart event |
| Portal health | PASS | `/health/live` and `/health` HTTP 200; database ready |
| Gateway deploy | PASS | Build and deploy succeeded; no failure or restart event |
| Gateway process health | PASS | `/health` HTTP 200; version 1.20.0 |
| PostgreSQL 18 | PASS | Available, HA enabled, portal reports database ready |
| Portal errors | PASS | 0 app error/critical, 0 warning, 0 exact request 5xx |
| Gateway process errors | PASS | 0 app error/critical, 0 warning |
| Provider catalogue availability | BLOCKED | 21 exact fail-closed read-only catalogue 502 responses |

## Capacity

| Resource | CPU peak | Memory peak | Other |
|---|---:|---:|---|
| Portal 1c / 2 GB | 6.93% | 175,697,920 bytes (8.18%) | 200-response p95 peak 127.64 ms |
| Gateway 1c / 2 GB | 1.91% | 86,233,090 bytes (4.02%) | 200-response p95 peak 86.93 ms |
| PostgreSQL 18 1c / 2 GB | 3.40% | 302,956,540 bytes (14.11%) | 11 active connections peak |

Both services held one instance throughout the evidence window. Resource use stayed well below the configured limits.

## Exact gateway 5xx classification

The exact request log contains 21 HTTP 502 responses, all on idempotent `GET` catalogue refreshes.

- **META GAMING:** 3 responses on `/providers/metagaming/games?account=normal`. This is the known supplier authorization/IP-allowlist blocker on a read-only catalogue request. It is not a platform process fault.
- **Other supplier catalogues:** 18 responses, three each for EPICWIN, Pragmatic Play, EVO888H5, CLOTPLAY, VENUS, and JDB. These profiles remain blocked by supplier authorization, allowlisting, or contract-readiness evidence.

The gateway failed all 21 reads closed without publishing a false catalogue. There were no process crashes, app error logs, payment calls, game launches, wallet writes, or provider write operations. Portal exact request 5xx remained zero.

The 60-second Render metric buckets report 23 gateway 502 responses because the first aggregate bucket includes requests at the edge of the fixed timestamp window. The fixed-timestamp request-log query is authoritative for the 21-entry path classification.

## Runtime boundary

Portal recovery evidence is current (`backupReady=true`, `restoreReady=true`). Runtime money and live-game flags remain closed. Gateway readiness remains `liveReady=false` and `productionQa=not_verified`. This evidence supports infrastructure monitoring health only and does not certify provider, real-money, DNS, or final production acceptance.
