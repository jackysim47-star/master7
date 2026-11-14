# MASTER7 V17 Cloudflare preview build

This procedure builds the pinned production V17 source archive from `release/v17.3-production` into a separate Cloudflare Worker preview. It does not change Render, registrar nameservers, production DNS, or transaction settings.

## Prepare the build

Use Node.js 24 and pnpm through Corepack. From the repository root, set a fresh output directory outside this repository:

```sh
node scripts/prepare-cloudflare-v17.mjs \
  --database-id "$MASTER7_D1_ID" \
  --database-name master7-v17-migration \
  --worker-name master7-v17-migration \
  --output /tmp/master7-v17-cloudflare-preview
```

Get `MASTER7_D1_ID` from the intended Cloudflare account's D1 database. The script checks the archive and production host-routing overlay hashes, extracts them into the new directory, installs the pinned dependencies, builds the Worker and static assets, and patches the generated `dist/server/wrangler.json`. The generated D1 binding is `DB`; all new deposits, game launches, payouts, provider orders and recovery, WhatsApp sending, and AI calls are disabled. The config has no production routes and exposes only the `workers.dev` preview. It includes no credentials.

Review the generated config, Worker bundle, and client assets before deployment. Use Cloudflare credentials from the operator's environment, never from this repository. From the generated source directory, deploy the preview only when ready:

```sh
corepack pnpm exec wrangler deploy --config dist/server/wrangler.json
```

The source archive is D1 native; Render runs the same application through `RenderD1Compat` against PostgreSQL. This build does not copy PostgreSQL business records into D1. Keep transaction switches disabled until the payment and game suppliers have independently passed acceptance.

## Stage an encrypted logical backup for D1

After the production owner has made a transaction-consistent encrypted logical backup and verified an isolated PostgreSQL restore, prepare SQL **locally** from the owner-held backup and decryption key. Use the extracted V17 source directory produced above, and a new private output directory outside the repository:

```sh
node scripts/prepare-d1-import.mjs \
  --source-dir /tmp/master7-v17-cloudflare-preview/master7-v17-render-staging \
  --backup /private/backup.json \
  --private-key /private/restore-key.pem \
  --passphrase-file /private/restore-passphrase.txt \
  --output /private/master7-d1-staged-import
```

The script reuses the release's encrypted-backup verifier, pins its contract and 55 migration files, requires full backup coverage and a transaction snapshot, checks manifest hashes, and rehearses the generated SQL against a fresh in-memory SQLite schema. It checks foreign keys, row counts, wallet ledger sums, and excluded session/lock tables. The generated `import.sql` guards the fresh schema's initial row counts before replacing seeded rows; it preserves the target's own `portal_schema_migrations` records. Review `manifest.json` and compare `postflight.sql` output after any isolated import.

**The staged SQL contains plaintext customer and financial data.** It is written with private filesystem permissions and must never enter GitHub, chat, or a shared folder. The script does not contact D1. Apply it only to a newly created, isolated D1 rehearsal database with the exact source migrations; Cloudflare supports `wrangler d1 execute DATABASE --remote --file=import.sql`, but remote import and data parity remain separate operator steps. The script currently stops if the SQL exceeds 64 MiB or one statement exceeds 95 KiB; larger backups need an explicit foreign-key-safe chunk plan. Do not use the live preview database as a rehearsal target.

## Domain cutover blocker (2026-11-14 read-only check)

`master7.best` and `master7.site` are still pending in Cloudflare. Public nameservers remain Spaceship `launch1.spaceship.net` and `launch2.spaceship.net`. Parent-zone DS records exist for both domains while Cloudflare DNSSEC is disabled; switching nameservers before removing stale DS records and allowing their TTL to expire can cause DNSSEC validation failures. Three current A records have been copied as DNS-only into the pending zones (`master7.best` apex, `master7.site` apex, `www.master7.site`). Confirm all DNS records, DS removal, delegation, TLS and origin routing before any cutover. No registrar change is part of this PR.
