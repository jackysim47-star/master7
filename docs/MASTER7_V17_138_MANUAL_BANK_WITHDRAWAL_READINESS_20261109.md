# MASTER7 V17.138 Manual Bank and withdrawal readiness

Captured: 2026-11-09 UTC  
Release: `17.0.0-selfbuilt.138-signoff-gates`  
Scope: read-only production evidence and local synthetic validation. No bank account, payment, payout, or production switch was changed.

## Production evidence

The V17.138 encrypted-backup restore receipt records the following production row counts:

| Table | Rows |
|---|---:|
| `company_bank_accounts` | 0 |
| `manual_deposit_requests` | 0 |
| `manual_bank_transactions` | 0 |
| `withdrawal_requests` | 0 |
| `provider_payouts` | 0 |
| `wallet_reservations` | 0 |
| `wallet_ledger` | 0 |

Source: `master7-v138-restore-postgres-2026-11-09T13-59-10-462Z.json`, generated from the production encrypted backup and verified in an isolated PostgreSQL 18 restore.

The live health endpoint reports:

```text
manualBankConfigured = false
manualBankMode       = closed
manualBankReady      = false
newDepositsEnabled   = false
newPayoutsEnabled    = false
payoutsEnabled       = false
productionReady      = false
```

Therefore no approved company-bank configuration exists in the captured production state. Manual Bank cannot be activated safely from existing evidence.

## Internal validation

The V17.138 release package passed 76/76 focused Manual Bank and withdrawal tests. The suite covers:

- immutable company-bank account replacement history;
- proof-backed deposit review and one balanced wallet posting;
- normalized bank-reference reuse prevention;
- Owner-only withdrawal approval and recipient-data encryption;
- Staff-redacted withdrawal records;
- wallet reservation, single debit, and exact release behavior;
- unknown payout outcomes remaining reserved for reconciliation;
- concurrent approval, payout, and cancellation protection;
- maintenance blocking new requests while existing reviews can finish.

No internal defect was found in this review, so no code or schema change was made.

## Provider payout readiness

| Provider | Current result |
|---|---|
| VPay | Adapter and configuration present; submission and global payout gates closed; real payout unverified |
| GSPAY MYR | Adapter present; bank-target configuration incomplete; submission and global payout gates closed; real payout unverified |
| GSPAY USDT | Payout contract not provided; adapter unavailable |
| 1MPay | Payout contract incomplete; adapter unavailable |
| Manual Bank | Application flow complete; no company bank, real deposit proof, real payout proof, or linked acceptance evidence |

## Exact external completion evidence required

1. Owner records the real company bank through the protected administration flow.
2. Owner restricts Manual Bank to one approved QA member and selects `qa` mode.
3. The QA member makes one minimum real MYR deposit; staff match the exact statement reference, amount, time, account, and proof.
4. The same QA member makes one minimum withdrawal; Owner approves and records the actual bank payout proof.
5. Owner links the deposit and withdrawal through the acceptance action.
6. The server must independently report `manualBankReady=true`; the wallet, bank statement, and audit records must reconcile before `live` can be selected.

Bank identities, references, and proofs must come from the real account and transaction records. They cannot be inferred from source code or supplied as placeholder data.
