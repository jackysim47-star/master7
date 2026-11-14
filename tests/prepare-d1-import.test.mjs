import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createPublicKey, generateKeyPairSync } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');

test('stages an encrypted synthetic backup with FK, count, ledger and transient checks', async t => {
  const scratch = mkdtempSync(join(tmpdir(), 'master7-d1-import-test-'));
  const keepSynthetic = process.env.MASTER7_KEEP_SYNTHETIC === '1';
  t.after(() => {
    if (keepSynthetic) console.log(`SYNTHETIC_STAGED_DIR=${join(scratch, 'staged')}`);
    else rmSync(scratch, { recursive: true, force: true });
  });
  const extraction = spawnSync('tar', ['-xzf', join(repo, 'master7-v17-render-staging.tar.gz'), '-C', scratch]);
  assert.equal(extraction.status, 0);
  const source = join(scratch, 'master7-v17-render-staging');
  const { createEncryptedPortalBackup, BACKUP_TABLES } = await import(pathToFileURL(join(source, 'lib/encrypted-backup.ts')).href);
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  sqlite.exec('PRAGMA foreign_keys=ON');
  for (const file of readdirSync(join(source, 'drizzle')).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort()) {
    sqlite.exec(readFileSync(join(source, 'drizzle', file), 'utf8'));
  }
  sqlite.exec(`
    INSERT INTO users(id,username,role,approved,csrf,created_at)
      VALUES('synthetic-owner','synthetic_owner','owner',1,'synthetic-csrf',1),
            ('synthetic-member','synthetic_member','member',1,'synthetic-csrf-2',1);
    INSERT INTO deposit_orders(id,user_id,request_key,fingerprint,provider,amount_minor,currency,trade_code,status,created_at,updated_at)
      VALUES('synthetic-deposit','synthetic-member','synthetic-request','synthetic-fingerprint','manual_bank',1000,'MYR','synthetic-trade','credited',1,2);
    INSERT INTO wallet_ledger(id,order_id,user_id,account_code,amount_minor,currency,created_at)
      VALUES('synthetic-credit','synthetic-deposit','synthetic-member','member',1000,'MYR',2),
            ('synthetic-clearing','synthetic-deposit','synthetic-member','provider_clearing',-1000,'MYR',2);
    INSERT INTO password_sessions(token_hash,user_id,csrf,credential_version,expires_at,created_at)
      VALUES('synthetic-session','synthetic-member','synthetic-csrf-2',1,9999999999,1);
  `);
  const passphrase = 'synthetic-passphrase-only';
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem', cipher: 'aes-256-cbc', passphrase },
  });
  const fingerprint = createHash('sha256').update(createPublicKey(publicKey).export({ type: 'spki', format: 'der' })).digest('hex');
  const db = {
    prepare(sql) { return { bind(...values) { return { all: async () => ({ results: sqlite.prepare(sql).all(...values) }) }; } }; },
    async withReadSnapshot(fn) { return fn(this); },
  };
  const { envelope } = await createEncryptedPortalBackup(db, 'synthetic-release', { publicKey, publicKeySha256: fingerprint });
  const backup = join(scratch, 'synthetic-backup.json');
  const key = join(scratch, 'synthetic-private.pem');
  const pass = join(scratch, 'synthetic-passphrase.txt');
  const output = join(scratch, 'staged');
  writeFileSync(backup, JSON.stringify(envelope), { mode: 0o600 });
  writeFileSync(key, privateKey, { mode: 0o600 });
  writeFileSync(pass, passphrase, { mode: 0o600 });
  const run = path => spawnSync(process.execPath, [join(repo, 'scripts/prepare-d1-import.mjs'),
    '--source-dir', source, '--backup', path, '--private-key', key,
    '--passphrase-file', pass, '--output', output], { cwd: repo, encoding: 'utf8', timeout: 120_000 });
  const result = run(backup);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'staged_only');
  const manifest = JSON.parse(readFileSync(join(output, 'manifest.json'), 'utf8'));
  assert.equal(manifest.tables.length, BACKUP_TABLES.length);
  assert.equal(manifest.tables.find(item => item.name === 'wallet_ledger').rows, 2);
  assert.equal(manifest.ledger.wallet_ledger.amountMinorSum, '0');
  assert.ok(manifest.excludedTransientTables.includes('password_sessions'));
  assert.equal(manifest.localDryRun.foreignKeyViolations, 0);
  assert.equal(manifest.tables.find(item => item.name === 'portal_schema_migrations').imported, false);
  const sql = readFileSync(join(output, 'import.sql'), 'utf8');
  assert.ok(sql.includes('PRAGMA defer_foreign_keys=ON'));
  assert.ok(!sql.includes('synthetic-session'));
  assert.ok(sql.includes('synthetic-credit'));
  const schema = readFileSync(join(output, 'schema.sql'), 'utf8');
  assert.ok(!/^[ \t]*(?:BEGIN|COMMIT);/m.test(schema));
  assert.equal(createHash('sha256').update(schema).digest('hex'), manifest.rehearsalSchemaSqlSha256);
  const remoteShape = new DatabaseSync(':memory:');
  try {
    remoteShape.exec('PRAGMA foreign_keys=ON');
    remoteShape.exec(`BEGIN;\n${schema}\nCOMMIT;`);
    const objects = db => db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all();
    assert.deepEqual(objects(remoteShape), objects(sqlite));
    remoteShape.exec(`BEGIN;\n${sql}\nCOMMIT;`);
    assert.equal(remoteShape.prepare('SELECT COUNT(*) AS n FROM users').get().n, 2);
    assert.equal(remoteShape.prepare('SELECT SUM(amount_minor) AS n FROM wallet_ledger').get().n, 0);
    assert.deepEqual(remoteShape.prepare('PRAGMA foreign_key_check').all(), []);
    assert.throws(() => remoteShape.exec(schema), /malformed JSON/);
    assert.equal(remoteShape.prepare('SELECT COUNT(*) AS n FROM users').get().n, 2);
  } finally { remoteShape.close(); }
  const nonFresh = new DatabaseSync(':memory:');
  try {
    nonFresh.exec('PRAGMA foreign_keys=ON');
    for (const file of readdirSync(join(source, 'drizzle')).filter(name => /^\d{4}_.+\.sql$/.test(name)).sort()) {
      nonFresh.exec(readFileSync(join(source, 'drizzle', file), 'utf8'));
    }
    nonFresh.exec("INSERT INTO users(id,username,role,approved,csrf,created_at) VALUES('existing','existing_user','owner',1,'existing-csrf',1)");
    assert.throws(() => nonFresh.exec(`BEGIN;\n${sql}\nCOMMIT;`), /malformed JSON/);
  } finally { nonFresh.close(); }
  const tampered = join(scratch, 'tampered.json');
  writeFileSync(tampered, JSON.stringify({ ...envelope, ciphertextSha256: '0'.repeat(64) }), { mode: 0o600 });
  const failed = run(tampered);
  assert.notEqual(failed.status, 0);
});
