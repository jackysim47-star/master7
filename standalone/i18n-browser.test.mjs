import {chromium} from 'playwright';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
import assert from 'node:assert/strict';
const dir=mkdtempSync(join(tmpdir(),'master7-i18n-')),probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
const base='http://127.0.0.1:'+port,env={...process.env};for(const key of Object.keys(env))if(/^(RENDER|RAILWAY_|PORTAL_|PUBLIC_ORIGIN)/.test(key))delete env[key];Object.assign(env,{NODE_ENV:'test',PORT:String(port),HOST:'127.0.0.1',PUBLIC_ORIGIN:base,PORTAL_DATABASE:join(dir,'fixture.sqlite')});
const password='Synthetic-browser-password-82713';const setup=spawnSync(process.execPath,['standalone/admin.mjs','create-owner','browserowner','browser@example.test'],{env,input:password+'\n',encoding:'utf8'});assert.equal(setup.status,0);
let server,browser;
try{
 server=spawn(process.execPath,['standalone/server.mjs'],{env,stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server timeout')),12000);server.stdout.on('data',chunk=>{if(String(chunk).includes('MASTER7 listening')){clearTimeout(timer);resolve();}});server.on('exit',()=>reject(Error('Server exited')));});
 browser=await chromium.launch({executablePath:process.env.MASTER7_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
 const context=await browser.newContext(),page=await context.newPage(),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 // Each request carries its own preference, including simultaneous visitors.
 await Promise.all(['en','ms','zh-CN'].map(async lang=>{const response=await context.request.get(base+'/signin?lang='+lang);assert.equal(response.headers()['content-language'],lang);assert((await response.text()).includes('lang="'+lang+'"'));}));
 for(const [lang,label]of [['en','Sign in to MASTER7'],['ms','Log masuk ke MASTER7'],['zh-CN','登录 MASTER7']]){
  for(const route of ['/','/signin','/register','/reset']){await page.goto(base+route+'?lang='+lang);assert.equal(await page.locator('html').getAttribute('lang'),lang);if(route==='/signin')await page.getByRole('heading',{name:label,exact:true}).waitFor();}
 }
 await page.goto(base+'/signin?lang=en');await page.locator('[name=username]').fill('browserowner');await page.locator('[name=password]').fill('Incorrect-password-123');await page.locator('form button').click();await page.getByRole('alert').filter({hasText:'Incorrect account or password'}).waitFor();
 await page.locator('[name=username]').fill('browserowner');await page.locator('[name=password]').fill(password);await page.locator('form button').click();await page.waitForURL(base+'/admin');await page.getByRole('heading',{name:'Administration centre',exact:true}).waitFor();
 await page.waitForFunction(()=>document.documentElement.dataset.platformCountry==='MY'&&document.documentElement.dataset.currency==='MYR'&&document.documentElement.dataset.timeZone==='Asia/Kuching'&&document.documentElement.dataset.visitorCountry==='unknown');
 const mutate=async body=>{const response=await context.request.post(base+'/api/portal',{headers:{Origin:base,'X-Portal-Request':'1'},data:body});assert(response.ok(),await response.text());return response.json();};
 const fixture=(await context.request.get(base+'/api/portal')).json();const data=await fixture;
 await mutate({action:'save-notice',title:'会员管理',body:'登录 银行转账 这里是原始公告',published:true});
 await mutate({action:'create-ticket',subject:'账号安全',body:'用户原文：会员管理'});
 const switcher=page.getByRole('combobox',{name:'Language / Bahasa / 语言'});
 for(const width of [390,1440])for(const lang of ['en','ms','zh-CN']){
  await page.setViewportSize({width,height:950});await switcher.selectOption(lang);assert.equal(await page.locator('html').getAttribute('lang'),lang);
  const titles={en:['Administration centre','Announcements','Support requests','Brand settings','Audit log','Free game catalogue','Finance','Financial records'],ms:['Pusat pentadbiran','Pengumuman','Permintaan sokongan','Tetapan jenama','Log audit','Katalog permainan percuma','Kewangan','Rekod kewangan'],'zh-CN':['新版管理中心','公告管理','客服申请','品牌设置','操作审计','免费游戏目录','财务管理','资金记录']};
  for(const [index,section] of ['overview','notices','requests','brand','audit','games','finance','records'].entries()){
   await page.goto(base+'/admin?section='+section);await page.getByRole('heading',{name:titles[lang][index],exact:true,level:1}).waitFor();assert.equal(await page.locator('html').getAttribute('lang'),lang);
   await page.waitForTimeout(150);
   if(section==='notices')assert((await page.locator('.content').innerText()).includes('登录 银行转账 这里是原始公告'));
   const overflow=await page.evaluate(()=>({page:document.documentElement.scrollWidth>document.documentElement.clientWidth,
    elements:[...document.querySelectorAll('body *')].map(element=>({tag:element.tagName,className:typeof element.className==='string'?element.className:'',text:(element.innerText||'').slice(0,70),right:Math.round(element.getBoundingClientRect().right),width:Math.round(element.getBoundingClientRect().width)})).filter(element=>element.right>document.documentElement.clientWidth+1).slice(0,8),
    ancestors:(()=>{let e=document.querySelector('.sponsor-tabs'),a=[];while(e){let r=e.getBoundingClientRect();a.push({tag:e.tagName,className:typeof e.className==='string'?e.className:'',left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),clientWidth:e.clientWidth,scrollWidth:e.scrollWidth,grid:getComputedStyle(e).gridTemplateColumns});e=e.parentElement;}return a;})(),buttons:[...document.querySelectorAll('.sponsor-tabs>button')].map(e=>({width:e.getBoundingClientRect().width,scrollWidth:e.scrollWidth,grid:getComputedStyle(e).gridTemplateColumns,minWidth:getComputedStyle(e).minWidth}))}));
   assert(!overflow.page,lang+' '+section+' overflow at '+width+' '+JSON.stringify({elements:overflow.elements,ancestors:overflow.ancestors}));
  }
  for(const route of ['/account','/accounts','/connections','/deployment-readiness']){await page.goto(base+route);assert.equal(await page.locator('html').getAttribute('lang'),lang);assert.equal((await page.locator('h1').count()),1);}
  console.log('PASS language '+lang+' at '+width+'px: portal navigation, protected pages, persistence, content preservation, no overflow');
  await page.goto(base+'/admin');await page.locator('.page-heading h1').waitFor();
 }
 await switcher.selectOption('en');await page.goto(base+'/admin?section=requests');await page.getByRole('button',{name:'View',exact:true}).first().click();const status=page.locator('select[name=status]');assert.deepEqual(await status.locator('option').evaluateAll(nodes=>nodes.map(n=>n.value)),['待处理','处理中','已完成']);await status.selectOption('处理中');await page.locator('textarea[name=reply]').fill('会员管理');await switcher.selectOption('ms');assert.equal(await page.locator('textarea[name=reply]').inputValue(),'会员管理');await page.getByRole('button',{name:'Simpan balasan',exact:true}).click();
 const tickets=await(await context.request.get(base+'/api/portal')).json();assert.equal(tickets.tickets[0].status,'处理中');assert.equal(tickets.tickets[0].reply,'会员管理');
 // Brand fallback must not overwrite an explicit visitor preference.
 await mutate({action:'save-brand',...data.brand,language:'ms'});await context.clearCookies({name:'master7_locale'});await page.goto(base+'/admin');await page.waitForFunction(()=>document.documentElement.lang==='ms');await switcher.selectOption('en');await page.reload();await page.waitForFunction(()=>document.documentElement.lang==='en');
 const member=await browser.newContext();const memberPage=await member.newPage();await memberPage.goto(base+'/signin?lang=ms');assert.equal((await member.request.get(base+'/api/v1/deployment-readiness')).status(),401);await member.close();
 assert.deepEqual(errors,[]);
 const artifacts=process.env.MASTER7_BROWSER_ARTIFACTS;if(artifacts){mkdirSync(artifacts,{recursive:true});for(const [lang,width]of [['en',1440],['ms',390]]){await page.goto(base+'/admin');await switcher.selectOption(lang);await page.setViewportSize({width,height:950});await page.waitForTimeout(400);await page.screenshot({path:join(artifacts,'i18n-'+lang+'-'+width+'.png'),fullPage:true});}}
 console.log('PASS translated login error, canonical ticket status, draft preservation, brand fallback, explicit preference, unauthorised review blocked, no browser errors');
 await context.close();
}finally{await browser?.close();if(server&&!server.killed){await new Promise(resolve=>{server.once('exit',resolve);server.kill('SIGTERM');});}rmSync(dir,{recursive:true,force:true});}
