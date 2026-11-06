# MASTER7 Current Deployment Receipt

## `.76` operations suite current live deployment

- Live release: `17.0.0-selfbuilt.76-operations-suite`.
- Source commit: `6b2ca6c6a315198ad714a46ae43d09f80ebf0ac3`.
- Bundle SHA-256:
  `c883258f5f15fe2a7902a5663ebf88eb52022f123845c66536f8322149f9ae42`.
- Publication commit: `331b1b7e6bee207b1e74b28d1cdca4a5e0e1b7f5`.
- Render deploy: `dep-dbn26qegekts738mr2b0`, `live` at
  2026-11-07 03:00:27 MYT.
- Adds the owner operations suite: dedicated VIP and commission setup, MYT
  finance views, Stephanie support assistant, curated game-platform ranking,
  monitor-only Bonus Hunter, non-cash Rewards Hub, owner-controlled Events
  Center, responsible-play controls, inline guides and a read-only AI Operations
  Manager.
- Money-moving and enforcement boundaries remain unchanged: no AI approval,
  automatic wallet credit, automatic payout, automatic member sanction or
  automatic marketing send. Missing provider evidence remains unverified.
- Local acceptance passed: 373/373 complete portal tests, 3/3 Render database
  adapter tests, Render TypeScript, lint with zero errors and four existing
  unused-code warnings, and the Render production build. The reproducible
  509-entry archive passed checks for repository metadata, dependencies,
  private keys, retired personal values and known production credential
  fragments.
- Online acceptance confirms runtime/source `.76`, database ready, SMS OTP
  ready, HTTP 200 member/management routes and `.76` assets, and HTTP 401 for
  anonymous summary and Operations Intelligence requests.
- The public game API remains platform-only with exactly 34 unique positions,
  `games=[]`, `playable=false` and zero launch-ready platforms. Payouts, GSPAY,
  payment settlement and global production readiness remain off/unverified.
- The acceptance window contains zero application error/fatal logs and zero
  request 5xx logs. Automatic accounting completed one close period.
- `master7.best` reaches member sign-in; `master7.site` and `www.master7.site`
  reach management. The separate `www.master7.best` DNS record is still absent.
- Checksum receipt:
  `docs/MASTER7_OPERATIONS_SUITE_RELEASE_SHA256_20261107.txt`.

## `.75` previous live deployment

- Live release: `17.0.0-selfbuilt.75-deposit-rejection-recovery`.
- Source commit: `9d5ad7661897b02e5c6d753fd69783b28708399e`.
- Bundle SHA-256: `93f669935a59e3745cfe4717862df639c6af58bd129b6f0508294a94575f71e3`.
- Bundle publication commit: `0448c33397ea765149830f8bc8b222d81115d4d9`;
  final `.75` receipt commit: `47a3266b1878a895b25f4a8666d56de00501ed5a`.
- Latest `.75` Render deploy: `dep-dbn0kle7bikc73c6mk7g`, `live` at
  2026-11-07 01:13:27 MYT and deactivated by `.76`.
- Explicit provider business rejection now becomes `failed` and returns HTTP
  422 `PROVIDER_REJECTED`, so the member can start a new deposit attempt.
- Timeout, network and ambiguous provider results remain `unknown` and retain
  the same idempotency key, preventing accidental duplicate real orders.
- The UI provider timeout is 35 seconds. Historical stuck orders are reconciled
  only when the same member's sanitized audit proves the explicit rejection and
  the stored order has no provider reference or checkout URL.
- Existing payment and game switches are unchanged. VPay supplier configuration
  must still be corrected before a real checkout URL can be accepted.
- Local acceptance passed: 284/284 portal tests, 3/3 Render database tests,
  TypeScript, lint, JavaScript syntax and the production build.
- Online acceptance confirms runtime/source `.75`, database ready, SMS OTP
  ready, and the `.75` CSS and JavaScript assets. Member and management domain
  entry routes return HTTP 200 through the Render service.
