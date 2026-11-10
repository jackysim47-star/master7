import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handle} from '../lib/backend.ts';

const migrations=[
 '0000_broken_bloodscream.sql','0001_orange_owl.sql','0002_lobby_ads.sql','0003_game_visibility.sql','0004_sponsored_brands.sql',
 '0005_custom_game_cards.sql','0006_malaysia_member_phone.sql','0007_vpay_uat_wallet.sql','0008_member_sms_otp.sql',
 '0009_game_payment_statuses.sql','0010_game_visibility_artwork.sql','0011_provider_artwork.sql','0012_close_defaults_and_brand_directory.sql',
 '0013_api_supplier_artwork.sql','0014_withdrawal_requests.sql','0019_game_catalogue_sync.sql','0020_manual_bank_deposits.sql',
 '0021_api_supplier_status.sql','0022_referrals.sql','0023_marketing_campaigns.sql','0024_megah5_transfer_wallet.sql',
 '0025_game_access_zones.sql','0027_marketing_contact_scale.sql','0090_security_wallet_reservations.sql','0091_operations_automation.sql',
 '0092_support_marketing_notifications.sql','0093_reward_state_machines.sql','0094_payment_recovery_and_payout_state.sql',
 '0100_whatsapp_campaign_delivery.sql','0101_rewards_hub.sql','0102_responsible_play.sql','0110_game_provider_adapter_core.sql',
 '0111_member_wallet_guards.sql','0112_megah5_launch_operations.sql','0113_game_provider_acceptance_evidence.sql','0115_manual_bank_funds.sql','0116_provider_wallet_operations.sql','0120_provider_wallet_sweeps.sql',
];

class Statement{
 constructor(sqlite,sql,args=[]){this.sqlite=sqlite;this.sql=sql;this.args=args;}
 bind(...args){return new Statement(this.sqlite,this.sql,args);}
 async first(){return this.sqlite.prepare(this.sql).get(...this.args)??null;}
 async all(){return {results:this.sqlite.prepare(this.sql).all(...this.args)};}
 async run(){return this.sqlite.prepare(this.sql).run(...this.args);}
}

