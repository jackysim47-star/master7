#!/usr/bin/env node
import {pathToFileURL} from 'node:url';
import pg from 'pg';
import {BACKUP_EXCLUDED_TABLES,BACKUP_FORMAT,BACKUP_SCHEMA_SHA256,BACKUP_SCHEMA_VERSION,BACKUP_TABLES} from '../lib/encrypted-backup.ts';
import {BACKUP_PUBLIC_KEY_SHA256} from '../lib/backup-public-key.ts';
import {
 PRODUCTION_ACCEPTANCE_EVIDENCE_MIGRATION,FLEXIBLE_PUBLIC_CONTACTS_MIGRATION,PROVIDER_WALLET_OPERATIONS_MIGRATION,MANUAL_BANK_FUNDS_MIGRATION,API_SUPPLIER_STATUS_MIGRATION,BENEFIT_CLAIM_REVIEW_MIGRATION,COMPANY_BANK_ARTWORK_MIGRATION,
 CONNECTED_SERVICES_MIGRATION,FIXED_VOUCHER_RETIREMENT_MIGRATION,GAME_ACCESS_ZONE_MIGRATION,
 GAME_PROVIDER_ADAPTER_CORE_MIGRATION,MEGAH5_LAUNCH_OPERATIONS_MIGRATION,GAME_PROVIDER_ACCEPTANCE_MIGRATION,GENERIC_GAME_WALLET_RISK_MIGRATION,
 WITHDRAWAL_DESTINATION_METHODS_MIGRATION,PROVIDER_WALLET_SWEEPS_MIGRATION,JDB_WAGER_COVERAGE_STAGING_MIGRATION,ACCEPTANCE_LEDGER_INTEGRITY_MIGRATION,GUARD_FUNCTION_SCHEMA_BINDING_MIGRATION,MANUAL_BANK_AUDIT_EVIDENCE_INDEX_MIGRATION,PRIVILEGED_STAFF_PASSWORD_BOUNDARY_MIGRATION,
 CRITICAL_DATABASE_GUARDS,CRITICAL_DATABASE_GUARD_FUNCTIONS,evaluateCriticalDatabaseGuardRows,
 GSPAY_PAYOUT_ACTIVATION_MIGRATION,GSPAY_USDT_PROFILE_MIGRATION,MANUAL_BANK_MIGRATION,MANUAL_COMPLIANCE_MIGRATION,
 MARKETING_CONTACT_SCALE_MIGRATION,NEW_MEMBER_VOUCHER_MIGRATION,ONE_MPAY_CHANNEL_MIGRATION,
 OPERATIONS_AUTOMATION_MIGRATION,PAYMENT_ACCEPTANCE_GUARD_MIGRATION,PAYMENT_CHANNEL_ACTIVATION_MIGRATIONS,
 PAYMENT_PROVIDERS_MIGRATION,PAYOUT_CONTROL_MIGRATION,PORTAL_STATUS_MIGRATION,RESPONSIBLE_PLAY_MIGRATION,
 REWARDS_HUB_MIGRATION,SUPPORT_MARKETING_MIGRATION,VOUCHER_MANUAL_WORKFLOW_MIGRATION,
 WHATSAPP_CAMPAIGN_DELIVERY_MIGRATION,
} from '../lib/render-migrations.mjs';

