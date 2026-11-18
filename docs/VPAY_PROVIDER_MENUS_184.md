# Clear supplier menus and accurate VPay refusal diagnostics

Member Deposit and Withdraw views retain their own VPAY entries, now labelled by purpose. The VPay deposit action explicitly opens the provider payment menu; a plain hint describes the next step without resembling an unusable method selector. Unsupported providers stay out of the member choices, and selected VPay withdrawal forms cannot offer an unrelated payout provider or unsupported e-wallet method. A persistent records action removes duplicate records buttons.

The VPay gateway previously classified any mention of whitelist as a source-IP refusal. That was too broad: return URL, notification URL or domain authorization could be mislabeled as an IP problem. This release distinguishes explicit IP messages, return URLs, notify URLs, domains and unspecified allowlist refusals. The portal stores the exact fixed diagnostic category; it presents proven supplier configuration refusals as service unavailability. Historical vpay_ip_not_allowed records alone cannot establish the precise whitelist target. No historical audit records are rewritten.

The refusal remains a non-created order only when the supplier explicitly returned a nonzero code without a provider reference or payment URL. Ambiguous responses and callbacks that raced with create remain subject to the existing reconciliation rules. No wallet, ledger, reservation or settlement rules are relaxed.

Manufacturer contract review confirmed the official endpoint, trader_id 3647, UTF-8 JSON, Unix timestamp seconds, callback/return fields and the signature algorithm using an independent implementation with synthetic credentials. Gateway 168 and portal 236 focused tests passed; TypeScript, build and browser checks at 360/390/1440px passed. No real order, payment, payout or callback replay is used.

Runtime scope: Production portal and main payment gateway source only; no environment, supplier credential, Staging, UAT, DNS, game or payout switch changes. The V17 audit plugin supplied source-chain and reporting guidance; explicit operator authorization governs this separate implementation task. Its linked private Pages were not readable with the available connectors. Publication does not establish successful new Production payment acceptance.

Rollback: redeploy the recorded previous portal and gateway commits. No database migration is needed.
