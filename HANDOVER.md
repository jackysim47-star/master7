# Wallet deposit, withdrawal and company-bank handover — 5 November 2026

## GSPAY contract and business-setup safety — 6 November 2026

Candidate release: `17.0.0-selfbuilt.63-gspay-contract`.

- The user confirmed that GSPAY must remain an integration target and supplied
  the official MYR Payment, Get Payment and callback contract. The Portal calls
  the pinned official GSPAY origin directly behind disabled channel and order
  switches; no live order is sent by automated verification.
- The MYR flow uses a two-decimal amount, MD5 contract signatures, a two-minute
  cashier URL, independent Get Payment verification, ten-minute no-callback
  expiry, and balanced once-only wallet posting. DuitNow, USDT and Payout remain
  outside this candidate and disabled.
- The configured payment callback is
  `https://master7.best/api/payment/gspay/callback`. The apex currently responds
  with a 302 URL forward, which is unsafe for POST callbacks. It must become a
  direct Render custom domain or body-preserving reverse proxy before live use.
- The merchant Render egress IP is `74.220.52.132`. The supplier also supplied
  `52.221.96.227` as a server IP; its ownership/use must be confirmed before any
  optional source-IP enforcement. Authentication key, MD5 signature and an
  independent provider query remain mandatory.
- The last pasted Operator Authentication Key has only 31 hexadecimal
  characters. The exact 32-character value must be copied from the supplier
  backoffice before it is stored in Render. Secrets never enter source or docs.
- 1MPay contract mapping and exact lowercase `ok` callback ACK are implemented,
  while company-bank retry/image handling and benefit/advertising publication
  validation are hardened. Real bank, benefit and advertising content is not
  invented.
- Payment and game production switches remain off. Portal validation is 192/192
  tests, lint pass, Render DB 3/3 and production build pass. Commit, bundle
  checksum, deploy ID and live verification remain release-time evidence.

## Full-platform acceptance handover — 6 November 2026

Candidate release: `17.0.0-selfbuilt.59-full-platform-handover`.

- Added a canonical redirect from `/admin/admin` to `/admin`, preserving query
  parameters. This protects staff access when an external domain redirect
  appends `/admin` twice.
- Standardized financial and commission display timezone to `Asia/Kuching`
  (MYT, UTC+8).
- Added the received full-platform requirements baseline and the requested
  acceptance deliverables for F01–F28, games, payments, recovery and owner
  handover. The live deployment receipt is maintained in the repository after
  deployment.
- The game acceptance register contains 76 brand-directory records plus current
  integration-only providers. The payment register contains six stages for
  VPay, GSPAY and 1MPAY.
- The latest three-gateway handover is included. `PAYMENT_SOURCE_TRACE.md` maps
  each contract to its exact module, functions and offline tests: 1MPay
  deposit/order/query/callback behavior is implemented and tested, while
  GSPAY settlement remains fail-closed pending query and callback terms.
- Validation: 165/165 full tests, 3/3 Render database adapter tests and the
  Render production build passed.
- Payment ordering, wallet credit, game launch and game settlement remain
  fail-closed. This release does not move money, launch a production game,
  restore data into production or change provider credentials.

Release: `17.0.0-selfbuilt.58-payment-startup-guard`.

- VPay, GSPAY, 1MPAY and GSPAY+ now remain fail-closed during database startup.
  Legacy setup migrations can record configured programs but cannot turn a
  payment channel Active.
- A one-time acceptance guard snapshots the previous four channel rows, sets
  VPay and 1MPAY to Suspended, and sets GSPAY and GSPAY+ to Close. A later
  owner decision remains persistent because the guard is applied only once.
- The compact five-step payment checklist from `.57` remains unchanged.

Release: `17.0.0-selfbuilt.57-payment-checks`.

- The backoffice now shows one compact VPay / GSPAY / 1MPAY checklist with
  Connected, Order, Query, Callback and Wallet columns. Every result is a simple
  ✅ or ❌, with a slow cyan light on passed checks.
