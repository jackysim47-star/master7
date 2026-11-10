import {test} from 'node:test';
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
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(`
  CREATE TABLE users(id TEXT PRIMARY KEY,username TEXT NOT NULL,role TEXT NOT NULL,approved INTEGER NOT NULL,csrf TEXT NOT NULL,created_at INTEGER NOT NULL);
  CREATE TABLE settings(id TEXT PRIMARY KEY,value TEXT NOT NULL);
  CREATE TABLE password_credentials(username TEXT PRIMARY KEY,user_id TEXT NOT NULL UNIQUE,salt TEXT NOT NULL,password_hash TEXT NOT NULL,version INTEGER NOT NULL,changed_at INTEGER NOT NULL);
  CREATE TABLE password_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,csrf TEXT NOT NULL,credential_version INTEGER NOT NULL,expires_at INTEGER NOT NULL,created_at INTEGER NOT NULL);
  CREATE TABLE audit(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,event TEXT NOT NULL,target TEXT NOT NULL,created_at INTEGER NOT NULL);
  CREATE TABLE rate_limits(id TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at INTEGER NOT NULL);
  INSERT INTO users VALUES('owner','owner@example.test','owner',1,'owner-csrf',1),('staff','staff@example.test','staff',1,'staff-csrf',2),('member','member@example.test','member',1,'member-csrf',3);
 `);
 const staffToken='s'.repeat(43),staffTokenHash=createHash('sha256').update(staffToken).digest('hex');
 sqlite.prepare("INSERT INTO password_credentials(username,user_id,salt,password_hash,version,changed_at) VALUES('staff_login','staff','test-salt',?,1,0)").run('a'.repeat(64));
 sqlite.prepare("INSERT INTO password_sessions(token_hash,user_id,csrf,credential_version,expires_at,created_at) VALUES(?,'staff','staff-csrf',1,4102444800,0)").run(staffTokenHash);
 sqlite.prepare("INSERT INTO settings(id,value) VALUES('staff_password_ready:staff','1')").run();
 const db={prepare:sql=>new Statement(sqlite,sql),async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
 async function call(who,path,method='GET',data,csrfOverride){const localStaff=who==='staff',csrf=csrfOverride??(who==='owner'?'owner-csrf':who==='staff'?'staff-csrf':who==='member'?'member-csrf':''),response=await handle(new Request(`https://portal.example.test${path}`,{method,headers:{'content-type':'application/json','origin':'https://portal.example.test','x-csrf-token':csrf,...(localStaff?{cookie:`__Host-master7_session=${staffToken}`}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})}),{db,identity:who&&!localStaff?{userId:who,email:`${who}@example.test`}:null,ownerEmail:'owner@example.test'});return {status:response.status,data:await response.json()};}
 return {sqlite,call};
}

test('engagement routes expose a safe public view and reserve settings for the owner',async()=>{
 const {sqlite,call}=fixture(),publicDefault=await call(null,'/api/engagement');assert.equal(publicDefault.status,200);assert.equal(publicDefault.data.configured,false);assert.equal(publicDefault.data.program.enabled,false);assert.deepEqual(publicDefault.data.readiness.tournament.leaderboard,[]);assert.equal(publicDefault.data.readiness.jackpot.poolAmount,null);assert.equal(publicDefault.data.readiness.jackpot.drawEnabled,false);assert.equal(publicDefault.data.automaticRewards,false);assert.equal(Object.hasOwn(publicDefault.data,'storage'),false);assert.equal(Object.hasOwn(publicDefault.data,'updatedBy'),false);
 assert.equal((await call(null,'/api/admin/engagement')).status,401);assert.equal((await call('staff','/api/admin/engagement')).status,403);const admin=await call('owner','/api/admin/engagement');assert.equal(admin.status,200);assert.equal(admin.data.providers.length,38);
 const program=structuredClone(admin.data.program);program.enabled=true;program.tournament.enabled=true;program.depositSpin={enabled:true,title:'Deposit Lucky Wheel',minDepositMYR:50,spinsPerDeposit:1,dailySpinCap:3,turnoverMultiplier:20,prizeNote:'Display only until audited draw connection.'};program.jackpot.enabled=true;program.personalizedLobby={enabled:true,ownerCuratedProviders:['jili','bg'],maxItems:10};program.notificationCenter={enabled:true,tickets:true,financial:true,systemStatus:true,sound:true};
 assert.equal((await call('owner','/api/admin/engagement','POST',{program},'bad-csrf')).status,403);assert.equal((await call('staff','/api/admin/engagement','POST',{program})).status,403);const attempt=structuredClone(program);attempt.jackpot.drawEnabled=true;assert.equal((await call('owner','/api/admin/engagement','POST',{program:attempt})).status,400);
 const saved=await call('owner','/api/admin/engagement','POST',{program});assert.equal(saved.status,200);assert.equal(saved.data.readiness.tournament.published,true);assert.equal(saved.data.readiness.tournament.awardsEnabled,false);assert.deepEqual(saved.data.readiness.tournament.leaderboard,[]);assert.equal(saved.data.readiness.depositSpin.published,true);assert.equal(saved.data.readiness.depositSpin.qualificationSource,'credited_deposit_orders');assert.equal(saved.data.readiness.depositSpin.spinLedger,'not_connected');assert.equal(saved.data.readiness.depositSpin.randomDrawSource,'not_connected');assert.equal(saved.data.readiness.depositSpin.awardsEnabled,false);assert.equal(saved.data.readiness.jackpot.drawEnabled,false);assert.equal(saved.data.readiness.jackpot.poolAmount,null);assert.equal(saved.data.walletCredit,false);assert.equal(saved.data.moneyMovement,false);assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM audit WHERE event='engagement_program_updated'").get().n,1);
 const publicSaved=await call('member','/api/engagement');assert.equal(publicSaved.status,200);assert.deepEqual(publicSaved.data.program,program);assert.equal(publicSaved.data.readiness.personalizedLobby.sensitiveWageringInference,false);assert.equal(publicSaved.data.readiness.notificationCenter.copiesRecords,false);assert.equal(Object.hasOwn(publicSaved.data,'providers'),false);assert.equal(Object.hasOwn(publicSaved.data,'updatedAt'),false);
});
