# MASTER7 legacy MegaH5 live safety acceptance

Date: 2026-11-10 UTC

## Scope

This record covers read-only catalogue, readiness and portal checks for the legacy `megah5_myr` profile. It does not certify a game launch or any wallet transaction.

## Proven

- Gateway `/health` returned HTTP 200 and identified gateway version `1.14.0`.
- Gateway `/providers/megah5/games` returned HTTP 200 with upstream HTTP status 200 and provider status 200.
- The live catalogue contained 166 games: 166 non-empty unique game codes, 166 unique game IDs and no empty game names.
- Gateway readiness reported credentials, game token and wallet token configured.
- Portal `/health/live` returned HTTP 200 with its database ready.
- Portal `/api/games?profile=megah5_myr` returned the same 166-game catalogue and reported it fresh and connected.
- The portal reported `enabled=false`, `launchReady=false`, `playable=false` and reason `gateway_wallet_contract_unavailable`.
- Gateway readiness reported `providerMappingVerified=false`.
- Session and balance were blocked by `provider_mapping_unverified`.
- Deposit, withdrawal and transfer-status were blocked by `provider_mapping_unverified` and `transaction_switch_off`.
- Production launch-ready profiles: 0. Production-verified profiles: 0.

## Not verified

- The legal and technical mapping between the legacy merchant account, the advertised MegaH5 brand and the upstream API operator.
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

The live catalogue and fail-closed controls are accepted for read-only operation. Legacy MegaH5 production play and wallet operation are **not accepted**. Play and all money actions must remain closed until the merchant-to-provider mapping and full supplier contract are confirmed, both Render Singapore CIDRs are allowlisted, and a controlled end-to-end acceptance produces durable evidence.

No payment-provider configuration was changed by this work.
