import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudReadiness,createCloudReadinessHandler,readGatewayReadiness,GATEWAY_READINESS_URL} from './cloud-readiness.mjs';

const env={NODE_ENV:'production',PUBLIC_ORIGIN:'https://staging.example.test',PORTAL_POSTGRES_URL:'postgresql://owner:very-private@db.example.test/staging'};
test('staging configuration cannot attest restoration or four-company production acceptance',()=>{
 const r=cloudReadiness(env);assert.equal(r.stagingConfigurationReady,true);assert.equal(r.productionReady,false);
 assert.equal(r.database.connectionVerified,false);assert.equal(r.database.restoreVerified,false);
 assert.equal(r.paymentCompanies.companies.length,4);assert.equal(r.paymentCompanies.identified,2);
 assert.deepEqual(r.paymentCompanies.companies.map(c=>c.name),['VPay','GSPAY+',null,null]);
 assert(!JSON.stringify(r).includes('very-private'));assert(!JSON.stringify(r).includes('db.example.test'));
});
test('missing database, test driver, invalid origin and active transactions block staging preflight',()=>{
 for(const changes of [{PORTAL_POSTGRES_URL:''},{PORTAL_POSTGRES_URL:'https://db.example.test'},{PUBLIC_ORIGIN:'http://localhost:8080'},
  {PORTAL_TEST_POSTGRES:'1'},{PORTAL_VPAY_ORDERS_ENABLED:'true'},{PORTAL_VPAY_SETTLEMENT_ENABLED:'true'},{PORTAL_VPAY_RECOVERY_ENABLED:'true'}])
  assert.equal(cloudReadiness({...env,...changes}).stagingConfigurationReady,false);
});
test('public web service binding defaults safely and rejects loopback overrides',()=>{
 const defaulted=cloudReadiness(env);
 assert.equal(defaulted.configuration.find(c=>c.code==='PUBLIC_BIND_ADDRESS').ok,true);
 assert.equal(cloudReadiness({...env,HOST:'0.0.0.0'}).configuration.find(c=>c.code==='PUBLIC_BIND_ADDRESS').ok,true);
 const loopback=cloudReadiness({...env,HOST:'127.0.0.1'});
 assert.equal(loopback.configuration.find(c=>c.code==='PUBLIC_BIND_ADDRESS').ok,false);
 assert.equal(loopback.stagingConfigurationReady,false);
});
test('only authenticated headquarters can inspect readiness and GET cannot mutate',async()=>{
 const handler=createCloudReadinessHandler({env});
 assert.equal(handler().status,401);
 for(const role of ['customer','employee','tenant_owner'])assert.equal(handler({user:{role}}).status,403);
 assert.equal(handler({user:{role:'owner'},method:'POST'}).status,405);
 const response=handler({user:{role:'owner'}});assert.equal(response.status,200);
 assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).productionReady,false);
});
test('live inspection is one fixed GET with no credentials and a strict safe projection',async()=>{
 let calls=0;
 const r=await readGatewayReadiness({fetchImpl:async(url,options)=>{
  calls++;assert.equal(url,GATEWAY_READINESS_URL);assert.equal(options.method,'GET');assert.equal(options.redirect,'manual');
  assert.deepEqual(options.headers,{accept:'application/json'});
  return Response.json({service:'master7-integration-gateway',scope:'configuration_only',liveReady:true,secret:'do-not-leak',
   vpay:{channels:{payment:{enabled:'true',callbackForwardingConfigured:true},withdrawal:{enabled:false,callbackForwardingConfigured:false}}}});
 }});
 assert.equal(calls,1);assert.equal(r.reachable,true);assert.equal(r.reportedLiveReady,true);
 assert.equal(r.productionAcceptanceVerified,false);assert.equal(r.paymentEnabled,false);assert(!JSON.stringify(r).includes('do-not-leak'));
});
test('redirect, oversized, wrong-service, malformed and failed responses cannot become ready or leak errors',async()=>{
 const fixtures=[()=>new Response(null,{status:302,headers:{location:'https://evil.example'}}),
  ()=>Response.json({service:'other',scope:'configuration_only',liveReady:true}),
  ()=>new Response('private-provider-error',{headers:{'content-type':'application/json'}}),
  ()=>new Response('x'.repeat(32769),{headers:{'content-type':'application/json'}}),
  ()=>{throw Error('postgresql://private-credential');}];
 for(const fixture of fixtures){const r=await readGatewayReadiness({fetchImpl:async()=>fixture()});
  assert.deepEqual(r,{reachable:false,productionAcceptanceVerified:false,error:'GATEWAY_READINESS_UNAVAILABLE'});}
});
