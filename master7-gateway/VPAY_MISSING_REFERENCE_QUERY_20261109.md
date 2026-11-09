# VPay missing-reference order query

Gateway 1.13.3 corrects a portal/gateway contract mismatch. The portal's recovery path can query a stored merchant order with no provider reference, while the gateway previously rejected this request with HTTP 400 before calling VPay.

The query-only peer now uses the same merchant-order-only ORDER_GET shape already supported by the gateway admin query. A supplied tradeNo remains validated and forwarded; empty, null, malformed or oversized supplied references still fail before supplier access. The merchant order ID remains mandatory and bound to the configured merchant's signed request.

No order-create, withdrawal, balance or admin scope is granted. No payment, wallet credit or successful recovery is inferred from this change. Portal callers still validate supplier reference, merchant, original order, currency and amount before treating any query as evidence or posting funds.

The current official documentation URL could not be retrieved in this run. This repair reuses the existing ORDER_GET implementation, and the actual upstream response is recorded separately as production evidence. Tests use synthetic supplier replies and do not prove real payment success.

Gateway 1.13.4 adds a fixed error class for recognized signature, credential and missing-order query rejections. Arbitrary supplier messages are not used as an error classification. The archived 2026-11-08 official ORDER_GET table lists action, trader_id, out_trade_no and sign as required fields; trade_no appears in its example. The live documentation fetch remains unavailable.
