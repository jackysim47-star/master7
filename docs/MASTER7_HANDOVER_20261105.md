# MASTER7 staging handover

Updated: 2026-11-05 MYT

Last verified live before the member-gateway update: source `99256353be2fdc51e563307cb1ad7a764c8e3c2a` · Render deploy `dep-dblosiui0phs73fv3ql0` · 2026-11-05 05:05 UTC.



## Member gateway update and OTP investigation — 2026-11-05

- Candidate release: `17.0.0-selfbuilt.28-member-gateway`.
- Anonymous `/` redirects to `/signin`; game-lobby data is not loaded while signed out. Member registration and sign-in use ID, password, Malaysian phone and one-time SMS code; successful sign-in opens the lobby.
- Login/registration entry now uses the existing MASTER7 blue-and-gold emblem and a mobile-first branded layout. The customer page contains no backoffice or API terminology.
- The live Render `/api/auth/options` check returned `smsOtpReady:false`. Its request log for `POST /api/auth/otp/send` at `2026-11-05T05:05:59Z` shows HTTP 503 in 7 ms. The server exits before calling Anchor, so no SMS was submitted; this is not a handset/carrier delivery delay.
- Render requires `ANCHOR_SMS_API_BASE_URL`, `ANCHOR_SMS_USERNAME`, `ANCHOR_SMS_PASSWORD`, `ANCHOR_SMS_SENDER_ID`, and `OTP_HASH_SECRET` (at least 32 characters). No secret values are included in the source bundle.
- Candidate verification: 89 Node tests passed, 3 Render database adapter tests passed, `node --check` passed, and the Render production build passed. A 390×844 mobile preview was visually inspected.
- Candidate bundle SHA-256: `7aa7cde8df63c8eb11634792caa6ce324957dd465378594f55aa49fa898e615d`.
- Reviewable patch: `docs/patches/MASTER7_MEMBER_GATEWAY_20261105.patch`.

## Release candidate 17.0.0-selfbuilt.27-simple-access

- Customer front uses a compact casino-style login with MASTER7 ID, Malaysian mobile and SMS OTP only.
- Owner backoffice uses ID and password; the minimum new owner password is six characters and six-digit numeric passwords are accepted.
- Customer-facing game and payment copy no longer exposes API, UAT, preview or staging terminology. Unverified game launches and payment channels show Coming soon or Maintenance.
- The customer VPay form now requires a verified live mode and `realPayments:true`; UAT configuration is never presented as live customer checkout.
- `master7.best` is reserved for the customer front. `master7.site` is reserved for the new owner backoffice; it is active through 2027-11-04 and had zero DNS records when purchased.
- Full local suite: 88 passed, 0 failed, 0 skipped. JavaScript syntax and Render production build passed.
- Bundle SHA-256: `3108b6de7564a122df6b1f7c246ba5bac112e6b2581b7a37b1d287d4d2beddc0`.
- Reviewable diff: `docs/patches/MASTER7_SIMPLE_ACCESS_CASINO_COPY_20261105.patch`.

## Live build 17.0.0-selfbuilt.26-withdrawal-requests

- Customer lobby and owner backoffice now use two distinct screenshot-based layouts.
- Customer lobby: lively casino-style dark game-lobby shell, animated MASTER7 stage, gold/purple lighting, category navigation, three sponsored suppliers, 34 separate supplier buttons and supplier artwork.
- Backoffice: one left navigation column, nine operational cards, daily trend panel and every implemented management section listed from top to bottom.
- Customer access displays only MASTER7 ID, Malaysian mobile and SMS OTP. Owner backoffice continues to use ID and password.
- OTP challenges are five minutes, one-use, rate-limited and stored as keyed hashes. Registration never grants backoffice access.
- Provider and game identity remains `(provider ID, game ID)`; matching game codes from different providers are not merged.
- Current readable catalogues remain separate: MegaH5 166, JILI 297 and 918KISS H5 92 (555 total records at the last online check).
- The 34 supplier artwork files are local same-origin fallbacks. The owner can upload a separate JPG, PNG or WebP lobby image for each supplier from backoffice without changing its provider ID.
- The owner can publish up to 20 lobby advertisements. The front shows one rotating lead banner plus as many as six simultaneous advertising cards.
- MegaH5 and 918KISS title art use the bounded same-origin image proxy; JILI uses its supplier artwork when its catalogue has no title image.
- Four payment entries and their backoffice controls remain independent.

- Customer Withdraw now records one of four independent companies, a Malaysian bank, account holder, account number and MYR amount.
- Requests first alert the MASTER7 owner backoffice. The owner then processes payment manually in the selected provider backoffice and records Approved, Processing, Paid or Rejected.
- Pending amounts are reserved from available wallet balance; rejected requests release the reserve and paid requests reduce the wallet once.
- Bank details are encrypted at rest and customer history shows only the last four digits.

## Verification

- Full local suite: 87 passed, 0 failed, 0 skipped.
- Customer OTP-only registration/login regression tests pass.
- Owner password login, activation and recovery regressions pass.
- JavaScript syntax check passes.
- Render production build passes.
- Desktop and 390 px mobile layouts were visually inspected for customer lobby and nine-card backoffice.
- Bundle SHA-256: `aa15f9b78401e28dd88d9cd5eb2ed68cb1eda49dc26a7474cf0bcc514d5df867`.
- Reviewable diff: `docs/patches/MASTER7_WITHDRAWAL_REQUESTS_20261105.patch`.

## Exact remaining live dependencies

- Anchor OTP code is present, but the running Render service reports `smsOtpReady:false`; live SMS requires the configured Anchor server values.
- Supplier game launch and settlement are not implemented by the current catalogue-only gateway. Catalogue records and pictures do not prove playability.
- VPay is UAT only. GSPAY, 1MPAY and GSPAY+ do not yet have verified live order/callback/ledger flows in this bundle.
- `www.master7.best` and `admin.master7.best` still require a valid hosting project/domain binding before they can be handed over as working official URLs.
- Financial cards show `—` when no real ledger source is connected; they never present missing figures as RM0.