- VPay and 1MPay remain Active with order/query configured. Both remain
  `liveReady=false` and `settlementVerified=false`; no real deposit was created
  during release verification. The public lobby remains platform-only with 34
  provider positions and no internal game list.
- No application error/fatal or request 5xx logs appeared in the acceptance
  window. Automatic accounting completed its close check on the new instance.

## `.74` previous live deployment

- Live release: `17.0.0-selfbuilt.74-whatsapp-business-queue`.
- Source commit: `440a096da78322a23a11cb8fb2d6cf5a7098aaab`.
- Bundle SHA-256: `fc65dc0e3084edb50c33414dc143bf01ad572147bb9b128db1240d993abb3c64`.
- Publication commit: `f2f4f27e76dc99a3f5f880ada717f97ae1f40d87`.
- Render deploy: `dep-dbn00gijnfac73bk1fag`, `live` at
  2026-11-07 00:30:28 MYT.
- Adds the official Meta approved-template queue, raw-body webhook signature
  verification, monotonic delivery receipts, opt-out cancellation, safe retry
  behavior and a protected loopback worker.
- Contact capacity is 1,000,000. Launching still requires the current verified
  Meta recipient tier, a complete approved template configuration and explicit
  consent evidence for every queued contact.
- The uploaded 123,676-row CSV passed format and deduplication checks but has
  only a `phone` column. It is not inside the bundle and was not imported or
  sent.
- No WhatsApp credential is included in source or bundle. Sending defaults to
  off and the module remains `Waiting` until Meta values are configured
  and separately accepted.
- Existing payment and game environment settings are unchanged. VPay and 1MPay
  remain Active, GSPAY remains Closed, payouts remain disabled and payment
  settlement remains unverified. `productionReady=false` stays truthful.
- Local acceptance passed: 278/278 portal tests, 23/23 WhatsApp-focused tests,
  3/3 Render database tests, TypeScript, lint and the production build.
- Online acceptance confirms `.74`, database ready, SMS OTP ready, 34 unique
  provider positions, platform-only public output and no public internal-game
  list. Anonymous game cards remain non-launchable. Webhook signatures, worker
  authorization and admin marketing authentication fail closed.
- No application error/fatal or request 5xx logs appeared in the acceptance
  window. Automatic accounting completed its close check on the new instance.

## `.73` previous live deployment

- Live release: `17.0.0-selfbuilt.73-management-login-copy`.
- Source commit: `d7e9b02261a3de9e5af90e2433cd4f68651b4011`.
- Bundle SHA-256: `024fb30a5927209320427e6797b238d02965033e5ee5d188640bbea0d158efac`.
- Publication commit: `6abfeefbffe564903a441147fb01f5e059d8d35f`.
- Render deploy: `dep-dbmvekdbedkc73dk1u10`, `live` at
  2026-11-06 23:52:20 MYT.
- `/health` returns HTTP 200 and reports `.73` for runtime and source;
  `database=ready` and `smsOtpReady=true`.
- Mobile browser acceptance of `/admin` returns HTTP 200. Opening the sign-in
  dialog shows `Management sign-in`, asks for an owner or staff ID and password,
  displays only the ID and password controls, and produces no browser console
  errors. Member OTP wording is absent from the management flow.
- `/api/games` still returns exactly 34 unique providers at positions 1–34,
  `platformsOnly=true`, `games: []`, `playable=false` and zero launch-ready
  providers. Internal game records remain out of the customer response.
- Existing payment order switches are unchanged: VPay and 1MPay remain enabled;
  GSPAY and GSPAY+ remain disabled.
- `productionReady=false` and `settlementVerified=false` remain truthful. This
  patch does not claim that the pending platform launch or settlement work is
  complete.
- Local acceptance passed: 257/257 portal tests, 3/3 Render database tests,
  TypeScript, lint, JavaScript syntax and the production build.

## `.72` previous live deployment

