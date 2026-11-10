# MASTER7 Coba8 contract discovery

- Checked: `2026-11-10T10:51:32Z`
- Scope: read-only public discovery and authorized back-office documentation lookup
- Result: **BLOCKED — no implementable API contract obtained**

## Available evidence

The owner supplied a merchant login and one API token. Those values are intentionally excluded from this report, logs, source code, and test fixtures.

Public infrastructure evidence confirms these Coba8 hostnames:

- `coba8.com`
- `api.coba8.com`
- `api2.coba8.com`
- `wap.coba8.com`
- `www.coba8.com`
- `cf.coba8.com`

The apex and API hosts are protected by a Cloudflare managed challenge. Direct read-only HTTP requests returned `403`; Firecrawl's index, document, Chrome CDP, stealth, and retry engines could not retrieve the page. Public web and developer-document searches returned no official Coba8 integration manual or API schema. This executor has no connected local-browser or cloud-desktop capability, so it could not complete the interactive challenge or log in to the authorized back office.

## Contract coverage

| Capability | Evidence | Status |
|---|---|---|
| Merchant identity / token exists | Owner-supplied | Present, not validated |
| Production vs UAT base URL | None | Missing |
| Authentication header and signature formula | None | Missing |
| Request timestamp / nonce rules | None | Missing |
| Server IP allowlist / callback allowlist | None | Missing |
| Game catalogue | None | Missing |
| Player create / bind | None | Missing |
| Game launch / return URL | None | Missing |
| Wallet model (seamless or transfer) | None | Missing |
| Balance / deposit / withdraw / transfer | None | Missing |
| Bet, win, rollback, cancel, jackpot | None | Missing |
| Session closure / unfinished rounds | None | Missing |
| Wager and settlement reports | None | Missing |
| Callback authentication and response ACK | None | Missing |
| Idempotency and duplicate handling | None | Missing |
| Currency, decimal precision, unit scaling | None | Missing |
| Error codes and retry semantics | None | Missing |
| UAT test account and acceptance procedure | None | Missing |

## Safe implementation decision

The supplied account and token are not enough to infer endpoint paths, signatures, money semantics, or callback behaviour. No Coba8 adapter, player, game launch, wallet call, provider write, or Play button should be enabled from this evidence. Guessing another supplier's contract would risk money and ledger corruption.

Implementation can begin once the authenticated back office provides the official API manual or downloadable OpenAPI/Postman/SDK package and its exact environment details. Required artifacts are:

1. Official endpoint and authentication/signature documentation.
2. Game, player, launch, wallet, transfer, wager, settlement, rollback, callback, and query schemas with examples.
3. Currency/unit rules, idempotency keys, error/retry rules, and callback ACK requirements.
4. UAT base URL/account, IP allowlist confirmation, callback URL registration, and provider acceptance steps.

Until then the provider must remain `adapter_unimplemented`, `launchReady=false`, and `playable=false`.
