import test from 'node:test';
import assert from 'node:assert/strict';
import {BACKUP_EXCLUDED_TABLES,BACKUP_FORMAT,BACKUP_SCHEMA_SHA256,BACKUP_SCHEMA_VERSION,BACKUP_TABLES} from '../lib/encrypted-backup.ts';
import {BACKUP_PUBLIC_KEY_SHA256} from '../lib/backup-public-key.ts';
import {ACCEPTANCE_LEDGER_INTEGRITY_MIGRATION,GUARD_FUNCTION_SCHEMA_BINDING_MIGRATION,JDB_WAGER_COVERAGE_STAGING_MIGRATION,MANUAL_BANK_AUDIT_EVIDENCE_INDEX_MIGRATION,PRIVILEGED_STAFF_PASSWORD_BOUNDARY_MIGRATION,PROVIDER_WALLET_SWEEPS_MIGRATION,WITHDRAWAL_DESTINATION_METHODS_MIGRATION} from '../lib/render-migrations.mjs';
import {OPTIONAL_MIGRATIONS,REQUIRED_COLUMNS,REQUIRED_MIGRATIONS,REQUIRED_TABLES,REQUIRED_TRIGGERS,evaluatePostgresReadinessEvidence,runPostgresReadinessGate} from '../scripts/postgres-readiness-gate.mjs';
import {criticalDatabaseGuardRows} from './critical-database-guard-fixture.mjs';

const release='17.0.0-readiness-fixture',nowMs=Date.parse('2026-11-08T12:00:00.000Z'),createdAt='2026-11-08T10:00:00.000Z',verifiedAt='2026-11-08T11:00:00.000Z';
const backup={format:BACKUP_FORMAT,release,schemaVersion:BACKUP_SCHEMA_VERSION,schemaSha256:BACKUP_SCHEMA_SHA256,publicKeySha256:BACKUP_PUBLIC_KEY_SHA256,readConsistency:'transaction_snapshot',tableCount:BACKUP_TABLES.length,totalRecords:123,backupSha256:'a'.repeat(64),plaintextSha256:'b'.repeat(64),ciphertextSha256:'c'.repeat(64),createdAt};
const restore={status:'verified',format:BACKUP_FORMAT,release,schemaVersion:BACKUP_SCHEMA_VERSION,schemaSha256:BACKUP_SCHEMA_SHA256,publicKeySha256:BACKUP_PUBLIC_KEY_SHA256,coverageComplete:true,missingTables:[],readConsistency:'transaction_snapshot',persistentWrites:false,restoreTargetKind:'isolated_postgresql_transaction',restoreTargetSha256:'d'.repeat(64),foreignKeyViolations:0,tableCount:BACKUP_TABLES.length,totalRecords:123,backupSha256:backup.backupSha256,plaintextSha256:backup.plaintextSha256,createdAt,verifiedAt};

const fixture=()=>({
 role:{transaction_read_only:'on',can_create_database:false,can_create_schema:false,can_write_tables:false},
 tables:REQUIRED_TABLES.map(name=>({name})),
 columns:Object.entries(REQUIRED_COLUMNS).flatMap(([table_name,names])=>names.map(column_name=>({table_name,column_name}))),
 triggers:criticalDatabaseGuardRows(),
 migrations:[...REQUIRED_MIGRATIONS,...OPTIONAL_MIGRATIONS.slice(0,2)].sort().map(version=>({version,applied_at:Math.floor(nowMs/1000)-100})),
 backupAudit:{target:JSON.stringify(backup),created_at:Math.floor(Date.parse(createdAt)/1000)},
 restoreSetting:{value:JSON.stringify(restore)},
});

