# MASTER7 · XBTECH MD 完整实施与验收记录

## Update All · 2026-11-06 14:28 MYT

本节是最新状态，并取代下方 `.55` 历史快照中的部署编号、测试数量、支付和
备份数字。

| 项目 | 最新结果 |
|---|---:|
| Portal | ✅ `17.0.0-selfbuilt.58-payment-startup-guard` |
| Portal commit / deploy | ✅ `479ac1559f8e573be549a1e5f0fd299a8eb2bba3` / `dep-dbmn2cff3r2c73b4q6d0` live |
| Gateway | ⚠️ `1.10.1` 证据修正版待回填最终部署回执 |
| Gateway commit / deploy | ⚠️ 旧 `1.10.0` 回执已被证据修正取代；以 `CURRENT_DEPLOYMENT.md` 最新值为准 |
| GSPAY credential 与建单样本 | ⚠️ credential 已安全配置；先前工单不属于 MASTER7，建单样本不可验收 |
| GSPAY 建单程序 | ❌ 本商户契约待确认；`createProgramReady=false`，路由先返回 503 |
| GSPAY 查单与回调结算 | ❌ 厂家仍欠完整查单外层、回调确认/重试规则；真钱开关关闭 |
| VPay | ❌ `suspended`，`enabled/liveReady: false` |
| 1MPAY | ❌ `suspended`，`enabled/liveReady/settlementVerified: false` |
| 真实支付与 settlement | ❌ `realPayments: false`、`productionReady: false` |
| 游戏目录 | ✅ 769 项；MegaH5 166、JILI 297、918KISS H5 92、Rectangle 64、EVO 缓存 150 |
| 游戏启动与钱包 | ❌ `playable/liveGames: false`；未完成生产验收 |
| Game checks | ✅ 分开显示 Connected、Catalog、Launch、Wallet 的 ✅/❌ |
| Payment checks | ✅ VPay / GSPAY / 1MPAY 分开显示 Connected、Order、Query、Callback、Wallet 的 ✅/❌ 与青色灯 |
| 启动保护 | ✅ 旧迁移不会自动打开支付；重启后 VPay/1MPAY Suspended，GSPAY/GSPAY+ Close |
| 自动化验证 | ✅ Gateway 84/84；Portal 164/164；Render DB 3/3；production build passed |
| 加密备份恢复 | ✅ 30 张表、244 条记录、外键错误 0；后台两项 Ready |
| Portal bundle SHA-256 | ✅ `40721727b2a9295f49b0f3ae024521f449ad70120ecd162b8ab64743ed27ff8e` |

GSPAY 安全回调地址已经上线：公开 GET 只显示 inactive；错误机器令牌返回
HTTP 401；正确内部令牌在结算开关关闭时返回 HTTP 503
`GSPAY_SETTLEMENT_DISABLED`，不会写钱包。检查时网关出口观察值是
`74.220.52.32`，且此前曾出现其他值，因此须由厂家与 Render 确认稳定白名单
方案，不能把单次观察值当作固定出口。

验收时间：2026-11-06 13:22 MYT（2026-11-06 05:22 UTC）  
上线版本：`17.0.0-selfbuilt.55-game-zones`  
部署提交：`e330472c419d1fb932ea9826ba7a6c96592e235f`  
Render 部署：`dep-dbmm4iui0phs73c8s750`，状态 `LIVE`

## 手机版本

| 项目 | 结果 |
|---|---|
| Android APK | ✅ 已签名、已上线、可从手机直接下载 |
| 下载地址 | <https://master7-v17-staging.onrender.com/downloads/MASTER7-Android-v17.0.52.apk> |
| App 名称 | `MASTER7` |
| Android package | `com.master7.portal` |
| 版本 | `17.0.52`（versionCode `170052`） |
| 系统要求 | Android 8.0 或以上（minSdk 26） |
| 目标版本 | Android API 35 |
| 文件大小 | 67,420 bytes |
| SHA-256 | `f7765f2787f6e50891d76eec1c9f58b9d1f978747fa43df0d11bb8f381822787` |
| 签名验证 | ✅ APK Signature Scheme v2；RSA 3072-bit |
| 签名证书 SHA-256 | `85fd2e1773852b66e09e1a31a14bebc55aae688ae7f36a24084b7a97d58acd2f` |
| iPhone Safari Web App | ✅ 可加入主画面、独立全屏启动；原生 App Store 包另行签名 |

APK 默认打开已验证的客户网址 `https://master7.best/`，并保留 Render 备用入口。SSL 错误不会被绕过。

