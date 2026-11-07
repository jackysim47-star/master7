# MASTER7 game and payment acceptance — 2026-11-07

This note records verified production behaviour only. Credentials, player data,
bank details and provider response bodies are intentionally excluded.

## 1MPay

- Merchant configuration, order creation and order query reached the provider.
- The observed customer checkout did not complete and no successful callback or
  balanced member-wallet settlement was received.
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
