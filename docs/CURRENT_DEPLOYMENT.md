# MASTER7 deployment handover

Current Portal release: `17.0.0-selfbuilt.173-staff-setup-route`.

Render deployment `dep-dbpn9ugm7kps7381nvcg` reached `live` on 2026-11-10.
Portal service: `srv-dbl0iv7f3r2c73848ei0`. Publication branch:
`codex/v17-render-staging-20261104`.

Release evidence:

- local source commit: `c826624`;
- remote source commit: `42ee462c5452c7a216f44bfef94595969437439d`;
- remote tar publication commit:
  `bca27aee28de007fe7bfe58c0999054c59e4e7ce`;
- published tar SHA-256:
  `43198cd4b40a72b957d34c6cfafba784d63b44e75a1947797696d97883594629`.

External verification found `/staff-setup` available for GET and HEAD with
HTTP 200, with an empty HEAD response body and v173 browser assets in the GET
response. `/health/live` reported the exact v173 release and a ready database.
The deployment keeps new deposits, game launches and payouts disabled. A
release-bound encrypted backup and rollback-only isolated PostgreSQL 18 restore
rehearsal subsequently passed for v173, so current runtime health reports both
`backupReady=true` and `restoreReady=true`. Runtime database-monitoring
technical evidence also passed: the live instance reported guards 9/9 and
functions 5/5, with no fail-closed, error/critical or HTTP 5xx event observed
from the v173 deployment through the evidence check. This is technical evidence
only; the Owner monitoring sign-off has not been recorded. The production
domain, provider, real-payment, live-game and rollback-approval items remain
outstanding. The platform therefore remains in integration/UAT and is not
approved for production go-live. See
`MASTER7_STAFF_SETUP_ROUTE_173_POSTDEPLOY.md`,
`MASTER7_V173_BACKUP_RESTORE_ACCEPTANCE.md` and
`MASTER7_V173_MONITORING_TECHNICAL_ACCEPTANCE.md`. The official-domain recheck
and exact DNS/TLS follow-up are recorded in
`MASTER7_V173_OFFICIAL_DOMAIN_RECHECK.md`.

## Official domains

Render Blueprint `exs-dboff93rjlhs73b9hihg` manages Portal service
`srv-dbl0iv7f3r2c73848ei0`. Its remote YAML declares `www.master7.best` and
`www.master7.site`; a fresh Blueprint plan returned `no_changes`. That result
only confirms that the declared Render plan has no pending infrastructure
change. It does not verify public DNS, direct custom-domain routing or TLS.

Public DNS still uses Spaceship forwarding. `master7.best` resolves to
`15.197.162.184` and redirects through Render to `/signin`;
`www.master7.best` returns DNS NODATA. `master7.site` and
`www.master7.site` resolve to `15.197.162.184` and redirect to `/admin`.
None of the four names has passed direct Render custom-domain and TLS
acceptance.

The remaining change is at Spaceship and Render's Custom Domains screen:
disable URL forwarding, point both `www` names by CNAME to
`master7-v17-staging.onrender.com`, remove conflicting A/AAAA records, set each
apex to the current A/ALIAS target shown by Render, and then verify TLS. The
historical Render apex IP is not treated as a current value. Acceptance also
requires GET and HEAD routing, Host behavior, and callback POST requests with
no redirect. This DNS correction does not require a compute-plan upgrade, but
the current session has no Spaceship DNS write access or Render Custom Domains
write/verify surface. Domain acceptance therefore remains blocked and the
platform remains in UAT.

## Staff setup route

v173 adds `app/staff-setup/route.ts`, exporting the root portal GET, HEAD and
dynamic handlers. Staff setup links can therefore reach the fragment-only
credential consumer introduced in v172. The backend release, portal asset
queries, service-worker cache and release probes advance together so browsers
do not retain the incomplete v172 shell. A regression test requires the route
file and all three exports.

This routing repair does not change a role, password, session, payment, payout,
game, wallet, provider credential, DNS record or production-acceptance result.
It adds no schema migration. Runtime migration 0125 and the encrypted-backup
0122/76-table contract remain current. See `V173_STAFF_SETUP_ROUTE.md`.

## Privileged staff role boundary

