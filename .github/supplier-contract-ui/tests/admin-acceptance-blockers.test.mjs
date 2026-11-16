import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const source=read('public/assets/acceptance-blockers.js');
const acceptanceStyle=read('public/assets/acceptance-blockers.css');
const adminApp=read('public/assets/app.js');
const adminStyle=read('public/assets/style.css');
const context=vm.createContext({console,setTimeout,clearTimeout});
vm.runInContext(source,context);
const matrix=context.Master7AcceptanceBlockers;
const plain=value=>JSON.parse(JSON.stringify(value));

class FakeElement {
  constructor(tag='div'){this.tagName=String(tag).toUpperCase();this.children=[];this.attributes={};this.dataset={};this.className='';this._text='';this.open=false;}
  set textContent(value){this._text=String(value??'');this.children=[];}
  get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this._text='';this.children=[...children];}
  setAttribute(name,value){this.attributes[name]=String(value);if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=String(value);}
}
const walk=(node,result=[])=>{for(const child of node.children||[]){result.push(child);walk(child,result);}return result;};

test('owner and staff blocker matrix is wired into the canonical game health panel without exposing secrets',()=>{
  const portal=read('app/portal.html'),worker=read('public/service-worker.js');
  assert.match(portal,/id="gameSyncPanel"[\s\S]*id="acceptanceBlockerMatrix"/);
  assert.match(portal,/id="paymentChannelManager"[\s\S]*id="paymentAcceptanceBlockerMatrix"/);
  assert.match(portal,/\/assets\/acceptance-blockers\.css\?v=/);
  assert.match(portal,/\/assets\/acceptance-blockers\.js\?v=/);
  assert.match(worker,/\/assets\/acceptance-blockers\.css/);
  assert.match(worker,/\/assets\/acceptance-blockers\.js/);
  assert.match(source,/\/api\/admin\/game-acceptance\?environment=production&limit=0/);
  assert.doesNotMatch(source,/innerHTML|secretKey|apiKey|password|authorization/i);
});

test('mobile acceptance DOM uses labelled cards, keeps payments first, and highlights zero real-money acceptance',()=>{
  context.document={createElement:tag=>new FakeElement(tag)};
  context.matchMedia=()=>({matches:true});
  const host=new FakeElement('div');
  const result=matrix.render(host,{directory:{profiles:[{profileId:'sample_myr',providerId:'sample',displayName:'Sample',implemented:false}],providers:[{id:'sample'}]},acceptance:{profiles:[]},channels:{items:[]},statuses:{},controls:{items:[]}},'en');
  assert.equal(result.gameRows.length,1);assert.equal(result.paymentRows.length,5);
  const details=host.children.filter(child=>child.tagName==='DETAILS');
  assert.match(details[0].className,/acceptance-payments-section/);assert.equal(details[0].open,true);
  assert.match(details[1].className,/acceptance-games-section/);assert.equal(details[1].open,false);
  const all=walk(host),summary=all.find(node=>node.className==='acceptance-summary'),live=all.find(node=>/acceptance-summary-live/.test(node.className));
  assert.equal(summary.dataset.realMoneyAccepted,'0');assert.match(live.className,/is-zero/);assert.match(live.textContent,/Real-money acceptance: 0/);
  const cards=all.filter(node=>node.tagName==='TABLE'&&node.dataset.mobileLayout==='cards');assert.equal(cards.length,2);
  const labelledCells=all.filter(node=>node.tagName==='TD'&&node.attributes['data-label']);assert.ok(labelledCells.length>=10);assert.ok(labelledCells.some(cell=>cell.attributes['data-label']==='Wallet credit'));
});