test('evidence gate accepts only the current schema, migration, backup and bound restore contract',()=>{
 const result=evaluatePostgresReadinessEvidence(fixture(),{expectedRelease:release,nowMs});
 assert.equal(result.ok,true);assert.equal(result.schema.requiredTables,76+5);assert.equal(result.schema.requiredTables,BACKUP_TABLES.length+BACKUP_EXCLUDED_TABLES.length);assert.ok(BACKUP_EXCLUDED_TABLES.includes('member_wallet_guards'));assert.ok(!BACKUP_TABLES.includes('member_wallet_guards'));assert.ok(BACKUP_TABLES.includes('megah5_launch_operations'));assert.ok(BACKUP_TABLES.includes('game_provider_acceptance_events'));assert.ok(BACKUP_TABLES.includes('game_provider_acceptance_current'));assert.ok(BACKUP_TABLES.includes('production_acceptance_events'));assert.ok(BACKUP_TABLES.includes('production_acceptance_current'));assert.ok(BACKUP_TABLES.includes('public_contact_revisions'));assert.ok(BACKUP_TABLES.includes('jdb_wager_receipts'));assert.ok(BACKUP_TABLES.includes('jdb_wager_observations'));assert.ok(REQUIRED_TABLES.includes('member_wallet_guards'));assert.equal(result.schema.requiredMigrations,36);assert.equal(result.schema.requiredColumns,7);assert.equal(result.schema.requiredTriggers,9);assert.equal(result.schema.requiredGuardFunctions,5);assert.equal(new Set(REQUIRED_MIGRATIONS).size,36);assert.ok(REQUIRED_MIGRATIONS.indexOf(WITHDRAWAL_DESTINATION_METHODS_MIGRATION)<REQUIRED_MIGRATIONS.indexOf(PROVIDER_WALLET_SWEEPS_MIGRATION));assert.ok(REQUIRED_MIGRATIONS.indexOf(PROVIDER_WALLET_SWEEPS_MIGRATION)<REQUIRED_MIGRATIONS.indexOf(JDB_WAGER_COVERAGE_STAGING_MIGRATION));assert.ok(REQUIRED_MIGRATIONS.indexOf(JDB_WAGER_COVERAGE_STAGING_MIGRATION)<REQUIRED_MIGRATIONS.indexOf(ACCEPTANCE_LEDGER_INTEGRITY_MIGRATION));assert.ok(REQUIRED_MIGRATIONS.indexOf(ACCEPTANCE_LEDGER_INTEGRITY_MIGRATION)<REQUIRED_MIGRATIONS.indexOf(GUARD_FUNCTION_SCHEMA_BINDING_MIGRATION));assert.ok(REQUIRED_MIGRATIONS.indexOf(GUARD_FUNCTION_SCHEMA_BINDING_MIGRATION)<REQUIRED_MIGRATIONS.indexOf(MANUAL_BANK_AUDIT_EVIDENCE_INDEX_MIGRATION));assert.ok(REQUIRED_MIGRATIONS.indexOf(MANUAL_BANK_AUDIT_EVIDENCE_INDEX_MIGRATION)<REQUIRED_MIGRATIONS.indexOf(PRIVILEGED_STAFF_PASSWORD_BOUNDARY_MIGRATION));assert.ok(result.checks.every(item=>item.pass));
});

for(const migration of [WITHDRAWAL_DESTINATION_METHODS_MIGRATION,PROVIDER_WALLET_SWEEPS_MIGRATION,JDB_WAGER_COVERAGE_STAGING_MIGRATION,ACCEPTANCE_LEDGER_INTEGRITY_MIGRATION,GUARD_FUNCTION_SCHEMA_BINDING_MIGRATION,MANUAL_BANK_AUDIT_EVIDENCE_INDEX_MIGRATION,PRIVILEGED_STAFF_PASSWORD_BOUNDARY_MIGRATION])test(`evidence gate fails when required schema marker ${migration} is missing`,()=>{
 const missing=fixture();missing.migrations=missing.migrations.filter(item=>item.version!==migration);
 const result=evaluatePostgresReadinessEvidence(missing,{expectedRelease:release,nowMs});
 assert.equal(result.ok,false);assert.equal(result.checks.find(item=>item.id==='required_migrations').pass,false);
});

for(const [migration,table,column] of [[WITHDRAWAL_DESTINATION_METHODS_MIGRATION,'withdrawal_requests','destination_type'],[PROVIDER_WALLET_SWEEPS_MIGRATION,'provider_wallet_operations','withdrawal_mode']])test(`evidence gate rejects ${migration} when required physical schema is missing`,()=>{
 const missing=fixture();missing.columns=missing.columns.filter(row=>row.table_name!==table||row.column_name!==column);
 const result=evaluatePostgresReadinessEvidence(missing,{expectedRelease:release,nowMs});
 assert.equal(result.ok,false);assert.equal(result.checks.find(item=>item.id==='required_migrations').pass,true);assert.equal(result.checks.find(item=>item.id==='required_schema_columns').pass,false);
});

