import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {handle} from '../lib/backend.ts';

class Statement{
 constructor(sqlite,sql,args=[]){this.sqlite=sqlite;this.sql=sql;this.args=args;}
 bind(...args){return new Statement(this.sqlite,this.sql,args);}
 async first(){return this.sqlite.prepare(this.sql).get(...this.args)??null;}
 async all(){return {results:this.sqlite.prepare(this.sql).all(...this.args)};}
 async run(){return this.sqlite.prepare(this.sql).run(...this.args);}
}
function fixture(t){
 const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());
 const dir=new URL('../drizzle/',import.meta.url);for(const file of readdirSync(dir).filter(name=>name.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL(file,dir),'utf8'));
 sqlite.exec(`
  INSERT INTO users(id,username,role,approved,csrf,created_at) VALUES
   ('owner','owner@example.test','owner',1,'csrf',0),('staff','staff@example.test','staff',1,'csrf',0),
   ('alice','alice@example.test','member',1,'csrf',0),('bob','bob@example.test','member',1,'csrf',0),('charlie','charlie@example.test','member',1,'csrf',0);
  INSERT INTO game_provider_profiles(id,provider_id,display_name,adapter_key,wallet_mode,balance_class,currency,unit_numerator,unit_denominator,environment,status,created_at,updated_at)
   VALUES('jdb_myr','jdb','JDB MYR','jdb','transfer','cash','MYR',1,1,'uat','uat',0,0),('jili_myr_1to1','jili','JILI MYR','jili','transfer','cash','MYR',1,1,'uat','uat',0,0);
  INSERT INTO game_provider_players(profile_id,user_id,provider_player_id,status,created_at,updated_at)
   VALUES('jdb_myr','alice','alice-vendor-id','verified',0,0),('jdb_myr','bob','bob-vendor-id','verified',0,0),('jili_myr_1to1','alice','alice-jili-id','verified',0,0);
  INSERT INTO game_provider_sessions(id,profile_id,user_id,provider_player_id,game_code,provider_game_id,request_key,request_fingerprint,wallet_mode,currency,status,created_at,updated_at)
   VALUES('alice-jdb','jdb_myr','alice','alice-vendor-id','0:1','0:1','alice-request','private-fingerprint','transfer','MYR','unknown',1,3),
         ('bob-jdb','jdb_myr','bob','bob-vendor-id','0:2','0:2','bob-request','private-fingerprint','transfer','MYR','active',1,2),
         ('alice-jili','jili_myr_1to1','alice','alice-jili-id','1','1','jili-request','private-fingerprint','transfer','MYR','settled',1,4);
  INSERT INTO wallet_reservations(user_id,kind,reference_id,amount_minor,created_at)
   VALUES('alice','game','alice-jdb',4000,1),('bob','game','bob-jdb',5000,1),('charlie','game','missing-session',6000,1);
  INSERT INTO game_wallet_transfers(id,session_id,profile_id,user_id,direction,request_key,request_fingerprint,provider_reference,amount_minor,currency,status,created_at,updated_at)
   VALUES('alice-transfer','alice-jdb','jdb_myr','alice','deposit','transfer-request','private-transfer-fingerprint','vendor-ref-alice',4000,'MYR','unknown',1,3),
         ('bob-transfer','bob-jdb','jdb_myr','bob','deposit','bob-transfer-request','private-bob-fingerprint','vendor-ref-bob',5000,'MYR','succeeded',1,2);
 `);
 const staffToken='S'.repeat(43),staffTokenHash=createHash('sha256').update(staffToken).digest('hex');
 sqlite.prepare("INSERT INTO password_credentials(username,user_id,salt,password_hash,version,changed_at) VALUES('staff_local','staff','fixture-salt','fixture-hash',1,0)").run();
 sqlite.prepare("INSERT INTO settings(id,value) VALUES('staff_password_ready:staff','1')").run();
 sqlite.prepare("INSERT INTO password_sessions(token_hash,user_id,csrf,credential_version,expires_at,created_at) VALUES(?,'staff','csrf',1,4102444800,0)").run(staffTokenHash);
 const db={prepare:sql=>new Statement(sqlite,sql),async batch(items){sqlite.exec('BEGIN IMMEDIATE');try{const result=[];for(const item of items)result.push(await item.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 let supplierCalls=0;
 async function call(who,path,method='GET',body){
  const localStaff=who==='local:staff';
  const response=await handle(new Request('https://portal.example.test'+path,{method,headers:{origin:'https://portal.example.test','content-type':'application/json','x-csrf-token':'csrf',...(localStaff?{cookie:`__Host-master7_session=${staffToken}`}:{})},...(body?{body:JSON.stringify(body)}:{})}),{db,identity:who&&!localStaff?{userId:who,email:`${who}@example.test`}:null,ownerEmail:'owner@example.test',newGameLaunchesEnabled:'false',gameGatewayFetch:async()=>{supplierCalls++;throw Error('unexpected supplier call');}});
  return {status:response.status,data:await response.json()};
 }
 return {sqlite,call,supplierCalls:()=>supplierCalls};
}

test('member reads only their own profile session and transfer while gaming is closed',async t=>{
 const f=fixture(t),a=await f.call('alice','/api/game-wallet?profileId=jdb_myr');
 assert.equal(a.status,200);assert.equal(a.data.profileId,'jdb_myr');assert.equal(a.data.providerId,'jdb');assert.equal(a.data.readOnly,true);
 assert.equal(a.data.session.id,'alice-jdb');assert.equal(a.data.session.status,'unknown');assert.equal(a.data.session.reservedMinor,'4000');assert.equal(a.data.transfers[0].id,'alice-transfer');
 assert.equal(a.data.wallet.gameHeldMinor,'4000');assert.equal(a.data.walletReady,false);assert.equal(a.data.liveReady,false);assert.equal(a.data.supportsSettlement,false);assert.equal(a.data.supportsRecovery,false);
 const serialized=JSON.stringify(a.data);for(const hidden of ['bob-jdb','bob-vendor-id','alice-vendor-id','private-fingerprint','vendor-ref-alice'])assert.ok(!serialized.includes(hidden));
 const b=await f.call('bob','/api/game-wallet?profileId=jdb_myr');assert.equal(b.data.session.id,'bob-jdb');assert.equal(b.data.transfers[0].id,'bob-transfer');
 const other=await f.call('alice','/api/game-wallet?profileId=jili_myr_1to1');assert.equal(other.data.session.id,'alice-jili');assert.deepEqual(other.data.transfers,[]);
 assert.equal(f.supplierCalls(),0);
});

test('staff and owner see profile records, provider references and unmatched holds read-only',async t=>{
 const f=fixture(t);
 for(const who of ['local:staff','owner']){
  const report=await f.call(who,'/api/admin/game-wallet');assert.equal(report.status,200);assert.equal(report.data.readOnly,true);
  const alice=report.data.profileItems.find(x=>x.id==='alice-jdb');assert.equal(alice.username,'alice@example.test');assert.equal(alice.reservedMinor,'4000');assert.equal(alice.lastTransfer.providerReference,'vendor-ref-alice');
  assert.equal(report.data.unmatchedReservations[0].referenceId,'missing-session');assert.equal(report.data.unmatchedReservations[0].amountMinor,'6000');
  assert.ok(!JSON.stringify(report.data).includes('private-fingerprint'));assert.ok(!JSON.stringify(report.data).includes('alice-vendor-id'));
 }
 assert.equal((await f.call('staff','/api/admin/game-wallet')).status,401,'hosted identity must not grant staff access');
 assert.equal((await f.call('alice','/api/admin/game-wallet')).status,403);assert.equal((await f.call(null,'/api/admin/game-wallet')).status,401);
 assert.equal(f.supplierCalls(),0);
});

test('read access does not enable settlement or recovery without the transfer runtime',async t=>{
 const f=fixture(t),before=f.sqlite.prepare('SELECT COUNT(*) n FROM game_wallet_transfers').get().n;
 assert.equal((await f.call('alice','/api/game-wallet?profileId=jdb_myr')).status,200);
 for(const path of ['/api/game-wallet/settle','/api/game-wallet/recover']){const r=await f.call('alice',path,'POST',{profileId:'jdb_myr',sessionId:'alice-jdb'});assert.equal(r.status,503);assert.equal(r.data.code,'GAME_TRANSFER_PROFILE_UNAVAILABLE');}
 assert.equal((await f.call('alice','/api/game-wallet?profile=other&profileId=jdb_myr')).status,400);
 assert.equal((await f.call('alice','/api/game-wallet?profileId=spribe_myr')).status,400);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM game_wallet_transfers').get().n,before);assert.equal(f.supplierCalls(),0);
});
