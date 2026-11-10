import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {handle} from '../lib/backend.ts';

function fixture(t){
 const sqlite=new DatabaseSync(':memory:'),stamp=Math.floor(Date.now()/1000),activity={writes:0,network:0};
 sqlite.exec(`
  CREATE TABLE users(id TEXT PRIMARY KEY,username TEXT,role TEXT,approved INTEGER,csrf TEXT,created_at INTEGER);
  CREATE TABLE payment_channel_controls(provider_id TEXT PRIMARY KEY,provider_name TEXT,status TEXT);
  CREATE TABLE settings(id TEXT PRIMARY KEY,value TEXT NOT NULL);
  CREATE TABLE provider_payout_controls(provider_id TEXT PRIMARY KEY,submission_enabled INTEGER,updated_at INTEGER);
  CREATE TABLE deposit_orders(id TEXT PRIMARY KEY,user_id TEXT,provider TEXT,amount_minor INTEGER,status TEXT,created_at INTEGER,updated_at INTEGER);
  CREATE TABLE withdrawal_requests(id TEXT PRIMARY KEY,user_id TEXT,amount_minor INTEGER,status TEXT,account_holder TEXT,account_number TEXT,created_at INTEGER,updated_at INTEGER);
  CREATE TABLE company_bank_accounts(id TEXT PRIMARY KEY,enabled INTEGER,account_name TEXT,account_number TEXT,supersedes_id TEXT);
  CREATE TABLE manual_deposit_requests(deposit_order_id TEXT PRIMARY KEY,receipt_data TEXT);
  CREATE TABLE tickets(id TEXT PRIMARY KEY,user_id TEXT,status TEXT,created_at INTEGER,message TEXT);
  CREATE TABLE game_wallet_sessions(id TEXT PRIMARY KEY,status TEXT,created_at INTEGER,player_id TEXT);
  CREATE TABLE game_catalogue_cache(provider_id TEXT PRIMARY KEY,status TEXT,checked_at INTEGER,last_success_at INTEGER,complete INTEGER);
  CREATE TABLE game_provider_acceptance_events(id TEXT PRIMARY KEY,profile_id TEXT,revision INTEGER,capability TEXT,environment TEXT,result TEXT,evidence_sha256 TEXT,evidence_reference TEXT,verified_by TEXT,observed_at INTEGER,recorded_at INTEGER);
  CREATE TABLE game_provider_acceptance_current(profile_id TEXT,capability TEXT,environment TEXT,event_id TEXT,PRIMARY KEY(profile_id,capability,environment));
  CREATE TABLE production_acceptance_events(id TEXT PRIMARY KEY,category TEXT,subject_id TEXT,capability TEXT,environment TEXT,revision INTEGER,result TEXT,evidence_sha256 TEXT,evidence_reference TEXT,verified_by TEXT,observed_at INTEGER,recorded_at INTEGER);
  CREATE TABLE production_acceptance_current(category TEXT,subject_id TEXT,capability TEXT,environment TEXT,event_id TEXT,PRIMARY KEY(category,subject_id,capability,environment));
  CREATE TABLE providers(id TEXT PRIMARY KEY,visible INTEGER);
  CREATE TABLE marketing_campaigns(id TEXT PRIMARY KEY,status TEXT,message TEXT);
  CREATE TABLE marketing_contacts(id TEXT PRIMARY KEY,consent_status TEXT,phone TEXT);
  CREATE TABLE wallet_ledger(id TEXT PRIMARY KEY,order_id TEXT,user_id TEXT,account_code TEXT,amount_minor INTEGER);
  CREATE TABLE benefit_claims(id TEXT PRIMARY KEY,status TEXT);
  CREATE TABLE commission_periods(id TEXT PRIMARY KEY,status TEXT,total_commission_minor INTEGER);
  CREATE TABLE payment_recovery_leases(provider TEXT,order_id TEXT,claim_token TEXT,locked_until INTEGER,last_checked_at INTEGER,attempts INTEGER,PRIMARY KEY(provider,order_id));
  CREATE TABLE accounting_job_runs(job_key TEXT PRIMARY KEY,period_start INTEGER,started_at INTEGER,completed_at INTEGER,status TEXT,result_json TEXT,error TEXT);
  CREATE TABLE audit(id TEXT PRIMARY KEY,user_id TEXT,event TEXT,target TEXT,created_at INTEGER);
  CREATE TABLE rate_limits(id TEXT PRIMARY KEY,count INTEGER,expires_at INTEGER);
 `);
 sqlite.exec(`
  INSERT INTO users VALUES
   ('owner','private-owner-username','owner',1,'private-owner-csrf',1),
   ('staff','private-staff-username','staff',1,'private-staff-csrf',1),
   ('member','private-member-username','member',1,'private-member-csrf',1);
  INSERT INTO payment_channel_controls VALUES('vpay','VPay','suspended'),('gspay','GSPAY','suspended'),('1mpay','1MPAY','active');
  INSERT INTO provider_payout_controls VALUES('vpay',0,0),('gspay',0,0),('1mpay',0,0);
  INSERT INTO deposit_orders VALUES
   ('credited','member','vpay',1000,'credited',${stamp-40},${stamp-30}),
   ('pending','member','vpay',2000,'pending',${stamp-20},${stamp-20});
  INSERT INTO wallet_ledger VALUES('ledger-member','credited','member','member',1000),('ledger-clearing','credited','member','provider_clearing',-1000);
  INSERT INTO withdrawal_requests VALUES('withdrawal','member',500,'pending','private-account-holder','998877665544',${stamp-10},${stamp-10});
  INSERT INTO company_bank_accounts VALUES('bank',1,'private-company-account-name','112233445566',NULL);
  INSERT INTO manual_deposit_requests VALUES('pending','private-bank-slip-image');
  INSERT INTO tickets VALUES('ticket','member','open',${stamp-5},'private-ticket-message');
  INSERT INTO game_wallet_sessions VALUES('session','manual_review',${stamp-5},'private-player-id');
  INSERT INTO providers VALUES('private-provider-card',1);
  INSERT INTO marketing_campaigns VALUES('campaign','draft','private-campaign-message');
  INSERT INTO marketing_contacts VALUES('contact','opted_in','+60123456789');
  INSERT INTO benefit_claims VALUES('benefit','awaiting_acceptance');
  INSERT INTO commission_periods VALUES('commission','preview',88);
  INSERT INTO payment_recovery_leases VALUES('vpay','pending','private-recovery-claim',0,${stamp-1200},25);
  INSERT INTO accounting_job_runs VALUES('close-1',${stamp-86400},${stamp-1200},NULL,'running','','private-accounting-error');
  INSERT INTO audit VALUES('audit-seed','owner','seed','private-audit-target',${stamp});
 `);
 const expectedGateway=['megah5','jili','jdb','pragmaticplay','918kissh5','metagaming_normal_myr','evo888h5','epicwin_normal_myr','venus','clotplay'];
 const insertCache=sqlite.prepare('INSERT INTO game_catalogue_cache VALUES(?,?,?,?,?)');
 for(const id of [...expectedGateway,'rectangle'])insertCache.run(id,'available',stamp,stamp,1);
 insertCache.run('atg','unavailable',stamp,0,0);
 class Statement{
  constructor(sql,args=[]){this.sql=sql;this.args=args;}
  bind(...args){return new Statement(this.sql,args);}
  async first(){return sqlite.prepare(this.sql).get(...this.args)??null;}
  async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};}
  async run(){activity.writes++;return sqlite.prepare(this.sql).run(...this.args);}
 }
 const db={prepare:sql=>new Statement(sql),async batch(statements){activity.writes+=statements.length;throw Error('operations intelligence must not execute a batch');}};
 const secrets={oneMpay:'private-one-mpay-secret',rectangle:'private-rectangle-key',support:'private-support-api-key-123456',whatsapp:'A'.repeat(48)};
 const context={
  db,ownerEmail:'owner@example.test',
  oneMpayApiBase:'https://api.1mpay.net',oneMpayMerchant:'MASTER7_TEST',oneMpaySecretKey:secrets.oneMpay,oneMpayOrdersEnabled:'true',oneMpayCallbackUrl:'https://master7-v17-staging.onrender.com/api/payment-callbacks/1mpay/payment',oneMpayReturnUrl:'https://master7-v17-staging.onrender.com/payment/return',
  gameGatewayUrl:'https://master7-integration-gateway.onrender.com',gameGatewayToken:'g'.repeat(40),gameGatewayWalletToken:'w'.repeat(40),megaTransfersEnabled:'true',megaLiveGamesEnabled:'true',megaSettlementVerified:'true',gameGatewayFetch:async()=>{activity.network++;throw Error('report must not synchronize catalogues');},
  rectangleApiBase:'https://apig.rg-lgna.com',rectangleOperatorCode:'FIXTURE_MASTER7',rectangleApiKey:secrets.rectangle,gameCatalogueFetch:async()=>{activity.network++;throw Error('report must not read direct catalogues');},
  whatsappEnabled:'true',whatsappGraphApiVersion:'v21.0',whatsappPhoneNumberId:'123456789012',whatsappWabaId:'987654321098',whatsappAccessToken:secrets.whatsapp,whatsappAppSecret:'a'.repeat(32),whatsappWebhookVerifyToken:'verify_token_fixture_1234567890123456',whatsappBusinessNumber:'+601166336686',whatsappTemplateName:'master7_launch',whatsappTemplateLanguage:'en',whatsappRecipientLimit:'1000',
  supportAiEnabled:'true',supportAiApiBaseUrl:'https://ai.example.test/v1',supportAiApiKey:secrets.support,supportAiModel:'support-model',supportAiFetch:async()=>{activity.network++;throw Error('report must not call the support model');},
 };
 t.after(()=>sqlite.close());
 return {sqlite,db,activity,context,secrets,expectedGateway};
}

