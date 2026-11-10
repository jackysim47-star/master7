import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {handle} from '../lib/backend.ts';
import {jdbPlayerId} from '../lib/jdb-transfer-protocol.ts';
import {jdbProfileRuntime} from '../lib/jdb-profile-runtime.ts';
import {seedTransferProfile} from '../lib/game-provider-runtime.ts';
import {GAME_PROVIDER_ACCEPTANCE_CAPABILITIES,getGameProviderAcceptanceReadiness} from '../lib/game-provider-acceptance.ts';

function fixture(){
 const sqlite=new DatabaseSync(':memory:');for(const name of readdirSync(new URL('../drizzle',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
 for(const [id,role] of [['alice','member'],['bob','member'],['owner','owner'],['staff','staff']])sqlite.prepare('INSERT INTO users(id,username,role,approved,csrf,created_at) VALUES(?,?,?,1,?,0)').run(id,id,role,'csrf-'+id);
 const staffToken='J'.repeat(43),staffTokenHash=createHash('sha256').update(staffToken).digest('hex');
 sqlite.prepare("INSERT INTO password_credentials(username,user_id,salt,password_hash,version,changed_at) VALUES('staff_local','staff','fixture-salt','fixture-hash',1,0)").run();
 sqlite.prepare("INSERT INTO settings(id,value) VALUES('staff_password_ready:staff','1')").run();
 sqlite.prepare("INSERT INTO password_sessions(token_hash,user_id,csrf,credential_version,expires_at,created_at) VALUES(?,'staff','csrf-staff',1,4102444800,0)").run(staffTokenHash);
 sqlite.exec("INSERT INTO deposit_orders(id,user_id,request_key,fingerprint,provider,amount_minor,currency,trade_code,status,created_at,updated_at) VALUES('synthetic-credit','alice','synthetic-credit','fixture','manual_bank',2000,'MYR','fixture','credited',0,0);INSERT INTO wallet_ledger(id,order_id,user_id,account_code,amount_minor,currency,created_at) VALUES('synthetic-member','synthetic-credit','alice','member',2000,'MYR',0),('synthetic-clearing','synthetic-credit','alice','provider_clearing',-2000,'MYR',0)");
 class Statement{constructor(sql,args=[]){this.sql=sql;this.args=args;}bind(...args){return new Statement(this.sql,args);}async first(){return sqlite.prepare(this.sql).get(...this.args)??null;}async all(){return{results:sqlite.prepare(this.sql).all(...this.args)};}async run(){const result=sqlite.prepare(this.sql).run(...this.args);return{success:true,meta:{changes:Number(result.changes)}};}}
 let queue=Promise.resolve();const db={prepare:sql=>new Statement(sql),batch(statements){const result=queue.then(async()=>{sqlite.exec('BEGIN IMMEDIATE');try{const out=[];for(const s of statements)out.push(await s.run());sqlite.exec('COMMIT');return out;}catch(e){sqlite.exec('ROLLBACK');throw e;}});queue=result.catch(()=>{});return result;}};
 const connection={profile:'jdb_myr',baseUrl:'https://provider.example.test',dc:'synthetic',parent:'agent01',aesKey:'key1234567Sample',aesIv:'iv12345678Sample',padding:'space',launchOrigins:['https://games.example.test'],reportUtcOffsetMinutes:480};
 const slot={mode:'qa',environment:'production',recoveryEnabled:true,sessionClosureVerified:true,qaMemberIds:['alice'],approvedApiOrigins:[connection.baseUrl],connection},document={profiles:{jdb_myr:slot}},providerCalls=[];
 const transport=async(...args)=>{providerCalls.push(args);throw new Error('JDB provider transport must remain unused in v164 staging');};
 const gameGatewayFetch=async url=>{assert.equal(url,'https://master7-integration-gateway.onrender.com/providers/jdb/games');return Response.json({provider:'jdb',games:[{gameCode:'0:100',name:'Synthetic game',category:'SLOT',maintenance:false}],complete:true,upstreamStatus:200});};
 const config={db,ownerEmail:'',newDepositsEnabled:'false',newPayoutsEnabled:'false',newGameLaunchesEnabled:'true',providerTransferFetch:transport,gameGatewayUrl:'https://master7-integration-gateway.onrender.com',gameGatewayFetch};
 const request=async(who,path,method='GET',data,extra={})=>{const localStaff=who==='local:staff',response=await handle(new Request('https://www.master7.best'+path,{method,headers:{Origin:'https://www.master7.best','Content-Type':'application/json','X-CSRF-Token':localStaff?'csrf-staff':'csrf-'+who,'X-Forwarded-For':'192.0.2.8',...(localStaff?{Cookie:`__Host-master7_session=${staffToken}`}:{})},...(data?{body:JSON.stringify(data)}:{})}),{...config,identity:who&&!localStaff?{userId:who,email:who+'@example.test'}:null,jdbTransferProfilesJson:JSON.stringify(document),...extra});return{status:response.status,body:await response.json()};};
 const launch=()=>request('alice','/api/game-launch','POST',{profileId:'jdb_myr',providerId:'jdb',gameCode:'0:100',idempotencyKey:crypto.randomUUID(),language:'en'});
 const acceptJdb=async()=>{for(const capability of GAME_PROVIDER_ACCEPTANCE_CAPABILITIES){const result=await request('owner','/api/admin/game-acceptance','POST',{profileId:'jdb_myr',capability,environment:'production',result:'passed',evidenceSha256:'a'.repeat(64),evidenceReference:`synthetic-${capability}`,observedAt:Math.floor(Date.now()/1000),expectedEventId:null});assert.equal(result.status,201,JSON.stringify(result));}};
 return{sqlite,db,document,connection,slot,providerCalls,config,request,launch,acceptJdb,close:()=>sqlite.close()};
}

function assertClosedWallet(body){
 for(const field of ['launchReady','walletReady','liveReady','launchVerified','walletVerified','settlementVerified','supportsSettlement','supportsRecovery'])assert.equal(body[field],false,field);
 assert.equal(body.session,null);assert.equal(body.capabilityReason,'transfer_connection_unavailable');
}

test('QA credentials and membership cannot activate JDB Play, wallet or recovery in v164 staging',async()=>{
 const h=fixture();try{
  const catalogue=await h.request('alice','/api/games?provider=jdb&profileId=jdb_myr');assert.equal(catalogue.status,200);assert.equal(catalogue.body.selectedProfile.launchReady,false);assert.equal(catalogue.body.selectedProfile.walletReady,false);assert.equal(catalogue.body.games[0].playable,false);assert.equal(catalogue.body.launchProvider,null);assert.equal(catalogue.body.liveReady,false);
  const launch=await h.launch();assert.equal(launch.status,503);assert.equal(launch.body.code,'GAME_TRANSFER_PROFILE_UNAVAILABLE');
  const wallet=await h.request('alice','/api/game-wallet?profileId=jdb_myr');assert.equal(wallet.status,200);assertClosedWallet(wallet.body);assert.equal(wallet.body.wallet.availableMinor,'2000');
  assert.equal(h.providerCalls.length,0);assert.equal(h.sqlite.prepare('SELECT COUNT(*) n FROM game_provider_sessions').get().n,0);assert.equal(h.sqlite.prepare('SELECT COUNT(*) n FROM wallet_reservations').get().n,0);assert.equal(h.sqlite.prepare('SELECT COUNT(*) n FROM game_wallet_ledger').get().n,0);
 }finally{h.close();}
});

test('generic five-capability acceptance cannot substitute for finality, closure and merchant authorization',async()=>{
 const h=fixture();try{
  h.slot.mode='production';h.slot.qaMemberIds=[];await h.acceptJdb();
  const acceptance=await getGameProviderAcceptanceReadiness(h.db),jdb=acceptance.profiles.find(profile=>profile.profileId==='jdb_myr');assert.equal(jdb.evidenceAccepted,true);assert.equal(acceptance.acceptedProfileCount,1);
  const before=await h.request(null,'/health');assert.equal(before.body.providerAcceptance.liveProfileCount,0);assert.equal(before.body.productionReady,false);
  const catalogue=await h.request('alice','/api/games?provider=jdb&profileId=jdb_myr');assert.equal(catalogue.body.selectedProfile.launchReady,false);assert.equal(catalogue.body.selectedProfile.launchVerified,false);assert.equal(catalogue.body.selectedProfile.walletVerified,false);assert.equal(catalogue.body.selectedProfile.settlementVerified,false);assert.equal(catalogue.body.games[0].playable,false);assert.equal(catalogue.body.liveReady,false);
  const launch=await h.launch();assert.equal(launch.status,503);assert.equal(launch.body.code,'GAME_TRANSFER_PROFILE_UNAVAILABLE');
  const after=await h.request(null,'/health');assert.equal(after.body.providerAcceptance.liveProfileCount,0);assert.equal(after.body.liveGames,false);assert.equal(after.body.productionReady,false);assert.equal(h.providerCalls.length,0);
 }finally{h.close();}
});

test('valid secret documents parse to a closed adapter and can seed only a closed profile',async()=>{
 const h=fixture();try{
  const runtime=jdbProfileRuntime(JSON.stringify(h.document),'jdb_myr','alice',{fetchImpl:h.config.providerTransferFetch,productionAccepted:true});assert.ok(runtime);assert.equal(runtime.launchAuthorized,false);assert.equal(runtime.recoveryEnabled,false);assert.equal(runtime.mode,'closed');
  assert.equal(await seedTransferProfile(h.db,runtime),true);assert.equal(h.sqlite.prepare("SELECT status FROM game_provider_profiles WHERE id='jdb_myr'").get().status,'closed');assert.equal(h.providerCalls.length,0);
  assert.notEqual(jdbPlayerId('jdb_myr','alice'),jdbPlayerId('spribe_myr','alice'));
 }finally{h.close();}
});

test('invalid runtime documents fail closed and the general secret has no activation bypass',async()=>{
 const h=fixture();try{
  assert.equal(jdbProfileRuntime('{invalid','jdb_myr','alice'),null);assert.equal(jdbProfileRuntime(JSON.stringify(h.document),'unregistered','alice'),null);assert.equal(jdbProfileRuntime(JSON.stringify(h.document),'spribe_myr','alice'),null);
  h.connection.baseUrl='https://provider.example.test/api';assert.equal(jdbProfileRuntime(JSON.stringify(h.document),'jdb_myr','alice'),null);h.connection.baseUrl='https://provider.example.test';h.slot.approvedApiOrigins=['https://other.example.test'];assert.equal(jdbProfileRuntime(JSON.stringify(h.document),'jdb_myr','alice'),null);
  h.slot.approvedApiOrigins=[h.connection.baseUrl];const result=await h.request('alice','/api/game-launch','POST',{profileId:'jdb_myr',providerId:'jdb',gameCode:'0:100',idempotencyKey:'general-secret',language:'en'},{jdbTransferProfilesJson:'',gameTransferProfilesJson:JSON.stringify(h.document)});assert.equal(result.status,503);assert.equal(result.body.code,'GAME_TRANSFER_PROFILE_UNAVAILABLE');assert.equal(h.providerCalls.length,0);
 }finally{h.close();}
});

test('closed JDB state is read-only for members and staff with no sensitive runtime values',async()=>{
 const h=fixture();try{
  const wallet=await h.request('alice','/api/game-wallet?profileId=jdb_myr');assertClosedWallet(wallet.body);
  const recover=await h.request('alice','/api/game-wallet/recover','POST',{profileId:'jdb_myr',sessionId:'missing'});assert.notEqual(recover.status,200);
  const settle=await h.request('alice','/api/game-wallet/settle','POST',{profileId:'jdb_myr',sessionId:'missing'});assert.notEqual(settle.status,200);
  for(const who of ['owner','local:staff']){const records=await h.request(who,'/api/admin/game-wallet');assert.equal(records.status,200);assert.deepEqual(records.body.profileItems,[]);assert.ok(!JSON.stringify(records.body).includes(h.connection.aesKey));}
  assert.equal((await h.request('staff','/api/admin/game-wallet')).status,401,'hosted identity must not grant staff access');
  assert.equal(h.providerCalls.length,0);assert.equal(h.sqlite.prepare('SELECT COUNT(*) n FROM wallet_reservations').get().n,0);
 }finally{h.close();}
});