- Live release: `17.0.0-selfbuilt.72-white-label-platform`.
- Source commit: `931a4ef51d2054dc3c8c177d9b0899019c75e7ce`.
- Bundle SHA-256: `170cebbd34a833841c75a1b8c1d8d6fa0cb3da849e895209a232a3815044f2a6`.
- Publication commit: `47afc025d6ec8ce39f1c18108aa387a9b72cc67b`.
- Render deploy: `dep-dbmv92gm7kps73ce7j90`, `live` at
  2026-11-06 23:40:18 MYT.
- Public games API is intentionally platform-only: exactly 34 provider summaries,
  `platformsOnly=true`, and `games: []`. Internal game titles and IDs remain in
  the protected backoffice.
- The lobby contains three separate sponsored positions and independent artwork
  for the 34 providers. Categories filter provider cards only.
- Platform-level launch adapters have not passed acceptance, so unverified cards
  remain `playable=false` and cannot be presented as ready for real play.
- Benefits remain preview-only until wager APIs, wallet payout, claim settlement
  and Turnover enforcement have production evidence.
- Built-in customer assistance is included. Telegram stays `Waiting` until the
  real server-side token and chat ID are supplied.
- Connected payment/game environment values and switches are unchanged by this
  release. Automatic accounting is already active and remains configured.
- Local acceptance passed: 257/257 portal tests, 3/3 Render database tests,
  TypeScript, lint, JavaScript syntax and production build.
- Online acceptance: `/health` and `/signin` return HTTP 200; runtime and source
  report `.72`; database and SMS OTP report ready. `/api/games` returns exactly
  34 unique providers at positions 1–34, `platformsOnly=true`, `games: []`,
  `playable=false` and zero launch-ready providers. The provider states are 30
  `awaiting_api` and four `awaiting_platform_adapter`.
- Post-deploy logs contain zero application error/fatal entries and zero HTTP
  5xx requests. The new instance logged a successful automatic accounting
  close check.
- Payment settings were preserved: VPay and 1MPay orders remain enabled;
  GSPAY remains disabled. `productionReady=false` and
  `settlementVerified=false` remain truthful.
- `master7.best` member entry, sign-in and health routes work; `master7.site`
  root correctly sends staff to `/admin`.

## Previous `.71` live deployment

更新时间：2026-11-06 22:15 MYT
验收时区：Asia/Kuching（MYT，UTC+8）

当前线上版：`17.0.0-selfbuilt.71-frontend-route-compat`
当前回滚版：`17.0.0-selfbuilt.69-payout-safe-support`

## `.71` 路线与域名清理

- 正式会员前台统一为 `https://www.master7.best/`，正式公司后台统一为 `https://www.master7.site/`。
- 404 日志证明用户请求曾误带结尾反引号，形成 `/%60` 与 `/admin/%60`；`.71` 自动纠正这些地址。
- `/games`、`/player/games`、`/home`、`/lobby`、`/player` 和 `/index.html` 会回到有效前台。
- 当前源码和新发布包删除旧 `.admin`、`.vip` 域名文字；正式 `/admin` 后台路线和 VIP 福利功能保留。
- `www.master7.best` 当前仍缺 DNS；发布程序不能替代域名方设置。DNS 完成前使用 `master7.best` 或 Render 直达入口。
- 详细记录见 `docs/MASTER7_FRONTEND_ROUTE_AND_RENDER_CLEANUP_20261106.md`。

## 正式发布记录

| 项目 | 已核实值 |
|---|---|
| Source commit | `524bab01fcdfe52dee189a9972afbf9f27bef070` |
| Publication commit | `99c16ae8c0b2a206ea13ce0b45057e3a5b49a080` |
| Portal deploy | `dep-dbmu1cdbedkc73dgl8s0`，`live` |
| 部署包 SHA-256 | `b40efb291f25e5fc156ffeae91cdf895356ac6c89bbd55db8258202b6321d874` |
| 上线完成 | 2026-11-06 22:15:38 MYT |
| Portal service | `srv-dbl0iv7f3r2c73848ei0` / `master7-v17-staging` |
| Render workspace | `tea-dakfo2h594qs73du231g` / ahbi |
| Branch | `codex/v17-render-staging-20261104` |
| Auto deploy | Off；本版已人工触发并记录 deploy ID |