async function request(context,who,path,method='GET'){
 const identity=who?{userId:who,email:`${who}@example.test`}:null,body=method==='GET'?undefined:'{}';
 const response=await handle(new Request('https://portal.example.test'+path,{method,headers:{'content-type':'application/json','origin':'https://portal.example.test','x-csrf-token':`private-${who}-csrf`},body}),{...context,identity});
 const text=await response.text();return {response,data:JSON.parse(text)};
}

function objectKeys(value,keys=new Set()){
 if(Array.isArray(value))for(const item of value)objectKeys(item,keys);
 else if(value&&typeof value==='object')for(const [key,item] of Object.entries(value)){keys.add(key);objectKeys(item,keys);}
 return keys;
}

test('operations intelligence API is owner-only, fail-closed, private and strictly read-only',async t=>{
 const {sqlite,activity,context,secrets,expectedGateway}=fixture(t);
 const beforeChanges=sqlite.prepare('SELECT total_changes() changes').get().changes,beforeAudit=sqlite.prepare('SELECT COUNT(*) count FROM audit').get().count;

 await t.test('authorization is enforced by the server',async()=>{
  assert.equal((await request(context,null,'/api/admin/operations-intelligence')).response.status,401);
  assert.equal((await request(context,'member','/api/admin/operations-intelligence')).response.status,403);
  assert.equal((await request(context,'staff','/api/admin/operations-intelligence')).response.status,401);
  const owner=await request(context,'owner','/api/admin/operations-intelligence?period=day');
  assert.equal(owner.response.status,200);assert.equal(owner.response.headers.get('cache-control'),'no-store');
 });

 await t.test('invalid periods are rejected and no POST operation exists',async()=>{
  assert.equal((await request(context,'owner','/api/admin/operations-intelligence?period=year')).response.status,400);
  assert.equal((await request(context,'owner','/api/admin/operations-intelligence','POST')).response.status,405);
 });

 await t.test('canonical readiness stays false until payout and settlement acceptance exist',async()=>{
  const {data}=await request(context,'owner','/api/admin/operations-intelligence?period=week'),ids=new Set(data.recommendations.map(item=>item.id));
  assert.equal(data.summary.productionReady,false);
  assert.equal(data.metrics.paymentRecovery.status,'manual_review_required');assert.equal(data.metrics.paymentRecovery.excessiveAttemptLeases,1);
  assert.equal(data.metrics.accountingJob.status,'stalled');assert.equal(data.metrics.accountingJob.automaticRerun,false);
  assert.ok(ids.has('complete_production_readiness'));assert.ok(ids.has('complete_payout_acceptance'));assert.ok(ids.has('verify_settlement'));
  assert.equal(ids.has('complete_payment_acceptance'),true,'closed deposit maintenance must not report payment availability');assert.equal(ids.has('complete_game_acceptance'),true,'legacy flags alone are not a current game capability observation');assert.equal(ids.has('complete_whatsapp_setup'),false);
  assert.equal(data.assistant.externalModelStatus,'available_not_used_for_actions');assert.equal(data.assistant.readOnly,true);
  assert.deepEqual(data.control,{actionsEnabled:false,approvalRequiredForAllActions:true,automaticWalletCredit:false,automaticDepositApproval:false,automaticWithdrawalApproval:false,automaticPayout:false,automaticAccountSanction:false,automaticCampaignSend:false});
  assert.ok(data.recommendations.every(item=>item.approvalRequired===true&&item.automaticAction===false));
 });

 await t.test('expected catalogue inventory follows configured gateway and direct sources only',async()=>{
  const configured=await request(context,'owner','/api/admin/operations-intelligence');
  assert.equal(configured.data.metrics.catalogue.expectedCatalogues,expectedGateway.length+1);assert.equal(configured.data.metrics.catalogue.cachedCatalogues,expectedGateway.length+1);assert.equal(configured.data.metrics.catalogue.status,'connected');
  const withGodee=await request({...context,godeeApiBase:'https://api.godeezone1.com',godeeOperatorId:'FIXTURE_OPERATOR',godeeApiKey:'private-godee-api-key'},'owner','/api/admin/operations-intelligence');
  assert.equal(withGodee.data.metrics.catalogue.expectedCatalogues,expectedGateway.length+2);assert.equal(withGodee.data.metrics.catalogue.status,'degraded');assert.equal(withGodee.data.metrics.catalogue.missingCatalogues,1);assert.equal(withGodee.data.metrics.catalogue.unavailableCatalogues,0);
  const unconfigured=await request({...context,gameGatewayUrl:undefined,rectangleApiBase:undefined,rectangleOperatorCode:undefined,rectangleApiKey:undefined},'owner','/api/admin/operations-intelligence');
  assert.equal(unconfigured.data.metrics.catalogue.expectedCatalogues,0);assert.equal(unconfigured.data.metrics.catalogue.status,'not_configured');
 });

 await t.test('response contains aggregates only and performs no database or network action',async()=>{
  const {data}=await request(context,'owner','/api/admin/operations-intelligence?period=month'),serialized=JSON.stringify(data),keys=objectKeys(data);
  for(const key of ['phone','account_name','account_number','accountHolder','receipt_data','message','player_id','username','email','csrf','apiKey','secretKey','authKey','accessToken','operatorCode','operatorId','businessNumber','token'])assert.equal(keys.has(key),false,key);
  for(const value of ['private-owner-username','private-staff-username','private-member-username','private-account-holder','998877665544','private-company-account-name','112233445566','private-bank-slip-image','private-ticket-message','private-player-id','private-campaign-message','+60123456789','private-audit-target','private-recovery-claim','private-accounting-error',...Object.values(secrets)])assert.equal(serialized.includes(value),false,value);
 });

 assert.equal(activity.network,0);assert.equal(activity.writes,0);
 assert.equal(sqlite.prepare('SELECT total_changes() changes').get().changes,beforeChanges);
 assert.equal(sqlite.prepare('SELECT COUNT(*) count FROM audit').get().count,beforeAudit);
});
