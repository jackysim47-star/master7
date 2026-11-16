(function installAcceptanceBlockers(scope){
  'use strict';

  const PAYMENT_PROFILES=Object.freeze([
    {id:'vpay',name:'VPay MYR',path:'/api/payments/vpay/status'},
    {id:'gspay',name:'GSPAY+ MYR',path:'/api/payments/gspay/status'},
    {id:'gspay_usdt',name:'GSPAY+ USDT',path:'/api/payments/gspay/usdt/status'},
    {id:'1mpay',name:'1MPay MYR',path:'/api/payments/1mpay/status'},
  ]);
  const COPY={
    zh:{title:'生产验收阻塞矩阵',intro:'只读证据。青色表示接口或配置证据存在，但仍未通过真实资金验收；只有持久化验收事件明确通过才显示绿色。',games:'游戏 Profile',payments:'支付 Profile',profile:'Profile',contract:'合同',adapter:'适配器',catalogue:'目录证据',launch:'启动',wallet:'钱包',settlement:'结算',recovery:'恢复',blocker:'当前首要阻塞',documented:'已有合同记录',incomplete:'合同资料不完整',missing:'缺少正式合同',implemented:'代码已实现 · 未验收',adapterMissing:'适配器未实现',current:n=>`${n===null?'数量未记录':`${n} 款`} · 缓存有效`,currentAccepted:n=>`${n===null?'数量未记录':`${n} 款`} · 缓存有效 · 已验收`,stale:n=>`${n===null?'数量未记录':`${n} 款`} · 缓存过期`,noCatalogue:'没有有效目录证据',verified:'已验收',available:'接口可用 · 待验收',notVerified:'未验收',blocked:'不可用',manual:'人工流程',configured:'已配置 · 未验收',notConfigured:'未配置',order:'下单',payment:'付款能力',callback:'回调',query:'查单／恢复',credit:'钱包入账',live:'真实资金验收',loading:'正在整理只读证据…',loadError:'无法读取完整证据；未读取项目保持未验收。',summary:(profiles,implemented,verified,payments,live)=>`${profiles} 个游戏 Profile · ${implemented} 个适配器有代码 · ${verified} 个全链路验收 · ${payments} 个支付 Profile · ${live} 个真实资金验收`,none:'没有',manualBlocker:'人工银行真实入账验收未记录',contractFields:n=>`${n} 项合同字段缺失`,invalidContractFields:n=>`${n} 项合同字段无效`,contractComplete:'合同字段齐全；适配器仍保持关闭'},
    en:{title:'Production acceptance blockers',intro:'Read-only evidence. Cyan means API or configuration evidence exists but real-money acceptance is pending. Green requires a passing durable acceptance event.',games:'Game profiles',payments:'Payment profiles',profile:'Profile',contract:'Contract',adapter:'Adapter',catalogue:'Catalogue evidence',launch:'Launch',wallet:'Wallet',settlement:'Settlement',recovery:'Recovery',blocker:'Primary blocker',documented:'Contract recorded',incomplete:'Contract incomplete',missing:'Contract missing',implemented:'Implemented · unverified',adapterMissing:'Adapter not implemented',current:n=>`${n===null?'Count not recorded':`${n} titles`} · cache current`,currentAccepted:n=>`${n===null?'Count not recorded':`${n} titles`} · cache current · accepted`,stale:n=>`${n===null?'Count not recorded':`${n} titles`} · cache stale`,noCatalogue:'No current catalogue evidence',verified:'Verified',available:'Available · unverified',notVerified:'Not verified',blocked:'Unavailable',manual:'Manual workflow',configured:'Configured · unverified',notConfigured:'Not configured',order:'Order',payment:'Payment capability',callback:'Callback',query:'Query / recovery',credit:'Wallet credit',live:'Real-money acceptance',loading:'Building the read-only evidence view…',loadError:'Some evidence could not be read; missing evidence remains unverified.',summary:(profiles,implemented,verified,payments,live)=>`${profiles} game profiles · ${implemented} adapters implemented · ${verified} end-to-end verified · ${payments} payment profiles · ${live} real-money accepted`,none:'None',manualBlocker:'Manual-bank real credit acceptance is not recorded',contractFields:n=>`${n} missing contract fields`,invalidContractFields:n=>`${n} invalid contract fields`,contractComplete:'Contract fields complete; adapter remains disabled'},
    ms:{title:'Matriks halangan penerimaan produksi',intro:'Bukti baca sahaja. Biru kehijauan bermaksud bukti API atau konfigurasi wujud tetapi penerimaan wang sebenar belum selesai. Hijau memerlukan acara penerimaan kekal yang lulus.',games:'Profil permainan',payments:'Profil pembayaran',profile:'Profil',contract:'Kontrak',adapter:'Penyesuai',catalogue:'Bukti katalog',launch:'Pelancaran',wallet:'Dompet',settlement:'Penyelesaian',recovery:'Pemulihan',blocker:'Halangan utama',documented:'Kontrak direkodkan',incomplete:'Kontrak tidak lengkap',missing:'Kontrak tiada',implemented:'Dilaksana · belum disahkan',adapterMissing:'Penyesuai belum dilaksana',current:n=>`${n===null?'Bilangan tidak direkod':`${n} tajuk`} · cache semasa`,currentAccepted:n=>`${n===null?'Bilangan tidak direkod':`${n} tajuk`} · cache semasa · diterima`,stale:n=>`${n===null?'Bilangan tidak direkod':`${n} tajuk`} · cache lapuk`,noCatalogue:'Tiada bukti katalog semasa',verified:'Disahkan',available:'Tersedia · belum disahkan',notVerified:'Belum disahkan',blocked:'Tidak tersedia',manual:'Proses manual',configured:'Dikonfigurasi · belum disahkan',notConfigured:'Belum dikonfigurasi',order:'Pesanan',payment:'Keupayaan bayaran',callback:'Panggilan balik',query:'Semakan / pemulihan',credit:'Kredit dompet',live:'Penerimaan wang sebenar',loading:'Menyusun bukti baca sahaja…',loadError:'Sebahagian bukti tidak dapat dibaca; bukti yang tiada kekal belum disahkan.',summary:(profiles,implemented,verified,payments,live)=>`${profiles} profil permainan · ${implemented} penyesuai dilaksana · ${verified} disahkan hujung-ke-hujung · ${payments} profil pembayaran · ${live} diterima untuk wang sebenar`,none:'Tiada',manualBlocker:'Penerimaan kredit sebenar bank manual belum direkodkan',contractFields:n=>`${n} medan kontrak tiada`,invalidContractFields:n=>`${n} medan kontrak tidak sah`,contractComplete:'Medan kontrak lengkap; penyesuai kekal ditutup'},
  };

  const bool=value=>value===true;
  const safeCode=value=>typeof value==='string'&&/^[a-z0-9_.:-]{1,100}$/i.test(value)?value:'';
  const safeField=value=>typeof value==='string'&&/^[a-z][a-z0-9_.:-]{0,159}$/i.test(value)?value:'';
  function safeContractDiagnostic(profile){
    const diagnostic=profile?.contractDiagnostic;if(!diagnostic||typeof diagnostic!=='object'||Array.isArray(diagnostic))return null;
    const missing=[...(Array.isArray(diagnostic.missingVendorFields)?diagnostic.missingVendorFields:[]),...(Array.isArray(diagnostic.missingContractFields)?diagnostic.missingContractFields:[])].map(safeField).filter(Boolean);
    const invalid=[...(Array.isArray(diagnostic.invalidVendorFields)?diagnostic.invalidVendorFields:[]),...(Array.isArray(diagnostic.invalidContractFields)?diagnostic.invalidContractFields:[])].map(item=>({field:safeField(item?.field),reason:safeCode(item?.reason)})).filter(item=>item.field&&item.reason);
    return {manifestComplete:bool(diagnostic.manifestComplete),documentationOnly:bool(diagnostic.documentationOnly),missingFields:[...new Set(missing)],invalidFields:invalid.filter((item,index,list)=>list.findIndex(value=>value.field===item.field&&value.reason===item.reason)===index)};
  }
  const countOf=provider=>{
    for(const value of [provider?.cachedGameCount,provider?.count,provider?.catalogueGameCount]){
      const number=Number(value);if(Number.isInteger(number)&&number>=0)return number;
    }
    return null;
  };
  function adapterState(profile){
    if(bool(profile?.implemented))return 'implemented';
    const status=profile?.adapterStatus||profile?.capabilityReason;
    return status==='adapter_unimplemented'?'adapter_unimplemented':'contract_missing';
  }
  function contractState(profile){
    if(['documented','incomplete','missing'].includes(profile?.contractStatus))return profile.contractStatus;
    const adapter=adapterState(profile);return adapter==='implemented'?'documented':adapter==='adapter_unimplemented'?'incomplete':'missing';
  }
  function evidence(value,ready=false,pending=false){return bool(value)?'verified':bool(ready)?'available':pending?'pending':'blocked';}
  function gameBlocker(row){
    if(row.contract==='missing')return 'contract_missing';
    if(row.contract==='incomplete')return 'contract_incomplete';
    if(row.adapter!=='implemented')return 'adapter_unimplemented';
    if(!row.catalogueCurrent)return row.catalogueCount!==null?'catalogue_stale':'catalogue_not_ready';
    if(!row.catalogueAccepted)return 'catalogue_acceptance_pending';
    if(row.launch!=='verified')return ['available','pending'].includes(row.launch)?'launch_acceptance_pending':'launch_unavailable';
    if(row.wallet!=='verified')return ['available','pending'].includes(row.wallet)?'wallet_acceptance_pending':'wallet_unavailable';
    if(row.settlement!=='verified')return 'settlement_acceptance_pending';
    if(row.recovery!=='verified')return ['available','pending'].includes(row.recovery)?'recovery_acceptance_pending':'recovery_unavailable';
    return '';
  }
  function buildGameRows(directory={},acceptanceData={}){
    const providers=new Map((Array.isArray(directory.providers)?directory.providers:[]).map(provider=>[String(provider.id),provider])),acceptances=new Map((Array.isArray(acceptanceData.profiles)?acceptanceData.profiles:[]).map(profile=>[String(profile.profileId),profile]));
    return (Array.isArray(directory.profiles)?directory.profiles:[]).map(profile=>{
      const provider=providers.get(String(profile.providerId))||{},acceptance=acceptances.get(String(profile.profileId))||{},registryProfile=typeof acceptance.implemented==='boolean'?{...profile,implemented:acceptance.implemented,adapterStatus:acceptance.adapterStatus}:profile,accepted=capability=>acceptance?.capabilities?.[capability]?.passed===true,adapter=adapterState(registryProfile),contract=contractState(registryProfile),catalogueCount=countOf(provider),catalogueCurrent=bool(provider.connectionVerified)&&bool(provider.catalogueSynced)&&provider.stale!==true,executable=adapter==='implemented',catalogueAccepted=catalogueCurrent&&executable&&accepted('catalogue');
      const acceptancePending=provider.platformStatus==='awaiting_acceptance'||provider.capabilityReason==='acceptance_pending',launchRuntime=executable&&catalogueCurrent&&(bool(profile.launchReady)||acceptancePending),walletRuntime=executable&&(bool(profile.walletReady)||bool(provider.walletReady)),settlementRuntime=walletRuntime,recoveryRuntime=executable&&(bool(profile.recoveryReady)||bool(provider.walletReady));
      const row={profileId:String(profile.profileId||''),providerId:String(profile.providerId||''),name:String(profile.displayName||profile.profileId||''),walletMode:String(profile.walletMode||'unknown'),unitScale:Number(profile.unitScale)===100?100:1,adapter,contract,contractDiagnostic:safeContractDiagnostic(acceptance),catalogueCount,catalogueCurrent,catalogueAccepted,catalogueStale:provider.stale===true,checkedAt:Number(provider.checkedAt)||0,launch:evidence(launchRuntime&&accepted('launch'),launchRuntime,executable),wallet:evidence(walletRuntime&&accepted('wallet'),walletRuntime,executable),settlement:evidence(settlementRuntime&&accepted('settlement'),false,executable),recovery:evidence(recoveryRuntime&&accepted('recovery'),recoveryRuntime,executable)};
      return {...row,blocker:gameBlocker(row),fullyVerified:executable&&catalogueCurrent&&catalogueAccepted&&['launch','wallet','settlement','recovery'].every(key=>row[key]==='verified')};
    });
  }
  function paymentBlockers(status,deposit){
    const listed=Array.isArray(deposit?.blockers)?deposit.blockers.map(safeCode).filter(Boolean):[];
    if(!bool(deposit?.implemented))listed.push('deposit_adapter_not_implemented');
    else if(!bool(deposit?.configured))listed.push('provider_configuration_missing');
    else if(!bool(status?.orderReady)&&!bool(deposit?.enabled))listed.push('order_creation_unavailable');
    if(!bool(status?.callbacksReady))listed.push('callback_not_ready');
    if(!bool(status?.queryReady)&&!bool(status?.recoveryReady))listed.push('query_recovery_not_ready');
    if(!bool(status?.settlementVerified))listed.push('wallet_credit_acceptance_pending');
    if(!bool(status?.realPaymentVerified))listed.push('real_payment_acceptance_pending');
    return [...new Set(listed)];
  }
  function buildPaymentRows(channelData={},statuses={},controls={}){
    const channels=new Map((Array.isArray(channelData.items)?channelData.items:[]).map(item=>[String(item.provider_id),item]));
    const controlMap=new Map((Array.isArray(controls.items)?controls.items:[]).map(item=>[String(item.providerId),String(item.mode)]));
    const rows=PAYMENT_PROFILES.map(definition=>{
      const channel=channels.get(definition.id)||{},status=statuses[definition.id]||{},capabilities=status.capabilities||channel.capabilities||{},deposit=capabilities.deposit||{},implemented=bool(deposit.implemented),configured=bool(deposit.configured),orderReady=bool(status.orderReady)||bool(deposit.enabled),callbackReady=bool(status.callbacksReady),queryReady=bool(status.queryReady)||bool(status.recoveryReady),settlementVerified=bool(status.settlementVerified),realPaymentVerified=bool(status.realPaymentVerified),liveVerified=settlementVerified&&realPaymentVerified&&bool(status.liveReady);
      const row={id:definition.id,name:definition.name,currency:definition.id==='gspay_usdt'?'USDT':'MYR',adapter:implemented?'implemented':'blocked',contract:configured?'configured':'missing',order:evidence(false,orderReady),payment:evidence(false,bool(status.realPayments)||bool(deposit.enabled)),callback:evidence(false,callbackReady),query:evidence(false,queryReady),credit:evidence(settlementVerified,false,implemented),live:evidence(liveVerified,false,implemented),blockers:paymentBlockers(status,deposit),mode:controlMap.get(definition.id)||'unknown'};
      return {...row,fullyVerified:implemented&&configured&&orderReady&&callbackReady&&queryReady&&settlementVerified&&liveVerified};
    });
    const manualMode=controlMap.get('manual_bank')||'unknown';
    rows.push({id:'manual_bank',name:'Manual Bank MYR',currency:'MYR',adapter:'manual',contract:'manual',order:manualMode==='auto'?'available':'blocked',payment:'available',callback:'blocked',query:'blocked',credit:'pending',live:'pending',blockers:[manualMode==='paused'?'deposit_channel_paused':'manual_bank_acceptance_pending'],mode:manualMode,fullyVerified:false});
    return rows;
  }

  function statusLabel(value,copy){return value==='verified'?copy.verified:value==='available'?copy.available:value==='pending'?copy.notVerified:copy.blocked;}
  function statusCell(value,copy){const cell=document.createElement('td'),pill=document.createElement('span');pill.className=`acceptance-state is-${value}`;pill.textContent=statusLabel(value,copy);cell.append(pill);return cell;}
  function header(labels){const head=document.createElement('thead'),row=document.createElement('tr');for(const label of labels){const cell=document.createElement('th');cell.scope='col';cell.textContent=label;row.append(cell);}head.append(row);return head;}
  function blockerLabel(code,copy){
    const labels={contract_missing:copy.missing,contract_incomplete:copy.incomplete,adapter_unimplemented:copy.adapterMissing,catalogue_stale:copy.stale(null),catalogue_not_ready:copy.noCatalogue,catalogue_acceptance_pending:copy.notVerified,launch_acceptance_pending:copy.available,launch_unavailable:copy.blocked,wallet_acceptance_pending:copy.available,wallet_unavailable:copy.blocked,settlement_acceptance_pending:copy.notVerified,recovery_acceptance_pending:copy.notVerified,recovery_unavailable:copy.blocked,deposit_adapter_not_implemented:copy.adapterMissing,provider_configuration_missing:copy.notConfigured,order_creation_unavailable:copy.blocked,callback_not_ready:copy.notVerified,query_recovery_not_ready:copy.notVerified,wallet_credit_acceptance_pending:copy.notVerified,real_payment_acceptance_pending:copy.notVerified,deposit_channel_paused:copy.blocked,manual_bank_acceptance_pending:copy.manualBlocker};
    return labels[code]||code||copy.none;
  }
  function infoCell(value,tone='info'){const cell=document.createElement('td'),pill=document.createElement('span');pill.className=`acceptance-state is-${tone}`;pill.textContent=value;cell.append(pill);return cell;}
  function blockerCell(item,copy){
    const cell=infoCell(blockerLabel(item.blocker,copy),item.blocker?'blocked':'verified'),diagnostic=item.contractDiagnostic;cell.className='acceptance-blocker-cell';
    if(!diagnostic)return cell;
    const details=document.createElement('details'),summary=document.createElement('summary'),content=document.createElement('code'),parts=[];details.className='contract-diagnostic';summary.className='contract-diagnostic-summary';
    if(diagnostic.missingFields.length)parts.push(copy.contractFields(diagnostic.missingFields.length));
    if(diagnostic.invalidFields.length)parts.push(copy.invalidContractFields(diagnostic.invalidFields.length));
    summary.textContent=parts.join(' · ')||copy.contractComplete;
    const fields=[...diagnostic.missingFields,...diagnostic.invalidFields.map(item=>`${item.field} (${item.reason})`)];
    if(fields.length){content.className='contract-diagnostic-fields';content.textContent=fields.join(' · ');details.append(summary,content);}else details.append(summary);
    cell.append(details);return cell;
  }
  function labelRow(row,labels){Array.from(row.children).forEach((cell,index)=>cell.setAttribute('data-label',labels[index]||''));}
  function mobileCards(){return typeof scope.matchMedia==='function'&&scope.matchMedia('(max-width: 640px)').matches;}
  function summaryPanel(copy,text,liveAccepted){
    const summary=document.createElement('div'),description=document.createElement('span'),critical=document.createElement('strong');summary.className='acceptance-summary';summary.dataset.realMoneyAccepted=String(liveAccepted);description.textContent=text;critical.className=`acceptance-summary-live${liveAccepted===0?' is-zero':''}`;critical.textContent=`${copy.live}: ${liveAccepted}`;summary.append(description,critical);return summary;
  }
  function renderGames(host,rows,copy){
    const labels=[copy.profile,copy.contract,copy.adapter,copy.catalogue,copy.launch,copy.wallet,copy.settlement,copy.recovery,copy.blocker],section=document.createElement('details'),heading=document.createElement('summary'),scroller=document.createElement('div'),table=document.createElement('table'),body=document.createElement('tbody');section.className='acceptance-section acceptance-games-section';section.open=!mobileCards();heading.textContent=`${copy.games} · ${rows.length}`;scroller.className='acceptance-matrix-scroll';scroller.tabIndex=0;scroller.setAttribute('role','region');scroller.setAttribute('aria-label',copy.games);table.className='acceptance-matrix-table';table.dataset.mobileLayout='cards';table.append(header(labels));
    for(const item of rows){const row=document.createElement('tr'),name=document.createElement('th'),strong=document.createElement('strong'),meta=document.createElement('small');name.scope='row';strong.textContent=item.name;meta.textContent=`${item.profileId} · ${item.walletMode} · 1:${item.unitScale}`;name.append(strong,meta);row.append(name,infoCell(item.contract==='documented'?copy.documented:item.contract==='incomplete'?copy.incomplete:copy.missing,item.contract==='documented'?'info':'blocked'),infoCell(item.adapter==='implemented'?copy.implemented:copy.adapterMissing,item.adapter==='implemented'?'available':'blocked'));
      const checked=item.checkedAt>0?` · ${new Date(item.checkedAt*1000).toISOString().replace('.000Z','Z')}`:'',catalogue=item.catalogueAccepted?copy.currentAccepted(item.catalogueCount):item.catalogueCurrent?copy.current(item.catalogueCount):item.catalogueStale?copy.stale(item.catalogueCount):copy.noCatalogue;row.append(infoCell(`${catalogue}${checked}`,item.catalogueAccepted?'verified':item.catalogueCurrent?'info':'blocked'),statusCell(item.launch,copy),statusCell(item.wallet,copy),statusCell(item.settlement,copy),statusCell(item.recovery,copy),blockerCell(item,copy));labelRow(row,labels);body.append(row);}
    table.append(body);scroller.append(table);section.append(heading,scroller);host.append(section);
  }
  function renderPayments(host,rows,copy){
    const labels=[copy.profile,copy.contract,copy.adapter,copy.order,copy.payment,copy.callback,copy.query,copy.credit,copy.live,copy.blocker],section=document.createElement('details'),heading=document.createElement('summary'),scroller=document.createElement('div'),table=document.createElement('table'),body=document.createElement('tbody');section.className='acceptance-section acceptance-payments-section';section.open=true;heading.textContent=`${copy.payments} · ${rows.length}`;scroller.className='acceptance-matrix-scroll';scroller.tabIndex=0;scroller.setAttribute('role','region');scroller.setAttribute('aria-label',copy.payments);table.className='acceptance-matrix-table payment-blockers-table';table.dataset.mobileLayout='cards';table.append(header(labels));
    for(const item of rows){const row=document.createElement('tr'),name=document.createElement('th'),strong=document.createElement('strong'),meta=document.createElement('small');name.scope='row';strong.textContent=item.name;meta.textContent=`${item.id} · ${item.currency}`;name.append(strong,meta);row.append(name,infoCell(item.contract==='configured'?copy.configured:item.contract==='manual'?copy.manual:copy.notConfigured,item.contract==='configured'?'available':item.contract==='manual'?'info':'blocked'),infoCell(item.adapter==='implemented'?copy.implemented:item.adapter==='manual'?copy.manual:copy.adapterMissing,item.adapter==='implemented'?'available':item.adapter==='manual'?'info':'blocked'),statusCell(item.order,copy),statusCell(item.payment,copy),statusCell(item.callback,copy),statusCell(item.query,copy),statusCell(item.credit,copy),statusCell(item.live,copy),infoCell(item.blockers.map(code=>blockerLabel(code,copy)).join(' · ')||copy.none,item.blockers.length?'blocked':'verified'));labelRow(row,labels);body.append(row);}
    table.append(body);scroller.append(table);section.append(heading,scroller);host.append(section);
  }
  function render(host,payload,language='en'){
    const copy=COPY[language]||COPY.en,gameRows=buildGameRows(payload.directory,payload.acceptance),paymentRows=buildPaymentRows(payload.channels,payload.statuses,payload.controls),liveAccepted=paymentRows.filter(item=>item.fullyVerified).length,title=document.createElement('div'),heading=document.createElement('h2'),intro=document.createElement('p'),summary=summaryPanel(copy,copy.summary(gameRows.length,gameRows.filter(item=>item.adapter==='implemented').length,gameRows.filter(item=>item.fullyVerified).length,paymentRows.length,liveAccepted),liveAccepted);host.replaceChildren();host.className='acceptance-blockers';heading.textContent=copy.title;intro.className='muted';intro.textContent=copy.intro;title.className='acceptance-blockers-head';title.append(heading,intro,summary);host.append(title);renderPayments(host,paymentRows,copy);renderGames(host,gameRows,copy);return {gameRows,paymentRows};
  }
  function renderPaymentOnly(host,payload,language='en'){
    const copy=COPY[language]||COPY.en,paymentRows=buildPaymentRows(payload.channels,payload.statuses,payload.controls),liveAccepted=paymentRows.filter(item=>item.fullyVerified).length,title=document.createElement('div'),heading=document.createElement('h3'),intro=document.createElement('p'),summary=summaryPanel(copy,`${copy.payments}: ${paymentRows.length}`,liveAccepted);host.replaceChildren();host.className='acceptance-blockers';heading.textContent=copy.title;intro.className='muted';intro.textContent=copy.intro;title.className='acceptance-blockers-head';title.append(heading,intro,summary);host.append(title);renderPayments(host,paymentRows,copy);return paymentRows;
  }

  const read=async path=>{const response=await fetch(path,{method:'GET',credentials:'same-origin',headers:{Accept:'application/json'}});if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json();};
  let lastLoaded=0,loading=null;
  async function load(force=false){
    const host=document.getElementById('acceptanceBlockerMatrix'),paymentHost=document.getElementById('paymentAcceptanceBlockerMatrix');if(!host&&!paymentHost)return;
    if(loading)return loading;if(!force&&Date.now()-lastLoaded<30000)return;
    const language=document.getElementById('locale')?.value||'en',copy=COPY[language]||COPY.en;if(host)host.textContent=copy.loading;if(paymentHost)paymentHost.textContent=copy.loading;
    loading=(async()=>{
      const requests=[read('/api/games'),read('/api/admin/game-acceptance?environment=production&limit=0'),read('/api/admin/payment-channels'),read('/api/admin/deposit-controls'),...PAYMENT_PROFILES.map(item=>read(item.path))],results=await Promise.allSettled(requests),directory=results[0].status==='fulfilled'?results[0].value:{profiles:[],providers:[]},acceptance=results[1].status==='fulfilled'?results[1].value:{profiles:[]},channels=results[2].status==='fulfilled'?results[2].value:{items:[]},controls=results[3].status==='fulfilled'?results[3].value:{items:[]},statuses={};
      PAYMENT_PROFILES.forEach((item,index)=>{if(results[index+4].status==='fulfilled')statuses[item.id]=results[index+4].value;});const payload={directory,acceptance,channels,controls,statuses};if(host)render(host,payload,language);if(paymentHost)renderPaymentOnly(paymentHost,payload,language);if(results.some(result=>result.status==='rejected'))for(const target of [host,paymentHost].filter(Boolean)){const note=document.createElement('p');note.className='acceptance-load-warning';note.textContent=copy.loadError;target.prepend(note);}lastLoaded=Date.now();
    })().catch(()=>{if(host)host.textContent=copy.loadError;if(paymentHost)paymentHost.textContent=copy.loadError;}).finally(()=>{loading=null;});return loading;
  }
  function install(){
    const panel=document.getElementById('gameSyncPanel'),paymentPanel=document.getElementById('paymentChannelManager'),host=document.getElementById('acceptanceBlockerMatrix'),paymentHost=document.getElementById('paymentAcceptanceBlockerMatrix');if(!panel||!host||!paymentPanel||!paymentHost)return;
    const maybeLoad=(force=false)=>{if(document.body.classList.contains('admin-mode')&&(panel.hidden!==true||paymentPanel.hidden!==true))load(force);};
    document.querySelectorAll('a[href="#gameSyncPanel"],[data-admin-shortcut="gameSyncPanel"],a[href="#paymentChannelManager"],[data-admin-shortcut="paymentChannelManager"]').forEach(link=>link.addEventListener('click',()=>setTimeout(()=>maybeLoad(false),0)));
    document.getElementById('syncGamesNow')?.addEventListener('click',()=>setTimeout(()=>maybeLoad(true),0));
    document.getElementById('locale')?.addEventListener('change',()=>{lastLoaded=0;setTimeout(()=>maybeLoad(true),0);});
    if(typeof MutationObserver==='function'){const observer=new MutationObserver(()=>maybeLoad(false));observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','hidden']});}
    maybeLoad(false);
  }
  scope.Master7AcceptanceBlockers=Object.freeze({buildGameRows,buildPaymentRows,render,renderPaymentOnly,load});
  if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',install,{once:true});
})(typeof globalThis==='object'?globalThis:this);
