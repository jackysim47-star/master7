# MASTER7: isolated JDB / SPRIBE common adapter

Candidate release: `17.0.0-selfbuilt.125-jdb-adapter`.

## Delivered code

`lib/jdb-provider-adapter.ts` wraps the existing encrypted JDB protocol client in the common `GameProviderAdapter` interface. The adapter is constructed only with an explicitly supplied transport, profile credentials, approved return origins and operation switches. It does not read ambient credentials or instantiate itself from member input.

Implemented operations: catalogue, verified player creation/lookup, launch, balance, deposit, withdrawal, transfer query and wager projection. Undocumented transfer callbacks return HTTP 403 without reading a payload, writing a record or acknowledging a financial result.

## Isolation and money boundaries

- JDB and SPRIBE use independent profile, player and ledger namespaces and deterministic, direction-specific transfer serials. A foreign profile or player fails before provider traffic.
- Player currency, parent and identity are verified independently before transfer submission or recovery. Locked accounts cannot launch or receive new deposits; a configured withdrawal may still recover an existing locked player's funds.
- Creation, launch, deposits and withdrawals have separate explicit switches, all false by default. Read-only verification, balance and transfer query do not depend on those switches.
- A transfer is submitted once. Timeout, duplicate and in-progress replies remain unknown. A supplier receipt includes `requiresLedgerReconciliation=true`; it never posts a platform-wallet entry.
- Recovery checks player, direction, amount, stable serial and an existing provider transaction reference when supplied. A query cannot create or resubmit a transfer.
- Sub-cent balances retain the original supplier amount and a residual flag. They cannot be silently rounded into a member ledger or submitted as a new transfer.
- Allowed game-launch origins and return origins are explicit. Request context cannot replace the configured transport or credentials.

## Wager records

The common wager model allows a missing round ID to remain null rather than inventing one. Report windows and `settledAt` use Unix milliseconds; database ingestion must convert units explicitly.

Bet ID, player ID, game ID, optional round ID and raw provider amount strings are retained. Arcade gambling stakes are included separately from base bets. Tax, valid bet, jackpot and jackpot-contribution fields are retained when supplied. Fractional-sen bets/wins, invalid signs/dates, duplicate rows or records outside the vendor's documented query-time basis stop projection rather than rounding or advancing coverage.

Every returned report page remains `complete=false`. Durable ingestion, cursor coverage, player-to-member mapping, turnover and accounting reconciliation are not implemented by this adapter.

## Contract references and limits

This work reuses the existing cached official JDB transfer documentation and the previously tested protocol client: Actions 49, 12, 15, 11, 19, 55 and 29/64. Attempts to re-fetch the current public action pages in this environment returned HTTP errors. No current-version or merchant authorization acceptance is inferred from cached documentation.

- [Action 19](https://doc.jygrq.com/en/transfer/functions/transactionManagement/action19)
- [Action 55](https://doc.jygrq.com/en/transfer/functions/transactionManagement/action55)
- [Action 29](https://doc.jygrq.com/en/transfer/functions/report/action29)

The existing protocol still requires an explicit padding choice because the saved introduction and language examples differ. The supplier must confirm the selected account contract, HTTPS host, padding, report timezone, game origins, allowlisting and credentials before live use.

## Activation remains blocked

The factory is a protocol component, not an authenticated member API or wallet orchestrator. `resolveGameProviderAdapter` continues to reject JDB and SPRIBE. Their registry `implemented`, `enabled` and production-acceptance flags remain false. SPRIBE's wallet mode is explicitly Transfer, and its player/ledger identity remains independent of JDB.

There is no database migration, member balance update, order submission, provider call, callback replay, real-money transaction or automatic registration in this delivery. Tests inject fake transports. This release must not be described as a playable JDB/SPRIBE frontend integration.

Remaining platform work: durable player/session mapping, wallet reservations, atomic postings, transfer attempt recovery, authenticated endpoints and report ingestion, followed by supplier/UAT and production acceptance. Spaceship DNS remains an independent access blocker for the two public entries.
