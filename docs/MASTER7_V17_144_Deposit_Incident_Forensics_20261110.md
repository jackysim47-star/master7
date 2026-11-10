# MASTER7 V17.144 Deposit Incident Forensics

> Review correction (2026-11-10): snapshot rows below are preserved as historical evidence. Missing provider references do not prove provider order creation failed. Callback receipt events introduced in `.145` were not present in the `.144` archive, so their absence cannot prove no callback arrived. The failure-node labels and wallet `FAIL` below must not be read as proven implementation root causes. See `MASTER7_V17_Deposit_Incident_Report.md` for the reviewed conclusions.

**Evidence captured:** 2026-11-10 08:04:44 MYT
**Source:** Encrypted transaction-snapshot backup from the live `.144` PostgreSQL database
**Scope:** `deposit_orders`, payment audit events, `payment_recovery_leases`, `wallet_ledger`, and `wallet_posting_intents`
**Method:** Local read-only decryption and aggregation. No provider request, database write, wallet write, or secret disclosure.

## Executive finding

The live database contains **12 deposit orders**:

- VPay: 8 orders, MYR 160.00 total.
- 1MPay: 4 orders, MYR 70.00 total.
- GSPAY: 0 orders.
- Wallet ledger entries for all deposit orders: **0**.
- Wallet posting intents: **0**.
- Dedicated verified callback events: **0**.
- Credited orders: **0**.

The database therefore proves that no recorded deposit reached wallet credit. It does **not** prove that a customer did or did not transfer money outside the platform.

## Historical order evidence

| Order ID | Provider | Created (MYT) | Amount | Current status | Provider transaction | Checkout recorded | Callback record | Wallet ledger | Evidence-only failure node |
|---|---|---:|---:|---|---|---|---|---|---|
| `d7a2f854-5e27-475f-978a-d87780ad7af9` | 1MPay | 2026-11-05 20:49:42 | MYR 20.00 | `review` | Missing | No | None | 0 | **B** — local order exists; provider reference missing |
| `d9878494-6ccd-41c3-8eec-0562cbe931e3` | VPay | 2026-11-05 20:53:36 | MYR 20.00 | `unknown` | Missing | No | None | 0 | **B** — provider order/payment not evidenced |
| `ec93b54e-ddbf-4720-877a-7f27101a6d3b` | VPay | 2026-11-05 20:53:41 | MYR 20.00 | `unknown` | Missing | No | None | 0 | **B** — provider order/payment not evidenced |
| `088a0837-bcb0-4beb-a17b-26af03d7b07f` | VPay | 2026-11-05 20:53:53 | MYR 20.00 | `unknown` | Missing | No | None | 0 | **B** — provider order/payment not evidenced |
| `09dba113-abe4-4484-9786-c2adf052f2c2` | 1MPay | 2026-11-05 21:02:05 | MYR 20.00 | `review` | Missing | No | None | 0 | **B** — local order exists; provider reference missing |
| `c1db3a41-0043-47f6-834d-afb0bf270049` | VPay | 2026-11-05 21:12:32 | MYR 20.00 | `unknown` | Missing | No | None | 0 | **B** — provider order/payment not evidenced |
| `fb8492c3-b4d7-4bb2-afb1-e44556f37134` | VPay | 2026-11-05 21:42:43 | MYR 20.00 | `unknown` | Missing | No | None | 0 | **B** — VPay returned provider code `-1` |
| `e9503bed-2e7c-402d-9419-e573fe4c25ca` | 1MPay | 2026-11-05 21:42:44 | MYR 20.00 | `review` | Missing | No | None | 0 | **B** — provider response lacked transaction ID and checkout URL |
| `abfc9030-7d21-4450-bc0e-2dd6895b8c1e` | VPay | 2026-11-06 22:35:29 | MYR 20.00 | `unknown` | Missing | No | None | 0 | **B** — VPay returned provider code `-1` |
| `56e46070-86b0-4ada-9f74-91d8de8912f9` | VPay | 2026-11-06 22:35:39 | MYR 20.00 | `unknown` | Missing | No | None | 0 | **B** — VPay returned provider code `-1` |
| `2ede966a-80e0-4ea2-a591-fc3385dfdc0d` | VPay | 2026-11-07 00:39:16 | MYR 20.00 | `failed` | Missing | No | None | 0 | **B** — gateway HTTP 502; VPay HTTP 200 with provider code `-1` |
| `M7b72277825cb44e19be` | 1MPay | 2026-11-07 12:50:15 | MYR 10.00 | `unknown` | `pwLDn0m8P6KNJx8x46hba2CIh` | Yes | None | 0 | **B/C boundary, NOT VERIFIED** — provider transaction exists; payment completion and signed callback are unverified |