v172 makes a staff role usable only through a local password session whose
credential version is bound to a durable `staff_password_ready` marker. Hosted
identity can no longer authorize a staff account. Promotion and setup-link
reissue rotate the prior verifier to an unusable value, revoke sessions, remove
readiness and issue a one-hour one-use setup link. Successful setup requires a
12-character password, binds readiness to the new credential version and
revokes every old session in the same transaction. Demotion and staff password
changes rotate the credential version and preserve the same fail-closed
boundary.

Startup migration 0125 quarantines every pre-v172 human staff credential that
lacks matching readiness, deletes its sessions and creates an expired pending
marker so the owner must explicitly reissue a private setup link. The
`system-support-assistant` reply-author principal is excluded and cannot be
changed through the role API. Setup secrets remain fragment-only in the
browser, are cleared before portal startup, are stored only as SHA-256 digests
and are excluded from owner exports. Release-bound asset queries and the
service-worker cache are advanced together so an old cached authentication
script cannot process the setup page.

This release does not enable deposits, payouts or games and does not change a
provider credential, DNS record or production-acceptance result. The encrypted
backup data contract remains 0122 with 76 tables; runtime migration 0125 is the
latest required startup marker. See `V172_PRIVILEGED_ROLE_BOUNDARY.md`.

The last recorded integration-gateway baseline remains release `1.17.0`,
deployment `dep-dbpchge417fc739h9b50`, commit
`c4aab70060439469f3c2e6081a57c0b40e630ff4`. Gateway service:
`srv-db6b7inlk1mc73ck6cmg`. Neither v172 nor v173 changes the gateway.

## Manual-bank audit evidence index

v171 adds one non-unique partial index for the exact paid-evidence checks used by
the manual-bank payout path. Migration 0124 indexes
`audit(target,user_id,created_at)` only where
`event='manual_bank_payout_paid'`. The evidence count and timestamp checks can
therefore use a covering index instead of scanning the entire audit table as
the operational history grows.

The index is deliberately not unique. Duplicate paid evidence must remain
representable so the v170 integrity checks can detect it and fail closed for
review. This is a query-performance migration only: it does not change an
audit record, payout state, wallet reservation, provider credential, runtime
control or production-acceptance result. Runtime migration 0124 becomes the
latest migration; the encrypted-backup data contract remains 0122 with 76
tables, and the nine trigger plus five function guards are unchanged.

## Manual-bank payout atomicity

v170 makes both manual-bank payout transitions depend on their exact audit
evidence. A start audit is inserted before the provider payout can move to
`processing`, so an audit primary-key collision leaves the withdrawal approved
and its full reservation intact. Paid evidence is inserted before a provider
payout can become `succeeded`; the transaction, audit, provider result,
withdrawal state and reservation release must all match the same bank proof.

Paid evidence now requires exactly one audit row for the bank transaction,
recorder and event, with the same timestamp as the recorded bank transaction.
An unrelated audit collision therefore cannot authorize a payout. A repeated
confirmation with identical evidence reuses the existing transaction, while a
different proof remains in review with the hold intact. The same restricted
path can finish a legacy `succeeded` provider payout whose withdrawal and hold
were left incomplete, but only when every stored bank-evidence field matches.

The change adds SQLite collision, retry and legacy-state regression coverage
plus PostgreSQL 18 concurrent-confirmation coverage. It does not call a bank,
enable payouts, change a provider credential, or change a production flag. The
v170 release added no schema migration; migration 0123 and the 0122/76-table
backup contract were current for that release. See
`V170_MANUAL_BANK_PAYOUT_ATOMICITY.md`.

## Runtime database guard monitor

v169 adds a mandatory per-instance PostgreSQL monitor after Nitro startup and
outside scheduler leadership. It opens a new bounded client for each check and
re-attests the nine critical triggers and five guard functions every 60 seconds
by default. Checks never overlap: the next unreferenced timer is created only
after the current connection, attestation and cleanup have completed.

Connection and server statement timeouts default to 10 seconds, the client
query timeout is one second longer, lock waits are bounded to two seconds, and
client cleanup is bounded to two seconds. A connection, metadata query,
attestation or cleanup failure emits one fixed, sanitized fail-closed message
and exits the instance once. Render then restarts it, where the existing startup
attestation prevents drifted definitions from becoming ready. The monitor never
repairs drift. Default Node SIGTERM/SIGINT behavior is preserved, and its idle
timer is unreferenced. See `V169_RUNTIME_DATABASE_GUARD_MONITOR.md`.

## Mobile dock navigation

