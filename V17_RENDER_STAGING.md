MASTER7 V17 Render staging package

This branch carries a V17 version 9 source snapshot adapted for Render Node/Nitro and an isolated PostgreSQL staging database. It is not the production site and must not be connected to customer DNS until staging checks pass.

Source snapshot SHA-256: e15d84a871dad55a97840381f5d938b7545f61e65a4235606fa25be9ab08fb38
Provenance: V17 source commit 295af6bc29fca1ff3521e5749b9cb241326bed66. The source archive is expanded by the Render build command into .render-v17/.

The database starts with schema only; no legacy customers, balances, or orders are imported. Payment, wallet, and live-game features remain disabled. SMS OTP and complete game/payment acceptance are not included by this portal source.

Render's internal staging PostgreSQL presents a self-signed certificate. Staging currently uses encrypted TLS over Render's private network with certificate-chain verification disabled. Production must use a trusted CA and verified TLS; do not copy the staging PGSSL_REJECT_UNAUTHORIZED setting to production.
