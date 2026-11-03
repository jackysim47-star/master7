MASTER7 V17 Render staging package

This branch carries a verified V17 source snapshot adapted for Render Node/Nitro and an isolated PostgreSQL staging database. It is not the production site and must not be connected to customer DNS until staging checks pass.

Source snapshot SHA-256: 2f3d57bf96e4ae0df3dd72bcb2e9e583f7d3a21d803381e302289f51e0c7fb2a
Source provenance: V17 version 9, source commit 295af6bc29fca1ff3521e5749b9cb241326bed66. The source archive is expanded by the Render build command into .render-v17/.

The database starts with schema only; no legacy customers, balances, or orders are imported. Payment, wallet, and live-game features remain disabled. SMS OTP and complete game/payment acceptance are not included by this portal source.