- The matrix reads each provider's real, secret-free status endpoint. It does
  not infer Wallet readiness from a configured credential or an Active display
  switch; Wallet requires verified settlement and live readiness.
- No money switch, callback settlement rule, member balance or provider
  credential is changed by this release.

Release: `17.0.0-selfbuilt.56-gspay-complete-program`.

- GSPAY MYR now has a complete, fail-closed portal program: member wallet entry,
  strict amount validation, idempotent order record, isolated gateway capability
  tokens, safe checkout redirect validation and backoffice deposit records.
- The integration gateway alone stores the supplier credential and calls the
  pinned supplier origin. The portal never stores or returns provider secrets.
- The previously cited supplier ticket does not belong to MASTER7 and has been
  removed from acceptance evidence. MASTER7's create success/failure envelope,
  query response wrapping, callback acknowledgement/retry rules and end-to-end
  wallet settlement are unconfirmed, so GSPAY orders, queries,
  callbacks and automatic wallet credit remain disabled.
- Backoffice Game checks now separates Connected, Catalog, Launch and Wallet
  into visible ✅/❌ columns. A cached catalogue can no longer be mistaken for a
  verified launch or wallet settlement.
- The 1MPAY supplier follow-up remains pending formal API, merchant activation,
  signed callback/query samples and end-to-end acceptance. Its money switch is
  unchanged and remains off.

Verification: 164 portal tests, 3 Render database tests, JavaScript syntax and
the Render production build pass locally. No real order, payment, payout, game
launch or wallet credit was created by this release.

Release: `17.0.0-selfbuilt.37-platform-advertising`.

- The member wallet now presents primary Deposit and Withdraw actions. Automated deposit choices are VPay, GSPAY and 1MPay; each remains gated by its independently verified production readiness.
- Company direct bank transfer is a separate flow. The owner manages receiving-bank details, members upload a receipt, staff receive a pending record and may approve or reject it. Approval posts a balanced, idempotent wallet ledger entry exactly once.
- Owner and staff can review company-bank requests and receipts. Only the owner can change the company receiving account. Exports include bank configuration and review metadata but exclude receipt image data.
- Manual receipt files accept only bounded PNG, JPEG or WebP data and are returned with private no-store and sandboxed response headers.
- Existing provider transaction records, daily reporting, member isolation, staff roles and wallet controls remain in place.
- All 12 test files passed, including API, authentication, migrations, game catalogues, 1MPay and startup readiness. The Render production build also passed.

Provider production readiness remains truthful: VPay is still reported by its gateway as UAT with payout disabled; GSPAY lacks the production operator authentication key and secret in the deployed gateway; 1MPay deposits are implemented, while automatic payout balance-routing requires the provider's documented balance/status contract and production acceptance. No production payment success is claimed by this release.

---

# Wallet deposit, withdrawal and company-bank handover — 5 November 2026

Release: `17.0.0-selfbuilt.36-supplier-controls`.

- The member wallet now presents primary Deposit and Withdraw actions. Automated deposit choices are VPay, GSPAY and 1MPay; each remains gated by its independently verified production readiness.
- Company direct bank transfer is a separate flow. The owner manages receiving-bank details, members upload a receipt, staff receive a pending record and may approve or reject it. Approval posts a balanced, idempotent wallet ledger entry exactly once.
- Owner and staff can review company-bank requests and receipts. Only the owner can change the company receiving account. Exports include bank configuration and review metadata but exclude receipt image data.
- Manual receipt files accept only bounded PNG, JPEG or WebP data and are returned with private no-store and sandboxed response headers.
- Existing provider transaction records, daily reporting, member isolation, staff roles and wallet controls remain in place.
- All 12 test files passed, including API, authentication, migrations, game catalogues, 1MPay and startup readiness. The Render production build also passed.

