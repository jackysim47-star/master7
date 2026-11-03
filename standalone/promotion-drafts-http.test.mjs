import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

delete process.env.PORTAL_POSTGRES_URL;delete process.env.RENDER;const postgres=process.argv.includes('--postgres');if(postgres)process.env.PORTAL_TEST_POSTGRES='1';else delete process.env.PORTAL_TEST_POSTGRES;
process.env.NODE_ENV='test';const directory=mkdtempSync(join(tmpdir(),'master7-promotion-drafts-'));
process.env.PORTAL_DATABASE=join(directory,'portal.sqlite');if(postgres)process.env.PORTAL_TEST_POSTGRES_PATH=join(directory,'portal-pg');process.env.PUBLIC_ORIGIN='https://portal.example.test';process.env.PORTAL_ALLOWED_ORIGINS='https://portal.example.test';
const {sql,withStorage}=await import('./runtime.mjs');const {newSession}=await import('./security.mjs');const {server}=await import('./server.mjs');
await withStorage(async()=>{
 const now=new Date().toISOString();
 for(const [id,username,email,role] of [['owner','owner','owner@example.test','owner'],['employee','employee','employee@example.test','customer'],['outsider','outsider','outsider@example.test','customer'],['customer','customer1','customer@example.test','customer']])await sql.prepare('INSERT INTO portal_users VALUES (?,?,?,?,?,?,?,?)').run(id,username,email,'synthetic-hash',role,1,'synthetic-recovery',now);
 await sql.prepare("INSERT INTO brands(id,name,created_at) VALUES ('alpha','Alpha',?)").run(now);
 await sql.prepare("INSERT INTO portal_staff(user_id,tenant_id,role) VALUES ('employee','alpha','employee')").run();
 await sql.prepare("INSERT INTO members(email,tenant_id,created_at) VALUES ('employee@example.test','alpha',?)").run(now);
 await sql.prepare("INSERT INTO members(email,tenant_id,created_at) VALUES ('customer@example.test','alpha',?)").run(now);
 await sql.prepare("INSERT INTO members(email,tenant_id,created_at) VALUES ('outsider@example.test','other',?)").run(now);
});
const cookies={};for(const id of ['owner','employee','outsider','customer'])cookies[id]='portal_session='+await withStorage(()=>newSession(id));
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
const call=(path,who,options={})=>fetch(base+path,{redirect:'manual',...options,headers:{...(options.headers||{}),...(who?{Cookie:cookies[who]}:{})}});
const headers={Origin:process.env.PUBLIC_ORIGIN,'Content-Type':'application/json','X-Portal-Request':'1'};
const post=(who,data,path='/api/v1/promotion-drafts?tenant=alpha')=>call(path,who,{method:'POST',headers,body:JSON.stringify(data)});
const validRules={eligibility:'New members only; eligibility needs confirmation.',rewardRatePercent:'3',fixedAmountMYR:null,rewardCapMYR:'100',budgetMYR:'1000',wagerMultiplier:'5',maxClaimsPerMember:1,gameCategories:['slots','fishing'],startsAtMytDate:'2026-11-05',endsAtMytDate:'2026-11-30'};
try{
 assert.equal((await call('/api/v1/promotion-drafts?tenant=alpha')).status,401);
 assert.equal((await call('/api/v1/promotion-drafts?tenant=alpha&format=csv')).status,401);
 assert.equal((await call('/api/v1/promotion-drafts?tenant=other','employee')).status,403);
 assert.equal((await call('/api/v1/promotion-drafts?tenant=alpha','customer')).status,403);
 assert.equal((await post('employee',{action:'create',title:'Invalid dates',kind:'cashback',summary:'x',terms:'y',rules:{...validRules,startsAtMytDate:'2026-12-01',endsAtMytDate:'2026-11-01'}})).status,400);
 assert.equal((await post('employee',{action:'create',title:'Invalid amount',kind:'cashback',summary:'x',terms:'y',rules:{...validRules,rewardCapMYR:'100000.01'}})).status,400);
 const invalid=await post('employee',{action:'create',title:'=HYPERLINK("https://bad.test","click")',kind:'cashback',summary:'x',terms:'y',rules:validRules,activate:true});assert.equal(invalid.status,200);
 const created=await invalid.json();assert.equal(created.financialEffects,false);const id=created.id;
 assert.equal((await post('employee',{action:'submit',id})).status,200);
 assert.equal((await post('employee',{action:'review',id,decision:'approve'})).status,403);
 const approved=await post('owner',{action:'review',id,decision:'approve',note:'Reviewed as draft only'});assert.equal(approved.status,200);assert.equal((await approved.json()).status,'approved_draft');
 assert.equal((await post('owner',{action:'submit',id})).status,409,'approved draft cannot be resubmitted as pending');
 const listed=await call('/api/v1/promotion-drafts?tenant=alpha','employee');const data=await listed.json();assert.equal(data.drafts.length,1);assert.equal(data.drafts[0].status,'approved_draft');assert.equal(data.drafts[0].reviewer,'owner@example.test');assert.deepEqual(data.drafts[0].rules,{currency:'MYR',timeZone:'Asia/Kuching',...validRules});
 const ownerCreated=await (await post('owner',{action:'create',title:'Owner draft',kind:'vip',summary:'Owner-created draft',terms:'Draft only',rules:validRules})).json();
 assert.equal((await post('owner',{action:'submit',id:ownerCreated.id})).status,200);
 const selfApproval=await post('owner',{action:'review',id:ownerCreated.id,decision:'approve'});assert.equal(selfApproval.status,409,'a draft creator must not approve their own rule');
 const cross=await post('outsider',{action:'update',id,title:'Cross tenant',kind:'vip',summary:'x',terms:'y'},'/api/v1/promotion-drafts?tenant=alpha');assert.equal(cross.status,403);
 assert.equal((await call('/api/v1/promotion-drafts?tenant=alpha&format=csv','customer')).status,403);
 const exported=await call('/api/v1/promotion-drafts?tenant=alpha&format=csv','owner'),csv=await exported.text();assert.equal(exported.headers.get('content-type'),'text/csv; charset=utf-8');assert.match(exported.headers.get('content-disposition')||'',/attachment; filename=/);assert(csv.includes("'=HYPERLINK"),'spreadsheet formula text must be neutralized');assert(!csv.includes('customer@example.test'),'member account data is not exported');assert.equal(exported.headers.get('cache-control'),'no-store');
 assert.equal((await sql.prepare('SELECT COUNT(*) AS count FROM portal_wallet_journal').get()).count,0,'promotion drafting must not create wallet movements');
 assert.equal((await sql.prepare("SELECT COUNT(*) AS count FROM audit WHERE action LIKE '%奖励规则%'").get()).count,5,'create, submit and review are audited; rejected self-approval is not recorded as successful');
 console.log(`PASS (${postgres?'PostgreSQL':'SQLite'}): promotion drafts are tenant-scoped, require owner review, remain non-activatable, audited, and create no wallet entries.`);
}finally{await new Promise(resolve=>server.close(resolve));await sql.close();rmSync(directory,{recursive:true,force:true});}
