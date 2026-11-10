# JILI transfer wallet implementation and acceptance boundary

This is an implementation handover, not a production acceptance certificate.

The candidate legacy protocol is described in the secondary reference https://www.scribd.com/document/957889365/JiLi-zh-cn . The primary SSS manual at https://wbgame.tadagaming.com/sss-doc/SSS_Seamless_API_Manual_TW.html describes a different GC/SC contract. It does not establish that these MYR/MY1 accounts use that SSS wallet. Other suppliers' session-close methods are not substituted into these accounts.

Implemented legacy methods: GetGameList, CreateMember, GetMemberInfo, LoginWithoutRedirect, KickMember, ExchangeTransferByAgentId, CheckTransferByTransactionId and paginated GetBetRecordByTime. Signing uses ordered parameters ending in AgentId, MD5 with fixed UTC-4 `yyMMd`, and independent six-character padding. Launch HomeUrl/platform fields are not signed. Launch URLs require HTTPS and explicitly approved origins. Submitted transfers are never automatically retried.

The reference warns that GetMemberInfo.Balance is delayed and should not determine withdrawals. The engine snapshots withdrawal_mode=all, creates an immutable return reference and submits TransferType=1 with Amount=0. Confirmation requires CheckTransferByTransactionId with the original account, transaction and direction. Only its actual normalized amount becomes expected_return_minor. A timed-out return is queried with that reference, without an invented amount or second submission. A zero sweep retains its supplier reference and one submission attempt.

Cash ledgers use MYR sen. Configure transferAmountUnit, queryAmountUnit, balanceAmountUnit and reportAmountUnit independently as platform_currency or game_points, only after the account contract confirms each field. An exchange endpoint may already apply the 1:100 agent ratio; assuming its Amount uses game points could multiply a debit or divide a return twice. There are deliberately no inferred unit defaults.

The adapter fingerprints its profile, API endpoint, agent ID and four unit settings. The engine snapshots that fingerprint when reserving the wallet. Database triggers prohibit changing an operation's mode or fingerprint. A different runtime account or unit mapping cannot reinterpret its receipt. Key rotation alone does not change this account/unit fingerprint.

Use server-only GAME_TRANSFER_PROFILES_JSON with independent profiles jili_myr_1to1 and jili_my1_1to100. Each slot requires:

- mode: closed, qa or production; environment: production.
- connection: exact profile, HTTPS /api1 endpoint, merchant agent ID/key, all four explicit unit choices and approved launchOrigins.
- approvedApiEndpoints and allowedReturnOrigins. Browser fields cannot select a supplier endpoint.
- qaMemberIds, at most 50 exact member IDs. QA membership never bypasses production acceptance.
- recoveryEnabled and merchantContractVerified, plus merchantContractEvidenceSha256 for independently reviewed account evidence.
- sessionClosureVerified, allIssuedLaunchesInvalidated and lateResultsFinal. Kick acknowledgement or a point-in-time offline status alone does not prove those properties.

These are deployment inputs for reviewed evidence, not evidence generators. Do not set them just to display Play. Cash/recovery methods stay disabled when the account or closure contract is unverified. Production also requires that profile's five durable catalogue, launch, wallet, settlement and recovery acceptance capabilities. Unknown launch tokens remain blocked from settlement until closure is proven.

The additive schema preserves existing JDB operations with exact mode and an empty fingerprint. SQLite and PostgreSQL tests cover actual amounts, zero receipts, concurrent returns, unknown outcomes, changed contracts and encrypted backup/rollback-only restores. HTTP tests use synthetic suppliers and balances. They are not real play, wager-settlement or real-money acceptance evidence.

Current production activation: no JILI runtime secret installed, no acceptance event recorded, no real game launch and no real-money transfer. Report JILI, 918KISS, MegaH5 and other supplier blockers independently. Do not claim all 37 brands are playable.
