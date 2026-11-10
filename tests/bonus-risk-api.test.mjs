import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {handle} from '../lib/backend.ts';

class Statement{
 constructor(sqlite,sql,args=[]){this.sqlite=sqlite;this.sql=sql;this.args=args;}
 bind(...args){return new Statement(this.sqlite,this.sql,args);}
 async first(){return this.sqlite.prepare(this.sql).get(...this.args)??null;}
 async all(){return {results:this.sqlite.prepare(this.sql).all(...this.args)};}
 async run(){return this.sqlite.prepare(this.sql).run(...this.args);}
}

function fixture(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(`
  CREATE TABLE users(id TEXT PRIMARY KEY,username TEXT NOT NULL,phone TEXT,role TEXT NOT NULL,approved INTEGER NOT NULL,csrf TEXT NOT NULL,created_at INTEGER NOT NULL);
  CREATE TABLE settings(id TEXT PRIMARY KEY,value TEXT NOT NULL);
  CREATE TABLE password_credentials(username TEXT PRIMARY KEY,user_id TEXT NOT NULL UNIQUE,salt TEXT NOT NULL,password_hash TEXT NOT NULL,version INTEGER NOT NULL,changed_at INTEGER NOT NULL);
  CREATE TABLE password_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,csrf TEXT NOT NULL,credential_version INTEGER NOT NULL,expires_at INTEGER NOT NULL,created_at INTEGER NOT NULL);
  CREATE TABLE rate_limits(id TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at INTEGER NOT NULL);
  CREATE TABLE deposit_orders(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,request_key TEXT NOT NULL,fingerprint TEXT NOT NULL,provider TEXT NOT NULL,amount_minor INTEGER NOT NULL,currency TEXT NOT NULL,trade_code TEXT NOT NULL,status TEXT NOT NULL,provider_trade_no TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
  CREATE TABLE benefit_claims(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,benefit_rule_id TEXT NOT NULL,request_key TEXT NOT NULL,deposit_order_id TEXT,rules_snapshot_json TEXT NOT NULL,deposit_minor INTEGER NOT NULL,reward_minor INTEGER NOT NULL,turnover_required_minor INTEGER NOT NULL,expires_at INTEGER NOT NULL,status TEXT NOT NULL,wallet_credit_status TEXT NOT NULL,turnover_source_status TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
  CREATE TABLE referral_relationships(member_id TEXT PRIMARY KEY,referrer_id TEXT NOT NULL,code TEXT NOT NULL,created_at INTEGER NOT NULL);
  CREATE TABLE audit(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,event TEXT NOT NULL,target TEXT NOT NULL,created_at INTEGER NOT NULL);
 `);
 const insert=sqlite.prepare('INSERT INTO users(id,username,phone,role,approved,csrf,created_at) VALUES(?,?,?,?,1,?,0)');
 insert.run('owner','owner-visible','private-owner-phone','owner','owner-csrf');insert.run('staff','staff-visible','private-staff-phone','staff','staff-csrf');insert.run('member','member-visible','private-member-phone','member','member-csrf');
 const staffToken='s'.repeat(43),staffTokenHash=createHash('sha256').update(staffToken).digest('hex');
 sqlite.prepare("INSERT INTO password_credentials(username,user_id,salt,password_hash,version,changed_at) VALUES('staff_login','staff','test-salt',?,1,0)").run('a'.repeat(64));
 sqlite.prepare("INSERT INTO password_sessions(token_hash,user_id,csrf,credential_version,expires_at,created_at) VALUES(?,'staff','staff-csrf',1,4102444800,0)").run(staffTokenHash);
 sqlite.prepare("INSERT INTO settings(id,value) VALUES('staff_password_ready:staff','1')").run();
 const db={prepare:sql=>new Statement(sqlite,sql),async batch(list){sqlite.exec('BEGIN');try{const out=[];for(const statement of list)out.push(await statement.run());sqlite.exec('COMMIT');return out;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
 async function call(who,path,method='GET',body=null){const localStaff=who==='staff',headers={'content-type':'application/json','origin':'https://portal.example.test',...(localStaff?{cookie:`__Host-master7_session=${staffToken}`}:{})};if(who)headers['x-csrf-token']=`${who}-csrf`;const response=await handle(new Request('https://portal.example.test'+path,{method,headers,body:body===null?undefined:JSON.stringify(body)}),{db,identity:who&&!localStaff?{userId:who,email:`${who}@example.test`}:null,ownerEmail:'owner@example.test',allowedOrigins:['https://portal.example.test']});return {status:response.status,data:await response.json()};}
 return {sqlite,call};
}

test('Bonus Hunter GET is restricted to owner and staff and exposes no sensitive member fields',async()=>{
 const {sqlite,call}=fixture();
 assert.equal((await call(null,'/api/admin/risk/bonus-hunter')).status,401);
 assert.equal((await call('member','/api/admin/risk/bonus-hunter')).status,403);
 for(const actor of ['owner','staff']){const response=await call(actor,'/api/admin/risk/bonus-hunter?hours=24&limit=25');assert.equal(response.status,200);assert.equal(response.data.mode,'monitor_only');assert.equal(response.data.enforcement.autoBan,false);assert.equal(response.data.filters.limit,25);assert.doesNotMatch(JSON.stringify(response.data),/private-.*-phone|receipt_data|account_number|password|secret/i);}
 assert.equal((await call('owner','/api/admin/risk/bonus-hunter?hours=0')).status,400);
 assert.equal((await call('owner','/api/admin/risk/bonus-hunter?limit=201')).status,400);
 assert.equal((await call('owner','/api/admin/risk/bonus-hunter?severity=critical')).status,400);
 sqlite.close();
});

test('only owner can save monitor thresholds and mode cannot enable automatic punishment',async()=>{
 const {sqlite,call}=fixture(),settings={version:1,mode:'monitor_only',thresholds:{depositAttempts:12,failedOrUnknownDeposits:5,referralFanout:30,benefitClaims:8,benefitClaimsPerDeposit:3,writeRateLimits:4}};
 assert.equal((await call('staff','/api/admin/risk/bonus-hunter','POST',{settings})).status,403);
 const saved=await call('owner','/api/admin/risk/bonus-hunter','POST',{settings});assert.equal(saved.status,200);assert.equal(saved.data.config.thresholds.depositAttempts,12);assert.equal(saved.data.enforcement.autoFreeze,false);
 const stored=JSON.parse(sqlite.prepare("SELECT value FROM settings WHERE id='bonus_risk_v1'").get().value);assert.equal(stored.mode,'monitor_only');assert.equal(sqlite.prepare("SELECT COUNT(*) count FROM audit WHERE event='bonus_risk_settings_updated'").get().count,1);
 const rejected=await call('owner','/api/admin/risk/bonus-hunter','POST',{settings:{mode:'auto_ban'}});assert.equal(rejected.status,400);assert.equal(JSON.parse(sqlite.prepare("SELECT value FROM settings WHERE id='bonus_risk_v1'").get().value).mode,'monitor_only');
 assert.equal((await call('owner','/api/admin/risk/bonus-hunter','POST',{})).status,400);
 sqlite.close();
});
