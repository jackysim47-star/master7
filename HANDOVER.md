# Wallet deposit, withdrawal and company-bank handover — 5 November 2026

## Payout safety and support release — 6 November 2026

Live release: `17.0.0-selfbuilt.69-payout-safe-support`.

- Source commit `8238cca41d7915ca1fded90e9637105f50fcae60`; bundle SHA-256
  `a54219780d233cdd2ee2a11add887c820b20ff34e8888d7efd66d6d58ab12121`.
- Complete Portal tests 238/238, GSPAY payout tests 7/7, TypeScript, lint,
  Render DB 3/3, production build and extracted-package build pass.
- GSPAY payout is implemented fail-closed with atomic submission, encrypted
  bank details, signed callback validation and independent status checks. It
  stays unavailable until every production prerequisite is verified.
- The member support inbox has a built-in bilingual reply assistant while
  preserving staff review and close controls.
- Existing connected Deposit and game settings are preserved. Deployment
  evidence is recorded in `docs/MASTER7_PAYOUT_SUPPORT_RELEASE_20261106.md`.
- Publication commit `01d36683a0fe2b6fca162321e8aa85e9dac1bce2` and Render
  deploy `dep-dbmt6jmc6qcc73cghapg` are live. Health is HTTP 200 with the
  database ready; the new instance has no application errors or request 5xx.

## Connected services release — 6 November 2026

Live release: `17.0.0-selfbuilt.68-connected`.

- Source commit `23f6f6d26a3f1b91d79b16c43c85899945ea1e41`; bundle SHA-256
  `08030fde94a8e0813d94d08b79387aeac330c8f7a1a79811926fc7452aa72cc0`.
- Complete Portal tests 229/229, TypeScript, lint, Render DB 3/3 and production
  build pass.
- A strictly validated production Deposit connection is activated once when
  its own environment switch is explicitly enabled. Later backoffice status
  changes are preserved across restarts. Payout is not changed.
- Publication commit `49c5afb909c9fae58bdabdb32ec9dde01292aea1` and Render
  deploy `dep-dbmsjuuc6qcc73cf2710` are live. Health is HTTP 200 with the
  database ready; the new instance has no application errors or request 5xx.

## Complete integrated release — 6 November 2026

Release candidate: `17.0.0-selfbuilt.67-complete`.

- Source commit `1d47c35b462c2e1e04359e6c4a2280943aec0333`; bundle SHA-256
  `55d6ca913b345ac3f2a2089b2611bada0da0dd71be814ceb4e3d31c414b6b4b0`.
- Portal tests 227/227, TypeScript, lint, Render DB 3/3, production build and
  extracted-package build all pass.
- The release integrates game controls and classification, automatic MYT
  accounting, scheduled company content, encrypted backup/restore, reward and
  referral state, support/marketing, payment capabilities and existing-order
  recovery.
- Render environment values are not replaced. Services that are already
  connected keep their current online settings during deployment.
- Deployment evidence is recorded in
  `docs/MASTER7_COMPLETE_RELEASE_20261106.md` after the manual Render deploy.

## Operations corrections release — 6 November 2026

Release: `17.0.0-selfbuilt.66-operations-corrections`.

- Benefit calculations now treat a fixed turnover value of zero as unset and
  use the configured turnover multiplier. Members below the minimum deposit
  receive zero reward and zero turnover in both the API and browser preview.
- The backoffice bell counts open support tickets and opens the Support panel
  directly. It no longer mixes pending-member approvals into the ticket count
  or sends the operator to AI settings.
- The member Referral card labels its current figure as an all-time L1 gross
  estimate and explicitly states that it is not withdrawable. Commission
  period, hold, cap and wallet settlement remain separate and disabled until
  real business acceptance is complete.
- Release validation is 202/202 Portal tests, TypeScript pass, lint pass,
  Render DB 3/3 and production build pass. Runtime commit
  `7cd1c0bc7cd4f364b73770b01f864abfbe1c07fc`, bundle SHA-256
  `bfdfcb22549911ca996b25b84617b4064cb9da2c425c3644c06b497f4e5b4285`
  and Render deploy `dep-dbmrhjbbc2fs73aompu0` are live.