Provider production readiness remains truthful: VPay is still reported by its gateway as UAT with payout disabled; GSPAY lacks the production operator authentication key and secret in the deployed gateway; 1MPay deposits are implemented, while automatic payout balance-routing requires the provider's documented balance/status contract and production acceptance. No production payment success is claimed by this release.

---

# Wallet deposit, withdrawal and company-bank handover — 5 November 2026

Release: `17.0.0-selfbuilt.35-wallet-deposit-withdraw`.

- The member wallet now presents primary Deposit and Withdraw actions. Automated deposit choices are VPay, GSPAY and 1MPay; each remains gated by its independently verified production readiness.
- Company direct bank transfer is a separate flow. The owner manages receiving-bank details, members upload a receipt, staff receive a pending record and may approve or reject it. Approval posts a balanced, idempotent wallet ledger entry exactly once.
- Owner and staff can review company-bank requests and receipts. Only the owner can change the company receiving account. Exports include bank configuration and review metadata but exclude receipt image data.
- Manual receipt files accept only bounded PNG, JPEG or WebP data and are returned with private no-store and sandboxed response headers.
- Existing provider transaction records, daily reporting, member isolation, staff roles and wallet controls remain in place.
- Removed the per-title “Individual supplier game controls” panel and its sidebar entry at the owner’s request. Supplier synchronization, front-end catalogue display and game connection checks remain available.
- Each supplier card now has owner-controlled Active, Maintenance and Close states. The upload label specifies 800 × 600 px (4:3), JPG/PNG/WebP, maximum 350 KB. Closed suppliers are hidden from members and Maintenance suppliers remain visible but unavailable.
- Removed the separate 76-entry supplier brand directory from both member and backoffice pages. Platform advertising remains in the lobby advertisement manager with upload, display toggle, rotation and optional destination link.
- All 12 test files passed, including API, authentication, migrations, game catalogues, 1MPay and startup readiness. The Render production build also passed.

Provider production readiness remains truthful: VPay is still reported by its gateway as UAT with payout disabled; GSPAY lacks the production operator authentication key and secret in the deployed gateway; 1MPay deposits are implemented, while automatic payout balance-routing requires the provider's documented balance/status contract and production acceptance. No production payment success is claimed by this release.

---

# Read-only financial records update — 5 November 2026

Release: `17.0.0-selfbuilt.34-read-only-financial-records`.

- Member deposits and withdrawals remain initiated from the customer portal and linked to the member wallet by one platform order ID.
- The MASTER7 backoffice is a read-only record view for deposits and withdrawals. Owner/staff controls cannot manually credit a wallet or mark a withdrawal paid.
- Daily reporting now shows successful deposit member count, order count and MYR total, plus withdrawal member count, request count and MYR total in Malaysia time.
- Deposit rows include the member ID, selected provider, amount, status and timestamp. Withdrawal rows include the member, selected provider, bank, masked/account details for owner support, amount, status and timestamp.
- Wallet credits remain limited to independently verified provider callbacks/queries and balanced ledger entries. Provider backoffices remain the provider-side reconciliation source.
- All 128 regression checks and the Render production build passed.

---

# Additional catalogue and checkout response update — 5 November 2026

Release: `17.0.0-selfbuilt.33-additional-game-sync`.

