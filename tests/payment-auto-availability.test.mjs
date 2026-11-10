import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {handle} from '../lib/backend.ts';

// Real migrations and synthetic supplier replies only; no external requests.
const origin='https://portal.example.test',gateway='https://master7-integration-gateway.onrender.com',returnUrl='https://master7-v17-staging.onrender.com/payment/return';
const providers=['vpay','gspay','1mpay'];
function fixture(t){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
 for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(file=>file.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 for(const [id,role,approved] of [['alice','member',1],['pending','member',0],['owner','owner',1]])sql.prepare('INSERT INTO users(id,username,role,approved,csrf,created_at) VALUES(?,?,?,?,?,0)').run(id,id,role,approved,'csrf-'+id);
 sql.prepare("UPDATE payment_channel_controls SET status='closed'").run();
 class Statement{constructor(text,args=[]){this.text=text;this.args=args;}bind(...args){return new Statement(this.text,args);}async first(){return sql.prepare(this.text).get(...this.args)??null;}async all(){return {results:sql.prepare(this.text).all(...this.args)};}async run(){return sql.prepare(this.text).run(...this.args);}}
 const db={prepare:text=>new Statement(text),async batch(statements){sql.exec('BEGIN');try{const result=statements.map(s=>sql.prepare(s.text).run(...s.args));sql.exec('COMMIT');return result;}catch(error){sql.exec('ROLLBACK');throw error;}}};
 const state={orders:{vpay:0,gspay:0,'1mpay':0},configPatch:value=>value};
 const context={db,identity:null,ownerEmail:'owner@example.test',allowedOrigins:[origin],newDepositsEnabled:'true',
  vpayGatewayUrl:gateway,vpayOrderToken:'o'.repeat(40),vpayQueryToken:'q'.repeat(40),vpayCallbackToken:'c'.repeat(40),vpayTraderId:'3647',vpayMode:'production',vpayReturnUrl:returnUrl,vpayOrdersEnabled:'true',
  gspayApiBase:'https://api.thegspay.com',gspayAuthKey:'a'.repeat(32),gspaySecretKey:'b'.repeat(32),gspayReturnUrl:returnUrl,gspayOrdersEnabled:'true',
  oneMpayApiBase:'https://api.1mpay.net',oneMpayMerchant:'fixture-merchant',oneMpaySecretKey:'fixture-secret-'.padEnd(40,'s'),oneMpayCallbackUrl:'https://master7-v17-staging.onrender.com/api/payment-callbacks/1mpay/payment',oneMpayReturnUrl:returnUrl,oneMpayOrdersEnabled:'true',
  vpayFetch:async(input,init)=>{
   const url=new URL(input);assert.equal(url.origin,gateway);
   if(url.pathname==='/platform/vpay/config'){assert.equal(init.method,'GET');assert.equal(new Headers(init.headers).get('authorization'),'Bearer '+context.vpayQueryToken);return Response.json(state.configPatch({provider:'vpay',mode:'production',paymentReady:true,traderId:'3647',notifyUrl:gateway+'/callbacks/vpay/payment',returnUrl,tradeCodes:['2']}));}
   assert.equal(url.pathname,'/platform/vpay/order');assert.equal(init.method,'POST');state.orders.vpay++;
   const body=JSON.parse(init.body);return Response.json({provider:'vpay',result:{code:0,data:{trader_id:'3647',out_trade_no:body.outTradeNo,trade_no:'fixture-trade',amount:body.amount,currency:'MYR',pay_url:'https://payment.vpay.club/checkout/fixture-trade'}}});
  },
  gspayFetch:async(input,init)=>{assert.equal(String(input),'https://api.thegspay.com/v2/integrations/operators/'+context.gspayAuthKey+'/payment');assert.equal(init.method,'POST');state.orders.gspay++;return Response.json({code:200,data:{payment_id:'12345',payment_url:'https://secured.gspay.online/channel?id=12345&key='+'d'.repeat(32)}});},
  oneMpayFetch:async(input,init)=>{assert.equal(String(input),'https://api.1mpay.net/fundtransfer/json');assert.equal(init.method,'POST');state.orders['1mpay']++;return Response.json({code:0,data:{trxno:'fixture-1mpay-trade'},redirect_url:'https://api.1mpay.net/checkout/fixture-1mpay-trade'});},
 };
 async function call(path,{who=null,method='GET',data={},headers={}}={}){
	  const local=who==='local:staff';
	  const request=new Request(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(who?{'X-CSRF-Token':local?'csrf-staff':'csrf-'+who}:{}),...(local?{Cookie:'__Host-master7_session='+state.staffToken}:{}),...headers},...(method==='GET'?{}:{body:JSON.stringify(data)})});
	  const response=await handle(request,{...context,identity:who&&!local?{userId:who,email:who+'@example.test'}:null});return {status:response.status,data:await response.json()};
 }
 const create=(provider,options={})=>call('/api/payments/'+provider+'/orders',{who:'alice',method:'POST',data:{amount:'20.00',requestKey:'automatic-request-'+provider,tradeCode:'2',payerName:'Fixture Member'},...options});
 t.after(()=>sql.close());return {sql,context,state,call,create};
}

