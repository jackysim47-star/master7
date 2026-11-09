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
