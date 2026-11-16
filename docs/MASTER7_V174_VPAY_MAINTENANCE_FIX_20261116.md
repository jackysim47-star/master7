# V174 VPay maintenance capability fix

Pausing Gateway order creation previously also reported existing-order query
and callback capabilities as unavailable. The Core and Gateway now keep
maintenance capabilities separate from permission to create a new order.

## Change and compatibility

- Authenticated Gateway `/platform/vpay/config` adds `queryReady` and
  `callbacksReady`. Existing `paymentReady` retains its creation semantics.
- Core uses the independent capabilities for status. New orders still require
  `paymentReady`, both maintenance capabilities, exact merchant/environment and
  callback/return bindings, permitted trade codes and both local order switches.
- A legacy response without either new field is accepted only when its
  existing `paymentReady` is strictly true. An explicit false, malformed value
  or partially upgraded response cannot inherit legacy readiness.
- Query/order token separation, provider signatures, destination restrictions,
  independent provider lookup, amount/currency/member checks and single balanced
  wallet posting remain in place. No schema, balance, credential or switch change.

## Fresh verification

- Gateway: 158/158 PASS.
- Core focused availability, VPay, incident lookup and capabilities: 114/114 PASS.
- Core full regression: 1526/1526 PASS.
- TypeScript, ESLint and Render production build: PASS, exit 0.
- Cross-service synthetic execution: both creation switches false; two actual
  HTTP callbacks through Gateway/Core; one independent provider query; zero new
  provider orders; two ledger entries with net zero; no acceptance record.

These results are isolated verification, not official provider UAT, acceptance,
live operations or production sign-off.

## Release records

- Core release baseline: `ee7da3cc9b4cc9602d012b471a27d0269fcdeac1`.
- Previous runtime archive: `4e1874b01ae7ddfa7826ac14a02e39593d8caf602be653f2d6578bde5f6477e5`.
- Candidate archive: `820b0a9c9fa8fbd2d26caee345a7b0df9bf95d6f613dca66dbf97aef15712c78`.
- Gateway baseline: `ac03e00bec68f612d62cdf1cd8041eec57626a32`.
- Gateway fix: PR #16, `313a73c05d1142b488c1f4220e13b71c40275498`.
- Core deployment and live post-checks: pending at package creation.

The archive also retains the three verified PostgreSQL test-fixture corrections
from the previous closeout. Production changes in this patch are confined to
`lib/vpay.ts`; other new archive changes are regression tests. The readable
zero-context patch is `docs/patches/V174_VPAY_MAINTENANCE.patch` and can be
applied to the preceding candidate with `git apply --unidiff-zero`.

Raw evidence: `/workspace/output/MASTER7_V174_VPAY_MAINTENANCE_20261116_g6A55p`.

## Rollback

Deploy the previous Core release and Gateway baseline if an unexpected
compatibility or health failure appears. Rolling either side back must leave
new order and payout switches false. No data migration or balance reversal is
required. Never disable signature checks or enable orders to make a probe pass.

Payment Acceptance remains 0/3; Supplier Acceptance remains 0/43. Handset OTP,
Owner authenticated login/logout/recovery, real bank evidence, independent
provider UAT, external statements and final operations sign-off remain separate
requirements.