function fixture(){
 const sqlite=new DatabaseSync(':memory:');for(const migration of migrations)sqlite.exec(readFileSync(new URL(`../drizzle/${migration}`,import.meta.url),'utf8'));
 sqlite.prepare("INSERT INTO users(id,username,phone,role,approved,csrf,created_at) VALUES(?,?,?,?,1,?,0)").run('owner','owner@example.test',null,'owner','owner-csrf');
 sqlite.prepare("INSERT INTO users(id,username,phone,role,approved,csrf,created_at) VALUES(?,?,?,?,1,?,0)").run('staff','staff@example.test',null,'staff','staff-csrf');
 sqlite.prepare("INSERT INTO users(id,username,phone,role,approved,csrf,created_at) VALUES(?,?,?,?,1,?,0)").run('member','member@example.test','+60112223333','member','member-csrf');
 const db={prepare:sql=>new Statement(sqlite,sql),async batch(statements){sqlite.exec('BEGIN IMMEDIATE');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
 async function call(who,path,method='GET',data,{csrf,origin='https://portal.example.test',extra={}}={}){
  const headers={'content-type':'application/json',origin,'x-csrf-token':csrf??(who?`${who}-csrf`:'')};
  const response=await handle(new Request(`https://portal.example.test${path}`,{method,headers,...(data===undefined?{}:{body:JSON.stringify(data)})}),{db,identity:who?{userId:who,email:`${who}@example.test`}:null,ownerEmail:'owner@example.test',allowedOrigins:['https://portal.example.test'],newDepositsEnabled:'true',newGameLaunchesEnabled:'true',...extra});
  return {status:response.status,data:await response.json()};
 }
 return {sqlite,call};
}

function deferred(){let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};}
function syntheticVPay({beforeConfig=async()=>{},beforeOrder=async()=>{}}={}){
 const gateway='https://master7-integration-gateway.onrender.com',traderId='fixture-trader';
 const state={configReads:0,orderPosts:0};
 const extra={vpayGatewayUrl:gateway,vpayOrdersEnabled:'true',vpayOrderToken:'fixture-order-token'.padEnd(40,'o'),vpayQueryToken:'fixture-query-token'.padEnd(40,'q'),vpayCallbackToken:'fixture-callback-token'.padEnd(40,'c'),vpayMode:'production',vpayTraderId:traderId,vpayReturnUrl:'https://master7-v17-staging.onrender.com/payment/return',vpayFetch:async(input,init)=>{
  const url=new URL(String(input));assert.equal(url.origin,gateway);
  if(url.pathname==='/platform/vpay/config'){
   state.configReads++;assert.equal(init.method,'GET');await beforeConfig(state.configReads);
   return Response.json({provider:'vpay',mode:'production',paymentReady:true,traderId,notifyUrl:gateway+'/callbacks/vpay/payment',returnUrl:extra.vpayReturnUrl,tradeCodes:['1']});
  }
  assert.equal(url.pathname,'/platform/vpay/order');assert.equal(init.method,'POST');state.orderPosts++;
  const body=JSON.parse(init.body);await beforeOrder();
  return Response.json({provider:'vpay',result:{code:0,data:{trader_id:traderId,out_trade_no:body.outTradeNo,trade_no:'fixture-vpay-trade',amount:body.amount,currency:'MYR',pay_url:'https://payment.vpay.club/fixture-checkout'}}});
 }};
 return {extra,state};
}

test('member Responsible Play routes enforce CSRF and keep owner access anonymous/read-only',async()=>{
 const {sqlite,call}=fixture();
 try{
  assert.equal((await call(null,'/api/responsible-play')).status,401);
  assert.equal((await call('staff','/api/responsible-play')).status,401);
  const initial=await call('member','/api/responsible-play');assert.equal(initial.status,200);assert.equal(initial.data.configured,false);assert.equal(initial.data.restricted,false);assert.equal(initial.data.availability.withdrawalRestriction,'not_added_by_play_settings');assert.equal(initial.data.availability.withdrawalChannelReadiness,'separate');assert.equal(initial.data.availability.support,true);
  const limits={action:'set_limits',dailyLimitMinor:'1000',weeklyLimitMinor:'2000',monthlyLimitMinor:'3000'};
  assert.equal((await call('member','/api/responsible-play','POST',limits,{csrf:'wrong'})).status,403);
  assert.equal((await call('member','/api/responsible-play','POST',limits,{origin:'https://evil.example'})).status,403);
  assert.equal((await call('staff','/api/responsible-play','POST',limits)).status,401);
  const saved=await call('member','/api/responsible-play','POST',limits);assert.equal(saved.status,200);assert.deepEqual(saved.data.limits,{dailyMinor:'1000',weeklyMinor:'2000',monthlyMinor:'3000'});
  assert.equal((await call(null,'/api/admin/responsible-play')).status,401);
  assert.equal((await call('staff','/api/admin/responsible-play')).status,401);
  assert.equal((await call('member','/api/admin/responsible-play')).status,403);
  const admin=await call('owner','/api/admin/responsible-play');assert.equal(admin.status,200);assert.equal(admin.data.anonymous,true);assert.equal(admin.data.memberDetailsExposed,false);assert.equal(admin.data.ownerOverride,false);assert.equal(admin.data.counts.profiles,1);assert.doesNotMatch(JSON.stringify(admin.data),/member@example|60112223333|\"member\"/i);
  assert.equal((await call('owner','/api/admin/responsible-play','POST',{action:'cancel',userId:'member'})).status,404);
 }finally{sqlite.close();}
});

test('active cooling-off blocks all four new-deposit paths and game launch without adding a withdrawal restriction',async()=>{
 const {sqlite,call}=fixture();
 try{
  const active=await call('member','/api/responsible-play','POST',{action:'cooling_off',durationHours:24});assert.equal(active.status,200);assert.equal(active.data.restricted,true);assert.equal(active.data.availability.newDeposits,false);assert.equal(active.data.availability.gameLaunch,false);assert.equal(active.data.availability.withdrawalRestriction,'not_added_by_play_settings');assert.equal(active.data.availability.withdrawalChannelReadiness,'separate');assert.equal(active.data.availability.login,true);assert.equal(active.data.availability.records,true);assert.equal(active.data.availability.support,true);assert.equal(active.data.availability.balanceFrozen,false);assert.equal(active.data.availability.balanceForfeited,false);
  const attempts=[
   ['/api/payments/vpay/orders',{amount:'10.00',tradeCode:'1',requestKey:'rp-vpay-request-0001'}],
   ['/api/payments/gspay/orders',{amount:'10.00',requestKey:'rp-gspay-request-001'}],
   ['/api/payments/1mpay/orders',{amount:'10.00',requestKey:'rp-1mpay-request-001'}],
   ['/api/manual-bank/deposits',{bankId:'company-bank-1',amount:'10.00',receiptData:'data:image/png;base64,AA==',requestKey:'rp-manual-request-001'}],
  ];
  for(const [path,payload] of attempts){const response=await call('member',path,'POST',payload);assert.equal(response.status,409,path);assert.match(response.data.error,/cooling|pause/i,path);}
  const game=await call('member','/api/game-launch','POST',{providerId:'megah5',gameCode:'55021'},{extra:{gameGatewayUrl:'https://master7-integration-gateway.onrender.com'}});assert.equal(game.status,409);assert.match(game.data.error,/cooling|pause/i);
  assert.equal((await call('member','/api/session')).status,200);
  assert.equal((await call('member','/api/withdrawals')).status,200);
  assert.equal((await call('member','/api/tickets')).status,200);
  const ticket=await call('member','/api/tickets','POST',{subject:'Account help',message:'Please help with my account records.'});assert.equal(ticket.status,201);
  assert.equal(sqlite.prepare('SELECT COUNT(*) count FROM deposit_orders').get().count,0);
  assert.equal(sqlite.prepare("SELECT COUNT(*) count FROM audit WHERE event='responsible_play_deposit_blocked'").get().count,4);
  assert.equal(sqlite.prepare("SELECT COUNT(*) count FROM audit WHERE event='responsible_play_game_launch_blocked'").get().count,1);
 }finally{sqlite.close();}
});

test('an idempotent deposit order is preserved if the member starts cooling-off before retrying it',async()=>{
 const {sqlite,call}=fixture();
 try{
  sqlite.prepare("INSERT INTO deposit_orders(id,user_id,request_key,fingerprint,provider,amount_minor,currency,trade_code,status,created_at,updated_at) VALUES(?,?,?,?,?,?,'MYR',?,'pending',?,?)").run('existing-vpay-order','member','rp-existing-request-01','existing-fingerprint','vpay',1000,'1',100,100);
  assert.equal((await call('member','/api/responsible-play','POST',{action:'cooling_off',durationHours:24})).status,200);
  const retry=await call('member','/api/payments/vpay/orders','POST',{amount:'10.00',tradeCode:'1',requestKey:'rp-existing-request-01'});assert.equal(retry.status,409);
  const order=sqlite.prepare("SELECT id,status,amount_minor,updated_at FROM deposit_orders WHERE user_id='member' AND request_key='rp-existing-request-01'").get();assert.deepEqual({...order},{id:'existing-vpay-order',status:'pending',amount_minor:1000,updated_at:100});
  assert.equal(sqlite.prepare("SELECT COUNT(*) count FROM deposit_orders WHERE user_id='member' AND request_key='rp-existing-request-01'").get().count,1);
  assert.equal(sqlite.prepare("SELECT COUNT(*) count FROM responsible_play_deposit_reservations WHERE user_id='member' AND request_key='rp-existing-request-01'").get().count,0);
 }finally{sqlite.close();}
});

test('all four failed creation paths release their allowance reservation when no order exists',async()=>{
 const {sqlite,call}=fixture();
 try{
  assert.equal((await call('member','/api/responsible-play','POST',{action:'set_limits',dailyLimitMinor:'100000',weeklyLimitMinor:'100000',monthlyLimitMinor:'100000'})).status,200);
  const png=Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0,0,0,0,0,0,0,0,0]),receiptData='data:image/png;base64,'+png.toString('base64');
  const attempts=[
   ['/api/payments/vpay/orders',{amount:'10.00',tradeCode:'1',payerName:'Member',requestKey:'rp-release-vpay-0001'}],
   ['/api/payments/gspay/orders',{amount:'10.00',requestKey:'rp-release-gspay-001'}],
   ['/api/payments/1mpay/orders',{amount:'10.00',requestKey:'rp-release-1mpay-001'}],
   ['/api/manual-bank/deposits',{bankId:'missing-bank',amount:'10.00',receiptData,requestKey:'rp-release-manual-01'}],
  ];
  for(const [path,payload] of attempts)assert.ok([409,503].includes((await call('member',path,'POST',payload)).status),path);
  assert.equal(sqlite.prepare("SELECT COUNT(*) count FROM responsible_play_deposit_reservations WHERE user_id='member' AND status='reserved'").get().count,0);
  assert.equal(sqlite.prepare("SELECT COUNT(*) count FROM responsible_play_deposit_reservations WHERE user_id='member' AND status='released'").get().count,4);
  assert.equal(sqlite.prepare("SELECT COUNT(*) count FROM deposit_orders WHERE user_id='member'").get().count,0);
 }finally{sqlite.close();}
});

