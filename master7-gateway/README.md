# MASTER7 integration gateway

Private server-side gateway for Malaysia/MYR provider integration.

Implemented:

- EVO888H5 game-list proxy, user creation and balance lookup.
- MegaH5 signed UAT game-list and game-session requests.
- Stable callback URL reservations for Cosmoplay, Creative Gaming, PGSOFT and Spade Gaming.
- Health reporting without exposing credentials.

Provider secrets are supplied only through Render environment variables. A callback POST remains closed until that provider's signed callback contract is implemented; a reachability endpoint never claims transaction readiness.

## Version 1.15.0: MegaH5 contract-boundary hardening

The legacy MegaH5 catalogue, session, balance and transfer responses are now
strictly validated and projected to bounded public fields. Invalid game rows,
duplicate codes, impossible client IPv4 addresses, malformed launch URLs,
wrong currencies and malformed transfer records fail closed. A successful
upstream status alone is no longer treated as proof of a valid response.

Game availability also fails closed. A title is reported as available only
when the legacy feed explicitly reports it active, H5-capable and outside
maintenance. The current schedule-shaped maintenance value remains unavailable
until the supplier confirms its meaning. No Play or money switch is enabled by
this release.

## Version 1.14.0: META GAMING catalogue boundary and legacy mapping gate

`GET /providers/metagaming/games?account=normal|free` implements only the
read-only `GetGameList` request from the supplier-linked META GAMING API v3.4.8.
Normal and free-credit accounts use separate base URL, operator ID, secret and
currency settings. Responses are strictly validated and reduced to public game
metadata; credentials and unrecognized provider fields are never returned.

Player creation, launch, balance, deposit, withdrawal, transfer status,
KickPlayer, unfinished-round, report and FlagLog routes are not implemented in
this candidate. Their reserved switches default to false, their peer tokens are
isolated by capability, and readiness continues to report `route_not_implemented`
even if a switch is changed. `KickPlayer` is temporary under the official
contract and must never be treated as proof of round, wallet or settlement
closure. See `METAGAMING.md`.

The older `/platform/megah5/session`, `/balance`, `/deposit`, `/withdraw` and
`/transfer-status` routes now also require
`MEGA_PROVIDER_MAPPING_VERIFIED=true`. It defaults to false and blocks provider
traffic until the exact legacy brand/account mapping is independently confirmed.
The legacy `/providers/megah5/games` catalogue remained readable in this
release; version 1.15.0 replaces its raw response with strict validation and a
safe public projection.

## Version 1.13.1: JDB protocol compatibility

The JDB Action 49 catalogue request now follows the current official transfer
wallet protocol: JSON request bodies and AES-CBC plaintext padded on the right
with spaces. The change keeps credentials server-side and preserves the
read-only catalogue boundary.

## Version 1.13.0: GSPAY Portal bridge

The official MYR order, query, signature and `ok`/`success` callback contract
is implemented through an isolated Portal bridge. Provider credentials stay in
the gateway; the Portal uses three separate internal credentials. Orders,
queries and callbacks each retain an independent environment switch.

The gateway validates and re-signs both query results and callbacks at the
trust boundary. It acknowledges a supplier callback only after the Portal
durably accepts it. Configuration readiness is distinct from paid settlement
acceptance: `productionQa` and `liveReady` remain unverified until a real paid
order produces one balanced member-wallet ledger and matches the merchant BO.

## Version 1.12.1: current portal origins

The default browser origin and MegaH5 session return URL now use the current
direct Render portal. Retired `master7.vip` defaults are no longer accepted.
Explicit environment values still take precedence, so the deployed
`ALLOWED_ORIGINS` and `REDIRECT_URL` must be updated separately. This release
does not enable game launch, transfers, payments or settlement.

## Version 1.12.0: Pragmatic Play read-only catalogue

`GET /providers/pragmaticplay/games` reads the assigned production catalogue
through the documented `getCasinoGames` request and sorted MD5 signature. The
adapter pins the production host, bounds the response, rejects redirects and
projects only public game fields. It never calls player, launch, wallet,
free-round, bet, transfer or payout operations.

The catalogue can populate the existing PRAGMATIC PLAY supplier button only
after the provider accepts the Render request. A successful catalogue is not
launch or wallet-settlement acceptance, so returned games remain non-playable
until the separate end-to-end flow is verified.

## Version 1.11.0: JDB and RSGHub read-only catalogues

The gateway now exposes authenticated, read-only game catalogues for JDB and
RSGHub at `GET /providers/jdb/games` and
`GET /providers/rsghub/games`. JDB follows the official Action 49 AES-CBC
contract. RSGHub follows the official encrypted
`GameListByCurrency` contract. Both adapters validate configuration, upstream
responses and public game fields before returning data, and never call player,
launch, wallet, betting or transfer operations.

