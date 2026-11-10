# MASTER7 payment runtime evidence — 2026-11-10

Audit scope: read-only production-related evidence for VPay MYR, GSPAY MYR and
1MPay MYR. No order was created, no callback was replayed, no wallet or ledger
was changed, and no production switch or secret was modified.

## Current runtime

| Service | Live release / commit | Runtime state |
|---|---|---|
| Portal | `17.0.0-selfbuilt.144-sponsor-withdrawal-lobby` / `3bc2e6c5bd2915eb973b7c0b8f79d81c9d633430` | health `ok`, database `ready` |
| Integration gateway | `1.13.4` / `04b716b119ebd39a9788b35315597bd735152c56` | process healthy, mode `uat`, `productionQa=not_verified`, `liveReady=false` |

The three portal status endpoints report configuration, callback, query and
recovery readiness. All three report `orderReady=false` with
`profile_orders_disabled`. This is a deliberate channel pause and is separate
from each provider's historical failure evidence.

Gateway provider status reports VPay and GSPAY as configured. VPay payment and
withdrawal configuration are complete but production QA is not verified.
GSPAY transaction routes are active, but its paid-settlement acceptance remains
unconfirmed.

## Public callback routes

| Provider | Public supplier route | Portal destination | Read-only route observation |
|---|---|---|---|
| VPay | `https://master7-integration-gateway.onrender.com/callbacks/vpay/payment` | `/api/payment-callbacks/vpay/payment` | gateway discovery `200`; direct portal discovery `401`, consistent with protected gateway forwarding |
| GSPAY | `https://master7-integration-gateway.onrender.com/callbacks/gspay/payment` | `/api/payment-callbacks/gspay/payment` | gateway discovery `200`; portal discovery `200` |
| 1MPay | direct portal callback | `/api/payment-callbacks/1mpay/payment` | GET `404` is expected because this callback is POST-only; status reports callback program ready |

Route reachability does not prove a paid callback or wallet credit.

## Seven-day request evidence

Only route, method, HTTP status and timestamp metadata were inspected. No
credential, callback payload or customer identifier was exported.

### VPay MYR

| Evidence | Observation |
|---|---|
| Portal new order | 8 × `202`, 3 × `401`, 3 × `403`, 8 × `409` |
| Portal order query | 1 × `202` |
| Gateway order query | at least 100 × `502` between 2026-11-09 11:49 and 12:17 UTC; log page had additional results |
| Captured provider query | two read-only runs, 8/8 stored orders each; upstream HTTP `200`, provider code `-1`, gateway class `vpay_invalid_signature` |
| Wallet action in captured runs | `paymentVerified=false`, `walletCreditExecuted=false`, `repairsExecuted=false` |

**Failure node:** stored order → gateway `ORDER_GET` → VPay signature validation
fails. Payment cannot be verified, so callback acceptance and wallet credit
cannot be established. The evidence cannot distinguish a stale/inactive API
key from a different provider-side `ORDER_GET` signing or timestamp contract.

### GSPAY MYR

| Evidence | Observation |
|---|---|
| Portal new order | 2 × `401` |
| Gateway order | 1 × `401` |
| Portal payment callback POST | 1 × `401`, 1 × `503` |
| Portal payment callback GET | 1 × `200`, discovery only |
| Portal order query | no request observed |

**Failure node:** authenticated order creation / callback verification. No
accepted order-payment-callback chain and no wallet-credit evidence exists in
the inspected logs.

### 1MPay MYR

| Evidence | Observation |
|---|---|
| Portal new order | 1 × `201`, 6 × `202`, 3 × `401`, 1 × `403`, 2 × `409` |
| Portal order query | 5 × `200` |
| Portal payment callback POST | 3 × `200`, 3 × `401`, 1 × `404` |
| Callback GET probes | 5 × `404`, expected for a POST-only route |

The HTTP metadata alone cannot establish which database or order produced the
three `200` responses. A fresh encrypted `.144` transaction snapshot provides
the stronger durable evidence: it contains four 1MPay orders, zero wallet-ledger
rows and zero dedicated callback/credit audit events. One MYR 10 order has a
provider transaction reference, but its bound provider query result is `Fail`;
the other three orders have no provider transaction reference. The `200`
responses are therefore unmatched transport evidence and do not prove a wallet
credit in the current database.

**Failure node:** three orders stopped before a usable provider transaction.
The referenced MYR 10 order reached the provider transaction/query boundary,
but payment success and callback delivery are not verified. If an external
receipt proves that payment completed, its stop node becomes payment completed
without a durable callback.

## Render configuration history evidence

For the event windows returned by Render:

- Portal: 21 deploy-start events from 2026-11-09 10:19 UTC through the live
  `.144` deploy; all recorded `envUpdated=false`.
- Gateway: 25 deploy-start events from 2026-11-07 08:37 UTC through the current
  `1.13.4` deploy; all recorded `envUpdated=false`.

This history does not expose secret values and cannot prove which credential is
stored. It provides no durable event evidence that the newly generated VPay API
key was applied before the captured signature failures.

## Decision

| Provider | Current decision | Exact next evidence required |
|---|---|---|
| VPay MYR | **FAIL** for the captured read-only query; production acceptance pending | provider-confirmed active key/signing/timestamp/merchant/allowlist, followed by a successful read-only bound query |
| GSPAY MYR | **NOT VERIFIED** | authenticated order and query contract, then one separately authorized paid callback-to-ledger acceptance run |
| 1MPay MYR | **NOT VERIFIED** | provider export or callback containing `refid`, `trxno`, amount and final status, followed by order-bound callback and balanced-ledger evidence |

The hosted Render query tool is blocked by the database's empty external IP
allowlist. The independently decrypted encrypted production snapshot supplied
the order and ledger evidence summarized above without opening database network
access. Customer orders must remain paused until the provider-specific evidence
above is complete.
