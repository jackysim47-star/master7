# Direct VPay entry and resilient management sign-in

The operator requested a direct login → amount/channel → VPay flow. Existing manual identity/risk review enforcement blocked new orders before the provider API. Production now explicitly disables that optional policy with `PORTAL_MANUAL_COMPLIANCE_ENFORCED=false`. Session metadata exposes the policy so the member verification menu is hidden consistently; existing review records and decisions are preserved. Login, CSRF, responsible-play limits, signature/amount binding, wallet reconciliation and idempotency remain enforced. No payout or game launch switch is enabled.

On dedicated sign-in pages, dismissing the login dialog could leave only the background. The entry dialog now remains present on Escape/back cancellation or its close control; management sign-in is shown immediately while the session request loads. Ordinary dialogs can still close normally.

Validation: 120 focused auth, review, routing, VPay and environment checks passed; TypeScript and Render build passed; 390px and 1440px browser checks passed for visible entry, dismissal protection, ordinary dialog closing and hidden review navigation. No real order, payment or payout was initiated.

Publication receipts record the actual commit, deploy and runtime policy. Only the Production policy variable changes; gateway, Staging and UAT configuration stay unchanged. Roll back to the previous recorded commit and restore the policy variable only if the operator requests restoring manual review.