test('evidence gate rejects every missing or disabled required integrity trigger',()=>{
 for(const required of REQUIRED_TRIGGERS){
  for(const disabled of [false,true]){
   const missing=fixture();
   missing.triggers=disabled?missing.triggers.map(row=>row.table_name===required.tableName&&row.trigger_name===required.triggerName?{...row,enabled:'D'}:row):missing.triggers.filter(row=>row.table_name!==required.tableName||row.trigger_name!==required.triggerName);
   const result=evaluatePostgresReadinessEvidence(missing,{expectedRelease:release,nowMs});
   assert.equal(result.ok,false);assert.equal(result.checks.find(item=>item.id==='required_schema_triggers').pass,false);
  }
 }
});

test('evidence gate rejects wrong trigger binding, function, type, schema or duplicate rows',()=>{
 const required=REQUIRED_TRIGGERS[0];
 const variants=[
  row=>({...row,table_name:'users'}),
  row=>({...row,function_name:'no_op_guard'}),
  row=>({...row,function_schema:'private'}),
  row=>({...row,trigger_type:31}),
  row=>({...row,update_columns:['adapter_contract_sha256']}),
  row=>({...row,function_source:'BEGIN RETURN NEW; END'}),
  row=>({...row,function_identity_arguments:'flag boolean'}),
  row=>({...row,function_language:'sql'}),
  row=>({...row,function_return_type:'boolean'}),
  row=>({...row,function_kind:'p'}),
  row=>({...row,function_volatility:'s'}),
  row=>({...row,function_parallel_safety:'s'}),
  row=>({...row,function_security_definer:true}),
  row=>({...row,function_leakproof:true}),
  row=>({...row,function_strict:true}),
  row=>({...row,function_returns_set:true}),
  row=>({...row,function_config:['search_path=pg_temp, pg_catalog']}),
  row=>({...row,trigger_when_is_null:false}),
  row=>({...row,trigger_argument_count:1,trigger_arguments_empty:false}),
  row=>({...row,old_transition_table:'old_rows'}),
  row=>({...row,new_transition_table:'new_rows'}),
  row=>({...row,constraint_oid:123}),
  row=>({...row,constraint_relation_oid:123}),
  row=>({...row,trigger_deferrable:true}),
  row=>({...row,trigger_initially_deferred:true}),
  row=>({...row,parent_trigger_oid:123}),
 ];
 for(const mutate of variants){
  const drift=fixture();drift.triggers=drift.triggers.map(row=>row.trigger_name===required.triggerName?mutate(row):row);
  const result=evaluatePostgresReadinessEvidence(drift,{expectedRelease:release,nowMs});
  assert.equal(result.ok,false);assert.equal(result.checks.find(item=>item.id==='required_schema_triggers').pass,false);
 }
 const duplicate=fixture();duplicate.triggers.push({...duplicate.triggers[0]});
 const result=evaluatePostgresReadinessEvidence(duplicate,{expectedRelease:release,nowMs});
 assert.equal(result.ok,false);assert.equal(result.checks.find(item=>item.id==='required_schema_triggers').pass,false);
 const extra=fixture();extra.triggers.push({...extra.triggers[0],trigger_name:'zzz_extra_guard'});
 const extraResult=evaluatePostgresReadinessEvidence(extra,{expectedRelease:release,nowMs});
 assert.equal(extraResult.ok,false);assert.equal(extraResult.checks.find(item=>item.id==='required_schema_triggers').pass,false);
});

test('evidence gate rejects dependency markers applied after their consumers',()=>{
 const outOfOrder=fixture(),epoch=Math.floor(nowMs/1000)-100;
 for(const row of outOfOrder.migrations){if(row.version===WITHDRAWAL_DESTINATION_METHODS_MIGRATION)row.applied_at=epoch;if(row.version===PROVIDER_WALLET_SWEEPS_MIGRATION)row.applied_at=epoch;if(row.version===JDB_WAGER_COVERAGE_STAGING_MIGRATION)row.applied_at=epoch;if(row.version===ACCEPTANCE_LEDGER_INTEGRITY_MIGRATION)row.applied_at=epoch;if(row.version===GUARD_FUNCTION_SCHEMA_BINDING_MIGRATION)row.applied_at=epoch+1;if(row.version===MANUAL_BANK_AUDIT_EVIDENCE_INDEX_MIGRATION)row.applied_at=epoch;}
 const result=evaluatePostgresReadinessEvidence(outOfOrder,{expectedRelease:release,nowMs});assert.equal(result.ok,false);assert.equal(result.checks.find(item=>item.id==='migration_dependency_order').pass,false);
});