test('health, provider status and public/admin channels share readonly automatic availability',async t=>{
 const f=fixture(t),before=f.sql.prepare('SELECT total_changes() n').get().n;
 const health=await f.call('/health'),publicChannels=await f.call('/api/payment-channels'),adminChannels=await f.call('/api/admin/payment-channels',{who:'owner'});
 for(const response of [health,publicChannels,adminChannels]){assert.equal(response.status,200);assert.equal(response.data.availabilityMode,'automatic');assert.equal(response.data.readOnly,true);}
 for(const provider of providers){
  const status=await f.call('/api/payments/'+provider+'/status');assert.equal(status.status,200);assert.equal(status.data.enabled,true);assert.equal(status.data.orderReady,true);assert.equal(status.data.channelStatus,'active');assert.equal(status.data.availabilityMode,'automatic');assert.equal(status.data.readOnly,true);assert.equal(status.data.settlementVerified,false);
  assert.deepEqual(status.data.capabilities.deposit,health.data.providerCapabilities[provider].deposit);assert.equal(health.data.providerOrdersEnabled[provider],true);
  for(const list of [publicChannels,adminChannels]){const item=list.data.items.find(item=>item.provider_id===provider);assert.equal(item.enabled,true);assert.equal(item.status,'active');assert.equal(item.readOnly,true);assert.equal(item.reason,status.data.reason);}
  assert.equal(status.data.capabilities.deposit.verified,false);assert.equal(status.data.capabilities.payout.enabled,false);
 }
 assert.equal(f.sql.prepare('SELECT total_changes() n').get().n,before);assert.deepEqual(f.state.orders,{vpay:0,gspay:0,'1mpay':0});
 assert.equal(health.data.productionReady,false);assert.equal(health.data.settlementVerified,false);
});