Provider credentials remain in Render environment variables. A configured
catalogue means only that the request can be attempted; it does not attest
provider allowlisting, game launch, wallet settlement or production QA.

## Version 1.10.1: GSPAY merchant-evidence correction

The owner confirmed that the previously cited supplier ticket does not belong
to MASTER7. It is excluded from MASTER7 evidence. The generic create-response
parser remains available for offline validation, but it no longer makes the
program or order route ready. `createProgramReady` and `orderReady` remain
false, and `POST /platform/gspay/order` returns HTTP 503 before provider
traffic until the supplier provides merchant-specific evidence for
`MASTER7VIPMYR+`.

## Version 1.10.0: guarded GSPAY order program (superseded)

The tentative GSPAY MYR create-payment envelope was implemented at
`POST /platform/gspay/order`. The route requires its own platform capability
token, an explicit order switch, the production operator credential, canonical
MYR amounts, a lower-case provider username and contract version
`gspay-myr-create-v1`. Provider traffic is pinned to `api.thegspay.com`, and the
returned checkout URL must use HTTPS on `secured.gspay.online`.

The gateway returns only the safe payment ID and checkout URL projection. Order
creation never credits a member wallet. Query and callback settlement remain
closed because the supplier has not confirmed the query response envelope or
the callback acknowledgement and retry contract. All three production switches
stay false until those contracts and end-to-end wallet acceptance are complete.

## Version 1.9.2: GSPAY create response record (superseded)

The response example recorded in this historical section was later found not
to be merchant-specific acceptance evidence for MASTER7. The gateway validates
the tentative JSON shape offline and projects only the payment ID and an HTTPS
checkout URL pinned to `secured.gspay.online`. Version 1.10.1 keeps the route
closed pending evidence issued for the MASTER7 merchant.

## Version 1.9.1: verified GSPAY MYR request contract

The authorized GSPAY backoffice documentation was rechecked on 2026-11-05.
Offline builders now pin the MYR order and query requests to
`https://api.thegspay.com`, place the documented fields deterministically, and
normalize signed payment-status payloads without performing network or wallet
operations. The supplier's documented server IP is recorded as
`52.221.96.227`.

Real GSPAY routes remain closed. The backoffice does not display this account's
Operator Authentication Key or Operator Secret Key, the successful order
response example is blank, and the callback acknowledgement/retry contract is
absent. The saved callback URLs and whitelist also point to retired
infrastructure. See `GSPAY-MYR-CONTRACT-20261105.md` for the evidence and exact
remaining supplier items.

## Version 1.9.0: disabled-by-default MegaH5 transfer wallet adapter

MegaH5 is confirmed to use the provider's Fund Transfer wallet contract. The
gateway now implements the documented server-side routes below:

- `POST /platform/megah5/transfer-status` → `CheckTransferStatus`
- `POST /platform/megah5/deposit` → `Deposit`
- `POST /platform/megah5/withdraw` → `Withdraw`

These routes require a dedicated `PLATFORM_GAME_WALLET_TOKEN`. The normal
`PLATFORM_GAME_TOKEN` cannot call them, and the wallet token cannot launch a
game or read a player balance. All peer tokens must be 32–1024 UTF-8 bytes and
must differ from every administrator, payment, game and provider secret.

Money routes are closed unless `MEGA_TRANSFERS_ENABLED=true`; status lookup is
closed unless `MEGA_TRANSFER_STATUS_ENABLED=true`. Both flags default to off.
While off, the routes return HTTP 503 before making any provider request. Money
amounts must be positive canonical strings with exactly two decimals, and the
operator reference must be a unique 1–50 character identifier.

The implementation follows the provider signatures exactly: Deposit and
Withdraw sign through `PlayerId`; CheckTransferStatus additionally signs
`ReferenceId` and transfer type. `/readiness` always keeps production QA and
`liveReady` false until the platform has a durable idempotent ledger and a real
end-to-end supplier acceptance record. Deploying this code does not move money.

## Version 1.8.1: isolated platform game-session scope

`POST /platform/megah5/session` accepts the same validated MegaH5 session request as the administrator route, but requires its own `PLATFORM_GAME_TOKEN`. The token cannot authorize Deposit, Withdraw, transfer-status lookup, EVO administration or callbacks, and it is rejected when it aliases another privileged credential. This server-to-server route does not expose provider credentials.

This route prepares authenticated portal launch testing. It does not prove that the member wallet, wager settlement or provider production QA is complete, so the public portal must keep games non-playable until those checks pass.

## Version 1.8.2: read-only MegaH5 wallet detection

