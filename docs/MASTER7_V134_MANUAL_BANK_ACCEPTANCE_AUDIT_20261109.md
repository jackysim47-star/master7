# MASTER7 V17.134 Manual Bank acceptance audit

**Release:** `17.0.0-selfbuilt.134-scheduler-leader`

**Audit date:** 2026-11-09

## Result

The Manual Bank application workflow is implemented and fails closed. It cannot become production-ready without a real company bank account and one linked real-bank QA deposit and payout. No bank identity or transaction evidence was invented during this audit.

Live status at the time of the audit:

```text
manualBankConfigured = false
manualBankMode       = closed
manualBankReady      = false
newDepositsEnabled   = false
newPayoutsEnabled    = false
productionReady      = false
```

## Implemented controls

- Owner-managed company bank accounts, with immutable replacement/version history.
- A dedicated QA mode limited to approved named members.
- Member receipt submission with stable request-key retry protection.
- Staff/owner review requiring the exact MYR amount, company bank, normalized bank reference, bank occurrence time, proof image, and explicit confirmation.
- Atomic two-entry wallet posting: member credit and matching provider-clearing debit.
- Reuse prevention for a normalized bank reference across members and orders.
- Separate owner approval and payout execution, encrypted recipient details, wallet reservation, unknown-outcome review, and proof-backed final settlement.
- Staff redaction and owner-only access to payout recipient details and execution.
- Maintenance controls that block new deposits and payouts while allowing existing reviews and payout confirmation to finish.
- Dynamic readiness that revalidates the enabled bank account, one credited QA deposit, one paid QA withdrawal for the same member, both bank proofs, balanced wallet ledger, released reservation, audit bindings, and a reconciliation-clean wallet.

## Validation evidence

Focused SQLite/application suite:

```text
60 tests passed
0 failed
```

The suite covered receipt preprocessing, idempotent retries, account replacement, approval races, duplicate bank references, balanced posting, maintenance behavior, payout reservations, unknown outcomes, staff restrictions, upload limits, readiness invalidation, and fail-closed availability.

Fresh loopback-only PostgreSQL 18 verification:

```text
6 tests passed
0 failed
```

It covered concurrent approvals, cross-member reference reuse, historical account traceability, payout confirmation races, balance consistency, encrypted backup, isolated PostgreSQL restore, zero foreign-key violations, and rollback of the isolated target.

## Production completion sequence

1. Owner enters the real company bank account in the protected admin page.
2. Owner selects one approved dedicated QA member and changes Manual Bank from `closed` to `qa`.
3. That QA member makes the provider-minimum real deposit and submits the actual receipt.
4. Staff/owner matches the bank statement and records the actual bank reference, amount, time, account, and proof. The wallet must receive exactly one balanced posting.
5. The same QA member requests a minimum withdrawal. The owner approves it, performs the bank transfer, and records the actual payout evidence. The reservation must release exactly once.
6. Owner links those two records through the Manual Bank acceptance action. The server must report `manualBankReady=true` before `live` mode can be selected.
7. Reconcile the platform records with the company bank statement and record operations sign-off.

## Decision

Manual Bank code and isolated data integrity: **PASS**.

Live company-bank configuration: **NOT CONFIGURED**.

Real-bank deposit and payout acceptance: **NOT VERIFIED**.

Manual Bank production activation: **CORRECTLY BLOCKED**.
