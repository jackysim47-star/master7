# MASTER7 V17.134 — Next Game Adapter Evidence Audit

**Audit date:** 2026-11-09

**Baseline reviewed:** V17.133 source snapshot

**Scope:** CLOTPLAY, META GAMING, FUMA, AWC, Rectangle and RSGHub
**Result:** No candidate currently meets every condition for an executable production adapter.

## Decision criteria

A provider qualifies only when the available evidence establishes all of the following:

1. The contract and credentials are bound to the MASTER7 account.
2. All production traffic uses HTTPS.
3. The contract covers catalogue, player creation or verification, launch, balance, deposit, withdrawal, transfer recovery, wagers and callback behavior where applicable.
4. The provider maps unambiguously to a MASTER7 lobby profile and isolated wallet ledger.
5. Transfer recovery proves transaction, direction, amount, currency and player ownership.
6. The provider supplies reliable session closure or offline evidence before funds are withdrawn.
7. Currency scale and rounding are confirmed.
8. Required staging acceptance can be performed without using production funds.

## Executive result

| Rank | Candidate | Account-bound HTTPS contract | Existing profile mapping | Safe close and recovery | Decision |
|---:|---|---|---|---|---|
| 1 | Rectangle | Substantially complete | Confirmed: `rectangle_myr` | Incomplete | Keep fail-closed |
| 2 | RSGHub | Complete | Not confirmed | Contract supports kick and online status | Mapping decision required |
| 3 | AWC | Account sheet only | Confirmed: `awc_myr` | Contract unavailable | Keep fail-closed |
| 4 | META GAMING | Account sheet and document links | Confirmed: `metagaming_myr` | Contract unavailable locally | Keep fail-closed |
| 5 | FUMA | Credential row only | Confirmed: `fuma_myr` | Missing | Keep fail-closed |
| 6 | CLOTPLAY | Catalogue-only evidence | Confirmed: `clotplay_myr` | Missing | Keep fail-closed |

## 1. Rectangle

### Evidence present

- Account attachment: `/workspace/.codex-attachments/4cae72a9-f8dd-487b-835b-3bb6ca58c8ea/df053aaa-5b52-4a43-b002-61cabadc3ce3/_PROD_Rectangle  master7 _2_.docx`.
- The attachment identifies a MASTER7 production account, MYR and Transfer Wallet.
- It supplies an HTTPS back office, an account-specific HTTPS catalogue URL, an HTTPS integration-document portal and production whitelist addresses.
- The authenticated integration document covers:
  - HMAC-SHA256 request signing using the exact JSON bytes, UTC date and bare hostname.
  - Game list and game details.
  - Player creation, update and authorization.
  - Deposit, withdrawal, balance, transaction details and transaction list.
  - Launch URLs using the game URL returned by the catalogue and a single-session authorization token.
  - Signed wager history with pagination.
- Current source already maps Rectangle to `rectangle_myr` as a MYR Transfer Wallet profile in `lib/game-provider-registry.ts`.

### Exact blockers

1. **Production host and catalogue route conflict.**
   - The account sheet supplies `https://apig.rg-lgna.com/api/v1/lobby-available-games`.
   - The current authenticated document supplies `https://api.rg-lgna.com/api/v1/available-games`.
   - V17.133 accepts `https://apig.rg-lgna.com` but calls `/api/v1/available-games` in `lib/direct-game-catalogues.ts`.
   - These three combinations are not equivalent. The vendor must confirm the canonical catalogue host and route for this exact account. The wallet API host must also be confirmed separately.

2. **No definitive session-close evidence.**
   - The document exposes player block and block-status APIs.
   - It does not document logout, kick, token revocation, current online state or a guarantee that blocking immediately ends an already issued session and all in-flight rounds.
   - A blocked-player result therefore cannot prove that funds are safe to withdraw.

