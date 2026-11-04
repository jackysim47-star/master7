# MASTER7 staging handover

Updated: 2026-11-05 MYT

## Delivered in candidate 17.0.0-selfbuilt.24-reference-dashboard-otp

- Customer lobby and owner backoffice now use two distinct screenshot-based layouts.
- Customer lobby: dark game-lobby shell, category navigation, three sponsored suppliers, 34 separate supplier buttons and supplier artwork.
- Backoffice: one left navigation column, nine operational cards, daily trend panel and every implemented management section listed from top to bottom.
- Customer access displays only MASTER7 ID, Malaysian mobile and SMS OTP. Owner backoffice continues to use ID and password.
- OTP challenges are five minutes, one-use, rate-limited and stored as keyed hashes. Registration never grants backoffice access.
- Provider and game identity remains `(provider ID, game ID)`; matching game codes from different providers are not merged.
- Current readable catalogues remain separate: MegaH5 166, JILI 297 and 918KISS H5 92 (555 total records at the last online check).
- The 34 supplier artwork files are local same-origin assets. MegaH5 and 918KISS title art use the bounded same-origin image proxy; JILI uses its supplier artwork when its catalogue has no title image.
- Four payment entries and their backoffice controls remain independent.

## Verification

- Full local suite: 83 passed, 0 failed, 0 skipped.
- Customer OTP-only registration/login regression tests pass.
- Owner password login, activation and recovery regressions pass.
- JavaScript syntax check passes.
- Render production build passes.
- Desktop and 390 px mobile layouts were visually inspected for customer lobby and nine-card backoffice.
- Bundle SHA-256: `14fd84b867275d5932ee953dd6274b990fd1b574881b60be37d5900d8a984086`.
- Reviewable diff: `docs/patches/MASTER7_REFERENCE_DASHBOARD_OTP_20261104.patch`.

## Exact remaining live dependencies

- Anchor OTP code is present, but the running Render service reports `smsOtpReady:false`; live SMS requires the configured Anchor server values.
- Supplier game launch and settlement are not implemented by the current catalogue-only gateway. Catalogue records and pictures do not prove playability.
- VPay is UAT only. GSPAY, 1MPAY and GSPAY+ do not yet have verified live order/callback/ledger flows in this bundle.
- `www.master7.best` and `admin.master7.best` still require a valid hosting project/domain binding before they can be handed over as working official URLs.
- Financial cards show `—` when no real ledger source is connected; they never present missing figures as RM0.
