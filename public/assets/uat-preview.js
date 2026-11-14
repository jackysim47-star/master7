(()=>{
 const $=id=>document.getElementById(id);
 const state=(id,value,label)=>{const element=$(id);if(!element)return;element.dataset.state=value;const target=element.querySelector('strong')||element.querySelector('em');if(target)target.textContent=label;};
 const json=async path=>{const response=await fetch(path,{method:'GET',cache:'no-store',headers:{Accept:'application/json'}});if(!response.ok)throw new Error(`${path}:${response.status}`);return response.json();};
 const friendlyReason=value=>({deposit_configuration_incomplete:'等待厂家新 UAT 配置',profile_credentials_incomplete:'等待厂家轮换凭据',catalogue_not_ready:'等待官方游戏目录',adapter_unimplemented:'等待钱包适配器'}[value]||'等待完整 UAT 证据');
 const paymentNames={vpay:'VPay MYR',gspay:'GSPAY MYR','1mpay':'1MPay MYR'};
 const gameNames={megah5_myr:'MegaH5 · MYR',jdb_myr:'JDB · MYR',jili_myr_1to1:'JILI · MYR 1:1'};
 const card=(name,ready,detail)=>`<article data-state="${ready?'pass':'blocked'}"><span>${ready?'PASS':'BLOCKED'}</span><strong>${name}</strong><small>${detail}</small></article>`;

 async function load(){
  const results=await Promise.allSettled([json('/health'),json('/api/payment-channels'),json('/api/games')]);
  const health=results[0].status==='fulfilled'?results[0].value:null;
  const payments=results[1].status==='fulfilled'&&Array.isArray(results[1].value?.items)?results[1].value.items.filter(item=>Object.hasOwn(paymentNames,item.provider_id)):[];
  const profiles=results[2].status==='fulfilled'&&Array.isArray(results[2].value?.profiles)?results[2].value.profiles:[];
  const coreReady=health?.status==='ok'&&health?.database==='ready';
  const otpReady=health?.smsOtpReady===true;
  const paymentReady=payments.filter(item=>item.enabled===true&&item.liveReady===true&&item.realPaymentVerified===true&&item.settlementVerified===true);
  const gameReady=profiles.filter(item=>item.enabled===true&&item.launchReady===true&&item.walletReady===true&&item.settlementVerified===true);
  const productionReady=health?.productionReady===true&&paymentReady.length>0&&gameReady.length>0&&otpReady;

  state('coreStatus',coreReady?'pass':'blocked',coreReady?'运行正常':'读取失败');
  state('otpStatus',otpReady?'pass':'blocked',otpReady?'已配置':'尚未就绪');
  state('paymentStatus',paymentReady.length===3?'pass':'blocked',`${paymentReady.length}/3 通过`);
  state('gameStatus',gameReady.length===profiles.length&&profiles.length>0?'pass':'blocked',`${gameReady.length}/${profiles.length||43} 通过`);
  state('flowDeposit',paymentReady.length>0&&health?.newDepositsEnabled===true?'pass':'blocked',paymentReady.length>0&&health?.newDepositsEnabled===true?'可用':'保持关闭');
  state('flowWallet',paymentReady.length>0&&health?.settlementVerified===true?'pass':'blocked',paymentReady.length>0&&health?.settlementVerified===true?'已验收':'等待入账验收');
  state('flowGame',gameReady.length>0&&health?.newGameLaunchesEnabled===true?'pass':'blocked',gameReady.length>0&&health?.newGameLaunchesEnabled===true?'可启动':'保持关闭');
  state('flowPayout',health?.payoutsEnabled===true&&health?.newPayoutsEnabled===true?'pass':'blocked',health?.payoutsEnabled===true&&health?.newPayoutsEnabled===true?'可用':'保持关闭');

  const verdict=$('overallVerdict');
  verdict.dataset.state=productionReady?'pass':'blocked';
  verdict.querySelector('strong').textContent=productionReady?'生产门槛已满足':'UAT 预览 · 暂不可收真钱';
  verdict.querySelector('small').textContent=productionReady?'PRODUCTION REVIEW':'PRODUCTION NO-GO';

  $('paymentCount').textContent=`${paymentReady.length}/3 PASS`;
  $('paymentCards').innerHTML=payments.length?payments.map(item=>card(paymentNames[item.provider_id],paymentReady.includes(item),paymentReady.includes(item)?'建单、回调、查单、入账与结算已验收':friendlyReason(item.reason))).join(''):'<p class="loading-copy error">支付状态暂时无法读取。</p>';
  const firstProfiles=Object.keys(gameNames).map(id=>profiles.find(item=>item.profileId===id)).filter(Boolean);
  $('gameCount').textContent=`${gameReady.length}/${profiles.length||43} PASS`;
  $('gameCards').innerHTML=firstProfiles.length?firstProfiles.map(item=>card(gameNames[item.profileId],gameReady.includes(item),gameReady.includes(item)?'启动、钱包、恢复与结算已验收':friendlyReason(item.capabilityReason))).join(''):'<p class="loading-copy error">游戏状态暂时无法读取。</p>';
  $('checkedAt').textContent=`只读检查时间：${new Intl.DateTimeFormat('zh-CN',{dateStyle:'medium',timeStyle:'medium',timeZone:'Asia/Kuching'}).format(new Date())} MYT`;
 }
 load().catch(()=>{
  for(const id of ['coreStatus','otpStatus','paymentStatus','gameStatus','flowDeposit','flowWallet','flowGame','flowPayout'])state(id,'blocked','状态无法确认');
  $('overallVerdict').dataset.state='blocked';$('overallVerdict').querySelector('strong').textContent='状态无法确认 · 不可收真钱';$('overallVerdict').querySelector('small').textContent='PRODUCTION NO-GO';
  $('checkedAt').textContent='只读状态读取失败，请稍后刷新。';
 });
})();