export const REQUIRED_TABLES=Object.freeze([...BACKUP_TABLES,...BACKUP_EXCLUDED_TABLES].sort());
export const REQUIRED_MIGRATIONS=Object.freeze([
 PRODUCTION_ACCEPTANCE_EVIDENCE_MIGRATION,FLEXIBLE_PUBLIC_CONTACTS_MIGRATION,PROVIDER_WALLET_OPERATIONS_MIGRATION,MANUAL_BANK_FUNDS_MIGRATION,PORTAL_STATUS_MIGRATION,CONNECTED_SERVICES_MIGRATION,PAYMENT_PROVIDERS_MIGRATION,MANUAL_BANK_MIGRATION,
 API_SUPPLIER_STATUS_MIGRATION,GAME_ACCESS_ZONE_MIGRATION,PAYMENT_ACCEPTANCE_GUARD_MIGRATION,
 MARKETING_CONTACT_SCALE_MIGRATION,OPERATIONS_AUTOMATION_MIGRATION,SUPPORT_MARKETING_MIGRATION,
 PAYOUT_CONTROL_MIGRATION,WHATSAPP_CAMPAIGN_DELIVERY_MIGRATION,REWARDS_HUB_MIGRATION,
 RESPONSIBLE_PLAY_MIGRATION,COMPANY_BANK_ARTWORK_MIGRATION,NEW_MEMBER_VOUCHER_MIGRATION,
 VOUCHER_MANUAL_WORKFLOW_MIGRATION,FIXED_VOUCHER_RETIREMENT_MIGRATION,BENEFIT_CLAIM_REVIEW_MIGRATION,
 MANUAL_COMPLIANCE_MIGRATION,GSPAY_USDT_PROFILE_MIGRATION,GAME_PROVIDER_ADAPTER_CORE_MIGRATION,MEGAH5_LAUNCH_OPERATIONS_MIGRATION,GAME_PROVIDER_ACCEPTANCE_MIGRATION,GENERIC_GAME_WALLET_RISK_MIGRATION,
 WITHDRAWAL_DESTINATION_METHODS_MIGRATION,PROVIDER_WALLET_SWEEPS_MIGRATION,JDB_WAGER_COVERAGE_STAGING_MIGRATION,ACCEPTANCE_LEDGER_INTEGRITY_MIGRATION,GUARD_FUNCTION_SCHEMA_BINDING_MIGRATION,MANUAL_BANK_AUDIT_EVIDENCE_INDEX_MIGRATION,PRIVILEGED_STAFF_PASSWORD_BOUNDARY_MIGRATION,
].sort());
export const OPTIONAL_MIGRATIONS=Object.freeze([
 ONE_MPAY_CHANNEL_MIGRATION,...Object.values(PAYMENT_CHANNEL_ACTIVATION_MIGRATIONS),GSPAY_PAYOUT_ACTIVATION_MIGRATION,
].sort());
export const REQUIRED_COLUMNS=Object.freeze({
 withdrawal_requests:Object.freeze(['destination_type','ewallet_code','ewallet_name','ewallet_account_encrypted','ewallet_account_last4']),
 provider_wallet_operations:Object.freeze(['withdrawal_mode','adapter_contract_sha256']),
});
export const REQUIRED_TRIGGERS=CRITICAL_DATABASE_GUARDS;

const sha256=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const parse=value=>{try{return typeof value==='string'?JSON.parse(value):null;}catch{return null;}};
const fresh=(value,maxAgeSeconds,nowMs)=>{const epoch=Date.parse(value);return Number.isFinite(epoch)&&epoch<=nowMs+300_000&&epoch>=nowMs-maxAgeSeconds*1000;};
const check=(checks,id,pass)=>checks.push({id,pass:pass===true});