test('Responsible Play game guard is scoped to launch and never added to settle or recover',()=>{
 const source=readFileSync(new URL('../lib/backend.ts',import.meta.url),'utf8');
 assert.match(source,/if\(p==='\/api\/game-launch'\)[^\n]*assertResponsiblePlayGameLaunch[^\n]*launchProviderGame/);
 assert.doesNotMatch(source,/if\(p==='\/api\/game-wallet\/(?:settle|recover)'\)[^\n]*assertResponsiblePlayGameLaunch/);
 assert.match(source,/try\{return await create\(\);\}\s*finally\{await finalizeResponsiblePlayDeposit/);
});

test('a VPay retry preserves a live reservation, recovers the same order and posts to the gateway only once',async t=>{
 const {sqlite,call}=fixture(),configEntered=deferred(),allowConfig=deferred(),orderEntered=deferred(),allowOrder=deferred();
 const logs=[];t.mock.method(console,'warn',value=>logs.push(JSON.parse(value)));
 const {extra,state}=syntheticVPay({beforeConfig:async count=>{if(count===1){configEntered.resolve();await allowConfig.promise;}},beforeOrder:async()=>{orderEntered.resolve();await allowOrder.promise;}});
 const payload={amount:'10.00',tradeCode:'1',payerName:'Fixture Member',requestKey:'preserve-same-request-key'};
 let first;
 try{
  assert.equal((await call('member','/api/responsible-play','POST',{action:'set_limits',dailyLimitMinor:'1000',weeklyLimitMinor:'1000',monthlyLimitMinor:'1000'})).status,200);
  first=call('member','/api/payments/vpay/orders','POST',payload,{extra});await configEntered.promise;
  const reserved={...sqlite.prepare('SELECT * FROM responsible_play_deposit_reservations WHERE request_key=?').get(payload.requestKey)};
  const earlyRetry=await call('member','/api/payments/vpay/orders','POST',payload,{extra});
  assert.equal(earlyRetry.status,409);assert.equal(earlyRetry.data.code,'DEPOSIT_REQUEST_IN_PROGRESS');
  assert.deepEqual({...sqlite.prepare('SELECT * FROM responsible_play_deposit_reservations WHERE request_key=?').get(payload.requestKey)},reserved);
  assert.equal(state.configReads,1);assert.equal(state.orderPosts,0);
  assert.deepEqual(logs,[{event:'payment_order_conflict',provider:'vpay',httpStatus:409,code:'DEPOSIT_REQUEST_IN_PROGRESS'}]);
  allowConfig.resolve();await orderEntered.promise;
  const inFlight=await call('member','/api/payments/vpay/orders','POST',payload,{extra});
  assert.equal(inFlight.status,202);assert.equal(inFlight.data.status,'awaiting_confirmation');assert.equal(state.orderPosts,1);
  allowOrder.resolve();const created=await first;assert.equal(created.status,201);
  const recovered=await call('member','/api/payments/vpay/orders','POST',payload,{extra});
  assert.equal(recovered.status,200);assert.equal(recovered.data.id,created.data.id);assert.equal(recovered.data.payUrl,created.data.payUrl);
  assert.equal(state.orderPosts,1);assert.equal(sqlite.prepare('SELECT COUNT(*) count FROM deposit_orders').get().count,1);
  const finalReservation=sqlite.prepare('SELECT status,amount_minor,order_id FROM responsible_play_deposit_reservations WHERE request_key=?').get(payload.requestKey);
  assert.deepEqual({...finalReservation},{status:'consumed',amount_minor:1000,order_id:created.data.id});
  assert.equal(sqlite.prepare('SELECT COUNT(*) count FROM wallet_ledger').get().count,0);
 }finally{allowConfig.resolve();allowOrder.resolve();if(first)await first.catch(()=>{});sqlite.close();}
});

test('deposit conflict logs distinguish limits and idempotency without recording request or customer data',async t=>{
 const {sqlite,call}=fixture(),{extra,state}=syntheticVPay(),logs=[];
 t.mock.method(console,'warn',value=>logs.push(JSON.parse(value)));
 try{
  assert.equal((await call('member','/api/responsible-play','POST',{action:'set_limits',dailyLimitMinor:'1000',weeklyLimitMinor:'1000',monthlyLimitMinor:'1000'})).status,200);
  const payload={amount:'10.00',tradeCode:'1',payerName:'Private Payer Name',requestKey:'private-request-key-409'};
  const created=await call('member','/api/payments/vpay/orders','POST',payload,{extra});assert.equal(created.status,201);
  const before={...sqlite.prepare('SELECT * FROM deposit_orders WHERE id=?').get(created.data.id)};
  const conflict=await call('member','/api/payments/vpay/orders','POST',{...payload,payerName:'Different Private Name'},{extra});
  assert.equal(conflict.status,409);assert.equal(conflict.data.error,'IDEMPOTENCY_CONFLICT');assert.equal(state.orderPosts,1);
  assert.deepEqual({...sqlite.prepare('SELECT * FROM deposit_orders WHERE id=?').get(created.data.id)},before);
  const limited=await call('member','/api/payments/vpay/orders','POST',{...payload,requestKey:'another-private-request-409'},{extra});
  assert.equal(limited.status,409);assert.equal(limited.data.code,'DAILY_DEPOSIT_LIMIT');assert.equal(state.orderPosts,1);
  assert.deepEqual(logs,[{event:'payment_order_conflict',provider:'vpay',httpStatus:409,code:'IDEMPOTENCY_CONFLICT'},{event:'payment_order_conflict',provider:'vpay',httpStatus:409,code:'DAILY_DEPOSIT_LIMIT'}]);
  assert.doesNotMatch(JSON.stringify(logs),/member|payer|private|request.key|amount|trader|token|https?:\/\/|example\.test/i);
 }finally{sqlite.close();}
});

test('the first order POST honors a matured limit without a prior settings GET',async t=>{
 const {sqlite,call}=fixture(),{extra,state}=syntheticVPay();let clock=1900000000;
 t.mock.method(Date,'now',()=>clock*1000);
 try{
  const limits={action:'set_limits',dailyLimitMinor:'1000',weeklyLimitMinor:'5000',monthlyLimitMinor:'5000'};
  assert.equal((await call('member','/api/responsible-play','POST',limits)).status,200);clock++;
  assert.equal((await call('member','/api/responsible-play','POST',{...limits,dailyLimitMinor:'2000'})).status,200);clock+=86400;
  const created=await call('member','/api/payments/vpay/orders','POST',{amount:'15.00',tradeCode:'1',payerName:'Fixture Member',requestKey:'matured-api-request-key'},{extra});
  assert.equal(created.status,201);assert.equal(state.orderPosts,1);
  assert.equal(sqlite.prepare("SELECT daily_limit_minor FROM responsible_play_profiles WHERE user_id='member'").get().daily_limit_minor,2000);
  assert.equal(sqlite.prepare('SELECT COUNT(*) count FROM wallet_ledger').get().count,0);
 }finally{sqlite.close();}
});
