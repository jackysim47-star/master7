# MASTER7 staging handover

Updated: 2026-11-05 MYT

Live source: `a067d87e1797fdffb69496c008c001fdf215c28d` · Render deploy: `dep-dblo0c8ae00c73cfs5sg` · 2026-11-05 02:59 MYT.

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