test('evidence gate fails closed for drift, a write-capable role or an unbound receipt',()=>{
 const missingTable=fixture();missingTable.tables.pop();assert.equal(evaluatePostgresReadinessEvidence(missingTable,{expectedRelease:release,nowMs}).checks.find(item=>item.id==='required_tables').pass,false);
 const missingMigration=fixture();missingMigration.migrations=missingMigration.migrations.filter(item=>item.version!==REQUIRED_MIGRATIONS[0]);assert.equal(evaluatePostgresReadinessEvidence(missingMigration,{expectedRelease:release,nowMs}).checks.find(item=>item.id==='required_migrations').pass,false);
 const unknownMigration=fixture();unknownMigration.migrations.push({version:'9999-unknown-migration',applied_at:Math.floor(nowMs/1000)-100});assert.equal(evaluatePostgresReadinessEvidence(unknownMigration,{expectedRelease:release,nowMs}).checks.find(item=>item.id==='no_unknown_migrations').pass,false);
 const writable=fixture();writable.role.can_write_tables=true;assert.equal(evaluatePostgresReadinessEvidence(writable,{expectedRelease:release,nowMs}).checks.find(item=>item.id==='database_role_read_only').pass,false);
 const forged=fixture();forged.restoreSetting.value=JSON.stringify({...restore,backupSha256:'f'.repeat(64),readConsistency:'unverified'});assert.equal(evaluatePostgresReadinessEvidence(forged,{expectedRelease:release,nowMs}).checks.find(item=>item.id==='bound_restore_rehearsal').pass,false);
});

class FakeClient{
 constructor(data=fixture()){this.data=data;this.sql=[];}
 async query(sql){
  this.sql.push(sql);
  if(sql.startsWith('BEGIN')||sql.startsWith('SET LOCAL')||sql==='ROLLBACK')return{rows:[]};
  if(sql.includes("current_setting('transaction_read_only')"))return{rows:[this.data.role]};
  if(sql.includes('FROM pg_catalog.pg_class'))return{rows:this.data.tables};
  if(sql.includes('FROM information_schema.columns'))return{rows:this.data.columns};
  if(sql.includes('FROM pg_catalog.pg_trigger'))return{rows:this.data.triggers};
  if(sql.startsWith('SELECT version,applied_at'))return{rows:this.data.migrations};
  if(sql.includes("event='encrypted_backup_created'"))return{rows:[this.data.backupAudit]};
  if(sql.includes("id='backup_restore_rehearsal'"))return{rows:[this.data.restoreSetting]};
  throw new Error('Unexpected SQL');
 }
}

test('PostgreSQL gate performs metadata-only reads in one rollback-only transaction',async()=>{
 const client=new FakeClient(),result=await runPostgresReadinessGate(client,{expectedRelease:release,nowMs});assert.equal(result.ok,true);
 assert.equal(client.sql[0],'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');assert.equal(client.sql.at(-1),'ROLLBACK');
 const sql=client.sql.join('\n');assert.doesNotMatch(sql,/SELECT\s+\*\s+FROM\s+(?:users|wallet_ledger|deposit_orders)/i);assert.doesNotMatch(sql,/\b(?:INSERT|UPDATE|DELETE|TRUNCATE)\s+(?:INTO|FROM)?\s*(?:users|wallet_ledger|deposit_orders)/i);
 assert.match(sql,/c\.relname=ANY\(\$1::text\[\]\)/);assert.doesNotMatch(sql,/t\.tgname=ANY/);
 assert.ok(sql.includes('pg_catalog.pg_class'));assert.ok(sql.includes('information_schema.columns'));assert.ok(sql.includes('pg_catalog.pg_trigger'));assert.ok(sql.includes('portal_schema_migrations'));assert.ok(sql.includes("event='encrypted_backup_created'"));assert.ok(sql.includes("id='backup_restore_rehearsal'"));
});

test('PostgreSQL gate rolls back after a metadata-query failure',async()=>{
 const client=new FakeClient();client.query=async function(sql){this.sql.push(sql);if(sql.startsWith('BEGIN')||sql.startsWith('SET LOCAL')||sql==='ROLLBACK')return{rows:[]};throw new Error('postgres://private-user:private-password@internal/db');};
 await assert.rejects(()=>runPostgresReadinessGate(client,{expectedRelease:release,nowMs}),/private-password/);assert.equal(client.sql.at(-1),'ROLLBACK');
});