test('mobile CSS stacks acceptance, provider checks and gateway checks while desktop tables remain defined',()=>{
  assert.match(acceptanceStyle,/@media\(max-width:640px\)[\s\S]*\.acceptance-matrix-table tbody tr\{display:grid/);
  assert.match(acceptanceStyle,/content:attr\(data-label\)/);
  assert.match(acceptanceStyle,/\.acceptance-matrix-table\{width:100%;min-width:1340px/);
  assert.match(acceptanceStyle,/\.contract-diagnostic-fields\{display:block;max-height:120px/);
  assert.match(acceptanceStyle,/@media\(max-width:640px\)[\s\S]*\.contract-diagnostic-fields\{max-height:180px;font-size:10px/);
  assert.match(adminStyle,/@media\(max-width:640px\)[\s\S]*\.game-sync-table tbody tr\{display:grid/);
  assert.match(adminStyle,/@media\(max-width:640px\)[\s\S]*\.gateway-check-table tbody tr\{display:grid/);
  assert.match(adminApp,/table\.dataset\.mobileLayout="cards"/);
  assert.match(adminApp,/cell\.setAttribute\("data-label",label\)/);
});

test('game rows preserve independent profiles and never turn readiness into verified acceptance',()=>{
  const rows=plain(matrix.buildGameRows({
    providers:[
      {id:'jili',connectionVerified:true,catalogueSynced:true,stale:false,cachedGameCount:297},
      {id:'megah5',connectionVerified:true,catalogueSynced:true,stale:false,count:92},
      {id:'fuma',connectionVerified:false,catalogueSynced:false,stale:true,count:4},
    ],
    profiles:[
      {profileId:'jili_myr_1to1',providerId:'jili',displayName:'JILI 1:1',implemented:false,capabilityReason:'adapter_unimplemented',launchVerified:false,walletVerified:false,settlementVerified:false,recoveryReady:false},
      {profileId:'jili_my1_1to100',providerId:'jili',displayName:'JILI 1:100',implemented:false,capabilityReason:'adapter_unimplemented',launchVerified:false,walletVerified:false,settlementVerified:false,recoveryReady:false,unitScale:100},
      {profileId:'megah5_myr',providerId:'megah5',displayName:'MegaH5',implemented:true,launchReady:true,walletReady:true,recoveryReady:true,launchVerified:false,walletVerified:false,settlementVerified:false},
      {profileId:'fuma_myr',providerId:'fuma',displayName:'FUMA',implemented:false,capabilityReason:'contract_missing'},
    ],
  }));
  assert.deepEqual(rows.map(row=>row.profileId),['jili_myr_1to1','jili_my1_1to100','megah5_myr','fuma_myr']);
  assert.equal(rows[0].contract,'incomplete');
  assert.equal(rows[1].unitScale,100);
  assert.equal(rows[2].catalogueCount,92);
  assert.equal(rows[2].launch,'available');
  assert.equal(rows[2].wallet,'available');
  assert.equal(rows[2].settlement,'pending');
  assert.equal(rows[2].recovery,'available');
  assert.equal(rows[2].fullyVerified,false);
  assert.equal(rows[2].blocker,'catalogue_acceptance_pending');
  assert.equal(rows[3].contract,'missing');
  assert.equal(rows[3].blocker,'contract_missing');
});

test('only durable acceptance evidence plus runtime capability produces a green end-to-end row',()=>{
  const directory={providers:[{id:'verified',connectionVerified:true,catalogueSynced:true,stale:false,count:1}],profiles:[{profileId:'verified_myr',providerId:'verified',implemented:true,launchReady:true,walletReady:true,recoveryReady:true,launchVerified:true,walletVerified:true,settlementVerified:true,recoveryVerified:true}]};
  const [withoutEvidence]=plain(matrix.buildGameRows(directory));
  assert.equal(withoutEvidence.launch,'available');
  assert.equal(withoutEvidence.settlement,'pending');
  assert.equal(withoutEvidence.fullyVerified,false);
  const acceptance={profiles:[{profileId:'verified_myr',capabilities:{catalogue:{passed:true},launch:{passed:true},wallet:{passed:true},settlement:{passed:true},recovery:{passed:true}}}]};
  const [row]=plain(matrix.buildGameRows(directory,acceptance));
  assert.equal(row.launch,'verified');
  assert.equal(row.wallet,'verified');
  assert.equal(row.settlement,'verified');
  assert.equal(row.recovery,'verified');
  assert.equal(row.fullyVerified,true);
  assert.equal(row.blocker,'');
});

test('verification flags cannot produce a complete row without an implemented adapter and current catalogue',()=>{
  const rows=plain(matrix.buildGameRows({providers:[{id:'stale',connectionVerified:true,catalogueSynced:true,stale:true,count:8},{id:'missing',connectionVerified:true,catalogueSynced:true,stale:false,count:8}],profiles:[
    {profileId:'stale_myr',providerId:'stale',implemented:true,launchVerified:true,walletVerified:true,settlementVerified:true,recoveryVerified:true},
    {profileId:'missing_myr',providerId:'missing',implemented:false,capabilityReason:'adapter_unimplemented',launchVerified:true,walletVerified:true,settlementVerified:true,recoveryVerified:true},
  ]}));
  assert.equal(rows[0].fullyVerified,false);
  assert.equal(rows[0].blocker,'catalogue_stale');
  assert.equal(rows[1].fullyVerified,false);
  assert.equal(rows[1].blocker,'contract_incomplete');
});

test('durable registry adapter status overrides a stale public implementation claim',()=>{
  const directory={providers:[{id:'provider',connectionVerified:true,catalogueSynced:true,stale:false,count:4}],profiles:[{profileId:'provider_myr',providerId:'provider',implemented:true,launchReady:true,walletReady:true,recoveryReady:true}]};
  const acceptance={profiles:[{profileId:'provider_myr',implemented:false,adapterStatus:'adapter_unimplemented',capabilities:{catalogue:{passed:true},launch:{passed:true},wallet:{passed:true},settlement:{passed:true},recovery:{passed:true}}}]};
  const [row]=plain(matrix.buildGameRows(directory,acceptance));
  assert.equal(row.adapter,'adapter_unimplemented');
  assert.equal(row.contract,'incomplete');
  assert.equal(row.fullyVerified,false);
  assert.equal(row.blocker,'contract_incomplete');
});

test('owner matrix exposes only safe exact supplier contract gaps from the authenticated acceptance API',()=>{
  const directory={providers:[{id:'epicwin',connectionVerified:false,catalogueSynced:false}],profiles:[
    {profileId:'epicwin_normal_myr',providerId:'epicwin',displayName:'EPICWIN Normal',implemented:false,capabilityReason:'adapter_unimplemented'},
  ]};
  const acceptance={profiles:[{profileId:'epicwin_normal_myr',implemented:false,adapterStatus:'adapter_unimplemented',contractStatus:'missing',contractDiagnostic:{
    manifestComplete:false,documentationOnly:true,
    missingVendorFields:['document.document_id','authentication.signature_algorithm','bad field containing secret=value'],
    invalidVendorFields:[{field:'profile.conversion_ratio',reason:'unexpected_value'},{field:'unsafe field',reason:'leaked=value'}],
  }}]};
  const [row]=plain(matrix.buildGameRows(directory,acceptance));
  assert.deepEqual(row.contractDiagnostic.missingFields,['document.document_id','authentication.signature_algorithm']);
  assert.deepEqual(row.contractDiagnostic.invalidFields,[{field:'profile.conversion_ratio',reason:'unexpected_value'}]);
  assert.equal(row.contractDiagnostic.documentationOnly,true);
  assert.equal(row.contractDiagnostic.manifestComplete,false);

  context.document={createElement:tag=>new FakeElement(tag)};
  context.matchMedia=()=>({matches:false});
  const host=new FakeElement('div');matrix.render(host,{directory,acceptance,channels:{items:[]},statuses:{},controls:{items:[]}},'en');
  const all=walk(host),detail=all.find(node=>/contract-diagnostic/.test(node.className)),summary=all.find(node=>/contract-diagnostic-summary/.test(node.className));
  assert.ok(detail);assert.match(summary.textContent,/2 missing contract fields/);
  assert.match(detail.textContent,/document\.document_id/);assert.match(detail.textContent,/authentication\.signature_algorithm/);assert.match(detail.textContent,/profile\.conversion_ratio/);
  assert.doesNotMatch(detail.textContent,/secret=value|leaked=value|unsafe field/);
});

test('payment rows keep configured capability separate from order callback recovery wallet credit and live acceptance',()=>{
  const rows=plain(matrix.buildPaymentRows({items:[
    {provider_id:'vpay',capabilities:{deposit:{implemented:true,configured:true,enabled:true,blockers:[]}}},
    {provider_id:'gspay_usdt',capabilities:{deposit:{implemented:false,configured:false,enabled:false,blockers:['usdt_deposit_contract_not_verified']}}},
  ]},{
    vpay:{orderReady:true,queryReady:true,callbacksReady:true,realPayments:true,settlementVerified:false,liveReady:false,capabilities:{deposit:{implemented:true,configured:true,enabled:true,blockers:[]}}},
    gspay_usdt:{orderReady:false,queryReady:false,callbacksReady:false,realPayments:false,settlementVerified:false,liveReady:false,capabilities:{deposit:{implemented:false,configured:false,enabled:false,blockers:['usdt_deposit_contract_not_verified']}}},
  },{items:[{providerId:'vpay',mode:'auto'},{providerId:'gspay',mode:'auto'},{providerId:'1mpay',mode:'paused'},{providerId:'manual_bank',mode:'auto'}]}));
  const vpay=rows.find(row=>row.id==='vpay'),usdt=rows.find(row=>row.id==='gspay_usdt'),manual=rows.find(row=>row.id==='manual_bank');
  assert.equal(vpay.contract,'configured');
  assert.equal(vpay.order,'available');
  assert.equal(vpay.callback,'available');
  assert.equal(vpay.query,'available');
  assert.equal(vpay.credit,'pending');
  assert.equal(vpay.live,'pending');
  assert.equal(vpay.fullyVerified,false);
  assert.equal(usdt.adapter,'blocked');
  assert.equal(usdt.order,'blocked');
  assert.equal(usdt.fullyVerified,false);
  assert.equal(manual.order,'available');
  assert.equal(manual.credit,'pending');
  assert.equal(manual.fullyVerified,false);
});

test('unknown provider blocker text is restricted to safe machine codes',()=>{
  const [row]=plain(matrix.buildPaymentRows({items:[{provider_id:'vpay',capabilities:{deposit:{implemented:true,configured:true,enabled:false,blockers:['bad code containing a secret=value']}}}]},{vpay:{capabilities:{deposit:{implemented:true,configured:true,enabled:false,blockers:['bad code containing a secret=value']}}}},{items:[]}));
  assert.equal(row.blockers.includes('bad code containing a secret=value'),false);
  assert.ok(row.blockers.length>0);
  assert.ok(row.blockers.every(code=>/^[a-z0-9_.:-]{1,100}$/i.test(code)));
});

test('payment live-ready configuration never becomes real-money accepted without explicit payment evidence',()=>{
  const base={orderReady:true,queryReady:true,callbacksReady:true,realPayments:true,liveReady:true,settlementVerified:true,capabilities:{deposit:{implemented:true,configured:true,enabled:true,blockers:[]}}};
  const [withoutEvidence]=plain(matrix.buildPaymentRows({items:[]},{vpay:base},{items:[]}));
  assert.equal(withoutEvidence.live,'pending');
  assert.equal(withoutEvidence.fullyVerified,false);
  const [withEvidence]=plain(matrix.buildPaymentRows({items:[]},{vpay:{...base,realPaymentVerified:true}},{items:[]}));
  assert.equal(withEvidence.live,'verified');
  assert.equal(withEvidence.fullyVerified,true);
});

