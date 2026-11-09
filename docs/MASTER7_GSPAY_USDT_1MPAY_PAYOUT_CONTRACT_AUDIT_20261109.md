# MASTER7 V17.133 — GSPAY+ USDT and 1MPay payout contract audit

**Audit date:** 2026-11-09

**Source reviewed:** isolated V17.133 tree at `/tmp/master7-v133-integrate.BJ1SuW/master7-v17-render-staging`
**Decision:** both transaction adapters remain unavailable. No adapter was added, no repository was edited, no provider request was sent, and no production credential was used or reproduced.

## Result matrix

| Profile | Provider material found | Complete end-to-end contract | Safe implementation decision | Current V17.133 behavior |
|---|---|---:|---|---|
| GSPAY+ USDT | Account/credential presentation and MASTER7-authored handover only | **No** | Do not implement order, callback, query, wallet, recovery or payout routes | Independent status-only profile; all transaction capabilities fail closed |
| 1MPay payout | API Specification 1.3 section 9: create endpoint, request envelope, fields, bank codes and PHP encryption example | **No** | Do not implement or submit payouts; creation alone cannot establish a safe payout lifecycle | Capability disabled with `provider_payout_contract_incomplete`; recovery reports payout disabled |

## Audit scope and method

- Searched the available attachment set for GSPAY, USDT, 1MPay, payout, callback, query, recovery, signing, encryption, bank and settlement material.
- Read the supplied 1MPay API Specification 1.3 text and the payment handover evidence.
- Compared that material with V17.133 source, documentation and fail-closed tests.
- Reviewed an older, non-V17.133 1MPay payout draft only as negative evidence. It is not an accepted provider contract and was not copied or merged.
- Kept all credentials, keys and account passwords out of this report.

## GSPAY+ USDT

### Evidence found

1. No versioned GSPAY+ USDT provider API specification was present in the reviewed attachments. The USDT material identifies an account/profile but does not define a transaction protocol.
2. V17.133 explicitly states that order, callback, query, recovery, wallet-credit and payout routes are absent, and that credentials alone are not a contract: `docs/GSPAY_USDT.md:3-9`.
3. The same source lists the unverified API/checkout origins, asset network and precision, order/signature schema, callback authentication, query/recovery rules and ledger treatment: `docs/GSPAY_USDT.md:11-20`.
4. The implementation exposes only `GET /api/payments/gspay/usdt/status`. It hardcodes deposit implementation/configuration/enablement to false and declares payout, balance and recovery unavailable: `lib/gspay-usdt.ts:26-63`.
5. The isolated tests prove the profile remains closed even when fictional values populate every declared field, and that no transaction route is recognized: `tests/gspay-usdt-profile.test.mjs:11-41`.
6. The V17.133 consistency record says GSPAY USDT recovery is absent and the MYR ledger is not a USDT ledger: `docs/MASTER7_TRANSACTION_CONSISTENCY_V17_20261109.md:30-34`.

### Exact missing provider-controlled contract

1. Versioned official API document and exact UAT/production API and checkout origins.
2. Product definition: deposit, payout, custodial wallet or on-chain transfer; asset and chain/network identifiers.
3. Atomic unit, decimals, rounding, deposit limits, fees, confirmation count, address/tag/memo rules and exchange-rate rules.
4. Create-order method/path/content type, required fields, canonicalization, nonce/timestamp, idempotency and provider reference.
5. Authentication and signature construction with an official fixed test vector.
6. Checkout response schema and permitted HTTPS origins.
7. Callback schema, authentication/signature, source restrictions, replay window, ACK, retry, duplicate and out-of-order behavior.
8. Query/recovery endpoint, ownership/amount/currency/network binding, status dictionary, expiration and conflict precedence.
9. Wallet rules for underpayment, overpayment, fees, multiple transaction hashes, delayed confirmations, chain reorganizations and replacement transactions.
10. Reconciliation/report/settlement interface and provider-side transaction fields.
11. Refund, reversal and chargeback rules, if supported.
12. A separate payout contract, including address validation, approval/risk states, query, callback and final ledger behavior.
13. Merchant binding and inbound/outbound IP allowlist requirements.

### Decision

**NOT IMPLEMENTABLE from available evidence.** Reusing GSPAY MYR endpoints, signatures, callbacks or ledger rules would invent a contract. The independent fail-closed V17.133 profile is correct.

## 1MPay payout

### Contract elements that are documented

The supplied `1mpay-api-manual.txt`, titled **1MPay API Specification — Version 1.3** and dated 23 June 2026, documents:

- `POST {api_url}/payout` and a minimal success example containing `data.trxno`: lines 288-315.
- Outer request fields `merchant`, `key`, `data` and `iv`: lines 316-327.
- Business fields `amount`, `refid`, `token`, `customer`, `currency`, `bankcode`, `account`, `post_url`, `failed_return_url` and `return_url`: lines 333-361.
- A bank-code table: lines 367-465.
- A PHP example using `openssl_seal` with `AES-256-CBC`, then Base64 encoding the ciphertext, wrapped key and IV: lines 471-495.

These elements can describe payout creation. They do not describe an end-to-end, recoverable money movement contract.

### Evidence that the lifecycle is incomplete

1. The callback definition at manual lines 214-250 is explicitly under **Fund Transfer**. The document does not say it also applies to payout.
2. The `/transquery/{trxno}/{base64_token}` query at lines 256-282 follows the Fund Transfer sections. The payout section does not adopt it or define a payout query.
3. The payout section ends after the encryption example at line 495; the next section is the abandoned CCID function. There is no payout callback, query, recovery, status or reconciliation section.
4. V17.133's accepted 1MPay module implements API 1.3 sections 4, 7 and 8 for deposits and states that it never invokes `/payout`: `lib/onempay.ts:9-13`.
5. The payout capability is explicitly disabled with `provider_payout_contract_incomplete`: `lib/payout-state.ts:18-22`.
6. The environment contract states that the application never invokes the payout endpoint: `.env.example:105-115`.
7. Payment recovery explicitly returns 1MPay payout disabled: `lib/backend.ts:562-568`.
8. The V17.133 source review records the same missing callback/query/finality and ambiguous-submit recovery semantics: `docs/MASTER7_PAYMENT_AUTOMATIC_AVAILABILITY_20261108.md:15-21`.

### Exact missing provider-controlled contract

1. Provider confirmation whether payout uses the Fund Transfer callback contract, or a separate payout callback specification.
2. Complete payout callback fields, authentication/signature formula and binding to merchant, reference, beneficiary, amount, currency and provider transaction.
3. Required callback ACK HTTP status/body, retry intervals, retry limit, duplicates and delivery ordering.
4. Payout query/status endpoint and exact request/response. If `/transquery` applies, the provider must state this explicitly and define its payout token.
5. Full payout status dictionary, finality, late-success, reversal/return handling and callback-versus-query precedence.
6. Recovery for a timeout or connection loss before `trxno` is returned. `refid` uniqueness alone does not define safe resubmission.
7. Duplicate `refid`, idempotent retry and ambiguous submission behavior.
8. Complete success/error semantics: HTTP statuses, response bodies/error codes and whether `code=0` means accepted or completed.
9. Official fixed encryption vector for cross-language verification, including JSON/character encoding, RSA padding/key wrapping, AES parameters and Base64 variant.
10. Supported key length/format, rotation and registered public-key fingerprint/account binding. Receipt of a public key does not prove the matching private key is registered.
11. Merchant payout permission, environment/currency, limits, fees, beneficiary name/account validation and the merchant-supported bank subset/version.
12. Source/egress IP and callback allowlist requirements and timeout policy.
13. Merchant balance/reservation semantics, payout statement, settlement/reconciliation interface and return/reversal accounting.

### Older draft review

`/workspace/m7-integration67-v1/lib/onempay-payout.ts` is outside V17.133 and is not accepted implementation evidence. It keeps submission disabled, but it also assumes that deposit callback tokens and `/transquery` apply to payouts, chooses response states/ACK behavior and supplies only a local bank mapping. Those assumptions are precisely the missing provider-controlled rules. The draft was not copied, edited or merged.

### Decision

**NOT IMPLEMENTABLE as a production payout adapter from available evidence.** The documented create envelope can be prototyped offline, but exposing it without verified callback, query, recovery, finality and reconciliation semantics could reserve funds indefinitely, resubmit an ambiguous payout or settle the wrong terminal state. V17.133 must remain fail closed.

## Evidence-only activation gate

Neither profile should change from unavailable until the missing provider-controlled items above are present in a versioned specification or authorized provider clarification and are covered by:

1. Fixed offline signing/encryption vectors using synthetic values.
2. Synthetic contract tests for create, rejected create, timeout-before-reference, duplicate submission, query, authenticated callback, callback replay, out-of-order updates, reversal and reconciliation.
3. UAT evidence that binds merchant, amount, currency/network, reference and terminal state.
4. A controlled production acceptance with idempotent wallet/ledger verification.

## Files changed

- V17.133/repository files: **none**.
- Provider configuration or runtime switches: **none**.
- External requests or transactions: **none**.
