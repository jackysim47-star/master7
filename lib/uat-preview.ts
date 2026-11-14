export const UAT_PREVIEW_RELEASE='17.0.0-selfbuilt.174-uat-preview';

export const UAT_PREVIEW_ENDPOINTS=['/health','/api/payment-channels','/api/games'] as const;

export function uatPreviewHtml(){return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#06131f">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta name="description" content="MASTER7 UAT 只读前台与接入状态">
  <title>MASTER7 · UAT 前台预览</title>
  <link rel="icon" href="/assets/favicon-64.png" type="image/png" sizes="64x64">
  <link rel="stylesheet" href="/assets/uat-preview.css?v=${UAT_PREVIEW_RELEASE}">
  <script src="/assets/uat-preview.js?v=${UAT_PREVIEW_RELEASE}" defer></script>
</head>
<body>
  <header class="preview-header">
    <a class="preview-brand" href="/signin" aria-label="返回 MASTER7 登录">
      <img src="/assets/seven-emblem.png" alt="">
      <span><strong>MASTER7</strong><small>UAT · READ-ONLY PREVIEW</small></span>
    </a>
    <a class="preview-signin" href="/signin">返回登录</a>
  </header>
  <main>
    <section class="preview-hero" aria-labelledby="preview-title">
      <div>
        <p class="eyebrow">MASTER7 · 第一批接入验收</p>
        <h1 id="preview-title">真钱流程的真实状态，<em>不使用假分数冒充上线</em></h1>
        <p>这页只读取当前系统状态。不会创建充值订单、移动钱包余额、启动游戏、下注或提款。</p>
      </div>
      <aside class="preview-verdict" id="overallVerdict" data-state="loading" aria-live="polite">
        <span>当前结论</span>
        <strong>正在读取系统状态…</strong>
        <small>UAT PREVIEW</small>
      </aside>
    </section>

    <section class="status-strip" aria-label="平台状态摘要">
      <article id="coreStatus" data-state="loading"><span>核心服务</span><strong>检查中</strong><small>Render + PostgreSQL</small></article>
      <article id="otpStatus" data-state="loading"><span>顾客 OTP</span><strong>检查中</strong><small>注册与登录</small></article>
      <article id="paymentStatus" data-state="loading"><span>MYR 支付</span><strong>检查中</strong><small>VPay · GSPAY · 1MPay</small></article>
      <article id="gameStatus" data-state="loading"><span>游戏 Profile</span><strong>检查中</strong><small>启动 · 钱包 · 结算</small></article>
    </section>

    <section class="preview-panel" aria-labelledby="flow-title">
      <div class="panel-heading"><div><p class="eyebrow">CUSTOMER MONEY FLOW</p><h2 id="flow-title">顾客真钱流程</h2></div><span>每一步通过后才可开放</span></div>
      <ol class="money-flow">
        <li id="flowDeposit" data-state="loading"><b>1</b><div><strong>MYR 充值</strong><span>支付商建单、签名回调、独立查单</span></div><em>检查中</em></li>
        <li id="flowWallet" data-state="loading"><b>2</b><div><strong>主钱包入账</strong><span>成功订单只入账一次，失败订单不入账</span></div><em>检查中</em></li>
        <li id="flowGame" data-state="loading"><b>3</b><div><strong>游戏下注与派彩</strong><span>启动、游戏钱包、输赢、取消与恢复</span></div><em>检查中</em></li>
        <li id="flowPayout" data-state="loading"><b>4</b><div><strong>顾客提款</strong><span>身份核对、预留余额、付款与对账</span></div><em>检查中</em></li>
      </ol>
    </section>

    <div class="preview-grid">
      <section class="preview-panel" aria-labelledby="payment-title">
        <div class="panel-heading"><div><p class="eyebrow">MYR PAYMENT UAT</p><h2 id="payment-title">第一批充值通道</h2></div><span id="paymentCount">—</span></div>
        <div id="paymentCards" class="provider-list" aria-live="polite"><p class="loading-copy">正在读取支付状态…</p></div>
      </section>
      <section class="preview-panel" aria-labelledby="game-title">
        <div class="panel-heading"><div><p class="eyebrow">GAME PROVIDER UAT</p><h2 id="game-title">第一批游戏厂家</h2></div><span id="gameCount">—</span></div>
        <div id="gameCards" class="provider-list" aria-live="polite"><p class="loading-copy">正在读取游戏状态…</p></div>
      </section>
    </div>

    <section class="preview-panel safeguards" aria-labelledby="safeguard-title">
      <div class="panel-heading"><div><p class="eyebrow">SAFETY GATES</p><h2 id="safeguard-title">上线前固定保护</h2></div><span>FAIL-CLOSED</span></div>
      <ul>
        <li>未通过厂家 UAT 的游戏保持关闭。</li>
        <li>未完成商户结算验收的支付保持关闭。</li>
        <li>聊天中公开过的旧密钥不得使用，必须由厂家轮换。</li>
        <li>没有合法运营与支付商批准，不开放真钱营业。</li>
      </ul>
    </section>
    <p class="preview-updated" id="checkedAt" role="status" aria-live="polite">等待系统状态…</p>
  </main>
  <footer><span>MASTER7 · UAT ONLY</span><span>${UAT_PREVIEW_RELEASE}</span></footer>
</body>
</html>`;}