export function evaluatePostgresReadinessEvidence(input,{expectedRelease,nowMs=Date.now()}={}){
 if(typeof expectedRelease!=='string'||!expectedRelease)throw new Error('Expected release is required');
 const checks=[],role=input.role??{},tables=(input.tables??[]).map(row=>String(row.name)),migrations=input.migrations??[],versions=migrations.map(row=>String(row.version)),knownMigrations=new Set([...REQUIRED_MIGRATIONS,...OPTIONAL_MIGRATIONS]);
 const columns=new Set((input.columns??[]).map(row=>`${String(row.table_name)}.${String(row.column_name)}`));
 const triggers=input.triggers??[],migrationTimes=new Map(migrations.map(row=>[String(row.version),Number(row.applied_at)]));
 check(checks,'database_role_read_only',role.transaction_read_only==='on'&&role.can_create_database===false&&role.can_create_schema===false&&role.can_write_tables===false);
 check(checks,'required_tables',REQUIRED_TABLES.every(name=>tables.includes(name)));
 check(checks,'no_unclassified_tables',tables.every(name=>REQUIRED_TABLES.includes(name)));
 check(checks,'required_migrations',REQUIRED_MIGRATIONS.every(version=>versions.includes(version)));
 check(checks,'no_unknown_migrations',versions.every(version=>knownMigrations.has(version)));
 check(checks,'migration_timestamps',migrations.every(row=>Number.isSafeInteger(Number(row.applied_at))&&Number(row.applied_at)>0&&Number(row.applied_at)<=Math.floor(nowMs/1000)+300));
 check(checks,'migration_dependency_order',[WITHDRAWAL_DESTINATION_METHODS_MIGRATION,PROVIDER_WALLET_SWEEPS_MIGRATION,JDB_WAGER_COVERAGE_STAGING_MIGRATION,ACCEPTANCE_LEDGER_INTEGRITY_MIGRATION,GUARD_FUNCTION_SCHEMA_BINDING_MIGRATION,MANUAL_BANK_AUDIT_EVIDENCE_INDEX_MIGRATION,PRIVILEGED_STAFF_PASSWORD_BOUNDARY_MIGRATION].every(version=>migrationTimes.has(version))&&migrationTimes.get(WITHDRAWAL_DESTINATION_METHODS_MIGRATION)<=migrationTimes.get(PROVIDER_WALLET_SWEEPS_MIGRATION)&&migrationTimes.get(PROVIDER_WALLET_SWEEPS_MIGRATION)<=migrationTimes.get(JDB_WAGER_COVERAGE_STAGING_MIGRATION)&&migrationTimes.get(JDB_WAGER_COVERAGE_STAGING_MIGRATION)<=migrationTimes.get(ACCEPTANCE_LEDGER_INTEGRITY_MIGRATION)&&migrationTimes.get(ACCEPTANCE_LEDGER_INTEGRITY_MIGRATION)<=migrationTimes.get(GUARD_FUNCTION_SCHEMA_BINDING_MIGRATION)&&migrationTimes.get(GUARD_FUNCTION_SCHEMA_BINDING_MIGRATION)<=migrationTimes.get(MANUAL_BANK_AUDIT_EVIDENCE_INDEX_MIGRATION)&&migrationTimes.get(MANUAL_BANK_AUDIT_EVIDENCE_INDEX_MIGRATION)<=migrationTimes.get(PRIVILEGED_STAFF_PASSWORD_BOUNDARY_MIGRATION));
 check(checks,'required_schema_columns',Object.entries(REQUIRED_COLUMNS).every(([table,names])=>names.every(name=>columns.has(`${table}.${name}`))));
 check(checks,'required_schema_triggers',evaluateCriticalDatabaseGuardRows(triggers,{schemaName:'public'}).ready);

 const backup=parse(input.backupAudit?.target),backupAuditAt=Number(input.backupAudit?.created_at),backupReady=!!backup&&backup.format===BACKUP_FORMAT&&backup.release===expectedRelease&&backup.schemaVersion===BACKUP_SCHEMA_VERSION&&backup.schemaSha256===BACKUP_SCHEMA_SHA256&&backup.publicKeySha256===BACKUP_PUBLIC_KEY_SHA256&&backup.readConsistency==='transaction_snapshot'&&backup.tableCount===BACKUP_TABLES.length&&Number.isSafeInteger(backup.totalRecords)&&backup.totalRecords>=0&&sha256(backup.backupSha256)&&sha256(backup.plaintextSha256)&&sha256(backup.ciphertextSha256)&&fresh(backup.createdAt,7*86400,nowMs)&&Number.isSafeInteger(backupAuditAt)&&backupAuditAt>=Math.floor(nowMs/1000)-7*86400&&backupAuditAt<=Math.floor(nowMs/1000)+300;
 check(checks,'current_encrypted_backup',backupReady);

 const restore=parse(input.restoreSetting?.value),createdAt=Date.parse(restore?.createdAt??''),verifiedAt=Date.parse(restore?.verifiedAt??''),restoreReady=backupReady&&!!restore&&restore.status==='verified'&&restore.format===BACKUP_FORMAT&&restore.release===expectedRelease&&restore.schemaVersion===BACKUP_SCHEMA_VERSION&&restore.schemaSha256===BACKUP_SCHEMA_SHA256&&restore.publicKeySha256===BACKUP_PUBLIC_KEY_SHA256&&restore.coverageComplete===true&&Array.isArray(restore.missingTables)&&restore.missingTables.length===0&&restore.readConsistency==='transaction_snapshot'&&restore.persistentWrites===false&&restore.restoreTargetKind==='isolated_postgresql_transaction'&&sha256(restore.restoreTargetSha256)&&restore.foreignKeyViolations===0&&restore.tableCount===BACKUP_TABLES.length&&restore.totalRecords===backup.totalRecords&&restore.createdAt===backup.createdAt&&restore.backupSha256===backup.backupSha256&&restore.plaintextSha256===backup.plaintextSha256&&fresh(restore.createdAt,30*86400,nowMs)&&fresh(restore.verifiedAt,30*86400,nowMs)&&Number.isFinite(createdAt)&&Number.isFinite(verifiedAt)&&verifiedAt>=createdAt;
 check(checks,'bound_restore_rehearsal',restoreReady);
 return {ok:checks.every(item=>item.pass),release:expectedRelease,checks,schema:{requiredTables:REQUIRED_TABLES.length,requiredMigrations:REQUIRED_MIGRATIONS.length,requiredColumns:Object.values(REQUIRED_COLUMNS).reduce((sum,names)=>sum+names.length,0),requiredTriggers:REQUIRED_TRIGGERS.length,requiredGuardFunctions:CRITICAL_DATABASE_GUARD_FUNCTIONS.length},evidence:{backupCreatedAt:backupReady?backup.createdAt:null,restoreVerifiedAt:restoreReady?restore.verifiedAt:null}};
}

