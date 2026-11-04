# V17 Render VPay environment mapping follow-up

**Candidate:** 17.0.0-selfbuilt.17  
**State:** local candidate only; Render still runs 17.0.0-selfbuilt.16.

## Change

The API route already consumes eight VPAY_* values, but the Render environment adapter did not expose them. The candidate adds a small server-side mapping helper and spreads its result into the adapter configuration. Missing variables remain undefined; no credentials are stored in source or this document.

The mapping does not change payment-channel rows, readiness flags, or make a request to the gateway. VPay order handling still requires the existing channel check, the separate explicit order setting, the fixed UAT gateway and callback validation. If all UAT settings are present and an owner later changes the channel to Active, the existing UAT order flow could become available. Keep the live channel Close until sandbox testing is deliberately scheduled. Live payment readiness remains false in the application.

## Validation

- Added two focused tests: all eight values pass through unchanged, and missing values remain unset.
- 70 tests passed across the extracted source test suite, including a regression for the /admin registration control.
- TypeScript check passed.
- Render build passed.
- Candidate bundle SHA-256: 9eeb05d9ac6e2c5db72c4576d3dcb3c7f46a0bf1bd0a8fef770420b647ef2db4.

The current .16 bundle was compared with open PR #4. The /register route and direct registration UI coverage were already included. The candidate keeps those files and tests, rather than replacing the bundle with the PR's older archive, and includes its still-missing /admin sign-in visibility fix.

## Still required

The live Render service was rechecked at 18:28 MYT and remained on .16; all four payment controls were Close, VPay was disabled, and the public game list was empty. This local candidate has not been pushed or deployed. Render environment values and provider credentials were not read, and no sandbox order or callback was attempted. Those steps require a confirmed supplier sandbox configuration and must keep production transactions disabled.
