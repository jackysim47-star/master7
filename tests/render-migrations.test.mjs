import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { initializePortalDatabase, assertCriticalDatabaseGuards, CRITICAL_DATABASE_GUARDS, CRITICAL_DATABASE_GUARD_FUNCTIONS, criticalDatabaseGuardFunctionSourceSha256, PORTAL_STATUS_MIGRATION, PAYMENT_PROVIDERS_MIGRATION, ONE_MPAY_CHANNEL_MIGRATION, GAME_ACCESS_ZONE_MIGRATION, PAYMENT_ACCEPTANCE_GUARD_MIGRATION, MARKETING_CONTACT_SCALE_MIGRATION, OPERATIONS_AUTOMATION_MIGRATION, SUPPORT_MARKETING_MIGRATION, WHATSAPP_CAMPAIGN_DELIVERY_MIGRATION, REWARDS_HUB_MIGRATION, RESPONSIBLE_PLAY_MIGRATION, COMPANY_BANK_ARTWORK_MIGRATION, NEW_MEMBER_VOUCHER_MIGRATION, VOUCHER_MANUAL_WORKFLOW_MIGRATION, FIXED_VOUCHER_RETIREMENT_MIGRATION, BENEFIT_CLAIM_REVIEW_MIGRATION, MANUAL_COMPLIANCE_MIGRATION, GSPAY_USDT_PROFILE_MIGRATION, GAME_PROVIDER_ADAPTER_CORE_MIGRATION, MEGAH5_LAUNCH_OPERATIONS_MIGRATION, GAME_PROVIDER_ACCEPTANCE_MIGRATION, GENERIC_GAME_WALLET_RISK_MIGRATION, JDB_WAGER_COVERAGE_STAGING_MIGRATION, ACCEPTANCE_LEDGER_INTEGRITY_MIGRATION, GUARD_FUNCTION_SCHEMA_BINDING_MIGRATION, MANUAL_BANK_AUDIT_EVIDENCE_INDEX_MIGRATION, PRIVILEGED_STAFF_PASSWORD_BOUNDARY_MIGRATION, PAYOUT_CONTROL_MIGRATION, GSPAY_PAYOUT_ACTIVATION_MIGRATION, PAYMENT_CHANNEL_ACTIVATION_MIGRATIONS, PORTAL_MIGRATION_ADVISORY_LOCK } from '../lib/render-migrations.mjs';
import {criticalDatabaseGuardRows} from './critical-database-guard-fixture.mjs';

const beforeFinalMigration = [
  '0000_broken_bloodscream.sql','0001_orange_owl.sql','0002_lobby_ads.sql','0003_game_visibility.sql',
  '0004_sponsored_brands.sql','0005_custom_game_cards.sql','0006_malaysia_member_phone.sql',
  '0007_vpay_uat_wallet.sql','0008_member_sms_otp.sql','0009_game_payment_statuses.sql',
  '0010_game_visibility_artwork.sql','0011_provider_artwork.sql',
];

test('base Render schema leaves JDB coverage to the ordered post-adapter migration',()=>{
 const schema=readFileSync(join('db','render-schema.sql'),'utf8');
 assert.doesNotMatch(schema,/CREATE TABLE IF NOT EXISTS jdb_wager_/,'the base schema runs before 0110 creates game_provider_profiles');
});