- Added read-only catalogue adapters for the supplied Rectangle and godeezone1 protocols. Rectangle signs GET requests using the assigned API host, UTC date, empty-body SHA256 and documented hexadecimal HMAC. The other adapter obtains a server-side token, follows provider/game pagination and preserves provider-specific game IDs. No game launch, transfer or wager is invoked by these adapters.
- These two additional adapters issue requests from the portal application, separately from the existing integration gateway. Manufacturer allowlists must follow the actual requesting service; the gateway observation 74.220.52.132 cannot be substituted for the portal's observed IP or a full fixed range.
- A private authenticated loopback job refreshes persisted catalogues while the Node service is running. Refreshes are lease-controlled and only call documented catalogue GET endpoints. Public pages and reports never receive API keys or access tokens.
- VPay can validate partial creation replies by independently querying the order binding. Monetary JSON numbers must have exact two-decimal precision. Optional expiry metadata does not override the vendor cashier's expiry.
- 1MPay strictly parses bounded JSON bodies even if a provider labels JSON as text. HTML and malformed bodies remain rejected; cashier host and settlement verification remain enforced.
- Owner-only payment diagnostics persist controlled response codes, HTTP statuses and missing-field names. Raw provider bodies, credentials, bank details, signatures and checkout query strings are never recorded.
- Checkout UI retains the chosen VPay method and reuses the same request key while an attempt is pending. Credited records clear the completed attempt before the next deposit.
- 128 backend/authentication/cache/payment regression checks passed. Render TypeScript, production build, game checkmark browser and the payment idempotency browser passed after final UI corrections. All automated financial tests used simulated provider replies.

Live account operations performed by the owner's explicit request: one phone-verified test member registered and its login verified; the owner login ID/password was changed and verified. Credentials are held in separate private handover files and are not included here.

Production RM20 checkout attempts were made for VPay and 1MPay, with no bank authentication or payment execution. Both initial attempts returned awaiting_confirmation without a cashier URL. No successful payment or wallet credit is claimed by these attempts. Fresh diagnostics/retests and independent settlement confirmation are still required before declaring these flows complete.

---

# Game synchronization update — 5 November 2026

Release: `17.0.0-selfbuilt.32-game-sync`.

- Added the previously omitted EVO888H5 catalogue and its 150 titles to the customer lobby and owner controls. Supplier identities and game IDs remain separate; current readable catalogues total 705 titles.
- Seven existing gateway catalogue routes now synchronize through a persisted five-minute cache. Database leases prevent repeated concurrent supplier calls. Temporary errors preserve the last successful catalogue and display maintenance; successful empty replies replace it.
- Added owner/staff checkmark table for all 37 current supplier entries, separately showing catalogue sync, verified launch and verified wallet. Unimplemented/unverified flows remain incomplete; adding catalogue records does not declare a game playable.
- Added a protected Sync now action and automatic refresh while an authenticated user views the lobby/backoffice. Customer pages contain no supplier API error details.
- EVO cover images are proxied from the pinned official image host, with bounds and a supplier fallback. Existing per-title owner artwork and state controls are preserved.
- This release creates only a catalogue cache and an EVO provider entry. It changes no member balance, payment order, game transfer or wager.
- Validation: 115 full regression checks, followed by 37 targeted backend/cache/authorization checks after final adjustments; Render type check, production bundle build and a 390px Chromium flow with actual read-only supplier recordings. Browser shows 705 titles, 150 separate EVO cards and 37 checkmark rows, and confirms no wallet/order mutation.

Known latest catalogue blockers: EPICWIN and CLOTPLAY upstream 403; VENUS response-signature verification fails. They remain incomplete. Other suppliers without verified adapters are not represented as successfully connected.

---

# MASTER7 payment and registration handover — 5 November 2026

Release: `17.0.0-selfbuilt.31-1mpay-deposits`.
Deployment: Render ahbi, `master7-v17-staging`. The tracked `master7-v17-render-staging.tar.gz` is the deployed source. The unrelated standalone app at the repository root is not deployed by this service.

## Customer and owner entry

- Member: `https://master7.best` currently redirects to the deployed `/signin` page. Members sign in using ID and password. Malaysian SMS OTP is for registration only.
- Owner: `https://master7.site` currently redirects to `/admin`. Owner/staff use ID and password without SMS.
- Anchor uses its supplied non-token GET protocol over HTTPS, sender 66886. Credentials are configured only on the server. `smsOtpReady` confirms configuration, not successful delivery to every handset.
- This release does not reset an owner or member password and does not publish the separate staff/reward candidate. No account password is included in this document.

## VPay