## 原 MD 范围逐项状态

| 原 MD 项目 | 状态 | 当前结果和边界 |
|---|---:|---|
| 客户前台 `master7.best` | ✅ 入口已验证 | HTTPS 有效，会进入 `.58` 客户前台并最终返回 HTTP 200。`www.master7.best` 别名仍缺 DNS 记录。 |
| 员工后台 `master7.site` | ✅ 入口已验证 | HTTPS 有效，并会转到已上线的 `/admin`，最终 HTTP 200；浏览器最终地址目前是 Render 域名。 |
| 登录、注册、公司名与 Logo | ✅ | 前台登录、注册和品牌入口保留。 |
| 手机 OTP | ✅ 程序就绪 | 公网健康检查返回 `smsOtpReady: true`；发送、过期和重复使用仍应使用授权测试号码验收。 |
| 后台 ID、密码、重设和角色权限 | ✅ | Owner、Staff、Member 权限及受保护后台路由保留。 |
| 加密独立备份与恢复演练 | ✅ 真实验收通过 | 已从上线 PostgreSQL 生成 AES-256-GCM/RSA-OAEP-SHA256 加密备份；30 张表、244 条记录在干净隔离数据库恢复成功，外键错误 0，恢复后所有账号须重新登录。 |
| 水蓝、金、白与手机后台排版 | ✅ | 新增紧凑侧栏、移动抽屉、青色状态灯；一次只打开一个后台模块，减少长页面卡顿。 |
| 简中、英文、马来文 | ✅ | 原有三语入口及内容机制保留。 |
| 供应商独立按钮、Logo 和状态 | ✅ | 供应商控制、品牌图、Active/Maintenance/Closed 状态及游戏分类保留。 |
| 免费与付费游戏分区 | ✅ | Owner 可逐款选择 FREE/PAID；前台有 ALL/FREE/PAID 按钮和标签，仍维持每次 12 款加载。分区只控制展示，不会绕过游戏启动、钱包或结算验收。 |
| Android 下载入口 | ✅ | 首页可直接下载本次签名 APK。 |
| iPhone 安装入口 | ✅ Safari Web App | 前台有 iPhone 安装按钮、加入主画面三语说明、standalone manifest、MASTER7 图标及安全离线页；原生 IPA/App Store 包仍须 Apple 签名。 |
| 客服入口与对话记录 | ✅ | Ticket、员工回复、转人工设置均保留。 |
| AI 客服 | ⏳ Provider 待验证 | 独立开关已完成；未接入已验证模型前不会自动回复。 |
| 钱包、存款、提款记录 | ✅ 页面和记录 | 管理页面和账本记录保留；真实通道与资金结算闸门仍关闭。 |
| 日报、月报、半年和年度账目 | ✅ | 会计报表、时期筛选、MYT 时区及导出保留。 |
| 会员、VIP 与福利 | ✅ | 会员管理、VIP/福利规则、turnover 计算和发布流程保留。 |
| 推荐关系与 Commission | ✅ 计算和记录 | 完成 Settings、Ledger、By upline、Tools；支持 1–3 层、Deposit/Turnover/Company Profit、MYT 周期、门槛、封顶、hold、expiry、claim、turnover/winover 和游戏筛选。 |
| Commission 自动入钱包 | ⏳ 待资金验收 | 计算会写入审计记录；资金验收前不会自动加余额。 |
| 公司广告和推广 | ✅ 编辑与名单 | 广告、福利、600k 联系人导入、同意状态、推荐链接、活动草稿和 CSV 发布名单保留。 |
| WhatsApp/SMS 批量实际发送 | ⏳ 官方 API 待接入 | 不会假装免费发送；点击发布会提示先连接官方 WhatsApp Business 或 SMS API。 |
| 安全和审计 | ✅ | 登录/配置/操作审计、Owner 权限和 CSV 导出保留。 |

## 后台功能排法

后台已按工作用途分组，手机上用抽屉打开，每次只显示一个模块：

1. **Finance**：Dashboard、Payment channels、Deposit records、Withdrawal requests、Accounting。
2. **Members**：Member records、Wallet/ledger、Referral/Commission、VIP/benefits。
3. **Games**：Supplier API checks、Supplier controls、Brand directory、Game categories。
4. **Marketing**：Company advertising、Announcements、Campaign contacts、Referral links。
5. **Support**：Tickets、Staff replies、Human handoff、AI 独立开关。
6. **Reports**：日报/月报/半年/年度、CSV 导出、Audit log。
7. **System**：Readiness、Security、Roles、Backup status。

## 必须继续关闭的生产闸门