test('one-time SQL migration snapshots old controls before closing them and seeds the exact catalog', () => {
  const db = new DatabaseSync(':memory:');
  for (const migration of beforeFinalMigration) db.exec(readFileSync(join('drizzle', migration), 'utf8'));
  db.prepare("INSERT INTO users(id,username,role,approved,csrf,created_at) VALUES('owner','owner','owner',1,'csrf',1)").run();
  db.prepare("UPDATE providers SET visible=0 WHERE id='jili'").run();
  db.prepare("INSERT INTO game_visibility(provider_id,game_code,visible,status,updated_by,updated_at) VALUES('jili','old-1',1,'active','owner',1)").run();
  db.prepare("INSERT INTO custom_game_cards(id,title,provider_name,game_code,category,image_data,is_platform_mini,enabled,status,position,created_by,created_at,updated_at) VALUES('old-card','Old card','Old supplier','old-1','SLOT','',0,1,'active',0,'owner',1,1)").run();
  db.prepare("UPDATE payment_channel_controls SET status='active' WHERE provider_id='vpay'").run();

  db.exec(readFileSync(join('drizzle', '0012_close_defaults_and_brand_directory.sql'), 'utf8'));
  assert.deepEqual({ ...db.prepare('SELECT status,visible FROM game_visibility').get() }, { status: 'closed', visible: 0 });
  assert.deepEqual({ ...db.prepare('SELECT status,enabled FROM custom_game_cards').get() }, { status: 'closed', enabled: 0 });
  assert.deepEqual({ ...db.prepare("SELECT status FROM payment_channel_controls WHERE provider_id='vpay'").get() }, { status: 'closed' });
  assert.deepEqual({ ...db.prepare("SELECT visible FROM providers WHERE id='jili'").get() }, { visible: 1 });
  const snapshots = db.prepare(`SELECT entity_type,row_data FROM portal_status_snapshots
    WHERE migration_version=? ORDER BY entity_type`).all(PORTAL_STATUS_MIGRATION);
  assert.deepEqual([...new Set(snapshots.map(row => row.entity_type))], ['custom_game_cards','game_visibility','payment_channel_controls','providers']);
  assert.equal(snapshots.filter(row => row.entity_type === 'payment_channel_controls').length, 4);
  assert.equal(snapshots.filter(row => row.entity_type === 'providers').length, 3);
  assert.equal(JSON.parse(snapshots.find(row => row.entity_type === 'game_visibility').row_data).status, 'active');
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM brand_directory_entries').get().count, 76);
  assert.deepEqual(db.prepare('SELECT category,COUNT(*) AS count FROM brand_directory_entries GROUP BY category ORDER BY category').all().map(row => ({...row})), [
    { category: 'FAST GAME', count: 2 }, { category: 'FISH', count: 7 }, { category: 'LIVE', count: 13 },
    { category: 'OTHERS', count: 2 }, { category: 'SLOT', count: 47 }, { category: 'SPORT', count: 5 },
  ]);
  db.close();
});

test('D1 historical promotion migrations never seed a fixed offer and retire a legacy row',()=>{
 const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE users(id TEXT PRIMARY KEY,username TEXT NOT NULL,role TEXT NOT NULL,approved INTEGER NOT NULL,csrf TEXT NOT NULL,created_at INTEGER NOT NULL);CREATE TABLE benefit_rules(id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL,rules_json TEXT NOT NULL,status TEXT NOT NULL,created_by TEXT NOT NULL REFERENCES users(id),created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);INSERT INTO users VALUES('owner','owner','owner',1,'csrf',1);");db.exec(readFileSync(join('drizzle','0104_new_member_rm88_voucher.sql'),'utf8'));assert.equal(db.prepare('SELECT COUNT(*) n FROM benefit_rules').get().n,0);db.prepare("INSERT INTO benefit_rules VALUES('new-member-rm88-sponsored','Legacy','Legacy','{}','active','owner',1,1)").run();db.exec(readFileSync(join('drizzle','0106_retire_fixed_rm88_voucher.sql'),'utf8'));assert.equal(db.prepare("SELECT status FROM benefit_rules WHERE id='new-member-rm88-sponsored'").get().status,'draft');db.close();
});

class FakePgClient {
  constructor({ failOnSeed = false, guardRows } = {}) {
    this.events = []; this.applied = new Set(); this.failOnSeed = failOnSeed; this.released = false;
    this.guardRows=guardRows??criticalDatabaseGuardRows();
  }
  async query(sql, params = []) {
    const clean = sql.trim(); this.events.push({ sql: clean, params });
    if (clean === 'BEGIN') return { rows: [] };
    if (clean === 'COMMIT') return { rows: [] };
    if (clean === 'ROLLBACK') { this.applied.clear(); return { rows: [] }; }
    if (clean.startsWith('SELECT version FROM portal_schema_migrations')) return { rows: this.applied.has(params[0]) ? [{ version: params[0] }] : [] };
    if (clean.includes('FROM pg_catalog.pg_trigger')) return { rows: this.guardRows };
    if (clean.startsWith("SELECT id FROM users WHERE role='owner'")) return { rows: [{ id: 'owner' }] };
    if (clean.startsWith('INSERT INTO portal_schema_migrations')) this.applied.add(params[0]);
    if (clean.startsWith('INSERT INTO brand_directory_entries') && this.failOnSeed) throw new Error('seed failed');
    return { rows: [] };
  }
  release() { this.released = true; }
}

