# GSPAY MYR contract evidence — 2026-11-05

This record was produced from the authorized MASTER7 GSPAY backoffice and the
deployed MASTER7 gateway. It contains no credentials and records no payment,
payout, settlement, or callback-setting change.

## Confirmed by the supplier documentation

- Provider API origin: `https://api.thegspay.com`
- Supplier server IP to whitelist: `52.221.96.227`
- Create payment: `POST /v2/integrations/operators/{operator_authentication_key}/payment`
- Create fields: `transaction_id`, `amount`, `player_username`, `signature`
- Create signature: MD5 of `transaction_id + player_username + amount(2dp) + operator_secret_key`
- Payment status: `GET /v2/integrations/operators/{operator_authentication_key}/getpayment`
- Status parameters: `auth_key`, `transaction_id`
- Status fields: `payment_id`, `transaction_id`, `player_username`, `amount`, `completed`, `success`, `remark`, `signature`
- Status signature: MD5 of `payment_id + amount(2dp) + transaction_id + operator_secret_key`
- Payment callback uses the same signed status fields and also carries `auth_key`.
- A generated payment URL expires after two minutes.

The documented MD5 examples are covered by local automated tests. The request
builders and status parser are offline helpers only; they cannot create a real
order or settle a member wallet.

## Confirmed account and infrastructure state

- The GSPAY backoffice API documentation instructs the operator to contact the
  supplier for an Operator Authentication Key and Operator Secret Key. It does
  not display the account's actual values.
- The successful Generate Payment Response example is visually blank.
- The documentation does not state the callback acknowledgement body, HTTP
  status, retry schedule, or idempotency rule.
- Saved payment callback: `https://master7.vip/api/payment/gspay/callback`
- Saved DuitNow callback: `https://master7.vip/api/payment/gspay/duitnow/callback`
- Saved GSPAY whitelist: `103.91.65.13`
- The saved payment callback returned HTTP 502 when checked.
- Current gateway callback: `https://master7-integration-gateway.onrender.com/callbacks/gspay/payment`
- Current gateway egress diagnostic returned `74.220.52.216` in five consecutive
  checks. This differs from both the saved whitelist and the previously supplied
  `74.220.52.132` address.
- The deployed gateway reports `configured: false`, all GSPAY switches off, and
  `liveReady: false`.

## Items the supplier must provide or confirm

1. Operator Authentication Key and Operator Secret Key through a secure channel.
2. Exact successful create-payment response JSON, including the payment URL field.
3. Exact callback acknowledgement body/status and retry/idempotency behavior.
4. Whitelist the actual stable MASTER7 gateway egress address or provide a
   supported alternative. The runtime diagnostic alone is not a guarantee of a
   permanently assigned address.
5. Confirm a production test procedure and acceptance evidence because this
   account has no sandbox.

Until these items are complete, changing the GSPAY backoffice callbacks would
send real notifications to a receiver that cannot safely acknowledge and settle
them. Therefore no callback or whitelist setting was changed.