const profileFlags={vpay:'vpayOrdersEnabled',gspay:'gspayOrdersEnabled','1mpay':'oneMpayOrdersEnabled'};
test('only an owner can change deposit controls and staff can read them',async t=>{
	 const f=fixture(t),stamp=Math.floor(Date.now()/1000);f.state.staffToken='S'.repeat(43);
	 f.sql.prepare("INSERT INTO users(id,username,role,approved,csrf,created_at) VALUES('staff','staff','staff',1,'csrf-staff',0)").run();
	 f.sql.prepare("INSERT INTO password_credentials(username,user_id,salt,password_hash,version,changed_at) VALUES('staff','staff','fixture-salt','fixture-hash',1,?)").run(stamp);
	 f.sql.prepare("INSERT INTO settings(id,value) VALUES('staff_password_ready:staff','1')").run();
	 f.sql.prepare('INSERT INTO password_sessions(token_hash,user_id,csrf,credential_version,expires_at,created_at) VALUES(?,?,?,?,?,?)').run(createHash('sha256').update(f.state.staffToken).digest('hex'),'staff','csrf-staff',1,stamp+3600,stamp);
	 assert.equal((await f.call('/api/admin/deposit-controls',{who:'staff'})).status,401);
	 assert.equal((await f.call('/api/admin/deposit-controls',{who:'local:staff'})).status,200);
	 for(const who of ['alice','local:staff'])assert.equal((await f.call('/api/admin/deposit-controls',{who,method:'POST',data:{providerId:'vpay',mode:'paused'}})).status,403);
 assert.equal((await f.call('/api/admin/deposit-controls',{who:'owner',method:'POST',headers:{'X-CSRF-Token':'bad'},data:{providerId:'vpay',mode:'paused'}})).status,403);
 assert.equal((await f.call('/api/admin/deposit-controls',{who:'owner',method:'POST',data:{providerId:'unknown',mode:'paused'}})).status,400);
 assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM settings WHERE id LIKE 'deposit_control:%'").get().n,0);
});
test('unsupported methods cannot mutate deposit controls or create audit records',async t=>{
 const f=fixture(t),before=f.sql.prepare('SELECT total_changes() n').get().n;
 for(const method of ['PUT','PATCH','DELETE']){
  const response=await f.call('/api/admin/deposit-controls',{who:'owner',method,data:{providerId:'vpay',mode:'paused'}});
  assert.equal(response.status,405,method);
 }
 assert.equal(f.sql.prepare('SELECT total_changes() n').get().n,before);
 assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM settings WHERE id LIKE 'deposit_control:%'").get().n,0);
 assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM audit WHERE event='deposit_control_changed'").get().n,0);
});
for(const provider of providers)test(`${provider} deposit pause blocks only new orders and is visible in health`,async t=>{
 const f=fixture(t),set=mode=>f.call('/api/admin/deposit-controls',{who:'owner',method:'POST',data:{providerId:provider,mode}});
 assert.equal((await set('paused')).status,200);
 const status=await f.call('/api/payments/'+provider+'/status'),health=await f.call('/health'),controls=await f.call('/api/admin/deposit-controls',{who:'owner'});
 assert.equal(status.data.enabled,false);assert.equal(health.data.providerOrdersEnabled[provider],false);assert.equal(controls.data.items.find(x=>x.providerId===provider).mode,'paused');
 for(const other of providers.filter(x=>x!==provider))assert.equal(health.data.providerOrdersEnabled[other],true);
 assert.equal((await f.create(provider)).data.code,'DEPOSIT_CHANNEL_PAUSED');assert.equal(f.state.orders[provider],0);
 assert.equal((await set('auto')).status,200);assert.equal((await f.create(provider)).status,201);
 assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM audit WHERE event='deposit_control_changed'").get().n,2);
});
test('manual bank pause and malformed stored controls fail closed',async t=>{
 const f=fixture(t);assert.equal((await f.call('/api/admin/deposit-controls',{who:'owner',method:'POST',data:{providerId:'manual_bank',mode:'paused'}})).status,200);
 const accounts=await f.call('/api/manual-bank/accounts',{who:'alice'});assert.equal(accounts.data.maintenance,true);
 const manual=await f.call('/api/manual-bank/deposits',{who:'alice',method:'POST',data:{}});assert.equal(manual.data.code,'DEPOSIT_CHANNEL_PAUSED');
 f.sql.prepare("INSERT INTO settings(id,value) VALUES('deposit_control:vpay','malformed')").run();
 assert.equal((await f.create('vpay')).data.code,'DEPOSIT_CHANNEL_PAUSED');assert.equal((await f.call('/api/payments/vpay/status')).data.enabled,false);
});
test('a malformed control database response blocks new orders without provider calls',async t=>{
 const f=fixture(t),original=f.context.db.prepare.bind(f.context.db),fetch=f.context.vpayFetch;let supplierCalls=0;
 f.context.vpayFetch=async(...args)=>{supplierCalls++;return fetch(...args);};
 f.context.db.prepare=text=>text.startsWith('SELECT id,value FROM settings WHERE id IN')?{all:async()=>({results:null})}:original(text);
 const result=await f.create('vpay');assert.equal(result.status,503);assert.equal(f.state.orders.vpay,0);assert.equal(supplierCalls,0);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM deposit_orders').get().n,0);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM wallet_ledger').get().n,0);
});
for(const value of ['false',undefined])for(const provider of providers)test(`${provider} profile switch ${String(value)} blocks only new ${provider} orders`,async t=>{
 const f=fixture(t),flag=profileFlags[provider];f.context[flag]=value;
 const status=await f.call('/api/payments/'+provider+'/status'),health=await f.call('/health'),channels=await f.call('/api/payment-channels');
 assert.equal(status.status,200);assert.equal(status.data.enabled,false);assert.equal(status.data.orderReady,false);assert.equal(status.data.reason,'profile_orders_disabled');
 assert.equal(status.data.queryReady,true);assert.equal(status.data.callbacksReady,true);assert.ok(status.data.capabilities.deposit.blockers.includes('profile_orders_disabled'));
 assert.equal(health.data.providerOrdersEnabled[provider],false);assert.equal(health.data.providerCapabilities[provider].deposit.reason,'profile_orders_disabled');
 assert.equal(channels.data.items.find(item=>item.provider_id===provider).enabled,false);
 for(const other of providers.filter(item=>item!==provider))assert.equal(health.data.providerOrdersEnabled[other],true,other);
 const rejected=await f.create(provider);assert.equal(rejected.status,503);assert.equal(rejected.data.code,'PROVIDER_ORDERS_DISABLED');
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM deposit_orders').get().n,0);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM wallet_ledger').get().n,0);assert.deepEqual(f.state.orders,{vpay:0,gspay:0,'1mpay':0});
});