test('Render startup status migration is transactional, idempotent and rolls back a failed catalog seed', async t => {
  const client = new FakePgClient();
  const pool = { connect: async () => client };
  const entries = JSON.parse(readFileSync(join('db', 'vendor-directory.json'), 'utf8'));
  const first = await initializePortalDatabase(pool, 'CREATE TABLE test_schema(id INTEGER);', entries);
  assert.deepEqual(first, { migrated: true, connectedServicesOpened: true, seededBrandCount: 76, criticalDatabaseGuardsReady:true, criticalDatabaseGuardCount:9, criticalDatabaseGuardTables:5, criticalDatabaseGuardFunctionCount:5 });
  const lock=client.events.find(event=>event.sql==='SELECT pg_advisory_xact_lock($1)');assert.deepEqual(lock?.params,[PORTAL_MIGRATION_ADVISORY_LOCK]);
  const pinnedSchema=client.events.find(event=>event.sql==="SELECT pg_catalog.set_config('search_path',$1,true)");assert.deepEqual(pinnedSchema?.params,['public, pg_catalog, pg_temp']);
  assert.ok(client.events.findIndex(event=>event.sql==='SELECT pg_advisory_xact_lock($1)')<client.events.findIndex(event=>event.sql==='CREATE TABLE test_schema(id INTEGER);'));
  const snapshots = client.events.filter(event => event.sql.startsWith('INSERT INTO portal_status_snapshots'));
  assert.equal(snapshots.length, 8);
  assert.ok(client.applied.has(PAYMENT_ACCEPTANCE_GUARD_MIGRATION));
  assert.ok(client.applied.has(MARKETING_CONTACT_SCALE_MIGRATION));
  assert.ok(client.applied.has(OPERATIONS_AUTOMATION_MIGRATION));
  assert.ok(client.applied.has(SUPPORT_MARKETING_MIGRATION));
  assert.ok(client.applied.has(WHATSAPP_CAMPAIGN_DELIVERY_MIGRATION));
  assert.ok(client.applied.has(REWARDS_HUB_MIGRATION));
  assert.ok(client.applied.has(RESPONSIBLE_PLAY_MIGRATION));
  assert.ok(client.applied.has(MANUAL_COMPLIANCE_MIGRATION));
  assert.ok(client.applied.has(GSPAY_USDT_PROFILE_MIGRATION));
  assert.ok(client.applied.has(GAME_PROVIDER_ADAPTER_CORE_MIGRATION));
  assert.ok(client.applied.has(MEGAH5_LAUNCH_OPERATIONS_MIGRATION));
  assert.ok(client.applied.has(GAME_PROVIDER_ACCEPTANCE_MIGRATION));
  assert.ok(client.applied.has(GENERIC_GAME_WALLET_RISK_MIGRATION));
  assert.ok(client.applied.has(JDB_WAGER_COVERAGE_STAGING_MIGRATION));
  assert.ok(client.applied.has(ACCEPTANCE_LEDGER_INTEGRITY_MIGRATION));
  assert.ok(client.applied.has(GUARD_FUNCTION_SCHEMA_BINDING_MIGRATION));
  assert.ok(client.applied.has(MANUAL_BANK_AUDIT_EVIDENCE_INDEX_MIGRATION));
  assert.ok(client.applied.has(PRIVILEGED_STAFF_PASSWORD_BOUNDARY_MIGRATION));
  assert.equal(client.events.filter(event=>event.sql.startsWith('CREATE INDEX IF NOT EXISTS audit_manual_bank_payout_paid_evidence')).length,1);
  assert.equal(client.events.filter(event=>event.sql.startsWith('CREATE OR REPLACE FUNCTION \"public\".')).length,5);
  const acceptanceIntegritySql=client.events.map(event=>event.sql).join('\n');
  for(const trigger of ['game_provider_acceptance_events_immutable','game_provider_acceptance_events_no_truncate','production_acceptance_events_immutable','production_acceptance_events_no_truncate','game_provider_acceptance_current_monotonic','game_provider_acceptance_current_no_truncate','production_acceptance_current_monotonic','production_acceptance_current_no_truncate'])assert.match(acceptanceIntegritySql,new RegExp(`CREATE TRIGGER ${trigger}\\b`));
  assert.match(acceptanceIntegritySql,/game provider acceptance projection is not current/);
  assert.match(acceptanceIntegritySql,/production acceptance projection is not current/);
  assert.match(acceptanceIntegritySql,/history revisions must be contiguous/);
  assert.match(acceptanceIntegritySql,/MIN\(revision\).*MAX\(revision\).*COUNT\(\*\)/s);
  assert.ok(!client.events.some(event=>event.sql.startsWith('INSERT INTO game_provider_profiles')&&event.sql.includes("'jdb_myr'")),'0121 never creates or mutates a provider profile');
  const jdbCoverageSql=client.events.find(event=>event.sql.startsWith('CREATE TABLE IF NOT EXISTS jdb_wager_sync_windows'))?.sql??'';
  for(const table of ['jdb_wager_sync_windows','jdb_wager_receipts','jdb_wager_identities','jdb_wager_event_versions','jdb_wager_observations'])assert.match(jdbCoverageSql,new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`));
  assert.match(jdbCoverageSql,/source_finality_verified = 0/);assert.match(jdbCoverageSql,/session_closure_verified = 0/);assert.match(jdbCoverageSql,/merchant_authorization_verified = 0/);assert.match(jdbCoverageSql,/coverage_complete = 0/);
  for(const name of ['game_provider_sessions_user_status','game_wallet_transfers_user_status','game_transactions_user_status'])assert.ok(client.events.some(event=>event.sql.startsWith('CREATE INDEX IF NOT EXISTS '+name)));
  assert.ok(client.applied.has(COMPANY_BANK_ARTWORK_MIGRATION));
  assert.ok(client.applied.has(NEW_MEMBER_VOUCHER_MIGRATION));
  assert.ok(client.applied.has(VOUCHER_MANUAL_WORKFLOW_MIGRATION));
  assert.ok(client.applied.has(BENEFIT_CLAIM_REVIEW_MIGRATION));
  assert.ok(client.applied.has(FIXED_VOUCHER_RETIREMENT_MIGRATION));
  assert.ok(client.applied.has(PAYOUT_CONTROL_MIGRATION));
  assert.ok(client.events.some(event=>event.sql.startsWith('ALTER TABLE marketing_contacts ADD COLUMN IF NOT EXISTS consented_at')));
  assert.ok(client.events.some(event=>event.sql.startsWith('CREATE TABLE IF NOT EXISTS ticket_reads')));
  assert.ok(client.events.some(event=>event.sql.startsWith('CREATE UNIQUE INDEX IF NOT EXISTS marketing_contacts_unsubscribe')));
  assert.ok(client.events.some(event=>event.sql.startsWith('ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS template_name')));
  assert.ok(client.events.some(event=>event.sql.startsWith('ALTER TABLE marketing_deliveries ADD CONSTRAINT marketing_deliveries_status_check')));
  assert.ok(client.events.some(event=>event.sql.startsWith('CREATE UNIQUE INDEX IF NOT EXISTS marketing_deliveries_provider_message')));
  assert.ok(client.events.some(event=>event.sql.startsWith('CREATE TABLE IF NOT EXISTS marketing_webhook_events')));
  assert.ok(client.events.some(event=>event.sql.startsWith('CREATE TABLE IF NOT EXISTS rewards_checkins')));
  assert.ok(client.events.some(event=>event.sql.startsWith('CREATE TABLE IF NOT EXISTS rewards_points_ledger')));
  assert.ok(client.events.some(event=>event.sql.startsWith('CREATE TABLE IF NOT EXISTS responsible_play_profiles')));
  assert.ok(client.events.some(event=>event.sql.startsWith('CREATE TABLE IF NOT EXISTS responsible_play_deposit_reservations')));
  for(const table of ['game_provider_profiles','game_provider_players','game_provider_sessions','game_wallet_transfers','game_rounds','game_transactions','game_wallet_postings','game_callback_receipts','game_wager_sync_cursors','game_recovery_leases'])assert.ok(client.events.some(event=>event.sql.startsWith(`CREATE TABLE IF NOT EXISTS ${table}`)),table);
  for(const table of ['game_provider_acceptance_events','game_provider_acceptance_current'])assert.ok(client.events.some(event=>event.sql.startsWith(`CREATE TABLE IF NOT EXISTS ${table}`)),table);
  assert.ok(client.events.some(event=>event.sql.startsWith('CREATE OR REPLACE FUNCTION responsible_play_reject_active_window_shortening')));
  assert.ok(client.events.some(event=>event.sql.startsWith('CREATE TRIGGER responsible_play_no_active_window_shortening')));
  const usdtProfileWrites=()=>client.events.filter(event=>event.sql.startsWith('INSERT INTO payment_channel_controls')&&event.sql.includes("'gspay_usdt'")).length;
  assert.equal(usdtProfileWrites(),1);
  assert.ok(client.events.some(event=>event.sql.startsWith('INSERT INTO payment_channel_controls')&&event.sql.includes("status='closed'")&&event.sql.includes("ON CONFLICT(provider_id) DO UPDATE")));
  assert.ok(client.events.some(event=>event.sql.startsWith('ALTER TABLE company_bank_accounts ADD COLUMN IF NOT EXISTS image_data')));
  assert.ok(client.events.some(event=>event.sql.startsWith('CREATE TABLE IF NOT EXISTS voucher_manual_reviews')));
  assert.ok(!client.events.some(event=>event.sql.startsWith('INSERT INTO benefit_rules')&&event.sql.includes('new-member-rm88-sponsored')));
  assert.ok(client.events.some(event=>event.sql.startsWith("UPDATE benefit_rules SET status='draft'")&&event.sql.includes('new-member-rm88-sponsored')));
  assert.ok(!client.events.some(event=>event.sql.includes("system-promotions")));
  assert.ok(!client.events.some(event=>event.sql.includes('0028-gspay-decommission')));
  assert.equal(client.events.filter(event=>event.sql.startsWith('CREATE INDEX IF NOT EXISTS marketing_contacts_export')).length,1);
  assert.equal(client.events.filter(event=>event.sql.startsWith('CREATE TABLE IF NOT EXISTS game_provider_profiles')).length,1);
  assert.ok(!client.events.some(event => event.sql.includes("provider_id='vpay'") && event.sql.startsWith('UPDATE payment_channel_controls SET status=\'active\'')));
  const firstStatusUpdate = client.events.findIndex(event => event.sql.startsWith('UPDATE game_visibility'));
  assert.ok(firstStatusUpdate > client.events.findIndex(event => event.sql.startsWith('INSERT INTO portal_status_snapshots')));
  assert.ok(client.events.some(event => event.sql === 'COMMIT'));
  const seed = client.events.find(event => event.sql.startsWith('INSERT INTO brand_directory_entries'));
  assert.equal(JSON.parse(seed.params[0]).length, 76);
  const guardRead=client.events.findIndex(event=>event.sql.includes('FROM pg_catalog.pg_trigger'));
  const guardReadEvent=client.events[guardRead];assert.equal(guardReadEvent.params[0],'public');assert.deepEqual([...guardReadEvent.params[1]].sort(),[...new Set(CRITICAL_DATABASE_GUARDS.map(item=>item.tableName))].sort());
  assert.ok(guardRead>client.events.findIndex(event=>event.sql.includes('INSERT INTO portal_schema_migrations')&&event.params[0]===ACCEPTANCE_LEDGER_INTEGRITY_MIGRATION));
  assert.ok(guardRead>client.events.findIndex(event=>event.sql.includes('INSERT INTO portal_schema_migrations')&&event.params[0]===GUARD_FUNCTION_SCHEMA_BINDING_MIGRATION));
  assert.ok(guardRead>client.events.findIndex(event=>event.sql.includes('INSERT INTO portal_schema_migrations')&&event.params[0]===MANUAL_BANK_AUDIT_EVIDENCE_INDEX_MIGRATION));
  assert.ok(guardRead>client.events.findIndex(event=>event.sql.includes('INSERT INTO portal_schema_migrations')&&event.params[0]===PRIVILEGED_STAFF_PASSWORD_BOUNDARY_MIGRATION));
  assert.ok(guardRead<client.events.findIndex(event=>event.sql.startsWith('INSERT INTO brand_directory_entries')));
  assert.equal(client.released, true);

  const second = await initializePortalDatabase(pool, 'CREATE TABLE test_schema(id INTEGER);', entries);
  assert.deepEqual(second, { migrated: false, connectedServicesOpened: false, seededBrandCount: 76, criticalDatabaseGuardsReady:true, criticalDatabaseGuardCount:9, criticalDatabaseGuardTables:5, criticalDatabaseGuardFunctionCount:5 });
  assert.equal(client.events.filter(event => event.sql.startsWith('UPDATE game_visibility')).length, 2);
  assert.equal(client.events.filter(event => event.sql.startsWith('INSERT INTO portal_status_snapshots')).length, 8);
  assert.equal(client.events.filter(event=>event.sql.startsWith('CREATE OR REPLACE FUNCTION "public".')).length,5);
  assert.equal(client.events.filter(event=>event.sql.startsWith('CREATE INDEX IF NOT EXISTS audit_manual_bank_payout_paid_evidence')).length,1);
  assert.equal(usdtProfileWrites(),1);

  await t.test('seed errors roll back the staged snapshot and status transition', async () => {
    const failedClient = new FakePgClient({ failOnSeed: true });
    await assert.rejects(() => initializePortalDatabase({ connect: async () => failedClient }, 'CREATE TABLE test_schema(id INTEGER);', entries), /seed failed/);
    assert.equal(failedClient.events.at(-1).sql, 'ROLLBACK');
    assert.equal(failedClient.applied.size, 0);
    assert.equal(failedClient.released, true);
  });
});

test('Render startup quarantines each legacy human staff credential exactly once',async()=>{
 class LegacyStaffClient extends FakePgClient{
  async query(sql,params=[]){const clean=sql.trim();if(clean.startsWith('SELECT c.user_id,c.version')){this.events.push({sql:clean,params});return {rows:[{user_id:'legacy-staff',version:3}]};}if(clean.startsWith('UPDATE password_credentials SET salt=$1,password_hash=$2')){this.events.push({sql:clean,params});return {rows:[{version:4}]};}return super.query(sql,params);}
 }
 const client=new LegacyStaffClient(),pool={connect:async()=>client};await initializePortalDatabase(pool,'SELECT 1;',[]);
 const selected=client.events.find(event=>event.sql.startsWith('SELECT c.user_id,c.version'));assert.match(selected.sql,/u\.id<>'system-support-assistant'/);assert.match(selected.sql,/FOR UPDATE OF c,u/);
 const update=client.events.find(event=>event.sql.startsWith('UPDATE password_credentials SET salt=$1,password_hash=$2'));assert.match(update.params[0],/^[A-Za-z0-9_-]{43}$/);assert.match(update.params[1],/^[a-f0-9]{64}$/);assert.deepEqual(update.params.slice(3),['legacy-staff',3]);
 assert.ok(client.events.some(event=>event.sql==='DELETE FROM password_sessions WHERE user_id=$1'&&event.params[0]==='legacy-staff'));assert.ok(client.events.some(event=>event.sql==='DELETE FROM settings WHERE id=$1'&&event.params[0]==='staff_password_ready:legacy-staff'));
 const pending=client.events.find(event=>event.sql.startsWith('INSERT INTO settings(id,value) VALUES($1,$2) ON CONFLICT'));assert.equal(pending.params[0],'staff_password_setup:legacy-staff');const marker=JSON.parse(pending.params[1]);assert.equal(marker.userId,'legacy-staff');assert.equal(marker.credentialVersion,4);assert.match(marker.tokenHash,/^[a-f0-9]{64}$/);assert.equal(marker.expiresAt-marker.issuedAt,3600);assert.ok(marker.expiresAt<Math.floor(Date.now()/1000));
 const audit=client.events.find(event=>event.sql.startsWith("INSERT INTO audit(id,user_id,event,target,created_at) VALUES($1,$2,'legacy_staff_password_disabled'"));assert.equal(audit.params[1],'legacy-staff');assert.ok(client.applied.has(PRIVILEGED_STAFF_PASSWORD_BOUNDARY_MIGRATION));
 const count=client.events.filter(event=>event.sql.startsWith('UPDATE password_credentials SET salt=$1,password_hash=$2')).length;await initializePortalDatabase(pool,'SELECT 1;',[]);assert.equal(client.events.filter(event=>event.sql.startsWith('UPDATE password_credentials SET salt=$1,password_hash=$2')).length,count);
});

test('critical database guard startup attestation rejects trigger and function-definition drift',async()=>{
 assert.equal(Object.isFrozen(CRITICAL_DATABASE_GUARDS),true);assert.equal(CRITICAL_DATABASE_GUARDS.length,9);assert.equal(Object.isFrozen(CRITICAL_DATABASE_GUARD_FUNCTIONS),true);assert.equal(CRITICAL_DATABASE_GUARD_FUNCTIONS.length,5);assert.ok(CRITICAL_DATABASE_GUARD_FUNCTIONS.every(Object.isFrozen));
 const good=criticalDatabaseGuardRows();
 assert.deepEqual(await assertCriticalDatabaseGuards({query:async()=>({rows:good})}),{criticalDatabaseGuardsReady:true,criticalDatabaseGuardCount:9,criticalDatabaseGuardTables:5,criticalDatabaseGuardFunctionCount:5});
 assert.deepEqual(await assertCriticalDatabaseGuards({query:async()=>({rows:criticalDatabaseGuardRows('restore_fixture')})},{schemaName:'restore_fixture'}),{criticalDatabaseGuardsReady:true,criticalDatabaseGuardCount:9,criticalDatabaseGuardTables:5,criticalDatabaseGuardFunctionCount:5});
 await assert.rejects(()=>assertCriticalDatabaseGuards({query:async()=>({rows:criticalDatabaseGuardRows('restore_fixture')})}),/Critical database guard attestation failed/);
 assert.equal(criticalDatabaseGuardFunctionSourceSha256(`  ${CRITICAL_DATABASE_GUARD_FUNCTIONS[0].source.replaceAll('\n','\r\n')}  `),CRITICAL_DATABASE_GUARD_FUNCTIONS[0].sourceSha256);
 assert.notEqual(criticalDatabaseGuardFunctionSourceSha256(CRITICAL_DATABASE_GUARD_FUNCTIONS[0].source.replace(' RETURN','\r RETURN')),CRITICAL_DATABASE_GUARD_FUNCTIONS[0].sourceSha256);
 const mutations=[
  rows=>rows.slice(1),
  rows=>rows.map((row,index)=>index?row:{...row,enabled:'D'}),
  rows=>rows.map((row,index)=>index?row:{...row,function_name:'no_op_guard'}),
  rows=>rows.map((row,index)=>index?row:{...row,function_schema:'private'}),
  rows=>rows.map((row,index)=>index?row:{...row,trigger_type:31}),
  rows=>rows.map((row,index)=>index?row:{...row,update_columns:['adapter_contract_sha256']}),
  rows=>rows.map((row,index)=>index?row:{...row,table_name:'users'}),
  rows=>rows.map((row,index)=>index?row:{...row,function_source:'BEGIN RETURN NEW; END'}),
  rows=>rows.map((row,index)=>index?row:{...row,function_identity_arguments:'flag boolean'}),
  rows=>rows.map((row,index)=>index?row:{...row,function_language:'sql'}),
  rows=>rows.map((row,index)=>index?row:{...row,function_return_type:'boolean'}),
  rows=>rows.map((row,index)=>index?row:{...row,function_kind:'p'}),
  rows=>rows.map((row,index)=>index?row:{...row,function_volatility:'s'}),
  rows=>rows.map((row,index)=>index?row:{...row,function_parallel_safety:'s'}),
  rows=>rows.map((row,index)=>index?row:{...row,function_security_definer:true}),
  rows=>rows.map((row,index)=>index?row:{...row,function_leakproof:true}),
  rows=>rows.map((row,index)=>index?row:{...row,function_strict:true}),
  rows=>rows.map((row,index)=>index?row:{...row,function_returns_set:true}),
  rows=>rows.map((row,index)=>index?row:{...row,function_config:['search_path=pg_temp, pg_catalog']}),
  rows=>rows.map((row,index)=>index?row:{...row,trigger_when_is_null:false}),
  rows=>rows.map((row,index)=>index?row:{...row,trigger_argument_count:1,trigger_arguments_empty:false}),
  rows=>rows.map((row,index)=>index?row:{...row,old_transition_table:'old_rows'}),
  rows=>rows.map((row,index)=>index?row:{...row,new_transition_table:'new_rows'}),
  rows=>rows.map((row,index)=>index?row:{...row,constraint_oid:123}),
  rows=>rows.map((row,index)=>index?row:{...row,constraint_relation_oid:123}),
  rows=>rows.map((row,index)=>index?row:{...row,trigger_deferrable:true}),
  rows=>rows.map((row,index)=>index?row:{...row,trigger_initially_deferred:true}),
  rows=>rows.map((row,index)=>index?row:{...row,parent_trigger_oid:123}),
  rows=>[...rows,{...rows[0],trigger_name:'zzz_extra_guard'}],
  rows=>[...rows,{...rows[0]}],
 ];
 for(const mutate of mutations){
  const guardRows=mutate(good.map(row=>({...row}))),client=new FakePgClient({guardRows});
  await assert.rejects(()=>initializePortalDatabase({connect:async()=>client},'SELECT 1;',[]),/Critical database guard attestation failed/);
  assert.equal(client.events.at(-1).sql,'ROLLBACK');assert.equal(client.events.some(event=>event.sql.startsWith('INSERT INTO brand_directory_entries')),false);assert.equal(client.released,true);
 }
});

test('explicit verified payment configuration opens each deposit channel once', async () => {
  const client=new FakePgClient(),pool={connect:async()=>client},entries=[];
  await initializePortalDatabase(pool,'SELECT 1;',entries);
  assert.ok(client.applied.has(PAYMENT_PROVIDERS_MIGRATION));
  assert.ok(client.applied.has(GAME_ACCESS_ZONE_MIGRATION));
  assert.ok(client.applied.has(MARKETING_CONTACT_SCALE_MIGRATION));
  assert.ok(client.applied.has(OPERATIONS_AUTOMATION_MIGRATION));
  assert.ok(client.applied.has(WHATSAPP_CAMPAIGN_DELIVERY_MIGRATION));
  assert.equal(client.events.filter(x=>x.sql.includes("ADD COLUMN IF NOT EXISTS access_zone")).length,1);
  assert.ok(!client.applied.has(ONE_MPAY_CHANNEL_MIGRATION));
  assert.equal(client.events.filter(x=>x.sql.startsWith('ALTER TABLE deposit_orders ADD CONSTRAINT')).length,2);
  await initializePortalDatabase(pool,'SELECT 1;',entries,{oneMpayEnabled:true});
  assert.ok(client.applied.has(ONE_MPAY_CHANNEL_MIGRATION));
  assert.ok(client.applied.has(PAYMENT_CHANNEL_ACTIVATION_MIGRATIONS['1mpay']));
  const opens=()=>client.events.filter(x=>x.sql.startsWith('UPDATE payment_channel_controls')&&x.sql.includes("provider_id='1mpay'")).length;
  const parameterizedOpens=provider=>client.events.filter(x=>x.sql.startsWith('UPDATE payment_channel_controls')&&x.params[0]===provider).length;
  assert.equal(opens(),0);
  assert.equal(parameterizedOpens('1mpay'),1);
  await initializePortalDatabase(pool,'SELECT 1;',entries,{oneMpayEnabled:true});
  assert.equal(opens(),0);
  assert.equal(parameterizedOpens('1mpay'),1);
  assert.equal(client.events.filter(x=>x.sql.startsWith('ALTER TABLE deposit_orders ADD CONSTRAINT')).length,2);
  assert.equal(client.events.filter(x=>x.sql.includes("ADD COLUMN IF NOT EXISTS access_zone")).length,1);

  await initializePortalDatabase(pool,'SELECT 1;',entries,{vpayEnabled:true,oneMpayEnabled:true,gspayEnabled:true});
  assert.equal(parameterizedOpens('vpay'),1);
  assert.equal(parameterizedOpens('1mpay'),1);
  assert.equal(parameterizedOpens('gspay'),1);
  for(const version of Object.values(PAYMENT_CHANNEL_ACTIVATION_MIGRATIONS))assert.ok(client.applied.has(version));
  const activationSnapshots=client.events.filter(x=>x.sql.startsWith('INSERT INTO portal_status_snapshots')&&Object.values(PAYMENT_CHANNEL_ACTIVATION_MIGRATIONS).includes(x.params[0]));
  assert.equal(activationSnapshots.length,3);
  await initializePortalDatabase(pool,'SELECT 1;',entries,{vpayEnabled:true,oneMpayEnabled:true,gspayEnabled:true});
  assert.equal(parameterizedOpens('vpay'),1);
  assert.equal(parameterizedOpens('1mpay'),1);
  assert.equal(parameterizedOpens('gspay'),1);
  assert.equal(client.events.some(x=>x.sql.includes('provider_payout_controls')&&x.sql.startsWith('UPDATE')),false);

  await initializePortalDatabase(pool,'SELECT 1;',entries,{gspayPayoutEnabled:true});
  assert.ok(client.applied.has(GSPAY_PAYOUT_ACTIVATION_MIGRATION));
  const payoutOpens=()=>client.events.filter(x=>x.sql.startsWith('UPDATE provider_payout_controls')&&x.sql.includes("provider_id='gspay'")).length;
  assert.equal(payoutOpens(),1);
  assert.equal(client.events.filter(x=>x.sql.startsWith('INSERT INTO portal_status_snapshots')&&x.params[0]===GSPAY_PAYOUT_ACTIVATION_MIGRATION).length,1);
  await initializePortalDatabase(pool,'SELECT 1;',entries,{gspayPayoutEnabled:true});
  assert.equal(payoutOpens(),1);
});
