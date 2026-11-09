# MASTER7 V17.134 deposit incident report

**Evidence time:** 2026-11-09 19:15:25 MYT  
**Release:** `17.0.0-selfbuilt.134-scheduler-leader`  
**Scope:** read-only transaction-consistent snapshot of the database used by the deployed application

## Confirmed result

- The database contains 12 deposit orders totaling MYR 230.
- Current state: 8 `unknown` totaling MYR 150, 3 `review` totaling MYR 60, and 1 `failed` totaling MYR 20.
- VPay has 8 orders totaling MYR 160. 1MPay has 4 orders totaling MYR 70.
- GSPAY and Manual Bank have no deposit orders in this snapshot.
- `wallet_ledger` contains zero rows. `wallet_posting_intents` contains zero rows. None of the 12 orders has wallet-credit evidence.
- Five orders totaling MYR 100 have a recorded provider order rejection. The existing MYR 10 1MPay transaction has a bound read-only provider query reporting `Fail`. These six orders stopped at provider order/payment status, before wallet credit.
- The remaining six orders totaling MYR 120 cannot be placed conclusively at provider payment, callback, or wallet credit from the preserved records alone.

## Change since the V17.127 investigation

Three 1MPay orders without a provider transaction reference were moved from `unknown` to `review` at 2026-11-09 13:59:47 MYT. Each has an idempotent `1mpay_recovery_review` audit event with reason `provider_reference_missing`. No wallet entry was created.

The MYR 10 1MPay order remains `unknown`; its earlier bound provider query reported `Fail`, and its wallet ledger remains empty.

## Provider findings

| Provider | Orders | Amount | Callback/settlement evidence | Wallet credit | Result |
|---|---:|---:|---|---|---|
| VPay | 8 | MYR 160 | Four order rejections; seven orders have recovery leases but no terminal successful result | 0 | NOT VERIFIED |
| GSPAY MYR | 0 | MYR 0 | No historical order to trace | 0 | NOT VERIFIED |
| 1MPay MYR | 4 | MYR 70 | Three missing-reference reviews; one bound query returned `Fail` | 0 | NOT VERIFIED |
| Manual Bank | 0 | MYR 0 | No submission, approval, or bank transaction | 0 | NOT VERIFIED |

VPay recovery leases show 432–435 claim cycles for seven orders, last checked at 2026-11-09 19:12:52 MYT. Those counters prove scheduled recovery activity only. They do not prove a payment, callback, successful provider query, or merchant settlement.

The V17.134 process logged `Payment recovery unavailable` at 2026-11-09 19:14:52 MYT while new-payment switches were closed. This is operational evidence that the current worker did not complete a provider recovery cycle; it is not a provider transaction result.

## Exact failure-node conclusion

1. **Six orders, MYR 110:** provider order/payment did not reach a successful verified state. Five have explicit provider order rejection diagnostics; the MYR 10 1MPay order has a bound provider query reporting `Fail`.
2. **Six orders, MYR 120:** unresolved between provider order/payment, callback, and wallet posting. No evidence supports selecting one of those nodes conclusively.
3. **Zero orders:** wallet credited but frontend stale. All wallet-ledger counts are zero.

The evidence does not support marking any historical order as paid and credited. It also does not prove that a customer's bank was never debited; that requires a bank receipt or merchant settlement statement matched to an order or provider transaction reference.

## Operational decision

- Existing orders and evidence remain preserved.
- No compensating credit, callback replay, reconstructed provider order, payment, payout, or production flag change was performed.
- New real-money acceptance must use one authorized minimum-value order per provider and retain Order → Provider Transaction → Callback/Query → Wallet Ledger → Merchant Settlement evidence.

Structured evidence: `MASTER7_V17_134_DEPOSIT_INCIDENT_EVIDENCE_20261109_MYT.json`.
