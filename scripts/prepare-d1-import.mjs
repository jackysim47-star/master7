#!/usr/bin/env node
// Stage a verified MASTER7 logical backup for a *fresh, isolated* D1 schema.
// This never connects to Cloudflare or prints decrypted rows.
import { constants, createDecipheriv, createHash, privateDecrypt } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

process.umask(0o077);
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceContractSha = '2248a62649c40e46b789eaedd44f08a05e269db0e1bd342c914692c5198d3080';
const verifierSha = 'df298e060b6655ed87b64ef37563a954118666b0e68f66d91cd2c19bfc59b568';
const migrationSha = '804e93bfe8767007023af4c822fe2e41f536cdcb60f7402ab9de6b043ce258aa';
const maxImportBytes = 64 * 1024 * 1024; // a larger backup needs an explicit FK-safe batch design
const maxStatementBytes = 95 * 1024; // D1 limits individual SQL statements to 100 KB
const hash = value => createHash('sha256').update(value).digest('hex');

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i], value = process.argv[i + 1];
  if (!key?.startsWith('--') || !value || value.startsWith('--') || args.has(key)) throw new Error('Expected paired, unique arguments');
  args.set(key, value);
}
const required = ['--source-dir', '--backup', '--private-key', '--passphrase-file', '--output'];
if (required.some(key => !args.get(key)) || args.size !== required.length) {
  throw new Error(`Usage: node scripts/prepare-d1-import.mjs ${required.map(key => `${key} PATH`).join(' ')}`);
}
for (const value of args.values()) if (!isAbsolute(value)) throw new Error('All paths must be absolute');
const source = resolve(args.get('--source-dir'));
const backupPath = resolve(args.get('--backup'));
const keyPath = resolve(args.get('--private-key'));
const passPath = resolve(args.get('--passphrase-file'));
const out = resolve(args.get('--output'));
if (!relative(repo, out).startsWith('..')) throw new Error('Output must be outside the repository');
const contractPath = join(source, 'lib/encrypted-backup.ts');
const verifierPath = join(source, 'scripts/verify-encrypted-backup.mjs');
if (hash(readFileSync(contractPath)) !== sourceContractSha || hash(readFileSync(verifierPath)) !== verifierSha) {
  throw new Error('Backup contract or verifier changed; review the new release before staging data');
}

const validation = spawnSync(process.execPath, [verifierPath, backupPath, keyPath, passPath],
  { cwd: source, encoding: 'utf8', timeout: 10 * 60_000, maxBuffer: 1024 * 1024 });
if (validation.error) throw validation.error;
if (validation.status !== 0) throw new Error(`Backup verification failed: ${validation.stderr.trim().slice(0, 500)}`);
const checked = JSON.parse(validation.stdout.trim());
if (checked.status !== 'verified' || checked.readConsistency !== 'transaction_snapshot'
    || checked.foreignKeyViolations !== 0 || checked.coverageComplete !== true) {
  throw new Error('Requires a complete, transaction-consistent backup and clean SQLite restore rehearsal');
}

const { BACKUP_TABLES, BACKUP_EXCLUDED_TABLES, ACCEPTANCE_PROTECTED_TABLES,
  BACKUP_FORMAT, backupRestoreContract, orderBackupRestoreRows } = await import(pathToFileURL(contractPath).href);
const envelopeBytes = readFileSync(backupPath);
const envelope = JSON.parse(envelopeBytes.toString('utf8'));
if (envelope.format !== BACKUP_FORMAT) throw new Error('Invalid backup format');
const contract = backupRestoreContract(envelope.schemaVersion, envelope.schemaSha256);
if (contract.missingTables.length || contract.tables.length !== BACKUP_TABLES.length) throw new Error('Legacy backup coverage is incomplete');
const ciphertext = Buffer.from(envelope.ciphertext, 'base64');
if (hash(ciphertext) !== envelope.ciphertextSha256) throw new Error('Ciphertext changed after verification');
const contentKey = privateDecrypt({ key: readFileSync(keyPath), passphrase: readFileSync(passPath, 'utf8').trim(),
  oaepHash: 'sha256', padding: constants.RSA_PKCS1_OAEP_PADDING }, Buffer.from(envelope.encryptedKey, 'base64'));
