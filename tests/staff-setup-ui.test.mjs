import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const app=read('public/assets/app.js'),portal=read('app/portal.html'),route=read('app/staff-setup/route.ts');
const definitions=app.slice(0,app.indexOf('(async function start(){'));

function evaluate(hash='',pathname='/staff-setup'){
 const historyCalls=[];
 const context=vm.createContext({
  console,URL,URLSearchParams,Date,setTimeout,clearTimeout,crypto:globalThis.crypto,TextEncoder,TextDecoder,
  location:{hash,pathname,search:'',origin:'https://portal.example.test'},
  history:{replaceState(...args){historyCalls.push(args);}},
  localStorage:{getItem(){return null;},setItem(){}},navigator:{},
  document:{getElementById(){return null;},querySelectorAll(){return [];},querySelector(){return null;},createElement(){return {};},addEventListener(){},body:{classList:{toggle(){},add(){},remove(){}}},visibilityState:'visible'},
  window:{addEventListener(){}}
 });
 vm.runInContext(definitions,context);
 return {context,historyCalls,setup:JSON.parse(vm.runInContext('JSON.stringify(state.staffSetup)',context))};
}

function fragment(userId,code){return '#staff-setup='+encodeURIComponent(new URLSearchParams({userId,code}).toString());}

test('staff setup secret is consumed from the fragment and removed before portal startup',()=>{
 const code='A'.repeat(43),result=evaluate(fragment('local:member-1',code));
 assert.deepEqual(result.setup,{userId:'local:member-1',code,username:''});
 assert.deepEqual(result.historyCalls,[[null,'','/signin']]);
 assert.ok(app.indexOf('const initialStaffSetup=consumeStaffSetupFragment()')<app.indexOf('const state ='));
 assert.ok(app.indexOf('const initialStaffSetup=consumeStaffSetupFragment()')<app.indexOf('configureAdvertisingPixels'));
});

test('malformed setup fragments are cleared without retaining a credential',()=>{
 for(const hash of ['#staff-setup=broken','#staff-setup='+encodeURIComponent('userId=x&code=short')]){
  const result=evaluate(hash);assert.equal(result.setup,null);assert.deepEqual(result.historyCalls,[[null,'','/signin']]);
 }
 const ordinary=evaluate('#section=games','/admin');assert.equal(ordinary.setup,null);assert.deepEqual(ordinary.historyCalls,[]);
 const wrongPath=evaluate(fragment('local:member-1','A'.repeat(43)),'/signin');assert.equal(wrongPath.setup,null);assert.deepEqual(wrongPath.historyCalls,[[null,'','/signin']]);
});

test('staff setup UI submits only the in-memory one-time credential and supports owner reissue',()=>{
 for(const id of ['staffSetupLinkDialog','staffSetupLink','copyStaffSetupLink','dismissStaffSetupLink'])assert.match(portal,new RegExp(`id="${id}"`));
 assert.match(app,/api\("\/api\/auth\/setup-staff","POST",\{userId:setup\.userId,code:setup\.code,username,password:pass\}\)/);
 assert.match(app,/state\.staffSetup=null;activationToSignIn/);
 assert.match(app,/changeMemberRole\(x\.id,"staff"\)/);
 assert.match(app,/resetStaffPassword/);
 assert.ok(app.includes('url.origin!==location.origin||url.pathname!=="/staff-setup"||url.search'));
 assert.doesNotMatch(app,/localStorage\.setItem\([^\n]*staffSetup|sessionStorage[^\n]*staffSetup/);
});

test('staff setup has an explicit Vinext route with GET and HEAD handlers',()=>{
 assert.match(route,/export\s*\{\s*GET\s*,\s*HEAD\s*,\s*dynamic\s*\}\s*from\s*['"]\.\.\/route['"]/);
});
