# MASTER7 Payment Gateway Checks Release

Candidate release: `17.0.0-selfbuilt.58-payment-startup-guard`  
Bundle SHA-256: `40721727b2a9295f49b0f3ae024521f449ad70120ecd162b8ab64743ed27ff8e`

## Result

The owner backoffice Payment channels page shows VPay, GSPAY and 1MPAY in one
compact table. Each company has five independent checks:

1. Connected
2. Order
3. Query
4. Callback
5. Wallet

Each result is a simple ✅ or ❌. Passed checks use the requested slow cyan light.
The table remains compact and scrollable on phone screens.

## Truthful readiness rule

The table reads the existing secret-free status endpoint for each provider.
Wallet cannot become ✅ from a credential, configured program or display switch.
It requires both `settlementVerified: true` and `liveReady: true`.

No production-money switch is changed. Orders, callbacks, withdrawals,
settlement and automatic wallet credit remain closed until their provider and
end-to-end production acceptance are complete.

Legacy startup migrations now record configured VPay and 1MPAY programs without
turning either channel Active. A one-time database guard snapshots all four
payment controls and restores their fail-closed states.

## Verification

- Portal tests: 164 passed, 0 failed.
- Render database tests: 3 passed, 0 failed.
- Browser JavaScript syntax: passed.
- Render production build: passed.
- No real payment order, withdrawal or wallet credit was created.