## 线上验收

- `/health` 为 HTTP 200，版本 `.71`，`database=ready`，`smsOtpReady=true`。
- `/`、`/signin`、`/register` 与 `/admin` 正常；误带反引号和旧游戏入口返回 HTTPS 308；`/favicon.ico` 返回 200。
- VPay Deposit 为 Active、production，order/query/callback 均 ready。
- 1MPay Deposit 为 Active、production，order/query/callback 均 ready。
- 已连接的 VPay、1MPay 与 MegaH5 设置在部署后保持开启。
- MegaH5 wallet、live games、settlement 均 ready；`liveGames=true`。
- 游戏目录返回 766 款、9 个来源。匿名访问 `playable=false` 是会员登录闸门；获批准会员才进入启动流程。
- GSPAY Deposit 为 Closed；当前凭证合约未通过，order/query/callback 均不启用。
- 三家 Payout 均关闭：VPay/1MPay 缺完整 payout contract；GSPAY 程序已实现，但生产前置条件未齐。
- `productionReady=false`，准确 blockers 为 `payout_provider_not_ready` 与 `payment_settlement_not_verified`。
- 新实例 application error/critical/fatal 为 0，request 5xx 为 0。

## 本版完成

- VPay readiness 改为读取 Gateway 远程合约，已连接充值不会再被本地旧判断错误阻挡。
- GSPAY Payout 已完成签名、回调、独立查单、幂等、钱包预留、失败释放、不确定状态恢复、数据库原子单调用锁和加密银行资料。
- GSPAY Payout 默认关闭；缺任一生产条件时，前台不显示为可用提款公司。
- 客服工单已接入内建中英双语自动回复；员工可继续接手、回复和关闭。
- 健康页使用真实充值、提款、支付结算与游戏结算条件计算营业状态。

## 当前公开业务内容

- 已发布公司广告：0。
- Active 福利：0；福利计算为 preview-only，领取、钱包派发与 Turnover enforcement 均关闭。
- 已发布公告：0。
- 提款银行目录：18 家；当前可提交的 Payout Provider：0。
- 公司银行账号只允许已登录会员读取，公开检查得到 401，符合权限设计。账号内容需由 Owner 在后台确认。

## GSPAY 尚需厂家/域名方完成

1. 提供可复制的准确 Operator Authentication Key；当前收到的文字只有 31 个十六进制字符，不能写入生产环境。
2. `master7.best` 当前对 callback 路径返回 HTTP 302。须改为 Render 直接自定义域名或保留 POST method/body 的反向代理。
3. 厂家确认 Render Singapore 完整出站 IP 范围白名单。单次观测 IP 不能当作稳定白名单证明。
4. 提供准确的 18 家 `bank_target` 对照与可用 Settlement balance，再做一笔获授权的真实 Payout 验收。
5. 分别完成 Order、Query、Callback、Wallet、Reconcile 与 Payout 六阶段生产签收后，才打开对应开关。

## Owner 营业资料

Owner 仍需在后台录入并核对公司银行账号、正式福利/Turnover/VIP 条款、公司广告与公告。这些内容属于业务资料，程序不会代造。VPay、1MPay 与 MegaH5 维持现有开启状态。

## 入口

- Portal：`https://master7-v17-staging.onrender.com`
- 正式会员前台：`https://www.master7.best/`，当前仍需 DNS/TLS。
- 会员前台备用：`https://master7.best/`，当前为 302 URL forwarding。
- 正式后台：`https://www.master7.site/`，当前可经转发进入 `/admin`。

## 最终内部收尾

不需要厂家、Owner 业务资料或真实资金授权的项目已全部复查完成。完整验收证据与外部输入清单见 `docs/MASTER7_FINAL_INTERNAL_COMPLETION_20261106.md`。
