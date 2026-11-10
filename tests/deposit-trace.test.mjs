import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {handleVPay} from '../lib/vpay.ts';
import {handle} from '../lib/backend.ts';

function fixture(t){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
 for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(file=>file.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 for(const [id,role] of [['alice','member'],['bob','member'],['owner','owner'],['staff','staff']])sql.prepare("INSERT INTO users(id,username,role,approved,csrf,created_at) VALUES(?,?,?,1,'fixture',0)").run(id,id,role);
 const activity={reads:0,writes:0,network:0};
 class Statement{
  constructor(query,args=[]){this.query=query;this.args=args;}
  bind(...args){return new Statement(this.query,args);}
  async first(){activity.reads++;if(this.query.startsWith('SELECT status,updated_at,provider_trade_no')&&activity.finalState)return activity.finalState;return sql.prepare(this.query).get(...this.args)??null;}
  async all(){activity.reads++;return {results:sql.prepare(this.query).all(...this.args)};}
  async run(){activity.writes++;throw Error('unexpected write');}
 }
 const db={prepare(query){assert.match(query,/^SELECT\b/i);return new Statement(query);},async batch(){activity.writes++;throw Error('unexpected batch');}};
 const owner={id:'owner',username:'owner',role:'owner',approved:1,csrf:'x'},context={db,user:owner,fetchImpl:async()=>{activity.network++;throw Error('unexpected network');}};
 function order(id,provider='vpay',status='created',user='alice'){
  sql.prepare("INSERT INTO deposit_orders(id,user_id,request_key,fingerprint,provider,amount_minor,currency,trade_code,status,provider_trade_no,checkout_url,created_at,updated_at) VALUES(?,?,?,'fixture',?,2000,'MYR','bank',?,?,?,1,2)").run(id,user,'request-'+id,provider,status,'trade-'+id,'https://checkout.example.test/private?token=do-not-expose');
 }
 function ledger(orderId,id,account,amount,user='alice',currency='MYR'){sql.prepare('INSERT INTO wallet_ledger VALUES(?,?,?,?,?,?,?)').run(id,orderId,user,account,amount,currency,3);}
 function audit(id,event,target,user='alice'){sql.prepare('INSERT INTO audit(id,user_id,event,target,created_at) VALUES(?,?,?,?,?)').run(id,user,event,target,4);}
 async function call(path,user=owner){const response=await handleVPay(new Request('https://portal.example.test'+path),{...context,user});return {status:response.status,data:await response.json()};}
 function freeze(){sql.exec('PRAGMA query_only=ON');return sql.prepare('SELECT total_changes() n').get().n;}
 t.after(()=>sql.close());return {sql,db,activity,order,ledger,audit,call,freeze};
}
const path=id=>'/api/admin/deposits/trace?orderId='+encodeURIComponent(id);

test('owner trace exposes only matching order and sanitized evidence without provider requests or writes',async t=>{
 const f=fixture(t);f.order('order-a');f.order('order-ab');
 f.audit('a1','payment_order_diagnostic',JSON.stringify({provider:'vpay',orderId:'order-a',kind:'GATEWAY_HTTP',httpStatus:502,providerCode:-1,secret:'do-not-expose'}));
 f.audit('a2','payment_order_diagnostic',JSON.stringify({provider:'vpay',orderId:'order-ab',kind:'TIMEOUT'}));
 f.audit('a3','deposit_callback_review','order-a');
 f.sql.prepare("INSERT INTO payment_recovery_leases(provider,order_id,claim_token,locked_until,last_checked_at,attempts) VALUES('vpay','order-a','do-not-expose',0,100,2)").run();
 const before=f.freeze(),response=await f.call(path('order-a'));assert.equal(response.status,200);const data=response.data;
 assert.equal(data.readOnly,true);assert.equal(data.order.id,'order-a');assert.equal(data.order.providerTradeNo,'trade-order-a');assert.equal(data.order.checkoutRecorded,true);
 assert.equal(data.providerPayment,'unverified');assert.equal(data.callback.status,'review_recorded');assert.equal(data.callback.completeHistory,false);
 assert.equal(data.ledger.status,'no_entries');assert.equal(data.ledger.reviewRequired,false);
 assert.deepEqual(data.audit.diagnostics.map(x=>x.kind),['GATEWAY_HTTP']);assert.equal(data.audit.diagnostics[0].httpStatus,502);assert.equal(data.audit.diagnostics[0].providerCode,-1);
 assert.equal(data.recovery.status,'recorded');assert.equal(data.recovery.attempts,2);assert.doesNotMatch(JSON.stringify(data),/do-not-expose|checkout\.example|order-ab/);
 assert.equal(f.sql.prepare('SELECT total_changes() n').get().n,before);assert.equal(f.activity.writes,0);assert.equal(f.activity.network,0);
});

test('wallet trace distinguishes balanced entries from a missing or mismatched ledger without inferring payment or callback success',async t=>{
 const f=fixture(t);f.order('balanced','1mpay','credited');f.ledger('balanced','b1','member',2000);f.ledger('balanced','b2','provider_clearing',-2000);f.audit('balanced-callback','1mpay_callback_verified','balanced');
 f.order('missing','gspay','credited');f.order('wrong','vpay','credited');f.ledger('wrong','w1','member',2000,'bob');f.ledger('wrong','w2','provider_clearing',-2000);
 f.order('pending','vpay','unknown');f.ledger('pending','p1','member',2000);
 f.order('manual','manual_bank','pending');f.freeze();
 const balanced=(await f.call(path('balanced'))).data;assert.equal(balanced.ledger.status,'balanced');assert.equal(balanced.ledger.reviewRequired,false);assert.equal(balanced.ledger.entries.length,2);assert.equal(balanced.callback.status,'verified_recorded');assert.equal(balanced.providerPayment,'unverified');assert.equal(balanced.recovery.status,'not_in_lease_table');
 const missing=(await f.call(path('missing'))).data;assert.equal(missing.ledger.status,'no_entries');assert.equal(missing.ledger.reviewRequired,true);assert.equal(missing.recovery.status,'not_recorded');
 const wrong=(await f.call(path('wrong'))).data;assert.equal(wrong.ledger.status,'mismatch');assert.equal(wrong.ledger.reviewRequired,true);assert.equal(wrong.ledger.entries[0].memberMatches,false);
 const pending=(await f.call(path('pending'))).data;assert.equal(pending.ledger.status,'mismatch');assert.equal(pending.ledger.reviewRequired,true);
 const manual=(await f.call(path('manual'))).data;assert.equal(manual.callback.status,'not_applicable');assert.equal(manual.providerPayment,'unverified');
 assert.equal(f.activity.writes,0);assert.equal(f.activity.network,0);
});

test('a 1MPay callback audit cannot classify another provider callback as verified',async t=>{
 const f=fixture(t);f.order('wrong-provider','vpay','unknown');f.audit('wrong-provider-callback','1mpay_callback_verified','wrong-provider');f.freeze();
 const trace=(await f.call(path('wrong-provider'))).data;assert.equal(trace.callback.status,'unknown');assert.equal(trace.providerPayment,'unverified');assert.equal(f.activity.writes,0);assert.equal(f.activity.network,0);
});

test('VPay and GSPAY callback audits cannot classify another provider callback as authenticated',async t=>{
 const f=fixture(t);
 for(const [id,provider,event] of [['vpay-order','vpay','gspay_callback_received'],['gspay-order','gspay','vpay_callback_authenticated'],['onempay-order','1mpay','vpay_callback_authenticated']]){f.order(id,provider,'unknown');f.audit('wrong-'+id,event,id);}
 f.freeze();
 for(const id of ['vpay-order','gspay-order','onempay-order']){const trace=(await f.call(path(id))).data;assert.equal(trace.callback.status,'unknown');assert.equal(trace.providerPayment,'unverified');}
 assert.equal(f.activity.writes,0);assert.equal(f.activity.network,0);
});

test('authenticated VPay and GSPAY callback receipts are reported without inferring provider payment',async t=>{
 const f=fixture(t);
 for(const [provider,event] of [['vpay','vpay_callback_authenticated'],['gspay','gspay_callback_received']]){
  const id='callback-'+provider;f.order(id,provider,'created');f.audit('audit-'+provider,event,id);
 }
 f.freeze();
 for(const provider of ['vpay','gspay']){const data=(await f.call(path('callback-'+provider))).data;assert.equal(data.callback.status,'authenticated_recorded');assert.equal(data.providerPayment,'unverified');assert.equal(data.ledger.status,'no_entries');}
});

test('trace exposes exhausted recovery as manual review without leaking its claim token',async t=>{
 const f=fixture(t);f.order('exhausted','vpay','unknown');f.audit('payment-recovery-manual-review:vpay:exhausted','payment_recovery_manual_review','exhausted');
 f.sql.prepare("INSERT INTO payment_recovery_leases(provider,order_id,claim_token,locked_until,last_checked_at,attempts) VALUES('vpay','exhausted','do-not-expose',0,100,12)").run();
 const before=f.freeze(),response=await f.call(path('exhausted'));assert.equal(response.status,200);const data=response.data;
 assert.equal(data.order.status,'unknown');assert.equal(data.recovery.status,'manual_review');assert.equal(data.recovery.attempts,12);
 assert.ok(data.audit.records.some(item=>item.event==='payment_recovery_manual_review'));assert.doesNotMatch(JSON.stringify(data),/do-not-expose/);
 assert.equal(f.sql.prepare('SELECT total_changes() n').get().n,before);assert.equal(f.activity.writes,0);assert.equal(f.activity.network,0);
});

test('trace requires owner access and a single valid order ID before any database read',async t=>{
 const f=fixture(t);f.order('one');f.freeze();
 for(const [user,status] of [[null,401],[{id:'alice',role:'member'},403],[{id:'staff',role:'staff'},403]])assert.equal((await f.call(path('one'),user)).status,status);
 for(const query of ['','?orderId=','?orderId=x%25','?orderId=x&orderId=y'])assert.equal((await f.call('/api/admin/deposits/trace'+query)).status,400);
 assert.equal(f.activity.reads,0);assert.equal((await f.call(path('missing'))).status,404);assert.equal(f.activity.writes,0);assert.equal(f.activity.network,0);
});

test('a concurrently changed order is not classified as a ledger mismatch',async t=>{
 const f=fixture(t);f.order('changing','vpay','created');f.freeze();f.activity.finalState={status:'credited',updated_at:3,provider_trade_no:'trade-changing'};
 const response=await f.call(path('changing'));assert.equal(response.status,200);assert.equal(response.data.snapshotConsistent,false);assert.equal(response.data.ledger.reviewRequired,null);assert.equal(f.activity.writes,0);
});

test('the application router preserves owner-only access to the read-only trace',async t=>{
 const f=fixture(t);f.order('one');const before=f.freeze();
 for(const [who,status] of [['owner',200],['staff',401],['alice',403],[null,401]]){
  const response=await handle(new Request('https://portal.example.test'+path('one')),{db:f.db,identity:who?{userId:who,email:who+'@example.test'}:null,ownerEmail:'owner@example.test'});
  assert.equal(response.status,status);if(status===200){const data=await response.json();assert.equal(data.order.id,'one');assert.equal(data.callback.status,'unknown');}
 }
 assert.equal(f.sql.prepare('SELECT total_changes() n').get().n,before);assert.equal(f.activity.writes,0);assert.equal(f.activity.network,0);
});
