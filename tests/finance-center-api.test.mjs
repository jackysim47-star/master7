import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handle} from '../lib/backend.ts';

const migrations=['0000_broken_bloodscream.sql','0001_orange_owl.sql','0002_lobby_ads.sql','0003_game_visibility.sql','0004_sponsored_brands.sql','0005_custom_game_cards.sql','0006_malaysia_member_phone.sql','0007_vpay_uat_wallet.sql','0008_member_sms_otp.sql','0009_game_payment_statuses.sql','0010_game_visibility_artwork.sql','0011_provider_artwork.sql','0012_close_defaults_and_brand_directory.sql','0013_api_supplier_artwork.sql','0014_withdrawal_requests.sql','0019_game_catalogue_sync.sql','0020_manual_bank_deposits.sql','0021_api_supplier_status.sql','0022_referrals.sql','0023_marketing_campaigns.sql','0024_megah5_transfer_wallet.sql','0025_game_access_zones.sql','0027_marketing_contact_scale.sql','0090_security_wallet_reservations.sql','0091_operations_automation.sql','0092_support_marketing_notifications.sql','0093_reward_state_machines.sql','0094_payment_recovery_and_payout_state.sql','0100_whatsapp_campaign_delivery.sql','0115_manual_bank_funds.sql','0116_provider_wallet_operations.sql','0120_provider_wallet_sweeps.sql'];

class Statement{
 constructor(sqlite,sql,args=[]){this.sqlite=sqlite;this.sql=sql;this.args=args;}
 bind(...args){return new Statement(this.sqlite,this.sql,args);}
 async first(){return this.sqlite.prepare(this.sql).get(...this.args)??null;}
 async all(){return {results:this.sqlite.prepare(this.sql).all(...this.args)};}
 async run(){return this.sqlite.prepare(this.sql).run(...this.args);}
}

function fixture(){
 const sqlite=new DatabaseSync(':memory:');for(const migration of migrations)sqlite.exec(readFileSync(new URL(`../drizzle/${migration}`,import.meta.url),'utf8'));
 const db={prepare:sql=>new Statement(sqlite,sql),async batch(list){sqlite.exec('BEGIN');try{const results=[];for(const item of list)results.push(await item.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
 const user=sqlite.prepare('INSERT INTO users(id,username,role,approved,csrf,created_at) VALUES(?,?,?,?,?,0)');user.run('owner','owner','owner',1,'owner-csrf');user.run('staff','staff','staff',1,'staff-csrf');user.run('member','member','member',1,'member-csrf');
 const staffToken='s'.repeat(43),staffTokenHash=createHash('sha256').update(staffToken).digest('hex');
 sqlite.prepare("INSERT INTO password_credentials(username,user_id,salt,password_hash,version,changed_at) VALUES('staff_login','staff','test-salt',?,1,0)").run('a'.repeat(64));
 sqlite.prepare("INSERT INTO password_sessions(token_hash,user_id,csrf,credential_version,expires_at,created_at) VALUES(?,'staff','staff-csrf',1,4102444800,0)").run(staffTokenHash);
 sqlite.prepare("INSERT INTO settings(id,value) VALUES('staff_password_ready:staff','1')").run();
 async function call(who,path){const localStaff=who==='staff',response=await handle(new Request('https://portal.example.test'+path,{headers:localStaff?{cookie:`__Host-master7_session=${staffToken}`}:{}}),{db,identity:who&&!localStaff?{userId:who,email:`${who}@example.test`}:null,ownerEmail:'owner@example.test'});return {status:response.status,data:await response.json()};}
 return {sqlite,call};
}

test('finance center API is read-only for owner and staff and hides bank details',async()=>{
 const {sqlite,call}=fixture(),at=Math.floor(Date.parse('2026-11-03T12:00:00+08:00')/1000);
 sqlite.prepare("INSERT INTO company_bank_accounts(id,bank_name,account_name,account_number,enabled,position,updated_by,updated_at) VALUES('bank','Private Bank','Private Holder','9988776655',1,0,'owner',?)").run(at);
 sqlite.prepare("INSERT INTO deposit_orders(id,user_id,request_key,fingerprint,provider,amount_minor,currency,trade_code,status,created_at,updated_at) VALUES('manual','member','manual-request','manual-fingerprint','manual_bank',2500,'MYR','bank','credited',?,?)").run(at,at);
 sqlite.prepare("INSERT INTO manual_deposit_requests(deposit_order_id,bank_account_id,receipt_data,reviewed_by,created_at,updated_at) VALUES('manual','bank','private-receipt','owner',?,?)").run(at,at);
 sqlite.prepare("INSERT INTO wallet_ledger(id,order_id,user_id,account_code,amount_minor,currency,created_at) VALUES('member-posting','manual','member','member',2500,'MYR',?),('clearing-posting','manual','member','provider_clearing',-2500,'MYR',?)").run(at,at);
 assert.equal((await call(null,'/api/admin/finance-center?period=month&month=2026-11')).status,401);
 assert.equal((await call('member','/api/admin/finance-center?period=month&month=2026-11')).status,403);
 for(const who of ['owner','staff']){
  const result=await call(who,'/api/admin/finance-center?period=month&month=2026-11');assert.equal(result.status,200);assert.equal(result.data.categories.manualBank.amountMinor,'2500');assert.equal(result.data.bank.bankConfigured,true);assert.equal(result.data.reconciliation.memberWallet.status,'matched');assert.equal(result.data.totals.netProfitMinor,null);assert.doesNotMatch(JSON.stringify(result.data),/Private Bank|Private Holder|9988776655|private-receipt/);
 }
 assert.equal((await call('staff','/api/admin/accounting?period=month&month=2026-11')).status,403);
 sqlite.close();
});
