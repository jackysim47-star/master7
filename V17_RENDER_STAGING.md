# MASTER7 V17 Render staging package

This branch carries the isolated SEVEN customer portal and shared backoffice for Render staging. It is not production and does not change either official domain or import legacy customer data.

Staging source bundle SHA-256: `c64d0f6630fac8e0824675e5741408de5865c51527f67aea8d99f12b3290b094`
Release: `17.0.0-selfbuilt.10`
Source archive is expanded by the Render build command into `.render-v17/`.

The package now includes backoffice-managed lobby ads (1200x360, rotating every five minutes), configurable benefit display rules, individually managed provider game cards and up to five separately displayed SEVEN mini-game cards (800x600 artwork). Malaysian member phone numbers are collected and normalized; account passwords require at least eight characters. Owner/staff sign-in remains ID and password at `/admin`.

Important staging limits: SMS OTP is not connected, so customer SMS verification is not complete. Provider games and platform mini-game cards are catalogue/display entries only and cannot launch or settle. Deposits, withdrawals, wallet changes and real-money play remain disabled. Do not connect production DNS or import legacy data based on this package.

The VPay wallet path is now mounted for isolated staging UAT: MYR deposit intents, idempotent order creation, a callback accepted only from the gateway peer, independent provider order-query before credit, and balanced double-entry ledger rows. The service reports VPay disabled unless isolated UAT configuration is complete; the explicit order switch defaults off. No provider order is created by build or health checks, and production mode is rejected. Synthetic tests cover disabled-by-default, query-before-credit, amount matching, and duplicate callback idempotency. SMS, withdrawals, provider authorization/real UAT, and production settlement remain unverified and disabled.