export async function runPostgresReadinessGate(client,options){
 let began=false,result,error,rollbackError;
 try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');began=true;
  await client.query("SET LOCAL statement_timeout='10000ms'");
  await client.query("SET LOCAL lock_timeout='2000ms'");
  await client.query("SET LOCAL idle_in_transaction_session_timeout='15000ms'");
  const role=(await client.query(`SELECT current_setting('transaction_read_only') transaction_read_only,
    has_database_privilege(current_user,current_database(),'CREATE') can_create_database,
    has_schema_privilege(current_user,'public','CREATE') can_create_schema,
    EXISTS(SELECT 1 FROM unnest($1::text[]) table_name WHERE
      has_table_privilege(current_user,format('%I.%I','public',table_name),'INSERT') OR
      has_table_privilege(current_user,format('%I.%I','public',table_name),'UPDATE') OR
      has_table_privilege(current_user,format('%I.%I','public',table_name),'DELETE') OR
      has_table_privilege(current_user,format('%I.%I','public',table_name),'TRUNCATE') OR
      has_table_privilege(current_user,format('%I.%I','public',table_name),'TRIGGER')) can_write_tables`,[REQUIRED_TABLES])).rows[0];
  const tables=(await client.query("SELECT c.relname name FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname")).rows;
  const columns=(await client.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[]) ORDER BY table_name,column_name",[Object.keys(REQUIRED_COLUMNS)])).rows;
  const triggers=(await client.query(`SELECT n.nspname table_schema,c.relname table_name,t.tgname trigger_name,t.tgenabled enabled,t.tgtype trigger_type,
    t.tgqual IS NULL trigger_when_is_null,t.tgnargs trigger_argument_count,octet_length(t.tgargs)=0 trigger_arguments_empty,
    t.tgoldtable old_transition_table,t.tgnewtable new_transition_table,t.tgconstraint constraint_oid,t.tgconstrrelid constraint_relation_oid,
    t.tgdeferrable trigger_deferrable,t.tginitdeferred trigger_initially_deferred,t.tgparentid parent_trigger_oid,
    p.proname function_name,pn.nspname function_schema,pg_catalog.pg_get_function_identity_arguments(p.oid) function_identity_arguments,
    l.lanname function_language,pg_catalog.format_type(p.prorettype,NULL) function_return_type,p.prokind function_kind,
    p.provolatile function_volatility,p.proparallel function_parallel_safety,p.prosecdef function_security_definer,
    p.proleakproof function_leakproof,p.proisstrict function_strict,p.proretset function_returns_set,p.proconfig function_config,p.prosrc function_source,
    COALESCE(ARRAY(SELECT a.attname::text FROM unnest(t.tgattr::smallint[]) WITH ORDINALITY position(attnum,ordinality)
     JOIN pg_catalog.pg_attribute a ON a.attrelid=t.tgrelid AND a.attnum=position.attnum ORDER BY position.ordinality),'{}'::text[]) update_columns
    FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid
    JOIN pg_catalog.pg_namespace pn ON pn.oid=p.pronamespace
    JOIN pg_catalog.pg_language l ON l.oid=p.prolang
    WHERE n.nspname='public' AND c.relname=ANY($1::text[]) AND NOT t.tgisinternal
    ORDER BY c.relname,t.tgname`,[[...new Set(REQUIRED_TRIGGERS.map(item=>item.tableName))]])).rows;
  const migrations=(await client.query('SELECT version,applied_at FROM portal_schema_migrations ORDER BY version')).rows;
  const backupCandidates=(await client.query("SELECT target,created_at FROM audit WHERE event='encrypted_backup_created' AND created_at=(SELECT MAX(created_at) FROM audit WHERE event='encrypted_backup_created')")).rows;
  const backupAudit=backupCandidates.map(row=>({row,metadata:parse(row.target)})).filter(item=>item.metadata&&fresh(item.metadata.createdAt,30*86400,options?.nowMs??Date.now())).sort((a,b)=>Date.parse(b.metadata.createdAt)-Date.parse(a.metadata.createdAt))[0]?.row??null;
  const restoreSetting=(await client.query("SELECT value FROM settings WHERE id='backup_restore_rehearsal'")).rows[0]??null;
  result=evaluatePostgresReadinessEvidence({role,tables,columns,triggers,migrations,backupAudit,restoreSetting},options);
 }catch(cause){error=cause;}
 finally{if(began)try{await client.query('ROLLBACK');}catch(cause){rollbackError=cause;}}
 if(error&&rollbackError)throw new AggregateError([error,rollbackError],'PostgreSQL readiness gate failed');
 if(error)throw error;if(rollbackError)throw rollbackError;if(!result)throw new Error('PostgreSQL readiness gate did not complete');return result;
}

async function main(){
 const connectionString=process.env.PORTAL_READINESS_DATABASE_URL,expectedRelease=process.env.MASTER7_EXPECTED_RELEASE;
 if(!connectionString||!expectedRelease){process.stdout.write(JSON.stringify({ok:false,error:'Readiness gate configuration is incomplete'})+'\n');return 1;}
 const client=new pg.Client({connectionString,application_name:'master7-readiness-gate',ssl:process.env.PGSSLMODE==='disable'?false:{rejectUnauthorized:process.env.PGSSL_REJECT_UNAUTHORIZED!=='false',...(process.env.PGSSL_CA?{ca:process.env.PGSSL_CA.replaceAll('\\n','\n')}:{})},connectionTimeoutMillis:10_000});
 try{await client.connect();const result=await runPostgresReadinessGate(client,{expectedRelease});process.stdout.write(JSON.stringify(result)+'\n');return result.ok?0:1;}
 catch{process.stdout.write(JSON.stringify({ok:false,error:'PostgreSQL readiness gate failed'})+'\n');return 1;}
 finally{try{await client.end();}catch{}}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