test('missing provider configuration remains unavailable without supplier or wallet mutations',async t=>{
 const f=fixture(t);f.context.vpayQueryToken=undefined;f.context.gspayAuthKey=undefined;f.context.oneMpaySecretKey=undefined;
 const health=await f.call('/health');
 for(const provider of providers){const status=await f.call('/api/payments/'+provider+'/status');assert.equal(status.data.orderReady,false);assert.equal(status.data.channelStatus,'unavailable');assert.equal(status.data.reason,'deposit_configuration_incomplete');assert.deepEqual(status.data.capabilities.deposit,health.data.providerCapabilities[provider].deposit);assert.equal((await f.create(provider)).status,503);}
 assert.deepEqual(f.state.orders,{vpay:0,gspay:0,'1mpay':0});assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM deposit_orders').get().n,0);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM wallet_ledger').get().n,0);
});

test('GSPAY USDT is a separate public/admin profile and remains fail closed without a verified contract',async t=>{
 const f=fixture(t);Object.assign(f.context,{gspayUsdtApiBase:'https://usdt-provider.example',gspayUsdtAuthKey:'u'.repeat(32),gspayUsdtSecretKey:'s'.repeat(32),gspayUsdtCallbackToken:'t'.repeat(32),gspayUsdtOrdersEnabled:'true',gspayUsdtReturnUrl:'https://portal.example.test/payment/return',gspayUsdtCallbackUrl:'https://portal.example.test/api/payment/gspay/usdt/callback',gspayUsdtRecoveryEnabled:'true',gspayUsdtBalanceEnabled:'true',gspayUsdtContractVerified:'true',gspayUsdtAssetNetwork:'TRC20',gspayUsdtCurrencyScale:'6',gspayUsdtCheckoutOrigin:'https://checkout.usdt-provider.example'});
 const [status,health,publicChannels,adminChannels]=await Promise.all([f.call('/api/payments/gspay/usdt/status'),f.call('/health'),f.call('/api/payment-channels'),f.call('/api/admin/payment-channels',{who:'owner'})]);
 assert.equal(status.status,200);assert.equal(status.data.profileId,'gspay_usdt');assert.equal(status.data.currency,'USDT');assert.equal(status.data.orderReady,false);assert.equal(status.data.queryReady,false);assert.equal(status.data.callbacksReady,false);assert.equal(status.data.capabilities.deposit.implemented,false);
 assert.equal(health.data.providerOrdersEnabled.gspay_usdt,false);assert.deepEqual(health.data.providerCapabilities.gspay_usdt,status.data.capabilities);
 for(const channels of [publicChannels,adminChannels]){const item=channels.data.items.find(entry=>entry.provider_id==='gspay_usdt');assert.ok(item);assert.equal(item.enabled,false);assert.equal(item.status,'unavailable');assert.equal(item.provider_name,'GSPAY+ USDT');}
 const rejected=await f.call('/api/payments/gspay/usdt/orders',{who:'alice',method:'POST',data:{amount:'20.00',requestKey:'gspay-usdt-request-0001'}});assert.equal(rejected.status,503);assert.equal(rejected.data.code,'PROVIDER_CONTRACT_UNVERIFIED');
 assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM deposit_orders WHERE provider='gspay'").get().n,0);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM wallet_ledger').get().n,0);
 const serialized=JSON.stringify({status:status.data,health:health.data,channels:publicChannels.data});for(const value of [f.context.gspayUsdtAuthKey,f.context.gspayUsdtSecretKey,f.context.gspayUsdtCallbackToken,f.context.gspayUsdtApiBase])assert.doesNotMatch(serialized,new RegExp(value));
});