3. **Current MASTER7 transfer engine requires stronger evidence.**
   - `lib/provider-transfer-wallet.ts` requires an executable adapter with `closeGame` before a profile can run.
   - Before funding and during settlement, it requires independently confirmed closure; settlement records a stable closure-evidence hash before querying and withdrawing the provider balance.
   - Creating `closeGame` from Rectangle's blocklist would invent a contract that the vendor has not documented.

4. **Recovery binding is incomplete.**
   - Rectangle's TransactionDetails response documents transaction ID, type, amount, currency and status.
   - It does not document the player reference in that response.
   - MASTER7 recovery requires proof that the queried transaction belongs to the original member and provider player, in addition to direction, amount and currency.

5. **Staging acceptance cannot yet be performed.**
   - The account sheet explicitly requires staging integration and testing.
   - The supplied account attachment contains production credentials only; no staging operator code, API key or whitelist confirmation was found.

6. **MYR unit conversion is not confirmed.**
   - The account sheet warns that conversion ratios vary by currency and supplier.
   - It does not explicitly confirm that this MYR account is 1:1 or define rounding and maximum precision.

### Decision

Rectangle is the closest candidate already mapped to a MASTER7 lobby profile. It must remain `contract_missing` or `adapter_unimplemented` and `executable=false` until all six blockers are resolved. No registry promotion is supported by the present evidence.

## 2. RSGHub

### Evidence present

- Account attachment: `/workspace/.codex-attachments/a2abc1c4-71df-46da-9003-fb78c4d6ecc5/a2ab0218-f4c0-45f5-8f3a-b32c60875440/MASTER7-api-docs_en.pdf`.
- The production sheet identifies:
  - HTTPS API and management-panel URLs.
  - MASTER7 as the System Code.
  - Transfer Wallet.
  - MYR.
  - Game Partner `RSG1.0` with all games open.
- Public contract: `https://docs.rsghub.dev/v1/transfer/en/`.
- The OpenAPI contract is technically complete for the universal adapter surface:
  - Player creation.
  - Player online-state query and kick operation.
  - Deposit, withdrawal, balance, transaction-result query and history.
  - Game list, direct game URL and lobby URL.
  - Round and aggregate reports.
  - Duplicate transaction detection and query-based recovery.
- The contract binds production traffic to `https://api.rsghub.io` and documents encrypted request/response envelopes and authenticated headers.

### Exact blocker

- No `rsghub` or `RSG1.0` brand/profile exists in the V17.133 37-provider registry.
- The sheet does not state that `RSG1.0` is an alias for any existing MASTER7 provider.
- Assigning it to JDB, SPRIBE or another lobby tile would be an unsupported guess and could mix players, wallet balances and ledgers.
- Before implementation, the owner or vendor must confirm one of these mappings:
  1. RSGHub is a new independent lobby provider with its own profile, player namespace and ledger namespace; or
  2. RSGHub is the contracted transport for a specifically named existing MASTER7 brand.

### Decision

RSGHub has the strongest complete technical contract and can satisfy the platform's kick/online requirement. Implementation is blocked only by the unverified lobby/profile mapping. It must not reuse another provider's namespace.

## 3. AWC

### Evidence present

- Account attachment: `/workspace/.codex-attachments/6268f79a-214b-4a89-94f2-241d18fb28c6/3e2759c0-a6c9-40c6-893f-293cbbb7453d/_AWC Production Credentials_master7.docx`.
- The attachment supplies account-bound production HTTPS API and fetch hosts, an agent certificate reference, whitelist addresses and links for Single Wallet and Multiple Wallet documents.
- V17.133 contains the `awc_myr` registry mapping.

### Exact blockers

- The API specification is an authentication-gated Atlassian document; the attachment does not contain the endpoint schemas.
- The available local evidence does not establish:
  - Which wallet model applies to MASTER7.
  - Player identifier rules.
  - Signature and timestamp rules.
  - Launch request and response fields.
  - Deposit, withdrawal and balance methods.
  - Callback contract.
  - Idempotency and unknown-result recovery.
  - Wager pagination and settlement-finality rules.
  - Session close or online-state proof.