## Callback evidence

The audit table contains none of the durable callback/credit events expected by the deployed code:

- `1mpay_callback_verified`: 0
- `1mpay_deposit_credited`: 0
- `deposit_callback_review`: 0
- `deposit_credited`: 0
- `gspay_deposit_credited`: 0

For 1MPay order `M7b72277825cb44e19be`, the database has a provider transaction ID and checkout record but no signed callback event. If independent bank/provider evidence proves the customer paid this exact provider transaction, the operational failure point is **C: payment completed but callback not recorded**. Without that external evidence, payment completion remains **NOT VERIFIED**.

## Recovery and diagnostic evidence

- Four VPay orders have `payment_order_diagnostic` records with upstream provider code `-1`. The gateway received HTTP 200 from VPay but returned HTTP 502 because the provider rejected the business request.
- Seven unresolved VPay orders have recovery leases with 464–467 attempts and were moved to manual review evidence. None acquired a provider transaction reference.
- Three 1MPay MYR 20.00 orders were moved to review with reason `provider_reference_missing`.
- The 1MPay MYR 20.00 order `e9503bed-2e7c-402d-9419-e573fe4c25ca` has an `ORDER_RESPONSE` diagnostic with provider code `-1`, missing `providerTradeNo` and `checkoutUrl`.
- No GSPAY order exists in this database snapshot, so current-database evidence stops at **A: order not created**. A historical GSPAY case in another database would be **F / NOT VERIFIED** until that database is supplied.

## MYR 210 and old-version evidence

No MYR 210 deposit order exists in the live `.144` database snapshot. The snapshot contains only MYR 20.00 and MYR 10.00 deposit orders. A MYR 210 incident therefore remains **F: transaction may exist only in the old production version or another database — NOT VERIFIED**.

## Root-cause decision

| Area | Status | Evidence |
|---|---|---|
| Local order creation | **PASS for 12 stored orders** | `deposit_orders` contains 12 rows |
| Provider order completion | **FAIL for 11; NOT VERIFIED for 1** | Eleven rows lack both provider reference and checkout; one 1MPay row has both |
| Provider payment completion | **NOT VERIFIED** | No independent provider/bank settlement evidence is stored |
| Callback receipt | **NOT VERIFIED / no durable event** | No callback evidence event exists |
| Wallet credit | **FAIL** | `wallet_ledger` has 0 rows |
| Frontend balance update | **NOT APPLICABLE** | No wallet credit exists to display |

The historical chain did not reach wallet credit. For eleven orders it stopped before a usable provider transaction. For the single 1MPay provider transaction, it stopped before a verified callback and wallet entry. Current evidence does not support a wallet-credit implementation defect because the payment/callback prerequisites were never proven.

## Remaining evidence required

1. Provider or bank receipt for the exact transaction ID and amount.
2. Provider-side payment status and callback delivery log for the same order.
3. Old `.99` database/export for the missing MYR 210 or GSPAY incident.
4. One controlled acceptance transaction per provider after authentication and callback configuration are accepted.
