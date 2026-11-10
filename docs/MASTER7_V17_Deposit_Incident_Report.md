# MASTER7 V17 Deposit Incident Report — reviewed

**Review date:** 2026-11-10 MYT
**Historical database evidence:** encrypted PostgreSQL snapshot captured from release `.144` at 2026-11-10 00:04:44.862 UTC
**Runtime observation:** release `.145`, checked at 2026-11-10 01:41:59 UTC
**Provider observation:** VPay read-only `ORDER_GET`, 2026-11-10 01:43:53.861 UTC
**Boundary:** historical database counts below describe the captured snapshot. This review did not create an order, pay, replay a callback or credit a wallet.

## 1. Conclusion

The snapshot contains 12 deposit orders, zero credited orders and zero wallet-ledger rows. It does not establish whether a customer transferred money outside the platform.

The immediate customer-facing deposit blocker is proven: all four payment profiles currently report `orderReady=false`. VPay MYR, GSPAY MYR and 1MPay MYR report `profile_orders_disabled`; GSPAY USDT reports `profile_credentials_incomplete`.

The previous conclusion that the new VPay token still produced a signature error was not supported by its code-only diagnostic. A fresh query returned HTTP 200, business code `-1`, and the exact message **`This deposit is not exist.`** This means the requested order was not found in that response. It does not prove a completed payment, correct wallet binding, or that a request from Render's outbound IP will receive the same result.

Production deposit acceptance remains **NOT VERIFIED**. No evidence in this review establishes a wallet-credit implementation defect, or rules one out.

## 2. Order evidence

| Profile | Historical orders | Stored provider reference / checkout | Current order readiness | Evidence status |
|---|---:|---|---|---|
| VPay MYR | 8, total MYR 160 | None of the 8 has either field | False: `profile_orders_disabled` | Historical signature rejection; latest direct query says order not found |
| GSPAY MYR | 0 | No order in this snapshot | False: `profile_orders_disabled` | NOT VERIFIED; zero rows do not prove a failed order attempt |
| GSPAY USDT | 0 | No order in this snapshot | False: `profile_credentials_incomplete` | Runtime also reports unimplemented deposit adapter and unverified endpoint/network contract |
| 1MPay MYR | 4, total MYR 70 | One order has both; three lack references | False: `profile_orders_disabled` | One bound query returned `Fail`; no paid-to-ledger acceptance |
| Manual bank | Outside these gateway incidents | No incident acceptance evidence | Not accepted by this review | NOT VERIFIED; no workflow PASS is inferred from absent incidents |

Eleven orders lack stored provider references and checkout URLs. This proves a local evidence gap. It does **not** prove the provider never created an order; a lost response or a different provider record cannot be resolved from these fields alone.

Exact IDs, creation times and snapshot fields are in `MASTER7_V17_144_Deposit_Incident_Forensics_20261110.md`. Its failure-node labels are provisional. In particular, missing fields alone do not establish node B; zero GSPAY orders alone do not establish a failed node A.

No MYR 210 order appears in this snapshot. The location or existence of that reported transaction remains unverified; an old `.99` database is a possible evidence source, not a proven location.

## 3. Provider evidence

### VPay

Earlier gateway observations classified the supplier response as `vpay_invalid_signature` using a recognized supplier message. Those observations predate the new-token query.

The original new-token helper instead set `signatureRejected=true` whenever the business code equalled `-1`, without inspecting the message. That inference was incorrect. The reviewed request used the existing stored merchant order ID, the same deployed signer, trader `3647`, and the supplied token. It returned:

```json
{
  "observedAt": "2026-11-10T01:43:53.861Z",
  "source": "execution_workspace_not_render",
  "httpStatus": 200,
  "providerCode": -1,
  "providerMessage": "This deposit is not exist.",
  "providerRecordPresent": false,
  "responseSha256": "fbe369bfb68b6cfef9f9b1a0ae3ecc4eeada3740f1ba5f8567a6e5ac5fe689fc"
}
```

No order or wallet write was made. Authentication and error-check ordering inside VPay are not independently known. A successful query of a real, order-bound VPay transaction from the deployed gateway remains required.

The three IP addresses provided by the owner are described as callback-source IPs. They are not evidence of Render's outbound IP or of successful callback delivery.

### GSPAY

The current snapshot has no GSPAY order. Earlier request metadata includes authentication failures, but it does not establish the root cause of a current authenticated order request.

Callback registration, outbound authorization and acknowledgement/retry requirements remain checks to resolve. The available evidence does not prove which of those is presently wrong. MYR and USDT must be assessed independently; USDT has additional implementation and contract gaps in runtime readiness.

### 1MPay

Order `M7b72277825cb44e19be` has provider reference `pwLDn0m8P6KNJx8x46hba2CIh` and a stored checkout URL. Its recorded bound provider query result is `Fail`.

The other three orders have no stored provider reference. Provider payment completion, settlement and the customer's bank debit cannot be established from that absence. The snapshot does not establish a paid-but-uncredited case for any of these orders.

## 4. Callback evidence

The `.144` archive contains none of the three receipt events added in `.145`: `vpay_callback_authenticated`, `gspay_callback_received`, `1mpay_callback_verified`.

Consequently, zero such events in a `.144` snapshot cannot prove that no callback arrived. Historical HTTP 200 callback metadata is also insufficient to prove authentication, exact order binding, successful settlement or wallet credit.

Release `.145` now persists these receipts after authentication and binding. A receipt still proves delivery/binding only; provider payment confirmation and ledger reconciliation remain separate.

## 5. Wallet and ledger evidence

For the historical snapshot:

- Credited orders: 0.
- `wallet_ledger`: 0 rows.
- `wallet_posting_intents`: 0 rows.
- No recorded deposit completed the local wallet-credit chain.

This is a **no-recorded-credit finding**, not proof that the wallet implementation is defective. A proven paid transaction matched to its callback, query, order and ledger is needed to diagnose a paid-but-uncredited defect.

A complete acceptance trace must show order and provider references, exact amount/currency, signed callback or authenticated recovery, member credit, equal opposite clearing entry, available balance and reconciliation. Merchant settlement requires its own provider evidence.

## 6. Fix status

Release `.145-payment-callback-evidence` is **live**, rather than an undeployed candidate. Its post-deploy receipt records healthy portal/database responses, 1,258/1,258 regression tests and successful encrypted backup/restore verification.

Those checks establish the tested software and recovery evidence; they do not establish real-money payment acceptance. At the runtime observation above:

```text
newDepositsEnabled = true
VPay / GSPAY MYR / 1MPay profile orders = disabled
GSPAY USDT orderReady = false
realPayments = false
productionReady = false
```

The global deposit flag and the per-profile controls are separate. A globally enabled flag does not make a paused payment profile available.

## 7. Remaining risks and acceptance work

1. Resolve the per-profile pause and readiness prerequisites through a controlled acceptance process; changing a flag alone supplies no payment evidence.
2. Query a genuine VPay provider transaction from the deployed gateway and preserve a sanitized, exact-message classification.
3. Validate GSPAY MYR authentication and callback delivery; complete GSPAY USDT's separate adapter and contract requirements.
4. Obtain 1MPay provider records for the stored order IDs before concluding that a customer payment was lost.
5. Complete one actual order-to-payment-to-callback/query-to-wallet-to-ledger reconciliation for every offered deposit profile.
6. Record merchant settlement and payout acceptance separately; a deposit check does not certify withdrawals.
7. Complete official-domain routing and TLS verification; the staging service's healthy response does not certify the official domains.

**Go-live decision: NOT ACCEPTED by this evidence.**
