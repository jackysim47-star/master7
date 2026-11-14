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

The source archive is D1 native; Render runs the same application through `RenderD1Compat` against PostgreSQL. This build does not copy PostgreSQL business records into D1. Before domain cutover, obtain a restorable production backup and an isolated restore receipt, perform a deliberate row-level migration with foreign-key and ledger parity checks, then verify authentication and public/static routes against the preview. Existing encrypted backup tooling includes a PostgreSQL restore rehearsal, but this branch has no automatic PostgreSQL-to-D1 importer. Keep transaction switches disabled until the payment and game suppliers have independently passed acceptance.
