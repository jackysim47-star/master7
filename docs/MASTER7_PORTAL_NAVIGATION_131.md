# MASTER7 V17 .131 — portal navigation

When an owner or staff member opened payment readiness, game readiness or Rewards on a narrow phone, nested grid items expanded to the full table/editor width. The resulting horizontal page overflow made the menu and adjacent actions hard to reach. Tables and the seven-day editor now scroll inside their own containers; table regions also support keyboard focus and have localized accessible names.

The existing shared owner/staff entry and server role checks remain in use. Frontend menu navigation was exercised against the actual API handler and a complete isolated SQLite schema with synthetic role accounts. No supplier API, bank transfer or production wallet write is part of this test.

Verification: `pnpm run verify:render` passed (maintenance 12, release probes 25, regression 1154, database adapter 3, TypeScript, lint and Render build). The browser audit passed 420 navigation checks: owner 234, staff 132, member 54, at 390/1280px in English, Chinese and Malay, with zero broken targets, page overflows, API error responses or uncaught browser errors. Browser navigation does not attest supplier authorization, actual payment, wallet credit from a real deposit, game launch acceptance or production DNS.

There are no database migrations or new secrets in this release. Cash acceptance and provider recovery controls keep their existing settings. Rollback uses the preceding .130 archive/commit; no data rollback is necessary for this presentation change.
