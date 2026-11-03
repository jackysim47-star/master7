MASTER7 V17 Render staging package

This branch carries a verified V17 source snapshot adapted for Render Node/Nitro and an isolated PostgreSQL staging database. It is not the production site and must not be connected to customer DNS until staging checks pass.

Source snapshot SHA-256: b2626d588f1db0345bbb954611f0b54dd1f7559cb3f8c4c8ba278697e66e4d45
Source provenance: V17 version 9, source commit 295af6bc29fca1ff3521e5749b9cb241326bed66. The source archive is expanded by the Render build command into .render-v17/.

The database starts with schema only; no legacy customers, balances, or orders are imported. Payment, wallet, and live-game features remain disabled. SMS OTP and complete game/payment acceptance are not included by this portal source.
