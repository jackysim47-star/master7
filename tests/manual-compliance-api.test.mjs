import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {handle} from '../lib/backend.ts';

function fixture(t){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
 for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>/^\d{4}_.+\.sql$/.test(x)).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 for(const [id,role] of [['owner','owner'],['staff','staff'],['alice','member'],['bob','member']])sqlite.prepare('INSERT INTO users(id,username,role,approved,csrf,created_at) VALUES(?,?,?,1,?,0)').run(id,id,role,'csrf-'+id);
 class Statement{constructor(sql,args=[]){this.sql=sql;this.args=args;}bind(...args){return new Statement(this.sql,args);}async first(){return sqlite.prepare(this.sql).get(...this.args)??null;}async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}async run(){return sqlite.prepare(this.sql).run(...this.args);}}
 const db={prepare:sql=>new Statement(sql),async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 async function call(who,path,method='GET',data,options={}){
  const response=await handle(new Request('https://portal.example.test'+path,{method,headers:{Origin:options.origin??'https://portal.example.test','Content-Type':'application/json','X-CSRF-Token':options.csrf??'csrf-'+who},...(data===undefined?{}:{body:JSON.stringify(data)})}),{db,identity:who?{userId:who,email:who+'@example.test'}:null,ownerEmail:'owner@example.test',allowedOrigins:['https://portal.example.test'],newDepositsEnabled:'true',newGameLaunchesEnabled:'true',...options.context});
  return {status:response.status,data:await response.json()};
 }
 t.after(()=>sqlite.close());return {sqlite,call};
}

test('manual identity and AML are distinct, scoped to the member, and require explicit owner review',async t=>{
 const f=fixture(t);
 assert.equal((await f.call(null,'/api/compliance')).status,401);
 assert.equal((await f.call('alice','/api/compliance')).data.reviewComplete,false);
 assert.equal((await f.call('alice','/api/compliance','POST',{})).data.identityStatus,'pending');
 assert.equal((await f.call('bob','/api/compliance')).data.identityStatus,'not_started');
 assert.equal((await f.call('staff','/api/admin/compliance')).status,401);
 assert.equal((await f.call('alice','/api/admin/compliance')).status,403);
 const decision={memberId:'alice',reviewType:'identity',decision:'passed',expectedVersion:1,confirmed:true};
 assert.equal((await f.call('staff','/api/admin/compliance','POST',decision)).status,401);
 assert.equal((await f.call('owner','/api/admin/compliance','POST',decision,{csrf:'wrong'})).status,403);
 assert.equal((await f.call('owner','/api/admin/compliance','POST',{...decision,confirmed:false})).status,400);
 const first=await f.call('owner','/api/admin/compliance','POST',decision);assert.equal(first.status,200);assert.equal(first.data.reviewComplete,false);assert.equal(first.data.identityStatus,'passed');assert.equal(first.data.amlStatus,'pending');
 assert.equal((await f.call('owner','/api/admin/compliance','POST',decision)).status,409);
 const second=await f.call('owner','/api/admin/compliance','POST',{memberId:'alice',reviewType:'aml',decision:'passed',expectedVersion:2,confirmed:true});assert.equal(second.data.reviewComplete,true);
 assert.equal((await f.call('bob','/api/compliance')).data.reviewComplete,false);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM manual_compliance_events').get().n,2);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM wallet_ledger').get().n,0);
});

test('review endpoints reject unneeded sensitive fields, cross-origin writes, and unknown members',async t=>{
 const f=fixture(t);assert.equal((await f.call('alice','/api/compliance','POST',{document:'private'})).status,400);
 assert.equal((await f.call('alice','/api/compliance','POST',{},{origin:'https://other.example'})).status,403);
 await f.call('alice','/api/compliance','POST',{});
 const decision={memberId:'alice',reviewType:'identity',decision:'passed',expectedVersion:1,confirmed:true};
 assert.equal((await f.call('owner','/api/admin/compliance','POST',{...decision,documentNumber:'private'})).status,400);
 assert.equal((await f.call('owner','/api/admin/compliance','POST',{...decision,memberId:'missing'})).status,404);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM manual_compliance_events').get().n,0);
});

test('locally registered member identifiers can request and receive manual review',async t=>{
 const f=fixture(t),id='local:12345678-1234-1234-1234-123456789abc';
 f.sqlite.prepare("INSERT INTO users(id,username,role,approved,csrf,created_at) VALUES(?,?,'member',1,?,0)").run(id,'newmember','csrf-'+id);
 const requested=await f.call(id,'/api/compliance','POST',{});assert.equal(requested.status,200);assert.equal(requested.data.identityStatus,'pending');
 const reviewed=await f.call('owner','/api/admin/compliance','POST',{memberId:id,reviewType:'identity',decision:'passed',expectedVersion:1,confirmed:true});
 assert.equal(reviewed.status,200);assert.equal(reviewed.data.identityStatus,'passed');assert.equal(reviewed.data.amlStatus,'pending');
});

test('an audit event failure rolls back the review decision',async t=>{
 const f=fixture(t);await f.call('alice','/api/compliance','POST',{});
 f.sqlite.exec("CREATE TRIGGER fail_compliance_event BEFORE INSERT ON manual_compliance_events BEGIN SELECT RAISE(ABORT,'fixture event failure'); END;");
 const result=await f.call('owner','/api/admin/compliance','POST',{memberId:'alice',reviewType:'identity',decision:'passed',expectedVersion:1,confirmed:true});
 assert.equal(result.status,503);
 const review=await f.call('alice','/api/compliance');assert.equal(review.data.identityStatus,'pending');assert.equal(review.data.version,1);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM manual_compliance_events').get().n,0);
});

