# MASTER7 Game Provider Network Gate

Date: 2026-11-10 UTC

## Confirmed platform state

- Gateway and portal run in Render Singapore.
- A one-time egress diagnostic observed `74.220.52.216`.
- This single address is not a complete Render allowlist. Render states that a service without dedicated IPs can use any address in its region's published CIDR ranges.
- Render Dedicated IPs provide three exclusive IPv4 addresses for one region. The current published price is USD 100 per month for each IP set and the workspace must be on Pro or higher.

## Required network decision

For payment and game suppliers that accept CIDR ranges, copy the gateway service's full list from **Connect > Outbound** and submit every listed Singapore range.

For suppliers that accept only individual IP addresses, create one Singapore Dedicated IP set scoped to the MASTER7 environment or workspace, wait until it is Active, then submit all three IPv4 addresses to every supplier. Both the gateway and portal are in Singapore, but game-provider traffic currently originates from the gateway.

## Provider results after v149

| Provider | Live read-only result | Required supplier action |
|---|---|---|
| JDB | `9001 Unauthorized` | Authorize the account and allowlist the final gateway outbound ranges or dedicated IP set. |
| META Normal | HTTP 403 | Allowlist the final gateway outbound ranges or dedicated IP set. |
| META Free | HTTP 403 | Allowlist the final gateway outbound ranges or dedicated IP set. |
| Pragmatic Play | HTTP 435 | Confirm account authorization and allowlist. |
| RSG Hub | HTTP 403 | Confirm the mapped MASTER7 brand/account and allowlist. |
| VENUS / EliteHubz | Successful business body without required `X-Sign` and `X-Ts` headers | Supplier must restore contract-compliant signed responses or issue a written replacement contract. |

## Activation rule

No Play or money switch is opened from catalogue success alone. Each profile still requires player, launch, wallet, settlement, recovery and reconciliation evidence. JDB remains first in the acceptance queue because its protocol and platform adapter are already implemented.

Sources: Render `Outbound IP Addresses`, `Dedicated IPs`, and public pricing documentation retrieved on 2026-11-10.
