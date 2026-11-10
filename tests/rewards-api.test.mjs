import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {handle} from '../lib/backend.ts';
import {defaultRewardsHubProgram} from '../lib/rewards-hub.ts';

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
  CREATE TABLE audit(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,event TEXT NOT NULL,target TEXT NOT NULL,created_at INTEGER NOT NULL);
  CREATE TABLE rate_limits(id TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at INTEGER NOT NULL);
  CREATE TABLE deposit_orders(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,amount_minor INTEGER NOT NULL,currency TEXT NOT NULL,status TEXT NOT NULL);
  CREATE TABLE referral_relationships(member_id TEXT PRIMARY KEY,referrer_id TEXT NOT NULL,created_at INTEGER NOT NULL);
  CREATE TABLE wallet_ledger(id TEXT PRIMARY KEY,amount_minor INTEGER NOT NULL);
  CREATE TABLE rewards_checkins(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,myt_day INTEGER NOT NULL,cycle_day INTEGER NOT NULL,streak INTEGER NOT NULL,points INTEGER NOT NULL,created_at INTEGER NOT NULL,UNIQUE(user_id,myt_day));
  CREATE TABLE rewards_points_ledger(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,source_type TEXT NOT NULL,source_id TEXT NOT NULL,points INTEGER NOT NULL,status TEXT NOT NULL,cash_value_status TEXT NOT NULL,wallet_credit_status TEXT NOT NULL,redemption_status TEXT NOT NULL,created_at INTEGER NOT NULL,UNIQUE(source_type,source_id));
  INSERT INTO users VALUES('owner','owner@example.test','owner',1,'owner-csrf',1),('staff','staff@example.test','staff',1,'staff-csrf',2),('member','member-visible','member',1,'member-csrf',3);
 `);const db={prepare:sql=>new Statement(sqlite,sql),async batch(list){sqlite.exec('BEGIN');try{const output=[];for(const item of list)output.push(await item.run());sqlite.exec('COMMIT');return output;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
 async function call(who,path,method='GET',data){const headers={'content-type':'application/json','origin':'https://portal.example.test'};if(who)headers['x-csrf-token']=`${who}-csrf`;const response=await handle(new Request(`https://portal.example.test${path}`,{method,headers,...(data===undefined?{}:{body:JSON.stringify(data)})}),{db,identity:who?{userId:who,email:`${who}@example.test`}:null,ownerEmail:'owner@example.test',allowedOrigins:['https://portal.example.test']});return {status:response.status,data:await response.json()};}
 return {sqlite,call};
}

test('Rewards Hub routes separate public, member and owner capabilities without wallet credit',async()=>{
 const {sqlite,call}=fixture(),publicDefault=await call(null,'/api/rewards');
 assert.equal(publicDefault.status,200);assert.equal(publicDefault.data.program.enabled,false);assert.equal(publicDefault.data.member,null);assert.equal(publicDefault.data.capabilities.walletCredit,false);assert.equal(publicDefault.data.capabilities.redemption,false);
 assert.equal((await call('staff','/api/admin/rewards')).status,401);const ownerDefault=await call('owner','/api/admin/rewards');assert.equal(ownerDefault.status,200);assert.equal(ownerDefault.data.activity.issuedNonCashPoints,0);
 const program=defaultRewardsHubProgram();program.enabled=true;program.pointsEnabled=true;program.checkIn={enabled:true,dailyPoints:[3,3,3,3,3,3,3]};
 const saved=await call('owner','/api/admin/rewards','POST',{program});assert.equal(saved.status,200);assert.equal(saved.data.program.enabled,true);assert.equal(sqlite.prepare("SELECT COUNT(*) count FROM audit WHERE event='rewards_hub_updated'").get().count,1);
 assert.equal((await call('staff','/api/admin/rewards','POST',{program})).status,401);
 const member=await call('member','/api/rewards');assert.equal(member.status,200);assert.equal(member.data.member.points.balance,0);assert.equal(member.data.member.checkIn.enabled,true);
 const first=await call('member','/api/rewards/check-in','POST',{}),duplicate=await call('member','/api/rewards/check-in','POST',{});assert.equal(first.status,200);assert.equal(first.data.idempotent,false);assert.equal(first.data.points,3);assert.equal(first.data.walletCredited,false);assert.equal(duplicate.status,200);assert.equal(duplicate.data.idempotent,true);
 assert.equal(sqlite.prepare('SELECT COUNT(*) count FROM rewards_checkins').get().count,1);assert.equal(sqlite.prepare('SELECT COUNT(*) count FROM rewards_points_ledger').get().count,1);assert.equal(sqlite.prepare('SELECT COUNT(*) count FROM wallet_ledger').get().count,0);
 assert.equal(sqlite.prepare("SELECT wallet_credit_status FROM rewards_points_ledger").get().wallet_credit_status,'disabled');
 sqlite.close();
});
