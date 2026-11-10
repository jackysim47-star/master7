# MASTER7 legacy MegaH5 live safety acceptance

Date: 2026-11-10 UTC

## Scope

This record covers read-only catalogue, readiness and portal checks for the legacy `megah5_myr` profile. It does not certify a game launch or any wallet transaction.

## Proven

- Gateway `/health` returned HTTP 200 and identified gateway version `1.14.0`.
- Gateway `/providers/megah5/games` returned HTTP 200 with upstream HTTP status 200 and provider status 200.
- The live catalogue contained 166 games: 166 non-empty unique game codes, 166 unique game IDs and no empty game names.
- Supplier-linked v3.4.8 material and the exact staging opgateway host prove that
  this is a MegaH5 brand feed through the META GAMING protocol family. Live
  rows also identify MegaH5/LGMegaH5/MegaH5Arc and use MegaH5 artwork.
- Gateway readiness reported credentials, game token and wallet token configured.
- Portal `/health/live` returned HTTP 200 with its database ready.
- Portal `/api/games?profile=megah5_myr` returned the same 166-game catalogue and reported it fresh and connected.
- The portal reported `enabled=false`, `launchReady=false`, `playable=false` and reason `gateway_wallet_contract_unavailable`.
- Gateway readiness reported `providerMappingVerified=false`.
- Session and balance were blocked by `provider_mapping_unverified`.
- Deposit, withdrawal and transfer-status were blocked by `provider_mapping_unverified` and `transaction_switch_off`.
- Production launch-ready profiles: 0. Production-verified profiles: 0.

## Not verified

- Whether the historic merchant account is the supplier's normal or
  free-credit account, and whether that exact account has production MYR Fund
  Transfer entitlement. It must remain isolated from both newer profiles.
- Production game launch, token creation, return URL and session closure.
- Player balance, deposit, withdrawal, transaction query, settlement and recovery.
- Amount units, decimals, MYR conversion and any game-credit scale.
- The meaning of the upstream `Maintenance` value `1|2|3|4|5|6`.
- Late wagers, unsettled rounds, corrections, rollback and finality after logout or forced closure.
- Authoritative bet/report reconciliation and callback requirements.
- Real-money end-to-end acceptance.

## Failed

No supplier launch or money action was executed during this acceptance check, so there is no failed supplier transaction to classify. An item without evidence remains **Not verified** and must not be represented as passed or failed.

## Acceptance decision

The live catalogue and fail-closed controls are accepted for read-only operation. Legacy MegaH5 production play and wallet operation are **not accepted**. Play and all money actions must remain closed until the exact merchant-account entitlement and full supplier contract are confirmed, both Render Singapore CIDRs are allowlisted, and a controlled end-to-end acceptance produces durable evidence.

No payment-provider configuration was changed by this work.

## Post-deployment acceptance

Deployment window: 2026-11-10 06:44–06:50 UTC.

- Gateway deployment `dep-dbpbqmh5efls73b24rng` is live at source commit
  `1292f75397e6e505efaa2631b84c1a10b30794a0` and reports version `1.15.0`.
- Portal deployment `dep-dbpbqv3rjlhs73fg1l20` is live at publication commit
  `76b24566dff7105d6742412e58d51cbc3adc6710` and reports release
  `17.0.0-selfbuilt.151-megah5-safety` with database `ready`.
- Customer sign-in and registration returned HTTP 200 in a 390×844 browser.
  The customer root redirects to sign-in as designed.
- The management entry returned HTTP 200 and displayed the management sign-in.
  Games remain a customer-front-end action; management is record and control
  access only.
- The refreshed portal catalogue contains 166 MegaH5 games. All 166 carry
  `maintenance=true`, all carry `playable=false`, and the selected profile
  reports `launchReady=false` and `launch_origin_allowlist_unavailable`.
- Gateway mapping remains false; transfer and status switches remain off.
- Render recorded no portal HTTP 5xx request and no application error log after
  this deployment during the acceptance window.

The deployment is accepted as a safe read-only MegaH5 catalogue release. It is
not an acceptance of production Play, wager ingestion, settlement or money
movement.
