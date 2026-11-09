# MASTER7 Render resource retention

Checked: 2026-11-09 UTC

## Decision

MASTER7 business workloads are already consolidated in the `ahbi` Render
workspace. Stability takes priority over reducing the four production
dependencies to free plans.

## Keep paid

| Resource | ID | Plan | Reason |
|---|---|---|---|
| V17 portal | `srv-dbl0iv7f3r2c73848ei0` | `1c-2g` | Customer and staff application; 13,480 requests in the last 24 hours |
| Integration gateway | `srv-db6b7inlk1mc73ck6cmg` | `1c-2g` | Payment and game provider boundary; 8,200 requests in the last 24 hours |
| PostgreSQL | `dpg-dbkl1g3bc2fs739li01g-a` | `1c-2g`, HA | Member, order, wallet, ledger and audit data |
| Key Value | `red-damasc0u01pc73f02lsg` | `1g`, persistent | Runtime coordination and cached business state |

Downgrading the web services would introduce sleep and unreliable callbacks.
Downgrading PostgreSQL would remove HA and production data guarantees.
Downgrading Key Value would remove disk persistence.

### Current minimum monthly compute estimate

Render's current public pricing lists `1c-2g` web compute at USD 25/month,
`1c-2g` Postgres at USD 40/month and persistent `1g` Key Value at USD
20/month. Render bills the Postgres HA standby at the same compute and storage
rate as the primary.

| Charge | Estimate |
|---|---:|
| V17 portal | USD 25/month |
| Integration gateway | USD 25/month |
| PostgreSQL primary | USD 40/month |
| PostgreSQL HA standby | USD 40/month |
| Key Value | USD 20/month |
| **Minimum core compute** | **USD 150/month** |

The invoice can also include workspace-plan fees, database storage, outbound
bandwidth, performance pipeline minutes, extra domains and taxes. The Render
connector does not expose the workspace subscription or invoice, so USD 150 is
the verified compute minimum rather than a final billing total.

## Already free

The old portal, support bots, recovery bot, platform sync and LuckyWin bot
services are already on Render's free web-service plan. They have no paid
runtime instance to downgrade.

Legacy V15, demo and tunnel entries are static sites. `buildPlan=performance`
describes the build machine, not an always-on paid hosting instance. Their
automatic deploys are disabled.

## Separate workspace

`AGBI7777` contains only the unrelated `.github` static site
`srv-db8es9s9v7es738jntkg`. It has no MASTER7 PostgreSQL or Key Value resource
and no business workload needs to be moved from it.

## Cleanup rule

Keep the four paid core resources. Before suspending any free bot, verify its
webhook/token ownership and confirm V17 and the integration gateway do not
reference its URL. Preserve source and historical assets in Git even when a
legacy Render service is retired.

### Verified archive/removal candidates

V17.140 and the current integration gateway contain no runtime references to
the legacy hostnames below. They can be archived and then removed after their
source and operational evidence are retained:

- `srv-dbkl79fb9u1s73fnoojg` — old `ahbi-service-portal`
- `srv-dangvpegekts738usqrg` — old support-live bot
- `srv-dangum6gekts738upsg0` — old support-recovery bot
- `srv-dam8ubm1egvs738j878g` — old support-bot-v2
- `srv-dam8tmh42hec738o5fbg` — old support-bot
- `srv-dakhooek1f9s73dbtqrg` and `srv-dakhegou01pc73f5kvhg` — LuckyWin bots
- `srv-dbia0ouc6qcc73d2v0fg`, `srv-dbi9t6gae00c73bkdj90`,
  `srv-dbi9kuo473hc739rp9t0` — old V15 static sites
- `srv-db8pf149v7es73ddmij0`, `srv-db8p7beq1p3s738tcd20`,
  `srv-db4fc27avr4c73eaegqg`, `srv-db49mscs728c73a2p3vg` — old static,
  tunnel and demo entries

Hold `srv-dan1fkuk1f9s73f38ft0` (`master7-platform-sync`) until its historical
`/tmp/master7-platform-sync.json` evidence has been exported. These candidates
are already free/static, so removal simplifies operations but does not reduce
the USD 150 minimum core compute estimate.
