# Separate Deposit and Withdraw entries with VPay hosted checkout

The member portal now has separate Deposit and Withdraw tabs. Deposit retains its VPAY entry; Withdraw adds a VPAY entry that opens the existing withdrawal form. A disabled payout provider stays disabled and cannot silently switch to another provider.

The operator requested VPay's own payment menu, rather than an extra menu in MASTER7. The cashier now collects amount/payer details and opens the exact provider-returned checkout URL. Channel-number and AUTO choices are removed from the customer form. The existing DuitNow profile (trade code 2, used by the successful historical Staging QR order) is preferred when configured; documented hosted profiles 7/1 are fallback configuration choices only, never retries after a rejection. No new code 0/AUTO channel is invented.

Read-only diagnosis found four recent Production orders rejected by VPay with provider code -1 and the sanitized reason vpay_ip_not_allowed. None had a provider order reference or checkout URL. The main Render payment gateway's official outbound IP API reports shared Singapore ranges 74.220.52.0/24 and 74.220.60.0/24. VPay must allow the actual caller's ranges on the merchant API allowlist. This is distinct from the vendor's callback server addresses; the portal does not change vendor configuration or forge allowlist headers.

Validation: 81 distinct focused cashier/withdrawal/review UI checks passed; TypeScript and Render build passed. Browser fixtures at 360px, 390px and 1440px verified both entries, VPAY buttons, hidden channel choice, original checkout delegation, disabled payout handling and no unintended provider substitution. No new real order, payment or payout was initiated.

Scope: Production portal source only. Gateway, Staging, UAT and runtime configuration are preserved. Manual review enforcement remains off per the operator's previous instruction; payout and game-launch switches remain off. UI deployment does not establish supplier allowlist completion or Production payment settlement acceptance.
