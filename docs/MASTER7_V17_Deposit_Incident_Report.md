# MASTER7 V17 Deposit Incident Report

**Evidence date:** 2026-11-10 MYT
**Database source:** encrypted transaction snapshot of live `.144` PostgreSQL
**Runtime source:** Render request metadata, provider query diagnostics and deployed source contracts
**Method:** read-only; no provider order, callback replay, wallet write or payment switch change

## Decision

The current database contains 12 deposit orders and no wallet-ledger entries.
Eleven orders stopped before a usable provider transaction. One 1MPay MYR 10
order reached a provider transaction and checkout, but its provider query result
is `Fail`; no signed callback or wallet entry exists. Current evidence does not
prove that any stored order completed payment.

| Provider | Orders | Order creation | Provider payment | Callback evidence | Wallet credit | Failure node | Status |
|---|---:|---|---|---|---|---|---|
| VPay MYR | 8 | Local orders exist; no provider transaction or checkout | Not verified | None | 0 ledger rows | **B** — VPay rejects `ORDER_GET` signature | **FAIL ❌** |
| GSPAY MYR | 0 | No order in current database | Not verified | None | 0 ledger rows | **A** in current database; historical external case unavailable | **NOT VERIFIED ⚠️** |
| 1MPay MYR | 4 | One provider transaction; three missing references | One bound query is `Fail`; three cannot be queried | None | 0 ledger rows | Three at **B**; one at **B/C boundary** | **NOT VERIFIED ⚠️** |
| Manual Bank | 0 automatic-provider incidents in this scope | Separate reviewed workflow | Not applicable | Not applicable | No incident credit in snapshot | Outside these gateway incidents | **PASS for workflow / no real incident acceptance ✅** |

## Historical records

The exact 12 order IDs, creation times, amounts, statuses, provider references,
callback evidence and ledger counts are recorded in
`MASTER7_V17_144_Deposit_Incident_Forensics_20261110.md`.

Totals:

- VPay: 8 × MYR 20 = MYR 160.
- 1MPay: three × MYR 20 plus one × MYR 10 = MYR 70.
- GSPAY: 0 orders.
- Credited orders: 0.
- `wallet_ledger`: 0 rows.
- `wallet_posting_intents`: 0 rows.
- Durable callback/credit events: 0.

No MYR 210 order exists in the current database. A MYR 210 incident remains
**F: old `.99` or another database — NOT VERIFIED** until that database or a
provider/bank export is supplied.

## Root cause by provider

### VPay MYR — FAIL ❌

The signer matches the current official Trader API document. Eight captured
read-only queries reached VPay over HTTP 200, but VPay returned business code
`-1` and the gateway classified it as `vpay_invalid_signature`. The remaining
root-cause boundary is the active API key/trader 3647 binding or an unpublished
provider production rule. No code guess can safely repair this.

### GSPAY MYR — NOT VERIFIED ⚠️

The current Order, GetPayment, MD5 and callback implementation matches the
recorded contract. Historical `401` traffic used an old route; the current bridge
has never processed a live order because the profile is paused. GSPAY must
confirm the gateway callback URL, authorize a fixed outbound IP or supported
auth alternative, and confirm callback acknowledgement/retry rules.

### 1MPay MYR — NOT VERIFIED ⚠️

Four orders exist. Three have no provider transaction reference. Order
`M7b72277825cb44e19be` has provider transaction
`pwLDn0m8P6KNJx8x46hba2CIh`, but its bound provider query result is `Fail` and
there is no durable callback or ledger. Historical HTTP 200 callback metadata
cannot be matched to an order in the current database and does not prove credit.

## Code fix status

Release candidate `.145-payment-callback-evidence` adds durable, idempotent
callback receipts for all three providers only after authentication and exact
order binding. These events prove callback delivery only. Provider payment and
wallet credit still require an independent provider query and balanced two-leg
ledger. New orders remain paused.

## Remaining acceptance evidence

1. VPay: provider-confirmed active API key/trader binding and one successful
   read-only bound query.
2. GSPAY: correct callback registration, stable outbound authorization and
   confirmed acknowledgement/retry contract.
3. 1MPay: provider export containing `refid`, `trxno`, amount and final status
   for the historical timestamps.
4. After the above, one explicitly authorized low-value production flow per
   provider: Order → Payment → Callback → Query/Reconciliation → Wallet → Ledger.

Until those items pass, real-money deposit acceptance remains pending.