const decipher = createDecipheriv('aes-256-gcm', contentKey, Buffer.from(envelope.iv, 'base64'));
decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'));
const plaintext = gunzipSync(Buffer.concat([decipher.update(ciphertext), decipher.final()]));
if (hash(plaintext) !== envelope.plaintextSha256) throw new Error('Plaintext hash mismatch');
const payload = JSON.parse(plaintext.toString('utf8'));
if (payload.schemaVersion !== envelope.schemaVersion || payload.schemaSha256 !== envelope.schemaSha256
    || payload.readConsistency !== 'transaction_snapshot' || payload.release !== checked.release) {
  throw new Error('Backup metadata changed after verification');
}
const manifest = payload.manifest?.tables;
if (!Array.isArray(manifest) || manifest.length !== BACKUP_TABLES.length
    || manifest.some((item, i) => item.name !== BACKUP_TABLES[i]
      || item.rows !== payload.tables[item.name]?.length
      || item.sha256 !== hash(JSON.stringify(payload.tables[item.name])))) {
  throw new Error('Table manifest mismatch');
}
if (payload.manifest.totalRecords !== manifest.reduce((sum, item) => sum + item.rows, 0)) throw new Error('Record total mismatch');
if (hash(envelopeBytes) !== hash(readFileSync(backupPath))) throw new Error('Backup file changed during staging');

const migrationDir = join(source, 'drizzle');
const migrations = readdirSync(migrationDir).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort();
if (hash(migrations.map(name => `${name}:${hash(readFileSync(join(migrationDir, name)))}`).join('\n')) !== migrationSha) {
  throw new Error('D1 migration files changed; review target schema before staging data');
}
// D1 owns the transaction. Only strip standalone wrappers in the pinned
// migrations; BEGIN/END inside triggers must remain intact.
const rehearsalSchema = [
  '-- Empty rehearsal schema only; not an in-place upgrade.',
  "SELECT CASE WHEN (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('_cf_KV','d1_migrations'))=0 THEN 1 ELSE json_extract('MASTER7_SCHEMA_TARGET_IS_NOT_EMPTY','$.abort') END;",
  'PRAGMA defer_foreign_keys=ON;',
  ...migrations.map(name => `-- ${name}\n${readFileSync(join(migrationDir, name), 'utf8')
    .replace(/^[ \t]*(?:BEGIN|COMMIT);[ \t]*\r?$/gm, '')
    .replace(/^[ \t]*PRAGMA foreign_keys=(?:OFF|ON);[ \t]*\r?$/gm, '')}`),
].join('\n') + '\n';
const createSchema = (forD1 = false) => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  if (forD1) db.exec(`BEGIN;\n${rehearsalSchema}\nCOMMIT;`);
  else for (const migration of migrations) db.exec(readFileSync(join(migrationDir, migration), 'utf8'));
  return db;
};
const baseline = createSchema();
const count = (db, table) => Number(db.prepare(`SELECT COUNT(*) AS n FROM "${table}"`).get().n);
const baselineCounts = Object.fromEntries(BACKUP_TABLES.map(table => [table, count(baseline, table)]));
const quote = value => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value))) throw new Error('Unsafe numeric backup value');
    return String(value);
  }
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (text.includes('\0')) throw new Error('NUL string requires a dedicated binary importer');
  return `'${text.replaceAll("'", "''")}'`;
};
const sumAmount = table => payload.tables[table].reduce((sum, row) => {
  const value = row.amount_minor;
  if ((typeof value !== 'number' || !Number.isSafeInteger(value)) && (typeof value !== 'string' || !/^-?\d+$/.test(value))) {
    throw new Error(`Unsafe amount_minor in ${table}`);
  }
  return sum + BigInt(value);
}, 0n).toString();
const ledgerTables = ['wallet_ledger', 'game_wallet_ledger', 'game_wallet_postings'];
const expectedLedger = Object.fromEntries(ledgerTables.map(table => [table, {
  rows: payload.tables[table].length, amountMinorSum: sumAmount(table),
}]));

// D1's migration markers describe the target schema and must remain its own.
// All other durable tables are replaced only after the target matches a fresh
// migration baseline. No production D1 is contacted by this script.
const skipped = new Set(['portal_schema_migrations']);
let sql = '-- MASTER7 V17 isolated D1 import; contains private data; never commit or share.\n';
sql += 'PRAGMA defer_foreign_keys=ON;\n';
for (const table of BACKUP_TABLES) {
  sql += `SELECT CASE WHEN (SELECT COUNT(*) FROM "${table}")=${baselineCounts[table]} THEN 1 ELSE json_extract('MASTER7_TARGET_IS_NOT_FRESH','$.abort') END;\n`;
}
for (const table of [...BACKUP_TABLES].reverse()) {
  if (!skipped.has(table) && !ACCEPTANCE_PROTECTED_TABLES.includes(table)) sql += `DELETE FROM "${table}";\n`;
}
const parts = [];
for (const table of BACKUP_TABLES) {
  if (skipped.has(table)) continue;
  const start = Buffer.byteLength(sql);
  sql += `-- table ${table}: ${payload.tables[table].length} rows\n`;
  for (const row of orderBackupRestoreRows(table, payload.tables[table])) {
    const columns = Object.keys(row);
    if (!columns.length || columns.some(column => !/^[a-z][a-z0-9_]*$/.test(column))) throw new Error(`Invalid columns in ${table}`);
    const line = `INSERT INTO "${table}" (${columns.map(column => `"${column}"`).join(',')}) VALUES (${columns.map(column => quote(row[column])).join(',')});\n`;
    if (Buffer.byteLength(line) > maxStatementBytes) throw new Error(`D1 statement too long in ${table}`);
    sql += line;
    if (Buffer.byteLength(sql) > maxImportBytes) throw new Error('Import exceeds safe single-file limit; design FK-safe batches');
  }
  parts.push({ table, rows: payload.tables[table].length, startByte: start, endByte: Buffer.byteLength(sql) });
}
sql += 'PRAGMA foreign_key_check;\n';

