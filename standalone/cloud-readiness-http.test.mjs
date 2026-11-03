import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('actual server protects cloud review, never calls suppliers and revokes suspended owner access',async()=>{
 for(const key of ['PORTAL_POSTGRES_URL','PORTAL_TEST_POSTGRES','RENDER','RAILWAY_ENVIRONMENT_ID'])delete process.env[key];
 const dir=mkdtempSync(join(tmpdir(),'master7-cloud-review-'));
 process.env.NODE_ENV='test';process.env.PUBLIC_ORIGIN='http://127.0.0.1:8080';process.env.PORTAL_DATABASE=join(dir,'fixture.sqlite');
 const {sql,withStorage}=await import('./runtime.mjs');
 const {newSession}=await import('./security.mjs');
 const {server}=await import('./server.mjs');
 const nativeFetch=globalThis.fetch;let outbound=0;
 globalThis.fetch=async()=>{outbound++;throw Error('No supplier request allowed');};
 try{
  const cookies={};
  await withStorage(async()=>{
   const now=new Date().toISOString();
   for(const id of ['owner','member','employee','tenant_owner']){
    await sql.prepare('INSERT INTO portal_users VALUES (?,?,?,?,?,?,?,?)').run(id,'fixture_'+id,id+'@example.test','not-a-real-hash',id==='owner'?'owner':'customer',1,'fixture-recovery',now);
    if(['employee','tenant_owner'].includes(id))await sql.prepare('INSERT INTO portal_staff VALUES (?,?,?)').run(id,'main',id);
    if(id==='member')await sql.prepare('INSERT INTO members(email,tenant_id,created_at) VALUES (?,?,?)').run(id+'@example.test','main',now);
    cookies[id]='portal_session='+await newSession(id);
   }
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const call=(path,cookie,method='GET')=>nativeFetch(base+path,{method,redirect:'manual',headers:cookie?{Cookie:cookie}:{}});
  for(const path of ['/api/v1/deployment-readiness','/deployment-readiness']){
   assert.equal((await call(path)).status,401);
   for(const id of ['member','employee','tenant_owner'])assert.equal((await call(path,cookies[id])).status,403);
   assert.equal((await call(path,cookies.owner,'POST')).status,405);
   const result=await call(path,cookies.owner);assert.equal(result.status,200);
   assert.equal(result.headers.get('cache-control'),'no-store');
   const body=await result.text();assert(!body.includes('fixture-recovery'));
   if(path.startsWith('/api/')){const report=JSON.parse(body);assert.equal(report.paymentCompanies.required,4);assert.equal(report.productionReady,false);}
   else{assert(body.includes('四家充值公司'));assert(body.includes('第 3 家'));assert(body.includes('第 4 家'));}
  }
  await withStorage(()=>sql.prepare('UPDATE portal_users SET approved=0 WHERE id=?').run('owner'));
  assert.equal((await call('/api/v1/deployment-readiness',cookies.owner)).status,401);
  assert.equal(outbound,0);
 }finally{
  globalThis.fetch=nativeFetch;
  if(server.listening)await new Promise(resolve=>server.close(resolve));
  await sql.close();rmSync(dir,{recursive:true,force:true});
 }
});