test('VPay retains every existing gateway contract binding before creating an order',async t=>{
 const mismatches=[{provider:'other'},{mode:'uat'},{paymentReady:false},{traderId:'9999'},{notifyUrl:'https://attacker.example.test/callback'},{returnUrl:'https://attacker.example.test/return'},{tradeCodes:[]}];
 for(const patch of mismatches)await t.test(Object.keys(patch)[0],async sub=>{
  const f=fixture(sub);f.state.configPatch=value=>({...value,...patch});const status=await f.call('/api/payments/vpay/status'),health=await f.call('/health');
  assert.equal(status.data.enabled,false);assert.equal(status.data.reason,'gateway_contract_not_ready');assert.deepEqual(status.data.capabilities.deposit,health.data.providerCapabilities.vpay.deposit);assert.equal((await f.create('vpay')).status,503);assert.equal(f.state.orders.vpay,0);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM deposit_orders').get().n,0);
 });
});

test('deprecated admin toggles reject without any database write and retain owner/CSRF checks',async t=>{
 const f=fixture(t),before=f.sql.prepare('SELECT total_changes() n').get().n;
 for(const providerId of providers)for(const status of ['active','suspended','closed']){
  const result=await f.call('/api/admin/payment-channels',{who:'owner',method:'POST',data:{providerId,status}});assert.equal(result.status,405);assert.equal(result.data.error,'PAYMENT_AVAILABILITY_AUTOMATIC');assert.equal(result.data.readOnly,true);assert.equal(result.data.deprecated,true);
 }
 assert.equal((await f.call('/api/admin/payment-channels',{who:'alice',method:'POST'})).status,403);
 assert.equal((await f.call('/api/admin/payment-channels',{who:'owner',method:'POST',headers:{'X-CSRF-Token':'wrong'}})).status,403);
 assert.equal(f.sql.prepare('SELECT total_changes() n').get().n,before);assert.deepEqual(f.state.orders,{vpay:0,gspay:0,'1mpay':0});
});

