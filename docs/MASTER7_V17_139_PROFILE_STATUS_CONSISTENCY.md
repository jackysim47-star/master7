# MASTER7 V17.139 profile status consistency

Release `17.0.0-selfbuilt.139-profile-status-consistency` makes every payment
profile status response publish explicit boolean readiness for recovery, payout,
and provider balance capabilities.

The VPay MYR, GSPAY MYR, GSPAY USDT, and 1MPay MYR profiles now report a
definite `false` when a capability is closed instead of leaving the top-level
field absent. The values come from the existing fail-closed capability objects
and provider recovery controls; this release does not infer acceptance from
configuration.

The three 918KISS H5 profiles now use separate fixed catalogue accounts and
cache keys: normal MYR, MY1 1:100, and free MYR. Gateway responses must match
the expected provider, account, and currency before they can update a profile
snapshot. Selecting one profile can no longer borrow the normal catalogue or
overwrite another profile's snapshot. Catalogue entries remain unplayable
until the separate launch and wallet contracts pass acceptance.

This release does not change payment-provider requests, callback handling, wallet or
ledger writes, credentials, DNS, bank targets, payment records, game sessions,
Render capacity, or databases. It does not enable deposits, game launches,
payouts, real payments, live games, or `productionReady`.
