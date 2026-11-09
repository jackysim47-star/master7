# MASTER7 V17 .132 — provider transfer wallets

JDB now uses the platform's canonical MYR wallet, reservation, game-result ledger and shared owner/staff records through the universal launch, wallet, settlement and recovery endpoints. This is a code delivery and isolated acceptance result. It does not certify supplier permission, real payment, live game launch or production readiness.

## Accounting and recovery

- A registered profile binds the supplier, account namespace, player and ledger. Only the explicitly implemented cash MYR 1:1 transfer adapter is executable in this release. Other profiles remain closed until their own adapters and acceptance are completed.
- The complete available wallet amount is reserved atomically before the original deposit reference can be claimed. Deposit and withdrawal submissions each have a maximum of one attempt. An uncertain submit is queried using the same member, profile, direction, amount and reference; a missing result does not release money.
- Launch URLs are returned to the owning member without being stored in the ledger. Unknown launches stay reserved for review. Closing a browser is insufficient proof of closure.
- JDB Action 17 only schedules a kick. Action 52 supplies the not-playing observation. Settlement additionally requires an independently accepted session-invalidation contract; the runtime flag for this starts false. An offline observation by itself does not establish invalidation of an unused URL.
- A confirmed return and verified zero provider balance create one game-result row equal to returned MYR minus transferred MYR. The original wallet projection books this result, without an extra main-wallet debit. Zero returns never generate a fabricated zero-value supplier withdrawal.
- Changed approval, AML/identity review or cooling-off status is rechecked before funding and before launch. An unsubmitted hold is cancelled safely; a funded but unlaunched session is returned using the existing settlement flow when that return can be confirmed.
- Existing wallet returns and queries remain available while new games are paused. Unknown results, sub-sen residuals and inconsistent evidence retain their hold. Stale-hold cleanup also requires the supplier-operation evidence.

## 1:100 accounts

The confirmed 1:100 account profiles are `918kiss_normal_my1_1to100` and `jili_my1_1to100`. Their ordinary 1:1 profiles remain separate.

The shared conversion helper uses integer arithmetic: MYR 1.00 becomes 100 game points, and 12,345 game points becomes MYR 123.45. The main ledger always stores MYR sen. Raw supplier amounts and any fractional-sen remainder remain explicit; no remainder is silently rounded or credited. The frontend displays `100 game points = MYR 1.00` in English, Chinese and Malay.

These are implemented conversion rules and display checks. This release does not claim that either manufacturer's actual 1:100 launch, debit, credit or settlement contract has passed acceptance.

## Credentials and activation

`JDB_TRANSFER_PROFILES_JSON` is a Render Secret. Its `profiles.jdb_myr` entry holds the account connection, exact approved API origin, approved game-launch origins and return origins. API requests cannot supply or replace the host, key, IV, merchant or exchange ratio.

Operational fields are `mode` (`closed`, `qa`, `production`), `environment` (`production` for the supplied account), `recoveryEnabled`, `sessionClosureVerified`, and `qaMemberIds`. The connection uses the existing JDB protocol fields `profile`, `baseUrl`, `dc`, `parent`, `aesKey`, `aesIv`, explicit `padding`, `launchOrigins` and, once confirmed, `reportUtcOffsetMinutes`.

Initial provisioning is **closed**, recovery disabled, closure unverified and no QA members. A restricted QA entry requires the named member, current approval and play settings, an executable return path, accepted closure semantics and a fresh catalogue. It does not set production verification. Production mode additionally requires the manufacturer's acceptance evidence for all listed profiles. The global new-game control remains authoritative.

The source account was read from the supplied JDB DOCX without copying credentials into source or reports. The existing Render gateway's catalogue probe returned supplier code 9001; a separate read-only probe from the execution workspace returned `provider_rejected`. The egress environments differ. Neither result proves which IP, credential or account-scope rule caused rejection. No player creation, launch, transfer or payment was attempted against the actual supplier.

## Schema and backups

Migration `0116-provider-wallet-operations` adds nullable profile identity to the existing game sessions and an operation-evidence table. Old MegaH5 rows, references, results, reservations and the composite launch foreign key are preserved. MegaH5-specific reads now filter its supplier explicitly.

The encrypted backup manifest includes the new operations. Prior 0115/0113 and older supported archives remain recoverable with an explicit missing-coverage receipt. PostgreSQL restore rehearsal forces deferred foreign keys to be checked before issuing a verification receipt; a hash-consistent encrypted archive with a broken deferred foreign key is rejected and rolled back.

Before considering a rollback to the MegaH5-only .131 binary, run `node scripts/provider-wallet-rollback-preflight.mjs` with the bound database. It is read-only and refuses approval if any new provider session or operation exists. In that case retain the new wallet implementation and recovery routes while pausing new launches. Do not remove transaction history to make a legacy rollback pass.

## Verification

- `pnpm run verify:render`: maintenance 12, release probes 25, regression 1196, database adapter 3; TypeScript, lint and Render build passed. Fault injection verifies interrupted unsubmitted deposits, prepared returns and zero returns without duplicate supplier transfers or missing wallet holds.
- Two isolated PostgreSQL suites passed 6 tests each: company-bank regression, and provider-wallet concurrency, query-only recovery, exact result projection and encrypted rollback-only restore. No production database or provider was used.
- Real browser plus actual backend handler, SQLite and encrypted protocol adapter against a synthetic supplier: MYR 20.00 held, MYR 15.75 returned, one MYR -4.25 result row, no remaining hold, matching owner/staff records. Non-QA members and guests cannot play the test entry.
- Twelve frontend ratio checks cover the two 1:100 profiles at 390/1280px in three languages. Actual supplier and real-money acceptance remain unverified.

No payment gateway switch, company bank account, DNS record or real-money acceptance was enabled by these tests.
