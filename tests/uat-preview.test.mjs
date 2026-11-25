import test from 'node:test';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {UAT_PREVIEW_ENDPOINTS,UAT_PREVIEW_RELEASE,uatPreviewHtml} from '../lib/uat-preview.ts';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const route=read('app/uat-preview/route.ts');
const client=read('public/assets/uat-preview.js');
const portal=read('app/portal.html');

test('UAT preview is a no-index read-only platform status page',()=>{
 const html=uatPreviewHtml();
 assert.match(html,/noindex,nofollow,noarchive/);
 assert.match(html,/UAT · READ-ONLY PREVIEW/);
 assert.match(html,/不会创建充值订单、移动钱包余额、启动游戏、下注或提款/);
 for(const id of ['overallVerdict','coreStatus','otpStatus','paymentStatus','gameStatus','paymentCards','gameCards'])assert.match(html,new RegExp(`id="${id}"`));
 assert.match(html,new RegExp(`/assets/uat-preview\\.js\\?v=${UAT_PREVIEW_RELEASE.replaceAll('.','\\.')}`));
 assert.match(html,new RegExp(`/assets/uat-preview\\.css\\?v=${UAT_PREVIEW_RELEASE.replaceAll('.','\\.')}`));
});

test('UAT preview reads only the three public status endpoints',()=>{
 assert.deepEqual([...UAT_PREVIEW_ENDPOINTS],['/health','/api/payment-channels','/api/games']);
 for(const endpoint of UAT_PREVIEW_ENDPOINTS)assert.match(client,new RegExp(`json\\('${endpoint.replaceAll('/','\\/')}'\\)`));
 assert.match(client,/method:'GET'/);
 assert.doesNotMatch(client,/method\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i);
 assert.doesNotMatch(client,/\/api\/(?:game-launch|withdrawals|payments\/[^/]+\/orders)/);
});

test('UAT preview route blocks forms and exposes only GET and HEAD',()=>{
 assert.match(route,/form-action 'none'/);
 assert.match(route,/X-Robots-Tag':'noindex, nofollow, noarchive'/);
 assert.match(route,/Cache-Control':'no-store'/);
 assert.match(route,/export function GET\(\)/);
 assert.match(route,/export function HEAD\(\)/);
 assert.doesNotMatch(route,/export function (?:POST|PUT|PATCH|DELETE)\(/);
});

test('member sign-in links to the read-only UAT preview',()=>{
 const link=portal.match(/<a\b[^>]*\bhref="([^"]+)"[^>]*>(?:(?!<\/a>)[\s\S])*?READ-ONLY UAT/);
 assert.ok(link);
 const staging='https://master7-v17-staging.onrender.com';
 assert.equal(new URL(link[1],staging).href,staging+'/uat-preview');
 assert.match(portal,/>READ-ONLY UAT</);
});

test('the UAT preview preserves each step name and distinguishes enabled orders from acceptance',async()=>{
 const html=uatPreviewHtml();
 const steps=['flowDeposit','flowWallet','flowGame','flowPayout'];
 const nodes=new Map();
 function element(id){
  if(nodes.has(id))return nodes.get(id);
  const match=html.match(new RegExp('<li id="'+id+'"[^>]*>[\\s\\S]*?<strong>([^<]+)</strong>[\\s\\S]*?<em>([^<]+)</em></li>'));
  const fields={strong:{textContent:match?.[1]??''},small:{}};
  if(match)fields.em={textContent:match[2]};
  const node={fields,dataset:{},querySelector:key=>fields[key]??null};
  nodes.set(id,node);
  return node;
 }
 const labels=steps.map(id=>element(id).fields.strong.textContent);
 assert.deepEqual(labels,['MYR 充值','主钱包入账','游戏下注与派彩','顾客提款']);
 const finished=Promise.withResolvers();
 Object.defineProperty(element('checkedAt'),'textContent',{set:finished.resolve});
 const responses={
  '/health':{status:'ok',database:'ready',newDepositsEnabled:true,realPayments:true},
  '/api/payment-channels':{items:[{provider_id:'1mpay',enabled:true,liveReady:false}]},
  '/api/games':{profiles:[]},
 };
 runInNewContext(client,{
  document:{getElementById:element},
  fetch:async path=>({ok:true,json:async()=>responses[path]}),
 });
 await finished.promise;
 assert.deepEqual(steps.map(id=>element(id).fields.strong.textContent),labels);
 assert.deepEqual(steps.map(id=>element(id).fields.em.textContent),['建单开关已开 · 未验收','等待入账验收','保持关闭','保持关闭']);
 assert.equal(element('paymentStatus').fields.strong.textContent,'0/3 通过');
 assert.equal(element('flowDeposit').dataset.state,'blocked');
 assert.match(element('paymentCards').innerHTML,/可能涉及真钱，尚未验收/);
});