以下状态是原 MD 明确要求的验收闸门，本次没有把“有页面”误报为“资金可营业”：

| 项目 | 公网实测结果 |
|---|---|
| VPay | 🔧 `suspended`，生产订单关闭 |
| GSPAY | 🔧 `closed`，生产订单关闭 |
| 1MPAY | 🔧 `suspended`，生产订单关闭 |
| GSPAY+ | 🔧 `closed`，生产订单关闭 |
| 真实支付 | 🔧 `realPayments: false` |
| Settlement | 🔧 `settlementVerified: false` |
| 游戏目录 | ✅ 可同步和分类显示 |
| 游戏启动 | 🔧 `playable: false`，Launch 未验收 |
| 游戏钱包和结算 | 🔧 未验收，不能称为可营业 |
| 整个平台生产状态 | 🔧 `productionReady: false` |

GSPAY MYR 正式 credential 已安全放入 Render secrets；连接器版本 `1.9.2`
在公网返回 `configured: true`。订单、查询和回调三个交易开关仍全部为
`false`，等待厂家回调 acknowledgement/retry、白名单与端到端钱包结算验收。
本次没有建立任何真实付款订单，USDT credential 没有接入 MYR 通道。

## 公网验收证据

- ✅ Render 部署状态：`LIVE`。
- ✅ Gateway 部署 `dep-dbmm4eei0phs73c8rpcg`：`LIVE`，commit `c42707a153d439602b6ca9ff7921876ab65eb8d4`。
- ✅ GSPAY MYR 状态：`configured: true`、`transactionRoutesActive: false`、`liveReady: false`。
- ✅ `/health`：HTTP 200，数据库 `ready`，版本 `.55`。
- ✅ `/admin/commission`：HTTP 200，新 Commission 页面已在线。
- ✅ Android APK：HTTP 200，`application/vnd.android.package-archive`。
- ✅ 公网下载 APK 的大小、SHA-256 与本地签名包一致。
- ✅ 公网 APK 重新验证：v2 签名有效，包名和版本正确。
- ✅ 自动化测试：154/154 通过。
- ✅ Render 数据库测试：3/3 通过。
- ✅ Web production build、Android release build 和 Android release lint 通过。
- ✅ 源码敏感资料扫描通过；签名 keystore 没有放进源码或交付压缩包。
- ✅ 真实加密备份：30 张表、218 条记录；隔离恢复、逐表哈希、记录数和外键检查全部通过。
- ✅ 后台 `Encrypted backup` 与 `Recovery rehearsal` 均显示 `Ready`。
- ✅ iPhone manifest、Service Worker、离线页和 Safari 安装按钮均在公网返回 HTTP 200。
- ✅ 后台 `iPhone Safari Web App entry` 显示 `Ready`；API、资金和 APK 下载不会进入离线缓存。

## 交付文件

| 文件 | SHA-256 |
|---|---|
| `MASTER7-Android-v17.0.52.apk` | `f7765f2787f6e50891d76eec1c9f58b9d1f978747fa43df0d11bb8f381822787` |
| `master7-v17-render-staging.tar.gz` | `11ba5591bab433d474d3767328ae04a29a54c613af9c44906554a367115890a9` |
| `MASTER7_FREE_PAID_GAME_ZONES_20261106.md` | `ea341e8a50fea91558bb591cd12f80fd4a7264c9599b6c7b99531f058c9ec632` |
| `MASTER7_BACKUP_RECOVERY_RECEIPT_20261106.md` | `7566cc528dea7b219e330e71671c2f49304248dcb9c92b75bd07fc587556f3b1` |
| `MASTER7_GAME_ZONES_GSPAY_RELEASE_RECEIPT_20261106.md` | `f279b5bd7f3c440319ea60f8d299407fa49692601b3d87191ee244ed8973c830` |
| `MASTER7_IPHONE_WEB_APP_RECEIPT_20261106.md` | `3489e71deab31b28686b92f4d9d32589342f8c0bffcfaedd45bec3d10bc9fcec` |
| `MASTER7_IPHONE_WEB_APP_GUIDE_20261106.md` | `53c38be052c5b926a85e2a9dbc14338c6d2293517459ba6c2a2c7892ffce1c4d` |
| `MASTER7_WWW_DNS_ACTION_20261106.md` | `c593cced5c9f8ba281f437d9f47f46f004f535f5c6f048606c3f5c81b32c615c` |

本记录严格沿用原 MD 的证据边界：没有真实证据的项目标记“待验证”，支付、游戏钱包和资金结算维持维护关闭。