const enforced={context:{manualComplianceEnforced:'true'}};
const depositAttempts=[
 ['/api/payments/vpay/orders',{amount:'10.00',tradeCode:'1',payerName:'Fixture',requestKey:'review-vpay-request-001'}],
 ['/api/payments/gspay/orders',{amount:'10.00',requestKey:'review-gspay-request-01'}],
 ['/api/payments/1mpay/orders',{amount:'10.00',requestKey:'review-1mpay-request-01'}],
 ['/api/manual-bank/deposits',{amount:'10.00',bankId:'fixture',receiptData:'data:image/png;base64,AA==',requestKey:'review-manual-request-1'}],
];
async function passReview(f){
 assert.equal((await f.call('alice','/api/compliance','POST',{},enforced)).status,200);
 for(const [reviewType,expectedVersion] of [['identity',1],['aml',2]]){
  const response=await f.call('owner','/api/admin/compliance','POST',{memberId:'alice',reviewType,decision:'passed',expectedVersion,confirmed:true},enforced);
  assert.equal(response.status,200);
 }
}
test('optional review gate blocks each new transaction until both reviews pass',async t=>{
 const f=fixture(t);assert.equal((await f.call('alice','/api/compliance','GET',undefined,enforced)).data.enforcementEnabled,true);
 for(const [path,data] of depositAttempts){const result=await f.call('alice',path,'POST',data,enforced);assert.equal(result.status,403,path);assert.equal(result.data.code,'COMPLIANCE_REVIEW_REQUIRED',path);}
 for(const [path,data] of [['/api/game-launch',{providerId:'megah5',gameCode:'55021'}],['/api/withdrawals',{amount:'10.00'}]]){
  const result=await f.call('alice',path,'POST',data,enforced);assert.equal(result.status,403,path);assert.equal(result.data.code,'COMPLIANCE_REVIEW_REQUIRED',path);
 }
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM deposit_orders').get().n,0);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM wallet_ledger').get().n,0);
 await f.call('alice','/api/compliance','POST',{},enforced);
 await f.call('owner','/api/admin/compliance','POST',{memberId:'alice',reviewType:'identity',decision:'passed',expectedVersion:1,confirmed:true},enforced);
 assert.equal((await f.call('alice','/api/game-launch','POST',{providerId:'megah5',gameCode:'55021'},enforced)).data.code,'COMPLIANCE_REVIEW_REQUIRED');
 const complete=await f.call('owner','/api/admin/compliance','POST',{memberId:'alice',reviewType:'aml',decision:'passed',expectedVersion:2,confirmed:true},enforced);assert.equal(complete.data.reviewComplete,true);
 for(const [path,data] of [...depositAttempts,['/api/game-launch',{providerId:'missing',gameCode:'55021'}],['/api/withdrawals',{amount:'10.00'}]]){
  const result=await f.call('alice',path,'POST',data,enforced);assert.notEqual(result.data.code,'COMPLIANCE_REVIEW_REQUIRED',path);
 }
 const authorized=f.sqlite.prepare("SELECT target FROM audit WHERE event='manual_compliance_action_authorized' ORDER BY target").all().map(x=>x.target);
 assert.deepEqual(authorized,['deposit:v3','deposit:v3','deposit:v3','deposit:v3','game_launch:v3','withdrawal:v3']);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM deposit_orders').get().n,0);
});

test('review gate defaults off and is exposed accurately to members',async t=>{
 const f=fixture(t);assert.equal((await f.call('alice','/api/compliance')).data.enforcementEnabled,false);
 assert.equal((await f.call('alice','/api/compliance','GET',undefined,{context:{manualComplianceEnforced:'false'}})).data.enforcementEnabled,false);
 const result=await f.call('alice','/api/game-launch','POST',{providerId:'missing',gameCode:'55021'});
 assert.notEqual(result.data.code,'COMPLIANCE_REVIEW_REQUIRED');
 assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM audit WHERE event='manual_compliance_action_authorized'").get().n,0);
});

test('revoked review blocks later requests without blocking reads, existing order query or game recovery',async t=>{
 const f=fixture(t);await passReview(f);
 const revoked=await f.call('owner','/api/admin/compliance','POST',{memberId:'alice',reviewType:'aml',decision:'failed',expectedVersion:3,confirmed:true},enforced);assert.equal(revoked.status,200);
 const next=await f.call('alice','/api/game-launch','POST',{providerId:'megah5',gameCode:'55021'},enforced);assert.equal(next.data.code,'COMPLIANCE_REVIEW_REQUIRED');
 for(const [path,method,data] of [
  ['/api/wallet','GET',undefined],['/api/payment-records','GET',undefined],['/api/withdrawals','GET',undefined],
  ['/api/payments/1mpay/orders/query','POST',{orderId:'missing-order'}],
  ['/api/game-wallet/settle','POST',{}],['/api/game-wallet/recover','POST',{}],
 ]){const result=await f.call('alice',path,method,data,enforced);assert.notEqual(result.data.code,'COMPLIANCE_REVIEW_REQUIRED',path);}
});

test('authorization audit failure rolls back the grant and prevents a transaction',async t=>{
 const f=fixture(t);await passReview(f);
 f.sqlite.exec("CREATE TRIGGER fail_action_audit BEFORE INSERT ON audit WHEN NEW.event='manual_compliance_action_authorized' BEGIN SELECT RAISE(ABORT,'fixture failure'); END;");
 const result=await f.call('alice','/api/payments/1mpay/orders','POST',depositAttempts[2][1],enforced);assert.equal(result.status,503);
 assert.equal(f.sqlite.prepare("SELECT last_authorization_id FROM manual_compliance_reviews WHERE user_id='alice'").get().last_authorization_id,null);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM deposit_orders').get().n,0);
 assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM wallet_ledger').get().n,0);
});
