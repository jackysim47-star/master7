# MASTER7 V17 Render staging package

This branch carries the isolated SEVEN customer portal and shared backoffice for Render staging. It is not production and does not change either official domain or import legacy customer data.

Staging source bundle SHA-256: `63575292a340445e2e309328a2ca5345f6aa8b1863d9425a89abf8ae0a18b6d5`
Release: `17.0.0-selfbuilt.9`
Source archive is expanded by the Render build command into `.render-v17/`.

The package now includes backoffice-managed lobby ads (1200x360, rotating every five minutes), configurable benefit display rules, individually managed provider game cards and up to five separately displayed SEVEN mini-game cards (800x600 artwork). Malaysian member phone numbers are collected and normalized; account passwords require at least eight characters. Owner/staff sign-in remains ID and password at `/admin`.

Important staging limits: SMS OTP is not connected, so customer SMS verification is not complete. Provider games and platform mini-game cards are catalogue/display entries only and cannot launch or settle. Deposits, withdrawals, wallet changes and real-money play remain disabled. Do not connect production DNS or import legacy data based on this package.