// Exercise the exact generated SQL against an isolated SQLite schema. D1 runs
// imported SQL in an implicit transaction, so the rehearsal wraps it locally.
const staged = createSchema(true);
try {
  const schemaObjects = db => db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all();
  if (JSON.stringify(schemaObjects(staged)) !== JSON.stringify(schemaObjects(baseline))) {
    throw new Error('D1 rehearsal schema differs from the pinned SQLite schema');
  }
  staged.exec(`BEGIN;\n${sql}\nCOMMIT;`);
  if (staged.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Local foreign-key check failed');
  for (const table of BACKUP_TABLES) {
    const expected = skipped.has(table) ? baselineCounts[table] : payload.tables[table].length;
    if (count(staged, table) !== expected) throw new Error(`Local row count mismatch in ${table}`);
  }
  for (const table of BACKUP_EXCLUDED_TABLES) if (count(staged, table) !== 0) throw new Error(`Transient table populated: ${table}`);
  for (const table of ledgerTables) {
    const result = staged.prepare(`SELECT COALESCE(SUM(amount_minor),0) AS n FROM "${table}"`).get();
    if (String(result.n) !== expectedLedger[table].amountMinorSum) throw new Error(`Ledger sum mismatch in ${table}`);
  }
} finally { staged.close(); baseline.close(); }

const outputManifest = {
  source: 'MASTER7 V17 encrypted logical backup', release: payload.release,
  backupSha256: hash(envelopeBytes), schemaVersion: envelope.schemaVersion,
  schemaSha256: envelope.schemaSha256, readConsistency: payload.readConsistency,
  migrationCount: migrations.length, latestMigration: migrations.at(-1),
  migrationSha256: migrationSha,
  skippedSchemaMetadata: [...skipped], excludedTransientTables: [...BACKUP_EXCLUDED_TABLES],
  tables: manifest.map(item => ({ name: item.name, rows: item.rows, sha256: item.sha256,
    targetBaselineRows: baselineCounts[item.name], imported: !skipped.has(item.name) })),
  chunks: parts, ledger: expectedLedger, importSqlSha256: hash(sql),
  rehearsalSchemaSqlSha256: hash(rehearsalSchema),
  localDryRun: { foreignKeyViolations: 0, rowCountsMatched: true, ledgerSumsMatched: true },
};
const postflight = ["PRAGMA foreign_key_check;",
  ...BACKUP_TABLES.filter(table => !skipped.has(table)).map(table => `SELECT '${table}' AS table_name, COUNT(*) AS rows FROM "${table}";`),
  ...ledgerTables.map(table => `SELECT '${table}' AS ledger, COUNT(*) AS rows, COALESCE(SUM(amount_minor),0) AS amount_minor_sum FROM "${table}";`),
].join('\n') + '\n';
mkdirSync(out, { mode: 0o700 }); // refuse existing directories and prevent accidental overwrite
try {
  writeFileSync(join(out, 'schema.sql'), rehearsalSchema, { mode: 0o600, flag: 'wx' });
  writeFileSync(join(out, 'import.sql'), sql, { mode: 0o600, flag: 'wx' });
  writeFileSync(join(out, 'manifest.json'), `${JSON.stringify(outputManifest, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  writeFileSync(join(out, 'postflight.sql'), postflight, { mode: 0o600, flag: 'wx' });
} catch (error) { rmSync(out, { recursive: true, force: true }); throw error; }
console.log(JSON.stringify({ status: 'staged_only', output: out, tables: parts.length,
  rows: parts.reduce((sum, part) => sum + part.rows, 0),
  importBytes: Buffer.byteLength(sql), importSqlSha256: outputManifest.importSqlSha256,
  localDryRun: outputManifest.localDryRun }));
