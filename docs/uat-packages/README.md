# MASTER7 V174 UAT intake templates

These manifests are non-secret intake records. They are deliberately blocked by
default and do not authorize provider calls, wallet movement, acceptance, live
traffic, or production use.

Rules:

- Keep credentials, tokens, passwords, private keys, account numbers, and raw
  provider responses out of these files.
- Store only a non-secret evidence reference and its SHA-256 digest under each
  required evidence key.
- Set `authorizedUat`, `officialContactVerified`, and `whitelistConfirmed` to
  `true` only after the corresponding official evidence exists.
- JILI 1:1 and JILI 1:100 remain independent. The 1:100 manifest additionally
  requires unit-scale and rounding evidence.
- GSPAY MYR, 1MPay MYR, and VPay MYR remain independent acceptance targets.
- A successful package check means only “ready for restricted UAT”. It never
  means Accepted, Live, or Production Ready.

Validate from the extracted V174 source directory:

```bash
pnpm uat:package-check -- /path/to/manifest.json
```

All five committed templates must currently exit non-zero because they contain
no official evidence.
