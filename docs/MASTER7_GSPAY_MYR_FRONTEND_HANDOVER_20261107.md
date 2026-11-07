# MASTER7 GSPAY+ MYR customer deposit handover

Date: 2026-11-07 MYT  
Scope: customer GSPAY+ MYR deposit, order status and wallet display.

## Customer flow

1. An approved member opens Wallet → Deposit, selects GSPAY+ and enters a MYR
   amount. A closed or maintenance channel rejects direct order requests as well
   as hiding the form.
2. One Continue action creates or recovers one idempotent platform order. The
   service binds member, tenant, currency, amount, platform reference and
   provider reference.
3. A provider checkout is accepted only when it is HTTPS on the exact
   `secured.gspay.online` host with the expected `/channel` path and bounded
   query fields. It opens in the current tab.
4. The member can read only their own records: pending, confirming, credited,
   failed or expired. Browser return parameters never settle an order.
5. A verified successful provider result commits the order and the two balanced
   wallet-ledger entries in one database transaction. Duplicate callbacks,
   queries and concurrent workers cannot credit twice.

Uncertain outcomes retain the original platform order and show **View deposit
records**. The interface uses the existing Chinese, English and Bahasa Melayu
translations and displays MYR amounts.

## Supplier contract boundary

- A successful create response has outer `code: 200`, `message: ok` and a JSON
  string in `data` containing `payment_id` and `payment_url`.
- A successful create proves only that a payment page was created. It does not
  prove payment or wallet settlement.
- Merchant credentials, signatures, callback payloads and original provider
  responses remain server-side and are not written into this document.
- Public provider callbacks and internal gateway-to-portal callbacks are
  different routes and must not be substituted for one another.
- DuitNow, USDT and payout require their own acceptance and remain disabled.

## Production acceptance

- Maintenance blocks both the form and a direct order POST.
- A mobile test creates one order and opens its validated checkout.
- Repeated clicks and network recovery reuse the same platform order.
- Return navigation reads the server order; it never credits from browser data.
- Callback signature, merchant/order/member/amount binding and an independent
  successful query are verified.
- Duplicate notification and concurrent processing create exactly one balanced
  wallet settlement.
- Supplier order, MASTER7 order, wallet ledger and accounting record reconcile.
- Rollback is recorded and production order creation stays closed until the
  owner explicitly enables it after acceptance.

Supplier confirmation is still required for the final query-success response,
callback acknowledgement body and HTTP status, callback retry rules and the
public callback/return domain. Production GSPAY+ MYR remains in maintenance.