`POST /platform/megah5/balance` calls the provider-documented `CheckBalance`
method for one validated player ID. It uses the isolated `PLATFORM_GAME_TOKEN`,
accepts no amount or transaction ID, and cannot deposit, withdraw or settle a
wager. A successful zero-balance response confirms the operator supports the
fund-transfer balance route; it does not verify a money transfer or settlement.

## Version 1.8.0: GSPAY+ MYR safe preparation

Version 1.8.0 adds the disabled GSPAY+ MYR skeleton documented below. It does
not change the live state of any transaction channel.

## Version 1.7.0: payment validation and truthful readiness

- `/health` remains process liveness (HTTP 200 is not provider QA).
- `/readiness` and `/providers/vpay/status` now distinguish configured credentials,
  transaction switches, secure wallet forwarding, and unverified production QA.
  These checks perform no upstream transaction. `liveReady` stays false because
  this service has no verified end-to-end acceptance record.
- Zero, negative and fractional-cent payment/withdrawal amounts are rejected.
  Orders also require a valid callback base, HTTPS wallet forwarding URL, and a
  platform callback bearer token of at least 32 characters.
- VPay and EVO888H5 require an explicit success code (`0` or `"0"`); null, empty
  strings, arrays, missing fields and provider rejection codes are failures.
- VPay callback forwarding acknowledges a signed notification only after the
  wallet returns HTTP 2xx with the exact plain-text body `SUCCESS`. Empty 204,
  HTML, JSON, declined acknowledgements, redirects and failures stay retryable.
  The wallet must durably and idempotently settle or recognize the notification
  before returning `SUCCESS`; the Gateway does not implement the wallet ledger.
- Requests are limited to 64 KiB in UTF-8 bytes and must be JSON objects.
  Responses from shared provider transport are limited to 2 MiB. Redirects are
  rejected and credential-bearing outbound requests require HTTPS.
- Every response has a server-generated `X-Request-Id`. Timeout messages are
  stable and do not echo upstream URLs or error text.

This release does not enable production payment switches, create players, grant
bonuses, or complete supplier QA. `render-gateway.yaml` pins the paid `1c-2g`
plan and configures `/health` as the HTTP health check. Confirm that Render has
applied those settings before allowing production traffic.

`npm test` verifies transport failures, signed callback forwarding and retry,
payment validation, credentials, origin boundaries, and all prior provider tests
with local fixtures. It does not send real payment or withdrawal requests.

## GSPAY+ MYR disabled integration skeleton

The gateway now records the confirmed MYR signature formulas in `gspay.js` and
tests them against the supplier-document examples. These helpers are offline:
they do not perform HTTP requests, persist orders, update a wallet, acknowledge a
callback, or implement DuitNow settlement. USDT and payout routes are outside
this skeleton.

The following discovery routes are intentionally safe and secret-free:

- `GET /providers/gspay/status`
- `GET /callbacks/gspay/payment`
- `GET /callbacks/gspay/duitnow`
- `GET /platform/gspay/config` with `PLATFORM_GSPAY_QUERY_TOKEN`

`POST /platform/gspay/order`, `POST /platform/gspay/order-query`, and both
callback POST routes always return HTTP 503 after bounded request parsing. They
make zero supplier or platform requests even if every switch is set to `true`.
This prevents an incomplete response contract or callback acknowledgement from
creating a false success. `/readiness` keeps `configurationReady` and
`liveReady` false until the create/query response envelope, callback response
and retry contract, provider credentials, and end-to-end wallet evidence are
confirmed.

Reserved environment names are:

```text
GSPAY_MODE=disabled
GSPAY_OPERATOR_AUTH_KEY
GSPAY_OPERATOR_SECRET_KEY
GSPAY_MYR_ORDERS_ENABLED=false
GSPAY_MYR_QUERIES_ENABLED=false
GSPAY_MYR_CALLBACKS_ENABLED=false
PLATFORM_GSPAY_ORDER_TOKEN
PLATFORM_GSPAY_QUERY_TOKEN
PLATFORM_GSPAY_CALLBACK_TOKEN
GSPAY_PAYMENT_FORWARD_URL
GSPAY_DUITNOW_FORWARD_URL
```

Each platform token must contain 32–1024 UTF-8 bytes and differ from all other
gateway peer, administrator and provider credentials. The supplier base is
fixed in code as `https://api.thegspay.com`; no environment setting can redirect
GSPAY credentials to another host. Production credentials may be stored only in
Render secrets while all three transaction switches remain `false`. The
transaction routes remain deliberately inactive until supplier QA, callback
acknowledgement/retry and wallet settlement acceptance are complete.

## Current website origins

Set `ALLOWED_ORIGINS` to a comma-separated exact-origin list in Render:

```text
https://master7.best,https://www.master7.best,https://master7.site,https://www.master7.site,https://master7-v17-staging.onrender.com
```

The plural setting takes precedence over the legacy `ALLOWED_ORIGIN`. Omitting
both retains the direct Render portal origin as the default. An explicit empty
list disables browser CORS access. Wildcards, URL paths and embedded credentials
are rejected. Configuration changes require a new deployment.

Approved browser origins receive matching CORS headers on successful responses
and errors. Preflight accepts only GET, POST, OPTIONS and Authorization/Content-Type.
This does not enable member login, expose admin tokens, complete DNS setup,
configure Cloudflare crawler access, activate games, or make payments live.
Server callbacks continue to require their existing signature validation.

`/health` reports the release version and effective browser origins without
secrets. `render-gateway.yaml` configures it as the HTTP health-check path;
confirm that Render has applied the Blueprint setting before production traffic.

# Wallet query scope

`POST /platform/vpay/order-query` accepts the dedicated `PLATFORM_QUERY_TOKEN`
and a JSON body containing `outTradeNo` and `tradeNo`. It can only issue
`ORDER_GET` for the configured merchant. This token does not authorize admin
routes, order creation, withdrawals, merchant balances or game operations.
Keep it server-side and separate from the callback-forwarding token. The route
is unavailable to an unset or short token; this source addition does not
configure a token, enable transactions or constitute supplier acceptance.


## Wallet checkout scope (not deployed)

`GET /platform/vpay/config` requires the query credential and returns the
configured merchant ID, environment, enabled method codes and exact callback
URLs. No provider credentials, merchant balance or secrets are included.

`POST /platform/vpay/order` requires a separate `PLATFORM_ORDER_TOKEN` (32–1024
bytes) and the existing order fields plus `notifyUrl` and `callbackUrl`. It can
only create orders. Set `VPAY_ENABLED_TRADE_CODES` to the confirmed active method
codes as a JSON array of strings, and explicitly set the HTTPS `VPAY_RETURN_URL`
for platform-created orders. VPay payment redirects and payment callback
forwarding accept only these portal origins: `https://master7-v17-staging.onrender.com`,
`https://master7.best`, and `https://www.master7.best`. The return path must be
exactly `/payment/return`; the payment forwarding path must be exactly
`/api/payment-callbacks/vpay/payment`. Queries, fragments, credentials, custom
ports, other subdomains, and alternate paths fail closed. If an administrator
creates an order without `VPAY_RETURN_URL`, the existing staging return route is
used. This fallback does not make the wallet peer order route ready.
The peer route checks both URLs against server-selected values and refuses
unconfirmed methods. Existing callback routing/readiness and
`VPAY_ORDERS_ENABLED` must also be configured. `VPAY_MODE` must match the wallet's
explicit environment. This label does not prove supplier sandbox access.

Query and order credentials are separate from each other, the callback token and
the full admin token. Neither peer scope grants withdrawals, merchant balances
or game-admin access. Creation retry claims and wallet ledger idempotency live in
the platform; clients must not call the provider directly or reissue uncertain
orders. The existing admin route remains compatible. These source changes do
not configure runtime secrets, activate payment switches, deploy services or
complete production acceptance.

All VPay peer credentials, including `PLATFORM_CALLBACK_TOKEN` and the isolated
`PLATFORM_PAYOUT_TOKEN`, require
32–1024 UTF-8 bytes and must differ from each other and `GATEWAY_ADMIN_TOKEN`.
Callback readiness and forwarding use the same validation as query/order
authorization. Invalid or reused credentials do not forward a notification.

`POST /platform/vpay/withdrawal` and
`POST /platform/vpay/withdrawal-query` require only
`PLATFORM_PAYOUT_TOKEN`. They use the documented `MONEY_OUT` and `MONEY_GET`
contracts and never accept the order, query, callback, or administrator token.
The payout route also requires the explicit MYR contract label and one of the
bank codes published in the VPay Trader API documentation. Provider callbacks
continue through the signed withdrawal callback and the platform wallet must
durably acknowledge them before the gateway returns `SUCCESS`.

`PUBLIC_BASE_URL` must be a standalone HTTPS origin: no non-root path, query,
fragment, credentials or non-default port. Host casing, the default HTTPS port
and an optional root slash are normalized before callback paths are appended.
`VPAY_WITHDRAWAL_FORWARD_URL` retains its full HTTPS path and query string, but
rejects credentials, fragments (including an empty `#`), whitespace and control
characters. VPay payment return and payment forwarding routes use the stricter
official-origin and exact-path rules above. Addresses are normalized before
use; peers must submit the canonical URLs returned by `GET /platform/vpay/config`.
Provider API URLs still support their required paths and signed query parameters.
