// Deployment inspection only: no database imports, migrations or transactions.
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {effectiveListenHost,webConfig,validateStorageConfig} from './production.mjs';
import {serviceOnlyMode} from './service-mode.mjs';

export const GATEWAY_READINESS_URL='https://master7-integration-gateway.onrender.com/readiness';
export const PAYMENT_COMPANIES=Object.freeze([
 Object.freeze({slot:1,id:'vpay',name:'VPay',identity:'identified',acceptance:'not_verified'}),
 Object.freeze({slot:2,id:'gspay',name:'GSPAY+',identity:'identified',acceptance:'not_verified'}),
 Object.freeze({slot:3,id:null,name:null,identity:'unresolved',acceptance:'not_verified'}),
 Object.freeze({slot:4,id:null,name:null,identity:'unresolved',acceptance:'not_verified'}),
]);
const transactionSwitches=['PORTAL_VPAY_SETTLEMENT_ENABLED','PORTAL_VPAY_ORDERS_ENABLED','PORTAL_VPAY_RECOVERY_ENABLED'];

export function cloudReadiness(env=process.env){
 const configuration=[];
 try{webConfig({...env,NODE_ENV:'production'});configuration.push({code:'HTTPS_ORIGIN',ok:true});}
 catch{configuration.push({code:'HTTPS_ORIGIN',ok:false});}
 configuration.push({code:'PUBLIC_BIND_ADDRESS',ok:effectiveListenHost({...env,NODE_ENV:'production'})==='0.0.0.0'});
 let databaseConfigured=false;
 try{
  validateStorageConfig({...env,NODE_ENV:'production'});
  const u=new URL(env.PORTAL_POSTGRES_URL);
  databaseConfigured=['postgres:','postgresql:'].includes(u.protocol)&&Boolean(u.hostname)&&u.pathname.length>1;
 }catch{}
 configuration.push({code:'POSTGRES_CONFIGURATION',ok:databaseConfigured});
 configuration.push({code:'SERVICE_ONLY_GUARD',ok:serviceOnlyMode(env)});
 configuration.push({code:'TRANSACTION_SWITCHES_OFF',ok:transactionSwitches.every(key=>env[key]!=='true')});
 return {
  scope:'configuration_only',stagingConfigurationReady:configuration.every(c=>c.ok),productionReady:false,
  configuration,database:{configured:databaseConfigured,connectionVerified:false,restoreVerified:false},
  paymentCompanies:{required:4,identified:2,companies:PAYMENT_COMPANIES.map(c=>({...c}))},
  blockers:['ORIGINAL_SOURCE_ACCESS_UNVERIFIED','DATABASE_RESTORE_UNVERIFIED','PAYMENT_COMPANY_3_UNIDENTIFIED',
   'PAYMENT_COMPANY_4_UNIDENTIFIED','SUPPLIER_ACCEPTANCE_UNVERIFIED','GAME_WALLET_INTEGRATION_UNVERIFIED'],
  limitations:['Configuration presence is not database connectivity, a restored balance, supplier acceptance or a production release.',
   'Bank transfer, DuitNow and USDT are payment methods or currencies, not additional payment companies.'],
 };
}

export async function readGatewayReadiness({fetchImpl=fetch,timeoutMs=5000}={}){
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000)throw Error('Invalid timeout');
 try{
  const response=await fetchImpl(GATEWAY_READINESS_URL,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(timeoutMs),headers:{accept:'application/json'}});
  if(response.status!==200||response.redirected||(response.url&&response.url!==GATEWAY_READINESS_URL)||
   !(response.headers.get('content-type')||'').toLowerCase().startsWith('application/json')){
   await response.body?.cancel();throw Error('Invalid response');
  }
  const reader=response.body?.getReader();if(!reader)throw Error('Missing body');
  const chunks=[];let size=0;
  try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;
   if(size>32768){await reader.cancel();throw Error('Too large');}chunks.push(value);}}
  finally{reader.releaseLock();}
  const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(data?.service!=='master7-integration-gateway'||data.scope!=='configuration_only'||typeof data.liveReady!=='boolean')throw Error('Wrong service');
  const payment=data.vpay?.channels?.payment,withdrawal=data.vpay?.channels?.withdrawal;
  // Project known booleans only. Never echo supplier errors, URLs or credentials.
  return {reachable:true,productionAcceptanceVerified:false,
   reportedLiveReady:data.liveReady,paymentEnabled:payment?.enabled===true,
   paymentRoutingConfigured:payment?.callbackForwardingConfigured===true,
   withdrawalEnabled:withdrawal?.enabled===true,withdrawalRoutingConfigured:withdrawal?.callbackForwardingConfigured===true};
 }catch{return {reachable:false,productionAcceptanceVerified:false,error:'GATEWAY_READINESS_UNAVAILABLE'};}
}

export function createCloudReadinessHandler({env=process.env}={}){
 return ({user,method='GET'}={})=>{
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  if(!user)return Response.json({error:'AUTHENTICATION_REQUIRED'},{status:401,headers});
  if(user.role!=='owner')return Response.json({error:'OWNER_REQUIRED'},{status:403,headers});
  if(method!=='GET')return Response.json({error:'METHOD_NOT_ALLOWED'},{status:405,headers:{...headers,Allow:'GET'}});
  return Response.json(cloudReadiness(env),{headers});
 };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const {values}=parseArgs({options:{live:{type:'boolean',default:false}},strict:true});
  const report=cloudReadiness();if(values.live)report.gateway=await readGatewayReadiness();
  console.log(JSON.stringify(report,null,2));
  if(!report.stagingConfigurationReady||(values.live&&!report.gateway.reachable))process.exitCode=1;
 }catch{console.error('Use npm run check:cloud -- [--live]. No database or provider transaction is performed.');process.exitCode=2;}
}
