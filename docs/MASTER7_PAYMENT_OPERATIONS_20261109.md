# MASTER7 .129 — Payment operations evidence

Release: `17.0.0-selfbuilt.129-payment-operations`.

The incident-only operations endpoint reports whether catalogue synchronization, accounting close and existing-payment recovery have their runtime credentials and provider flags configured. It returns booleans and intervals, never credentials, and does not claim a timer actually executed. It uses the same separate expiring incident authorization and rejects unauthenticated access before any database query.

VPay query observations now accept a missing merchant ID in the documented legacy response shape, matching the existing settlement parser. An explicit different merchant still fails validation. The query is signed by the gateway for its configured merchant; original platform ID, provider reference, MYR amount and explicit currency remain checked.

The portal accepts only fixed gateway error classes for invalid signatures, invalid credentials, missing orders and other query rejections. Raw supplier error messages, signing material and banking fields are not exported. These classifications describe observed rejection, not a successful payment or an automatic wallet repair.

Gateway 1.13.4 adds those fixed error classes to the existing query response. Archived official VPay documentation read from the 2026-11-08 cache lists ORDER_GET required fields as action, trader_id, out_trade_no and sign; trade_no appears in an example. The live documentation fetch failed this run. The prior gateway fix reuses the existing admin ORDER_GET request shape instead of creating a transaction.

New money creation, game launches and payout submissions are separate controls. Configuring recovery processes existing orders only; any actual configuration and execution evidence must be recorded separately from code delivery and synthetic tests.
