import {test} from 'node:test';
import assert from 'node:assert/strict';
import {portalHostRedirect,portalHostGroups} from '../lib/portal-host-routing.ts';

const request=(host,path='/',method='GET',headers={})=>new Request(`https://${host}${path}`,{method,headers});

test('all approved admin hosts route only their root page to the management console',()=>{
 for(const host of ['www.master7.site']){
  for(const method of ['GET','HEAD'])assert.deepEqual(portalHostRedirect(request(host,'/',method)),{status:308,location:'/admin'});
  assert.equal(portalHostRedirect(request(host,'/admin')),null);
  assert.equal(portalHostRedirect(request(host,'/admin/withdrawals')),null);
 }
 assert.deepEqual([...portalHostGroups.adminHosts],['www.master7.site']);
});

test('old staff addresses redirect pages to the single official staff entry',()=>{
 for(const host of ['master7.site','admin.master7.best','admin.master7.site']){
  assert.deepEqual(portalHostRedirect(request(host,'/')),{status:308,location:'https://www.master7.site/admin'});
  assert.deepEqual(portalHostRedirect(request(host,'/admin/withdrawals?scope=open')),{status:308,location:'https://www.master7.site/admin/withdrawals?scope=open'});
 }
});

test('customer admin pages use a fixed HTTPS backoffice destination and preserve only path and query',()=>{
 for(const method of ['GET','HEAD'])assert.deepEqual(
  portalHostRedirect(request('www.master7.best','/admin?lang=zh',method)),
  {status:308,location:'https://www.master7.site/admin?lang=zh'},
 );
 assert.deepEqual(portalHostRedirect(request('master7.best','/admin/withdrawals?scope=open')),
  {status:308,location:'https://www.master7.site/admin/withdrawals?scope=open'});
});

test('customer apex pages redirect to the canonical www entry without redirecting APIs',()=>{
 for(const method of ['GET','HEAD']){
  assert.deepEqual(portalHostRedirect(request('master7.best','/',method)),
   {status:308,location:'https://www.master7.best/'});
  assert.deepEqual(portalHostRedirect(request('master7.best','/signin?lang=zh',method)),
   {status:308,location:'https://www.master7.best/signin?lang=zh'});
 }
 assert.equal(portalHostRedirect(request('master7.best','/api/version')),null);
 assert.equal(portalHostRedirect(request('master7.best','/signin','POST')),null);
});

test('host routing never redirects APIs or state-changing methods',()=>{
 for(const host of ['www.master7.site','admin.master7.best','admin.master7.site','master7.best']){
  for(const path of ['/api/admin/summary','/api/payment/gspay/callback','/api/payment-callbacks/1mpay/payment']){
   assert.equal(portalHostRedirect(request(host,path,'GET')),null);
   assert.equal(portalHostRedirect(request(host,path,'POST')),null);
  }
  assert.equal(portalHostRedirect(request(host,'/','POST')),null);
  assert.equal(portalHostRedirect(request(host,'/admin','POST')),null);
 }
});

test('unapproved, malformed and non-default-port host headers do not influence routing',()=>{
 for(const forwarded of ['attacker.example','admin.master7.best.evil.example','admin.master7.best:444','admin.master7.best/path','https://admin.master7.best']){
  assert.equal(portalHostRedirect(request('master7-v17-staging.onrender.com','/', 'GET',{'x-forwarded-host':forwarded})),null);
 }
 assert.equal(portalHostRedirect(request('master7-v17-staging.onrender.com','/','GET',{'x-forwarded-host':'admin.master7.best:443'})),null);
});
