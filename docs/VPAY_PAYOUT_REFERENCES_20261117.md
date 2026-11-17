# VPay payout reference repair — Staging/UAT

Release: `17.0.0-selfbuilt.176-vpay-payout-references`.

The Portal now stores VPay's `money_id` separately from its existing merchant
`out_money_id`. Create responses and authenticated callbacks bind the provider
ID once. Conflicting or reused provider IDs require review without releasing
held funds or posting another debit. The owner withdrawal API includes the
non-secret provider ID for reconciliation. Bank Rakyat's undocumented `KRYT`
mapping is removed; the UAT Gateway also rejects `RYT` and `KRYT` before traffic
can reach VPay.

The additive `0127-vpay-provider-money-id` migration creates a nullable column
and a unique index. Historical rows retain NULL until an authenticated callback
provides the ID. Existing merchant references are preserved. The previous
application remains compatible with the additive database change.

Verification:

- Gateway full suite: 167 tests passed.
- Portal VPay, withdrawal, migration and adapter regression: 185 tests passed.
- Final release probes and focused regressions: 68 tests passed.
- Isolated PostgreSQL 18.6 payout suite: 12 tests passed, including startup
  migration idempotence, provider ID persistence, duplicate/conflicting IDs,
  repeated callbacks and held-fund preservation.
- Render type check, changed-file ESLint and Render build passed.

PostgreSQL ran only on loopback in a fresh temporary database. All provider
replies were synthetic. No real payout was submitted. This release changes
neither transaction switches nor Production configuration.

Portal base: `f273488d25d06e07e9bd4108819a1655f7343bb2`.
Gateway base: `14fecf38f349c2af64042ad2e8079185abca3887`.
Gateway repair: `de53acb739183ba235c3c6af5d59cec5d2e16b2c`.
Portal source archive SHA-256:
`81a70252981e50905d21c06cd1b21182169c4315a235e479cf8180051c15450a`.

Deployment targets are the existing `master7-v17-staging` and
`master7-payment-uat` services. Post-live acceptance must confirm `.176`,
database readiness, the expected deployed commits and closed payout switches.
