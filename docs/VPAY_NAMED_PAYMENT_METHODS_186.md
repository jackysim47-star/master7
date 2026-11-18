# VPay payment method names

The VPay deposit form offers enabled methods using the supplier documentation names, including DUITNOW, P2P Online Banking and DYNAMIC DUITNOW. Internal numeric trade codes remain request values; customers see the original supplier names. The selected method is submitted without replacing it with another method. An unavailable selection requires another explicit selection.

The same VPay order adapter, validated checkout URL, query, callbacks, wallet, ledger, withdrawal configuration and business switches are retained. Only the deposit UI, release/cache identifiers and regression tests changed inside the deployment archive.

Validation: 55 affected engineering tests passed; the new method-selection checks fail against release 185; browser checks at 360, 390 and 1440 px passed without overflow or page errors; production build passed. No real payment or withdrawal was submitted.

The previous Production VPay create refusal remains an operational limitation. This UI release does not establish successful real-money UAT or enable withdrawals.
