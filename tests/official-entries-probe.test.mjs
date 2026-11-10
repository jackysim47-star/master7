import test from 'node:test';
import assert from 'node:assert/strict';
import {probeOfficialEntries,OFFICIAL_ENTRIES} from '../scripts/probe-official-entries.mjs';

const release='17.0.0-selfbuilt.172-privileged-role-boundary';
function response(url){return url.pathname==='/health/live'?Response.json({status:'ok',database:'ready',scope:'portal-liveness',release}):new Response('<title>MASTER7 · Premium Game Lobby</title>',{headers:{'content-type':'text/html'}});}

test('fixed official entry probe sends GET only, omits credentials and never claims financial acceptance',async()=>{
 const calls=[],result=await probeOfficialEntries({expectedRelease:release,fetchImpl:async(raw,options)=>{const url=new URL(raw);calls.push({url,options});return response(url);}});
 assert.equal(result.networkReady,true);assert.equal(calls.length,4);assert.equal(result.entries.length,2);
 for(const {url,options} of calls){assert.ok(OFFICIAL_ENTRIES.some(entry=>entry.origin===url.origin));assert.ok(['/','/health/live'].includes(url.pathname));assert.equal(options.method,'GET');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'manual');assert.equal(options.body,undefined);assert.deepEqual(Object.keys(options.headers),['Accept']);}
 for(const name of ['callbackDeliveryVerified','realPaymentVerified','walletCreditVerified','productionReady'])assert.equal(result[name],false);
});
test('external page forwarding and redirected health fail without following the target',async()=>{
 const calls=[],result=await probeOfficialEntries({expectedRelease:release,fetchImpl:async(raw)=>{calls.push(String(raw));return new Response(null,{status:302,headers:{location:'https://attacker.invalid/login?token=secret'}});}});
 assert.equal(result.networkReady,false);assert.equal(calls.length,4);assert.ok(calls.every(url=>!url.includes('attacker')));assert.ok(!JSON.stringify(result).includes('token=secret'));
 assert.ok(result.entries.every(entry=>entry.liveness.reason==='health_redirect'&&entry.page.reason==='page_forwarding_or_unexpected_redirect'));
});
test('same-origin page routing works while health always requires a direct response',async()=>{
 const result=await probeOfficialEntries({expectedRelease:release,fetchImpl:async(raw)=>{const url=new URL(raw);return url.pathname==='/'?new Response(null,{status:308,headers:{location:'/admin'}}):response(url);}});
 assert.equal(result.networkReady,true);assert.ok(result.entries.every(entry=>entry.page.redirects.length===1));
});
test('missing DNS fails closed without leaking raw exceptions or secrets',async()=>{
 const result=await probeOfficialEntries({expectedRelease:release,fetchImpl:async()=>{throw new Error('credential=secret',{cause:{code:'ENOTFOUND'}});}});
 assert.equal(result.networkReady,false);assert.ok(result.entries.every(entry=>entry.liveness.reason==='ENOTFOUND'));assert.ok(!JSON.stringify(result).includes('credential'));
});
test('old release, HTML health and malformed JSON are not accepted as a working V17 origin',async()=>{
 for(const health of [()=>Response.json({status:'ok',database:'ready',scope:'portal-liveness',release:'17.0.0-selfbuilt.99-payment-settlement'}),()=>new Response('<title>MASTER7</title>',{headers:{'content-type':'text/html'}}),()=>new Response('invalid',{headers:{'content-type':'application/json'}})]){
  const result=await probeOfficialEntries({expectedRelease:release,fetchImpl:async(raw)=>new URL(raw).pathname==='/health/live'?health():response(new URL(raw))});assert.equal(result.networkReady,false);
 }
});
test('only the two owner-selected public entries are configured',()=>{
 assert.deepEqual(OFFICIAL_ENTRIES.map(entry=>entry.origin),['https://www.master7.best','https://www.master7.site']);assert.ok(OFFICIAL_ENTRIES.every(entry=>entry.required));
});
test('redirect loops stop after four reads per page',async()=>{
 let calls=0;const result=await probeOfficialEntries({expectedRelease:release,fetchImpl:async(raw)=>{calls++;const url=new URL(raw);return url.pathname==='/health/live'?response(url):new Response(null,{status:307,headers:{location:'/signin'}});}});
 assert.equal(calls,10);assert.equal(result.networkReady,false);assert.ok(result.entries.every(entry=>entry.page.reason==='redirect_limit'));
});
test('timeouts are bounded and oversized responses fail closed',async()=>{
 const timed=await probeOfficialEntries({expectedRelease:release,timeoutMs:10,fetchImpl:async(_raw,options)=>new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}))});
 assert.equal(timed.networkReady,false);assert.ok(timed.entries.every(entry=>entry.page.reason==='request_timeout'));
 const huge=await probeOfficialEntries({expectedRelease:release,fetchImpl:async()=>new Response('x'.repeat(512_001),{headers:{'content-type':'text/html'}})});assert.equal(huge.networkReady,false);assert.ok(huge.entries.every(entry=>entry.page.reason==='response_too_large'));
});
test('invalid expected release and timeout are rejected before network access',async()=>{
 let calls=0;const fetchImpl=async()=>{calls++;throw new Error('unexpected');};
 await assert.rejects(probeOfficialEntries({fetchImpl,expectedRelease:'secret\nheader'}),/release/);await assert.rejects(probeOfficialEntries({fetchImpl,expectedRelease:release,timeoutMs:0}),/timeout/);assert.equal(calls,0);
});
