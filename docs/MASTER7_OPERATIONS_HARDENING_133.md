# MASTER7 V17 `.133` operations hardening

Release: `17.0.0-selfbuilt.133-operations-hardening`

This release hardens runtime operations and adds flexible public contacts and approved advertising IDs. It does not enable real-money deposits, payouts, or unaccepted game providers.

## Runtime and readiness

- PostgreSQL pools are capped at five connections per web instance. Startup migrations and runtime requests use the same validated pool settings, idle expiry, connection lifetime, and TCP keepalive.
- Idle PostgreSQL errors are handled without logging database URLs or credentials.
- HTTP responses include HSTS, MIME-sniffing protection, `SAMEORIGIN`, no-referrer, restricted permissions, and cross-domain policy headers.
- Production readiness requires a current encrypted backup for this release and a matching successful isolated PostgreSQL restore rehearsal. `/health` exposes the corresponding readiness flags, timestamps, and blockers.
- Render remains fixed at one 2c/4g instance after the 2026-11-09 PostgreSQL connection exhaustion incident. Autoscaling must remain disabled until the database budget and multi-instance scheduler behavior are load tested.

## Flexible public contacts and tracking

- Owners can add, remove, reorder, enable, and disable typed public contact entries without code changes. Staff can inspect the configuration but cannot change it.
- Owners can configure validated Meta numeric IDs and Google `G-` or `AW-` IDs. Arbitrary scripts and custom financial or identity events are rejected.
- Public tracking is limited to approved SDK origins and PageView behavior, with advanced matching and personalization disabled.
- Changes use revision comparison, immutable history, and audit events. Public responses contain enabled entries only.
- Admin actions and checkboxes have consistent touch targets and larger readable text in Chinese, English, and Bahasa Melayu.

## Verification

- Maintenance controls: 12/12
- Release probes: 25/25
- Regression: 1,199/1,199
- Render database adapter: 3/3
- TypeScript, lint, and Render build: passed

These checks validate the program and build. They do not prove a live provider launch, a provider settlement, a real payment callback, a real wallet credit, or merchant settlement.

## Activation state

The release preserves fail-closed controls for new deposits, new game launches, and new payouts. Thirty-seven provider brands remain registered for management, while production acceptance is tracked per profile. A profile must not be shown as live until its provider-issued launch, wallet, settlement, recovery, and reconciliation evidence has passed.

GSPAY USDT and 1MPay payout remain unimplemented pending complete provider contracts. Manual Bank remains closed until a real company account and reconciliation evidence are configured.
