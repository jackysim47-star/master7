# VPay cashier availability refresh

This fix is based on the production release 174 source. It updates the open cashier's availability and asset cache version; it does not roll out the separate member-services feature branch.

Previously, an unavailable VPay dialog kept its status until the customer explicitly retried or reopened it. Enabling the provider in the backoffice did not refresh an already-open dialog.

An open, unavailable VPay cashier now refreshes the existing read-only status endpoint at most once every ten seconds. It also rechecks when the page becomes visible or regains focus. Ready forms, hidden pages, closed dialogs, pending submissions, unapproved accounts and responsible-play restrictions do not trigger background refresh. Requests stay serialized, late responses remain member-scoped, and the existing draft and request key are preserved. Refreshing never submits an order or navigates to checkout.

The release marker, service-worker cache and versioned asset URLs are updated together so a fresh page loads the corrected client.

Validation: 44 focused cashier, deposit-state and SQL-compatibility tests passed, including paused-to-enabled refresh, retained drafts and request keys, closed/hidden/submitting guards and late account-switch responses. JavaScript syntax checks passed. No live payment, callback replay or withdrawal is used for this fix. Payment configuration, balances, ledger, identity review and payout switches are unchanged.