- Post-deploy health is HTTP 200 with `.66` and the database ready. New-instance
  application error/critical/fatal and request 5xx counts are zero.
- This release does not change any payment, game, payout, callback or wallet
  production switch. `.65-payment-safety` remains the rollback release.

## Payment safety release — 6 November 2026

Release: `17.0.0-selfbuilt.65-payment-safety`.

- VPay callback settlement now proves that both wallet-ledger entries belong to
  the order member, use the order currency and amount, and balance to zero.
  Missing, partial, unbalanced or cross-member ledgers move the order to
  `review`; they are not queried, posted or acknowledged as successful.
- VPay financial inserts are bound to the database order, provider, state and
  provider transaction. A committed order and its ledger are checked again
  before a success acknowledgement is returned.
- 1MPay can continue querying and reconciling already-created orders while the
  new-order channel remains closed. This does not enable a new order, callback
  or automatic settlement switch.
- The AI support response type no longer contains a duplicate `status` field,
  and the Render environment declaration now includes the existing GSPAY
  variables. Neither change configures an AI provider or a payment secret.
- Release validation is 199/199 Portal tests, TypeScript pass, affected-file
  lint pass, Render DB 3/3 and production build pass. No real order, callback,
  payout, game transfer or wallet movement was created by this validation.
- Runtime commit `6b432399eabf09b22e6a309e4a547c700515cfbc`, bundle
  SHA-256 `2af1922f4018a4213e38fad7d5ab101188a183dbdd605f530d017e1ee70b4026`
  and Render deploy `dep-dbmr15s9v7es73ahfaf0` are live. Post-deploy health
  returns `.65` with the database ready; every real-payment/new-order switch
  remains off. `.64` remains the recorded rollback release.

## Full game audit and trusted control coverage — 6 November 2026

Release: `17.0.0-selfbuilt.64-game-controls`.

- The live catalogue audit found 766 unique games with complete names, codes
  and image URLs. MegaH5, JILI, 918KISS H5 and Rectangle returned current
  catalogues. EVO888H5 retained a stale maintenance cache; EPICWIN, Venus,
  ClotPlay and GodeeZone returned no current catalogue.
- Rectangle and GodeeZone now use the same fixed trusted provider allowlist as
  the seven gateway catalogues for per-game status and artwork controls.
  Unknown provider IDs remain rejected.
- MegaH5 is the only supplier with a launch and transfer-wallet adapter. The
  gateway transfer and transfer-status configuration switches are persistent;
  the Portal switch is controlled separately. Other suppliers remain catalogue
  entries until their launch and wallet contracts are implemented.
- Catalogue connection is not recorded as production launch, wallet, exit or
  settlement acceptance. Those checks require an approved member session and
  one controlled end-to-end provider transaction.
- Portal deploy `dep-dbmqj56tlv9c73bo3u6g` and gateway code deploy
  `dep-dbmqqqtg1s2s73d9msq0` (`7f65d6a`) are live. Portal and gateway MegaH5 transfer
  switches remain enabled in persistent Render environment configuration.
- Gateway `7f65d6a` adds a stable service User-Agent to EPICWIN and ClotPlay
  catalogue calls and stops caching HTTP-200 business rejections from EVO and
  MegaH5. Gateway regression is 85/85. Post-deploy production probes still
  show EVO `code 130`, EPICWIN/ClotPlay 403, Venus missing `X-Sign`/`X-Ts`,
  and GodeeZone `/token` Cloudflare 403. These remain supplier blockers.
- Suppliers must allow the complete Render Singapore outbound ranges
  `74.220.52.0/24` and `74.220.60.0/24`; a single observed egress address is
  not a stable allowlist contract.

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

Known latest catalogue blockers after gateway deploy `dep-dbmqqqtg1s2s73d9msq0`: EVO returns HTTP 200 with business `code 130` for its IP allowlist; EPICWIN and CLOTPLAY remain upstream 403 from the production Render source; VENUS returns `Code: 0` without the documented `X-Sign`/`X-Ts`; GodeeZone is blocked by Cloudflare HTML 403 on the first `/token` request. They remain incomplete. Other suppliers without verified adapters are not represented as successfully connected.

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