### Decision

AWC remains fail-closed until the complete account-applicable API document is available locally and the wallet model is confirmed.

## 4. META GAMING

### Evidence present

- Account attachment: `/workspace/.codex-attachments/4214f2b1-f7c3-4577-8455-154c7d4e6913/d7907aeb-16f0-4b58-9ff5-c1742340f273/_PROD_META GAMING MASTER7 _5_.txt`.
- The attachment identifies MASTER7 production and staging HTTPS back-office/API locations, MYR, and links to wallet documents, game lists and artwork.
- V17.133 contains the `metagaming_myr` registry mapping.

### Exact blockers

- The local attachment only provides an API URL pattern containing a function placeholder.
- The linked wallet documents were not supplied as local contract evidence.
- Missing locally verified fields include methods, signature algorithm, request and response schemas, player mapping, wallet mode selection, idempotency, transfer query, launch, wager pagination, callback behavior and session closure.

### Decision

META GAMING remains fail-closed. A link and function placeholder do not establish an executable contract.

## 5. FUMA

### Evidence present

- Account attachment: `/workspace/.codex-attachments/4214f2b1-f7c3-4577-8455-154c7d4e6913/c80133d4-eb55-4367-9ad6-da8bddf1991f/_PROD_FUMA MASTER7 _3_.csv`.
- The row identifies an account-bound HTTPS API host, MYR and Transfer Wallet.
- V17.133 contains the `fuma_myr` registry mapping.

### Exact blockers

- The callback field is blank.
- No API method contract is attached.
- Missing evidence includes signature/encryption rules, player creation, game catalogue, launch, deposit, withdrawal, balance, transaction recovery, wager reports, error states, idempotency, session closure and staging acceptance.

### Decision

FUMA remains fail-closed. Credentials and a wallet-mode label are not an implementation contract.

## 6. CLOTPLAY

### Evidence present

- Vendor follow-up artifact: `/workspace/deliverables/MASTER7_CLOTPLAY_VENDOR_MESSAGE_20261105.txt`.
- Earlier integration material identifies a read-only game-catalogue endpoint.
- V17.133 contains the `clotplay_myr` registry mapping.

### Exact blockers

- No complete account-bound CLOTPLAY player, launch and Transfer Wallet contract was found in the supplied attachments.
- The catalogue integration previously received an upstream HTTP 403, so allowlisting or account authorization remains unresolved.
- Missing evidence includes player mapping, signing, deposit, withdrawal, balance, query/recovery, wagers, session close, errors, idempotency and staging acceptance.
- A catalogue token cannot be reused as a wallet or launch credential without explicit vendor documentation.

### Decision

CLOTPLAY remains fail-closed. Catalogue access alone cannot support game launch or wallet settlement.

## Required next evidence

### To proceed with Rectangle

1. Vendor confirmation of the account-specific production and staging catalogue and wallet hosts/routes.
2. Staging operator code, API key and whitelist confirmation through the secret channel.
3. Written MYR scale, decimal precision and rounding rules.
4. A documented kick/logout/offline procedure that proves issued tokens and in-flight rounds are closed.
5. A transaction-query response or secondary query that binds recovery to the original player.

### To proceed with RSGHub

1. Written confirmation that `RSG1.0` is a new independent MASTER7 lobby provider, or the exact existing brand it represents.
2. If independent, approval to add a new provider/profile with separate player and ledger namespaces.

## Final conclusion

- **Executable adapter selected:** None.
- **Registry promotion:** None.
- **Source changes:** None.
- **Deployment changes:** None.
- **Live transaction calls:** None.
- **Closest existing mapped candidate:** Rectangle.
- **Most complete technical contract:** RSGHub, pending provider/profile mapping.

Promoting any reviewed candidate now would require guessing a host, route, session-close rule, player binding or provider mapping. The evidence does not support those guesses.
