function paymentGatewayLabels(){
 const labels={
  en:{headers:["Company","Deposit configured","New order","Query","Callback","Payout","Balance","Wallet verified"],yes:"Yes",no:"No",unavailable:"Status unavailable. Refresh to try again."},
  zh:{headers:["供应商","充值已配置","新建充值单","查单","回调","出款","商户余额","钱包结算已验收"],yes:"是",no:"否",unavailable:"状态读取失败，请刷新重试。"},
  ms:{headers:["Syarikat","Deposit dikonfigurasikan","Deposit baharu","Semakan","Panggilan balik","Pembayaran keluar","Baki peniaga","Penyelesaian dompet disahkan"],yes:"Ya",no:"Tidak",unavailable:"Status tidak tersedia. Muat semula untuk mencuba lagi."}
 };
 return labels[state.lang]||labels.en;
}
function paymentGatewayStatusAvailable(status){
 const object=value=>Boolean(value)&&typeof value==="object"&&!Array.isArray(value);
 if(!object(status)||!object(status.capabilities))return false;
 const required=[
  [status,["queryReady","callbacksReady","settlementVerified","liveReady"]],
  [status.capabilities.deposit,["configured","enabled"]],
  [status.capabilities.payout,["enabled","submissionEnabled"]],
  [status.capabilities.balance,["enabled"]]
 ];
 return required.every(([value,keys])=>object(value)&&keys.every(key=>typeof value[key]==="boolean"));
}
function paymentCheck(value){const labels=paymentGatewayLabels(),mark=node("span",`gateway-check-mark ${value?"ok":"off"}`,value?"✅":"❌");mark.setAttribute("aria-label",value?labels.yes:labels.no);return mark;}
async function renderPaymentGatewayChecks(){
 const host=$("paymentGatewayChecks");if(!host)return;clear(host);
 const providers=[{name:"VPay",path:"/api/payments/vpay/status"},{name:"GSPAY+",path:"/api/payments/gspay/status"},{name:"1MPAY",path:"/api/payments/1mpay/status"}];
 const results=await Promise.allSettled(providers.map(item=>api(item.path))),labels=paymentGatewayLabels(),table=node("table","gateway-check-table"),head=document.createElement("thead"),headRow=document.createElement("tr");
 for(const label of labels.headers){const cell=document.createElement("th");cell.scope="col";cell.textContent=label;headRow.append(cell);}head.append(headRow);
 const body=document.createElement("tbody");
 providers.forEach((item,index)=>{
  const result=results[index],status=result.status==="fulfilled"?result.value:null,row=document.createElement("tr"),name=document.createElement("th");
  name.scope="row";name.textContent=item.name;row.append(name);
  if(!paymentGatewayStatusAvailable(status)){
   const cell=document.createElement("td");cell.colSpan=labels.headers.length-1;cell.className="muted";cell.setAttribute("role","status");cell.textContent=labels.unavailable;row.append(cell);body.append(row);return;
  }
  const capabilities=status.capabilities||{},deposit=capabilities.deposit||{},payout=capabilities.payout||{},balance=capabilities.balance||{};
  const checks=[deposit.configured===true,deposit.enabled===true,status.queryReady===true,status.callbacksReady===true,payout.enabled===true&&payout.submissionEnabled===true,balance.enabled===true,status.settlementVerified===true&&status.liveReady===true];
  for(const check of checks){const cell=document.createElement("td");cell.append(paymentCheck(check));row.append(cell);}body.append(row);
 });
 table.append(head,body);host.append(table);
}
