# VPay QR entry and bank withdrawal names

The member Deposit entry, cashier title and submit button now identify VPay QR / DuitNow instead of an unnamed payment menu or numeric channel. English, Chinese and Malay labels describe the actual operation. The QR entry sends documented trade code 2, as used by the historical completed Staging QR payment, and becomes unavailable if that profile is missing rather than selecting a different method. Withdraw remains a separate VPay bank withdrawal entry with the existing manufacturer MONEY_OUT / MONEY_GET integration.

The supplier HTTPS gateway, merchant binding, credentials, callbacks, wallet logic and payout switches are unchanged. No payment, payout or callback replay was performed. The user will attempt QR deposit RM20 and then request RM20 withdrawal only after confirmed credit; neither transaction was started by this release.

Validation: 40 cashier tests passed; Render build passed; browser fixtures at 360, 390 and 1440 pixels show named QR controls, a hidden trade code, one records button and no overflow or page errors. The source archive preserves the baseline 858 members and changes exactly five files, documented in the adjacent patch.

Outstanding external evidence: the latest real Production order at 2026-11-18 07:19:32 UTC was rejected as vpay_ip_not_allowed with no checkout URL. The user's cashier screenshot is a Cloudflare block and does not establish a new successful Production order. Read-only balance and historical Staging order query succeeded. Merchant login requires a Google Authenticator code; no authenticated merchant session or supplier whitelist edit was completed. Production end-to-end payment and real payout remain unverified.
