import test from 'node:test';
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
 assert.match(portal,/href="\/uat-preview"/);
 assert.match(portal,/>READ-ONLY UAT</);
});
