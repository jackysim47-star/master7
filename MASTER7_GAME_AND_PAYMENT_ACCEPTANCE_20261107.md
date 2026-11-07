# MASTER7 game and payment acceptance — 2026-11-07

This note records verified production behaviour only. Credentials, player data,
bank details and provider response bodies are intentionally excluded.

## VPay

- The portal and gateway have the merchant configuration, signed order route,
  independent order query and authenticated callback forwarding in place.
- Three observed production order attempts reached VPay. VPay returned HTTP 200
  with provider business code `-1`; therefore no checkout URL was accepted and
  no wallet entry was created. The public VPay documentation defines only code
  `0` as success and does not define `-1`.
- The gateway's observed Render egress IP is not the IP in the merchant handover
  and is not guaranteed to remain a single address. VPay must confirm the
  meaning of `-1`, the purpose of the handed-over IP, the accepted outbound
  allowlist and the enabled MYR trade codes.
- New VPay orders remain disabled. Query and callback reconciliation stay
  configured so an existing order can still be checked without resubmission.
- The callback implementation verifies the VPay signature and order binding,
  performs an independent provider query, commits one balanced wallet ledger,
  and returns the exact uppercase `SUCCESS` acknowledgement only after that
  durable result.

## 1MPay

- Merchant configuration, order creation and order query reached the provider.
- One provider-style callback was accepted and independently queried. This
  proves callback reachability and validation, but the query was not shown to
  be successfully paid and no balanced member-wallet settlement was proven.
- New 1MPay orders are therefore disabled in the Render environment. Existing
  orders and reconciliation records remain available; they are not recreated or
  deleted.
- The customer portal identifies the channel as awaiting provider payment and
  wallet acceptance instead of describing it as an available deposit channel.

Acceptance requires one authorized real payment to produce all of the following:

1. a provider checkout completion;
2. an authenticated callback bound to the original order, member and amount;
3. an independent successful provider query;
4. exactly one balanced member and provider-clearing ledger pair;
5. a matching wallet and accounting record.

## GSPAY+ MYR

- The customer flow, idempotent platform order, provider-order binding, HTTPS
  checkout-host validation, authenticated callback, independent status query
  and single balanced wallet settlement are implemented and covered by local
  contract tests.
- The supplied successful create example proves only the create response shape:
  outer code `200` with a JSON string containing `payment_id` and an HTTPS URL
  on `secured.gspay.online`. It is not settlement evidence.
- The production portal channel is closed and the current portal configuration
  is incomplete. Customer order creation therefore remains unavailable and the
  lobby must show maintenance.
- Production acceptance still requires the supplier's final query-success
  response, callback acknowledgement and retry contract, plus one reconciled
  payment across the supplier order, MASTER7 order, wallet ledger and accounts.
- DuitNow, USDT and payout are outside this MYR deposit acceptance and remain
  separately disabled.

## Game catalogues

- MegaH5, JILI and 918KISS H5 have successful read-only catalogue responses.
- JDB and RSGHub read-only adapters are deployed. The current production calls
  reach the suppliers but are rejected (`JDB 9001`, `RSGHub HTTP 403`). They stay
  in maintenance and are not represented as playable.
- Pragmatic Play now has a pinned, read-only `getCasinoGames` catalogue adapter.
  It stays in maintenance until the assigned production endpoint accepts the
  Render request; no player, free-round, wallet or launch method is called.
- The public ATG supplier ID now maps to the existing assigned direct catalogue
  contract. The former internal Godee label is no longer exposed as a separate
  supplier.
- A catalogue response is not game-launch or wallet-settlement acceptance. Every
  supplier remains non-playable until its own launch, wallet and settlement flow
  passes an end-to-end acceptance run.

## Release guard

- The lobby keeps the fixed 34 supplier inventory.
- Supplier failures retain the last trusted snapshot and display maintenance.
- Unknown supplier IDs, arbitrary artwork hosts and unverified launch routes fail
  closed.
- No test in this release creates a player, transfers funds, places a wager or
  submits a payout.

## Release `.87` package

- Source commit: `9b8af5ee47d8db8922d49edcbde7adad0945a979`.
- Archive SHA-256: `92d6066a8fcb8176a8fddf2c47437e83827c4dab400a881e21a23cea00d7d995`.
- The archive contains one root and no Git metadata, dependency directory,
  generated build, runtime database, non-template environment file or known
  credential value.
- Full suite: 391/391 passed. Render DB adapter: 3/3 passed. A clean extracted
  archive installed from its frozen lockfile, repeated the full suite and
  completed the Render production build.
- Production payment and game switches are unchanged by this release.
