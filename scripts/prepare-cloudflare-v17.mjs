#!/usr/bin/env node
// Build the pinned V17 archive for an isolated Cloudflare Worker preview.
// This script prepares files locally; it does not authenticate or deploy.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const archive = join(repo, 'master7-v17-render-staging.tar.gz');
const overlay = join(repo, 'production/lib/portal-host-routing.ts');
const archiveSha256 = '9cbb6a05625da4857c55db7b4283ff1e29aa63ad5262f3c8dddef1332713b8e3';
const overlaySha256 = '1fec245fe0ddc78a2a387c8751b2e2e312d04394d1a2aadcfbc56506b88c126c';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i];
  const value = process.argv[i + 1];
  if (!key?.startsWith('--') || !value || value.startsWith('--') || args.has(key)) {
    throw new Error('Usage: node scripts/prepare-cloudflare-v17.mjs --database-id UUID --output ABSOLUTE_PATH [--worker-name NAME] [--database-name NAME]');
  }
  args.set(key, value);
}
for (const key of args.keys()) {
  if (!['--database-id', '--output', '--worker-name', '--database-name'].includes(key)) {
    throw new Error(`Unknown argument: ${key}`);
  }
}

const dbId = args.get('--database-id');
const output = args.get('--output');
const workerName = args.get('--worker-name') ?? 'master7-v17-migration';
const databaseName = args.get('--database-name') ?? 'master7-v17-migration';
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dbId ?? '')) {
  throw new Error('A Cloudflare D1 database UUID is required');
}
if (!/^[a-z0-9_][a-z0-9-_]*$/.test(workerName) || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(databaseName)) {
  throw new Error('Invalid Worker or D1 database name');
}
if (!output || !isAbsolute(output)) throw new Error('--output must be an absolute path');
const out = resolve(output);
const rel = relative(repo, out);
if (!rel.startsWith('..') || existsSync(out)) {
  throw new Error('Choose a new output directory outside the repository');
}

const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
if (sha256(archive) !== archiveSha256 || sha256(overlay) !== overlaySha256) {
  throw new Error('Production source has changed; review and update the pinned hashes before building');
}
const run = (command, commandArgs, cwd = repo) => {
  const result = spawnSync(command, commandArgs, { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status}`);
};

run('mkdir', ['-p', out]);
run('tar', ['-xzf', archive, '-C', out]);
const source = join(out, 'master7-v17-render-staging');
copyFileSync(overlay, join(source, 'lib/portal-host-routing.ts'));
run('corepack', ['pnpm', 'install', '--frozen-lockfile'], source);
run('corepack', ['pnpm', 'build'], source);

const configPath = join(source, 'dist/server/wrangler.json');
const config = JSON.parse(readFileSync(configPath, 'utf8'));
if (config.d1_databases?.length !== 1 || config.d1_databases[0].binding !== 'DB'
    || Object.keys(config.vars ?? {}).length || config.route || config.routes?.length
    || !config.compatibility_flags?.includes('nodejs_compat')
    || !config.assets?.directory || !existsSync(join(source, 'dist/client/assets/style.css'))) {
  throw new Error('Unexpected V17 Worker build output; review it before deployment');
}
config.name = workerName;
config.topLevelName = workerName;
config.d1_databases = [{ binding: 'DB', database_name: databaseName, database_id: dbId }];
config.workers_dev = true;
config.routes = [];
config.vars = Object.fromEntries([
  'PORTAL_NEW_DEPOSITS_ENABLED', 'PORTAL_NEW_GAME_LAUNCHES_ENABLED', 'PORTAL_NEW_PAYOUTS_ENABLED',
  'PORTAL_MEGA_TRANSFERS_ENABLED', 'PORTAL_MEGA_LIVE_GAMES_ENABLED', 'PORTAL_MEGA_SETTLEMENT_VERIFIED',
  'VPAY_ORDERS_ENABLED', 'VPAY_RECOVERY_ENABLED', 'VPAY_PAYOUT_ENABLED',
  'GSPAY_ORDERS_ENABLED', 'GSPAY_RECOVERY_ENABLED', 'GSPAY_PAYOUT_ENABLED', 'GSPAY_BALANCE_QUERY_ENABLED',
  'GSPAY_USDT_ORDERS_ENABLED', 'GSPAY_USDT_RECOVERY_ENABLED', 'GSPAY_USDT_BALANCE_QUERY_ENABLED',
  'GSPAY_USDT_CONTRACT_VERIFIED', 'ONE_MPAY_ORDERS_ENABLED', 'ONE_MPAY_RECOVERY_ENABLED',
  'WHATSAPP_SENDING_ENABLED', 'OPENAI_ENABLED',
].map(key => [key, 'false']));
writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ sourceSha256: archiveSha256, workerName, databaseName,
  configPath, assetsDirectory: join(source, 'dist/client'), transactionFlags: 'disabled',
  deployCommand: `cd ${source} && corepack pnpm exec wrangler deploy --config dist/server/wrangler.json`,
}, null, 2));
