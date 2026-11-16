# MASTER7 V174 restricted UAT package gate

Created: 2026-11-16 MYT

## Outcome

The release now contains a local, non-transactional validator for official
supplier and payment UAT intake packages. It does not accept credentials, call a
provider, create an order, move a balance, record acceptance, or change a
runtime switch.

Run it with:

```bash
pnpm uat:package-check -- /secure/path/to/manifest.json
```

A successful result means only that the supplied non-secret references are
complete enough to schedule restricted UAT. It never means `Accepted`,
`Live`, or `Production Ready`.

## Fixed admission rules

- Environment must be exactly `uat`.
- The contact, UAT authorization, network allowlist, and provider test-credit
  confirmations must all be explicit.
- Evidence records contain only a non-secret reference and lowercase SHA-256.
- JILI 1:1 and 1:100 are independent profiles.
- Every 1:100 profile requires independent unit-scale and rounding evidence.
- Free-credit profiles require non-cash wallet separation and withdrawal
  exclusion evidence.
- Game packages require account/test-credit authorization, credential delivery
  and rotation evidence, session-closure finality, and wager-report rules.
- Payment packages require the full order, payment, callback, query/recovery,
  wallet-credit, and merchant-settlement evidence set.
- GSPAY USDT remains outside the three-primary-MYR-gateway UAT scope.
- Unknown profiles and the Lebet gateway cannot be admitted as supplier
  profiles.

## Compatibility and safety

No public API, database schema, wallet behavior, settlement behavior, provider
credential, DNS setting, Render setting, or Production flag changes. Existing
acceptance ledgers remain the only immutable acceptance record, and only the
Owner can write them after evidence review.

Payment Acceptance remains `0/3`; Supplier Acceptance remains `0/43`;
Production remains `NO-GO` until official UAT and independent acceptance
evidence exist.

## Fresh verification

- Focused UAT intake, CLI and contract tests: 12/12 PASS.
- Full regression: 1534/1534 PASS.
- TypeScript: PASS.
- ESLint: PASS.
- Render/Vinext production build: PASS.

These checks validate code and fail-closed behavior only. They are not official
provider UAT or acceptance evidence.

