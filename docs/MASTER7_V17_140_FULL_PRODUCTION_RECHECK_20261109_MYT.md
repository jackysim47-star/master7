# MASTER7 V17.140 full production recheck

Checked: 2026-11-09 MYT

## Decision

The Render infrastructure is healthy, but the customer platform is not ready
for real deposits or live games. Production controls correctly remain closed.

## Runtime

| Area | Result | Evidence |
|---|---|---|
| V17 web | PASS | `/health` and `/health/live` HTTP 200 |
| Database | PASS | PostgreSQL 18, `1c-2g`, HA enabled, ready |
| Backup / restore | PASS | `backupReady=true`, `restoreReady=true` |
| Gateway | PASS (process only) | root, health and readiness HTTP 200 |
| Post-upgrade logs | PASS | zero application errors and zero HTTP 5xx after recovery |

Gateway process health does not establish supplier production acceptance.
Gateway readiness remains `productionQa=not_verified` and `liveReady=false`.

## Official domains

| Domain | Result | Evidence |
|---|---|---|
| `www.master7.best` | FAIL | no A, AAAA or CNAME record |
| `master7.best` | FAIL | URL forwarding changes the browser to the Render hostname |
| `www.master7.site` | FAIL | forwarding prefixes `/admin` to every route |
| `master7.site` | FAIL | `/admin`, `/signin`, `/health` and API paths are rewritten incorrectly |

Required DNS result: both `www` hosts must directly CNAME to
`master7-v17-staging.onrender.com`; conflicting URL forwarding and A/AAAA
records for the same host must be removed. Render already declares both custom
domains.

## Deposits and payouts

Global state:

- `newDepositsEnabled=false`
- `newPayoutsEnabled=false`
- `realPayments=false`
- `paymentReady=false`
- Manual Bank is unconfigured and closed

| Channel | Framework | Real acceptance | Current use |
|---|---|---|---|
| VPay MYR | query, callback and recovery present | order, payment, callback, wallet credit and settlement not recorded | CLOSED |
| GSPAY MYR | create/query/callback/recovery present | real order and wallet credit not recorded; balance and payout setup incomplete | CLOSED |
| GSPAY USDT | incomplete | credentials, endpoints, contract, network/scale and adapter incomplete | CLOSED |
| 1MPay MYR | query/callback/recovery present | real order and wallet credit not recorded; payout contract incomplete | CLOSED |
| Manual Bank | workflow code present | bank configuration absent | CLOSED |

Credentials previously shared in chat must be rotated in the merchant portals
and stored only as Render secrets before production acceptance.

### Connector verification

- VPay, GSPAY MYR and 1MPay order, signature, query, callback, once-only
  wallet credit, balanced ledger, recovery, concurrent replay and maintenance
  protection tests passed: **289 / 289**.
- The gateway reports VPay payment/withdrawal configuration ready, but
  `productionQa=not_verified` and `liveReady=false`.
- The gateway reports GSPAY MYR order/query/callback routes ready, with the
  remaining blocker `supplier_uat_not_verified`.
- Code readiness does not replace an authorized minimum-value real order. No
  production order was submitted during this recheck.

## Games

| Metric | Value |
|---|---:|
| Brands displayed | 37 |
| Profiles registered | 41 |
| Cached catalogue records | 769 |
| Implemented profiles | 2 |
| Launch-ready profiles | 0 |
| Verified profiles | 0 |
| Accepted / live profiles | 0 / 0 |

`newGameLaunchesEnabled=false`, `liveGames=false`, `playable=false`.
Cached catalogues are display evidence only; they do not prove launch, wallet,
settlement or recovery.

- JILI 1:1 and 1:100: 297 cached titles; adapter not implemented.
- 918KISS H5 Normal 1:1: 92; 1:100: 92; Free MYR: 88; adapters not implemented.
- MegaH5 and JDB are the two code-implemented profiles, but both remain disabled
  and unverified.

### Adapter verification

- **JILI and 918KISS H5** expose catalogues only. Their player, launch,
  wallet, close-session, recovery and wager contracts are absent, so an
  adapter cannot be implemented without inventing supplier behavior.
- **MegaH5** already exposes launch, balance, deposit, withdrawal and transfer
  query routes. The supplier contract does not expose a provider-backed
  close/offline/finality operation. V17 correctly refuses to settle an issued
  session without that evidence.
- **JDB** has the complete V17 transfer-wallet adapter and durable state
  machine. Targeted adapter, wallet and API tests passed **57 / 57**. Restricted
  QA remains blocked on provider confirmation of the exact host, IP allowlist,
  AES padding, reporting timezone and Action 17/52 closure behavior. The last
  online supplier response was a rejection, so the profile remains closed.
- Online catalogue probes also prove that a configured credential is not the
  same as acceptance: MegaH5, JILI and all three 918KISS profile catalogues
  returned HTTP 200, while EPICWIN and CLOTPLAY returned upstream 403,
  EVO888H5 reported an IP-whitelist rejection, VENUS omitted the required
  response signature, JDB returned provider rejection 9001, and PRAGMATIC
  returned upstream HTTP 435.

### Truthful customer and staff UI

The member and staff interfaces were rechecked. Unverified payment channels do
not expose order submission, unconfigured manual-bank and payout forms remain
disabled, and game catalogue cards do not expose launch or wallet actions.
There is no false green/live state in the current UI.

## Completion order

1. Correct official DNS and verify TLS and every route without forwarding.
2. Rotate all exposed payment and game credentials and confirm provider
   allowlists/callback URLs.
3. Complete provider contracts and adapters; keep each profile isolated.
4. Run an authorized minimum-value order for each payment profile and reconcile
   provider transaction, verified callback, once-only wallet credit and ledger.
5. Run launch, wallet, settlement and recovery acceptance for every approved
   game profile.
6. Record immutable acceptance evidence and owner/operations sign-off.
7. Enable deposits, launches and payouts only for profiles that passed.

Until these steps pass, the platform must not claim that deposits or live games
are usable.