The v169 member shell also gives Home and Games independent mobile-dock state.
Opening Games, a provider or a game category keeps Games as the single active
`aria-current` destination while the lobby section remains mounted. Home
returns the dock to Home, and Wallet, Promotions and Support retain their own
current-state indicators. This is a presentation and navigation correction; it
does not enable a provider, game launch or money flow.

## Guard function attestation

v168 freezes the definitions of the five unique PostgreSQL functions behind
the nine protected triggers. Portal startup and the external readiness gate
share the same contract and verify canonical `pg_proc.prosrc` SHA-256 values,
all behavior-relevant function metadata, and trigger `WHEN`, argument,
transition-table, constraint and parent fields. Drift aborts startup before
directory seeding and commit. One-time migration 0123 hardens all five
functions with a fixed safe search path and explicit runtime schema binding;
after 0123 is applied, drift is never repaired automatically. Custom restore
schemas remain supported. The backup data contract remains 0122/76 tables.
See `V168_GUARD_FUNCTION_ATTESTATION.md`.

## Startup log severity

v167 removes alert-severity words from the successful database-guard startup
message. It still reports `database guards 9/9 ready`; the nine-guard
attestation and its fail-closed behavior are unchanged. This prevents Render
from classifying a successful startup message as a critical log entry. See
`V167_GUARD_LOG_SEVERITY.md`.

## Critical database guard attestation

v166 verifies all nine critical PostgreSQL guard triggers on every portal
startup, including their table, name, enabled state, trigger function, trigger
shape and update-column binding. The attestation runs inside the existing
migration transaction and advisory lock after migrations and before catalog
seeding. Any missing, disabled, rebound or malformed guard aborts startup and
rolls back the transaction; startup never repairs drift silently. The external
PostgreSQL readiness gate imports the same frozen guard contract. See
`V166_DATABASE_GUARD_ATTESTATION.md`.

## Acceptance evidence integrity

v165 makes game-provider and production-acceptance event history immutable and
only permits each current projection to advance to the next latest revision.
Runtime reads derive the latest event from history and fail closed if the
projection disagrees. The PostgreSQL readiness gate requires migration 0122
and all acceptance-integrity triggers. See
`V165_ACCEPTANCE_LEDGER_INTEGRITY.md`.

## Current game registry

- The member lobby contains 38 distinct provider brands and 43 listed provider
  profiles.
- Implemented adapter profiles: 6.
- Launch-ready profiles: 0.
- Production-verified profiles: 0.
- Playable profiles: 0.

COBA8 remains registered as the 38th member-facing provider and independent
`coba8_myr` profile. Its official API contract is unavailable, so it remains
`contract_missing` with no catalogue, player, Play, launch, wallet, settlement
or recovery capability.

JDB remains unavailable for member Play. v164 adds durable fixture-only wager
coverage staging: exact page deduplication, lease fencing, transactional crash
retry, and aggregate gap/duplicate/late/revision/reversal-candidate diagnostics.
The storage keeps hashed identifiers plus review-only amounts and timestamps;
it cannot feed wallet, turnover, reward or accounting operations. Supplier finality, official session closure, merchant
authorization, production acceptance, launch, wallet, settlement and recovery
remain unverified and false. See `V164_JDB_WAGER_COVERAGE_STAGING.md`.

Unavailable provider cards now identify their accessible state as `Coming
soon`; only actually available cards retain game-entry semantics. This text
change does not alter readiness.

Catalogue presence, credentials, HTTP success, an implemented adapter, staged
report continuity, or a merchant login do not establish launch availability.
Production acceptance and runtime readiness remain independent fail-closed
gates.

## Other operational boundaries

Payment work remains paused. VPay, GSPAY and 1MPay code, credentials, callbacks,
activation flags, service plans and DNS are unchanged by v173. This release
does not enable any real-money payment, payout or live-game switch.

V173 source verification passed: maintenance 12/12, release probe 27/27,
full regression 1,426/1,426 and Render database compatibility 3/3. TypeScript,
lint, diff checks and the Render build also passed. Verification made no live
provider, customer-money or wallet call. This handover records deployment of
the staff-setup route repair only and does not claim production acceptance.

Workspace: `tea-dakfo2h594qs73du231g`.
Publication branch: `codex/v17-render-staging-20261104`.
Portal automatic deployment is off; the recorded gateway automatic deployment
setting is on.