- Deployed member checkout follows the backend enabled flag. The gateway and application order/callback tokens were paired; vendor credentials and query token were preserved.
- The member submits amount, method and payer name. Only the validated VPay cashier URL is shown.
- Signed vendor notifications are forwarded through the gateway; the application independently queries the provider before writing two balanced, idempotent ledger entries.
- `/payment/return` exists. Authenticated callback-configuration GET is read-only.
- The internal `uat` label remains in the existing adapter. It is not evidence that the supplier offers a sandbox. Actual bank payment and wallet settlement still require verification.

## 1MPay deposit integration

- Implements the supplied 1MPay API Specification 1.3 (23 June 2026), production API `https://api.1mpay.net`.
- Backend POST `/fundtransfer/json`: amount fixed to two decimals, unique refid, stable pseudonymous member customer, MYR, callback/return URLs and base64 of the raw SHA256 digest in the exact documented concatenation order.
- Callback: `https://master7-v17-staging.onrender.com/api/payment-callbacks/1mpay/payment`.
- Return: `https://master7-v17-staging.onrender.com/payment/return`.
- Callback token is validated, then GET `/transquery/{trxno}/{base64_token}` independently confirms the merchant, amount, reference, customer, provider transaction and token. The documented callback signature does not cover status, so callback status alone cannot credit a wallet.
- Initial failure/timeout can be followed by a later success, as required by the supplier. Duplicate notifications cannot add duplicate wallet credit. Failed database batches roll back. Inconsistent existing ledger entries are held for review.
- Member POST `/api/payments/1mpay/orders/query` reconciles only that member's own order. Closing a channel prevents new orders while outstanding signed payments can still settle.
- Health and payment-channel status now report configured deposit switches separately from settlement verification; enabling production checkout does not mark a bank payment verified.
- The existing member wallet and owner deposit list include both providers. Customer records display platform and provider reference numbers.
- The application talks directly to 1MPay. The separate game/payment gateway IP must not be substituted for this application's outbound IP. Private authenticated diagnostics reports an observed application IP; it does not guarantee a fixed IP or the full Render outbound range.
- `/payout` is not invoked by this integration. Provider bank/settlement settings were not changed. An unpaid checkout or API configuration is not proof of a completed bank deposit.

Server-only variables: ONE_MPAY_API_BASE_URL, ONE_MPAY_MERCHANT, ONE_MPAY_SECRET_KEY, ONE_MPAY_ORDERS_ENABLED, ONE_MPAY_CALLBACK_URL, ONE_MPAY_RETURN_URL, ONE_MPAY_DIAGNOSTICS_TOKEN. No secret values are in this archive.

## Financial schema and activation

PostgreSQL migration 0017 widens only the existing deposit provider constraint; it deletes no orders or ledger entries. The SQLite migration preserves and checks both tables with foreign-key enforcement enabled. The one-time 0018 startup activation opens 1MPay only when its server configuration is present. It does not reopen a channel that the owner closes after activation. Migration and state snapshot are committed atomically with startup initialization.

Deployment rollback does not reverse a database migration. The added provider constraint is backward compatible with existing VPay rows; do not restore the old VPay-only constraint after 1MPay orders exist.

## Verification and remaining limits

- 105 Node/SQLite/backend/auth/UI checks passed.
- Real Chromium at 390px tested VPay and 1MPay with simulated RM20 provider responses: checkout visibility, method selection, stable duplicate request key, order references, independent query credit, return page, disabled channels and no mobile overflow.
- Render-specific TypeScript check (`tsconfig.render.json`, ES2022 for the deployed Node runtime) and production bundle build passed. Financial tests contacted no external provider and moved no money.
- GSPAY/GSPAY+ are still closed. Recent Google Authenticator attempts were rejected; no further stale code is submitted. Exact create-order response and callback acknowledgement rules plus merchant API configuration remain unresolved. Backoffice login or a supplier screenshot must not be marked as live wallet settlement.
- Games remain catalogue-only; actual launch, transfer/seamless debit and credit, turnover settlement and automated benefits are not made operational by this payment release. Consult the individual game API report for supplier errors.
