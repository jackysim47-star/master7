# MASTER7 API automatic deployment — 8 November 2026

## Authorized outcome

Keep original supplier brands and customer buttons. Approved members initiate deposits and games from the frontend; the server follows existing supplier contracts and records the result. Backoffice availability is read-only. Remove extra manual Active / Maintenance / Close gates and deliver complete MYT deposit reporting. Do not change vendor API addresses, signing rules, callback formats or business success criteria.

## Exact verified package

- Release: `17.0.0-selfbuilt.96-api-automatic`
- Production baseline: `e3faa8ddc6b6fe87768e9e71f466ce48538bfad7`
- Reviewed source commit: `8bee8877f8b7c7db05236678c95b3de92f58ea4f`
- Candidate archive retention commit: `1a4b8b4a117b3e4c6a31acbeefbf6d6154a431c9`
- Actions: https://github.com/jackysim47-star/master7/actions/runs/42447333367
- Archive: `master7-v17-render-staging.tar.gz`, 3663047 bytes
- Archive SHA-256: `734c7082dd1f76bc7b33d467c46832e605b6bdd3631ebbbc7c40cb3c79504026`
- Archive Git blob: `a7904c0c50767a4139de102faf645571111bd439`
- Source files: 490; every reconstructed file matches the reviewed local source.
- Complete validation: 488 tests in 82 files; 0 failed, skipped, cancelled or todo.
- Actual Render build passed; hosted identity boundary included; no production credentials; isolated network namespace; 0 external network attempts.
- Dependencies unchanged: 889 locked packages, Node 24.22.1, pnpm 11.25.0.

## Production change

Fast-forward only `codex/v17-render-staging-20261104` from the exact baseline. Replace the source archive, retain its CI receipt and add this review. Then manually deploy Render service `srv-dbl0iv7f3r2c73848ei0`, whose automatic deploy setting is off. Keep existing build/start commands, database and environment settings. Do not redeploy the separate integration gateway.

The package includes previous .95 repairs plus API-based deposit and game capability, deprecated manual availability write routes, preserved brand buttons, truthful acceptance fields and paginated MYT deposit reporting. Legacy stored controls remain as historical data. Original authentication, approvals, Origin/CSRF, responsible-play, payment verification, amount/currency checks, wallet reservations, idempotency and recovery continue.

No new schema migration is included. Normal existing startup initialization and already configured background recovery jobs may operate after restart. No real test order, payout, game session or wallet transfer is authorized or initiated by this deployment procedure.

## What this deployment does not attest

Configuration and adapter readiness are distinct from successful real-money settlement. `verified` fields are not forced true. Current source contains eight catalogue adapters and one complete Portal game launch/wallet adapter (MegaH5); all 34 brand entries remain. Other vendors require their matching implementation, valid configuration and resolution of real upstream errors. Existing provider documents and supplied credentials are not presumed missing merely because no adapter exists.

## Verification and rollback

After Render reports this exact commit live, verify the actual .96 release, public payment statuses and game directory/selected-provider capability. Check that unauthenticated visitors cannot access private deposit reports. Verify customer/staff entry pages and that returned frontend assets contain no manual availability controls.

If startup or the application is materially broken, restore the source archive from the exact baseline through a new reviewed fast-forward commit and manually redeploy. Do not revert database data, erase new orders or change callback processing. Record the exact failed deployment and live health results.
