# MASTER7 `.67` Complete Release Receipt

Release: `17.0.0-selfbuilt.67-complete`  
Source commit: `1d47c35b462c2e1e04359e6c4a2280943aec0333`  
Bundle SHA-256: `55d6ca913b345ac3f2a2089b2611bada0da0dd71be814ceb4e3d31c414b6b4b0`  
Prepared: 2026-11-06 20:25 MYT

## Included

- Compact backoffice with one panel open at a time, cyan menu indicators and health-backed LIVE status.
- Supplier and individual-game Active / Maintenance / Close controls, 800×600 artwork guidance, automatic seven-category customer lobby and 12-game initial paging.
- Company-bank Deposit, receipt upload, staff Approve / Reject and idempotent balanced wallet posting.
- MYT daily close plus month, half-year and annual accounting views; scheduled company advertisements and announcements.
- Benefit and Turnover calculation preview, hidden unconfigured VIP offers, referral ownership, three-tier commission preview and durable blocked reward state.
- Ticket pagination, per-user unread state, new-message audio, consent proof, unsubscribe suppression, campaign image handling and resumable large contact import.
- VPay and ordinary MYR GSPAY recovery for existing orders, payment capability reporting, and fail-closed payout state. Recovery never creates a new order or submits a payout.
- Encrypted backup and isolated restore coverage for all 44 durable recovery tables. Three authentication/session tables remain intentionally excluded.
- Android download and iPhone PWA icons at 180, 192 and 512 pixels.

## Verification

| Check | Result |
|---|---|
| Portal tests | 227/227 pass |
| TypeScript | pass |
| ESLint | pass, 0 warnings |
| Render database adapter | 3/3 pass |
| Render production build | pass |
| Extracted release bundle install / DB test / build | pass |
| Security regression | 93/93 pass |
| UI requirement regression | 30/30 pass |
| Database and backup regression | 13/13 pass |

## Deployment policy

The package does not overwrite Render environment variables or reset existing connected services. Existing online connection settings are carried into the new deployment. Financial and game readiness continue to be reported from their real environment and database state; code configuration alone does not claim vendor settlement acceptance.

The first publication commit contains the reviewed release bundle. The final deploy ID, online time, health response and log verification are added after Render reports the deployment live.