test('automatic availability never grants owners, anonymous or unapproved users member deposit powers',async t=>{
 const f=fixture(t);
 for(const provider of providers){for(const [who,status] of [[null,401],['owner',403],['pending',403]])assert.equal((await f.create(provider,{who})).status,status);assert.equal((await f.create(provider,{headers:{'X-CSRF-Token':'wrong'}})).status,403);}
 assert.deepEqual(f.state.orders,{vpay:0,gspay:0,'1mpay':0});assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM deposit_orders').get().n,0);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM wallet_ledger').get().n,0);
});

test('new-deposit maintenance defaults closed and status matches enforcement for all four channels',async t=>{
 const f=fixture(t);
 f.sql.prepare("INSERT INTO company_bank_accounts(id,bank_name,account_name,account_number,image_data,enabled,position,updated_by,updated_at) VALUES('fixture-bank','Fixture Bank','Company','123456','','1',0,'owner',0)").run();
 const receiptData='data:image/png;base64,'+Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0,0,0,0,0,0,0,0,0]).toString('base64');
 f.sql.prepare("INSERT INTO settings(id,value) VALUES('manual_bank:configuration',?)").run(JSON.stringify({mode:'qa',qaMemberIds:['alice']}));
 const existing=await f.call('/api/manual-bank/deposits',{who:'alice',method:'POST',data:{amount:'20.00',requestKey:'existing-manual-maintenance-request',bankId:'fixture-bank',receiptData}});assert.equal(existing.status,201);
 const existingBefore={...f.sql.prepare('SELECT id,status,amount_minor FROM deposit_orders WHERE id=?').get(existing.data.id)};
 for(const flag of [undefined,'false','TRUE']){
  f.context.newDepositsEnabled=flag;
  const health=await f.call('/health'),publicChannels=await f.call('/api/payment-channels');
  assert.equal(health.data.newDepositsEnabled,false);assert.equal(health.data.transactionsEnabled,false);assert.equal(health.data.realPayments,false);
  for(const provider of providers){
   const status=await f.call('/api/payments/'+provider+'/status');
   assert.equal(status.data.enabled,false,provider);assert.equal(status.data.orderReady,false,provider);assert.equal(status.data.reason,'new_deposits_paused',provider);
   assert.equal(status.data.queryReady,true,provider);assert.equal(status.data.callbacksReady,true,provider);
   assert.deepEqual(status.data.capabilities.deposit,health.data.providerCapabilities[provider].deposit);
   assert.equal(publicChannels.data.items.find(item=>item.provider_id===provider).enabled,false);
   const rejected=await f.create(provider);assert.equal(rejected.status,503);assert.equal(rejected.data.code,'DEPOSITS_MAINTENANCE');
  }
  const accounts=await f.call('/api/manual-bank/accounts',{who:'alice'});assert.equal(accounts.status,200);assert.deepEqual(accounts.data.items,[]);assert.equal(accounts.data.maintenance,true);
  const existingItems=await f.call('/api/manual-bank/deposits',{who:'alice'});assert.equal(existingItems.status,200);assert.ok(existingItems.data.items.some(item=>item.id===existing.data.id));assert.equal((await f.call('/api/admin/manual-bank',{who:'owner'})).status,200);
  const manual=await f.call('/api/manual-bank/deposits',{who:'alice',method:'POST',data:{amount:'20.00',requestKey:'maintenance-manual-request',bankId:'bank'}});
  assert.equal(manual.status,503);assert.equal(manual.data.code,'DEPOSITS_MAINTENANCE');
 }
 assert.deepEqual(f.state.orders,{vpay:0,gspay:0,'1mpay':0});assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM deposit_orders').get().n,1);assert.deepEqual({...f.sql.prepare('SELECT id,status,amount_minor FROM deposit_orders WHERE id=?').get(existing.data.id)},existingBefore);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM wallet_ledger').get().n,0);
});
