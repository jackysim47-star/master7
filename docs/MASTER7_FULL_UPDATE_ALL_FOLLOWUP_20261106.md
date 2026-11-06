# MASTER7 · Full Update All Follow-up

核对时间：2026-11-06 14:28:48 MYT  
Portal：`17.0.0-selfbuilt.58-payment-startup-guard`  
Commit / Render deploy：`479ac1559f8e573be549a1e5f0fd299a8eb2bba3` / `dep-dbmn2cff3r2c73b4q6d0` (`live`)  
Gateway：`1.10.0`

## 一眼看完整状态

| 模块 | 状态 | 实际结果 |
|---|---:|---|
| 客户入口 | ✅ | `master7.best` HTTP 200，进入客户登录 |
| 员工后台 | ✅ | 使用 `master7.site` 根网址，HTTP 200，进入 `/admin` |
| Android APK | ✅ | v17.0.52，线上下载正常 |
| iPhone Web App | ✅ | Manifest 正常，可加入主画面 |
| 注册与 SMS OTP | ✅ 程序就绪 | `smsOtpReady:true`；本次未另发真实短信 |
| 账号与权限 | ✅ | 4 个账号：Owner 1、Staff 1、Member 2；全部已批准 |
| 三家支付程序 | ✅ 已接入 | VPay、GSPAY、1MPAY 都在前后台及检查表出现 |
| 三家真钱充值 | ❌ | `realPayments:false`、`settlementVerified:false` |
| 公司银行入款 | ⏳ 等资料 | 页面、上传收据、Approve/Reject 程序完成；银行户口 0 个 |
| 游戏目录 | ✅ | 769 项，自动分类和每次 12 项加载程序保留 |
| 游戏启动/钱包 | ❌ | 全部 `launchVerified:false`、`walletVerified:false` |
| 福利与 turnover | ✅ 程序 | 自动计算完成；现有福利 0 个 |
| 公司广告 | ✅ 程序 | 1200×360、轮播和链接完成；现有广告 0 个 |
| Referral / Commission | ✅ 程序 | 3 层 5% / 2% / 1%，每周一、手动领取；关系 0 个 |
| 自动 Commission 入钱包 | ❌ | 等资金结算验收 |
| 日/月/半年/年账目 | ✅ | MYT 报表和 CSV 完成；当前正式入款与提款均 RM0 |
| 客服 | ✅ 人工流程 | Ticket 与人工接手完成；目前未有工单 |
| AI 自动回复 | ⏳ | 开关已开，AI provider 尚未接入，未自动回复 |
| 600k 推广名单 | ✅ 导入程序 | 最大 600,000；当前联系人 0，官方发送 API 未连接 |
| 加密备份恢复 | ✅ | 30 张表、244 条记录、外键错误 0 |

## VPay / GSPAY / 1MPAY

| 公司 | Connected | Order | Query | Callback | Wallet | 通道状态 |
|---|---:|---:|---:|---:|---:|---|
| VPay | ✅ | ❌ | ❌ | ❌ | ❌ | Suspended |
| GSPAY | ✅ | ❌ | ❌ | ❌ | ❌ | Close |
| 1MPAY | ✅ | ❌ | ❌ | ✅ | ❌ | Suspended |

- VPay：生产 credential 与支付程序存在；厂家生产 QA 和钱包结算未验收。
- GSPAY：正式 credential、签名和建单程序完成；厂家查单外层及回调确认/重试规则仍未齐。
- 1MPAY：程序与回调配置完成；端到端付款、查单、入钱包和对账未生产验收。
- 启动保护已上线。重启不会再因 credential 齐全而自动把通道变成 Active。

数据库保留 8 条未确认旧测试记录：VPay 5 条、1MPAY 3 条，状态均为
`unknown`。今天正式 credited 入款为 0，没有自动增加会员钱包。

## 游戏完整状态

| 厂家 | 目录 | 当前连接 | Launch | Wallet |
|---|---:|---:|---:|---:|
| MegaH5 | 166 | ✅ | ❌ | ❌ |
| JILI | 297 | ✅ | ❌ | ❌ |
| 918KISS H5 | 92 | ✅ | ❌ | ❌ |
| Rectangle | 64 | ✅ | ❌ | ❌ |
| EVO888H5 | 150 缓存 | ❌ stale | ❌ | ❌ |
| EPICWIN | 0 | ❌ 403 | ❌ | ❌ |
| VENUS | 0 | ❌ | ❌ | ❌ |
| CLOTPLAY | 0 | ❌ 403 | ❌ | ❌ |
| 精选游戏 | 0 | ❌ 403 | ❌ | ❌ |

目录共 769 项：Active 618、Suspended 148、Closed 3。现在全部属于
Paid 区。前台分类、Lazy Load、供应商状态按钮可用，但真实启动和钱包结算
尚未验收，因此平台仍返回 `liveGames:false`。

## 后台现有资料

- 供应商品牌目录：76 个；Active 39、Close 37；品牌照片 0。
- 公司银行户口：0；银行收据请求 0；提款请求 0。
- 福利：0；广告：0；公告：0；自定义游戏：0。
- 推广联系人：0；活动：0；Referral code：1。
- 社交主页：未启用。
- Audit events：107；今天 write rate limit：0。
- 支付诊断保留 2 条安全记录，不含 credential。

以上 0 项代表管理程序已经存在，但还没有实际银行资料、广告图片、福利规则
或推广名单。系统不会自行猜测银行号码、优惠金额或客户同意状态。

## 域名注意事项

- 员工请直接打开 `https://master7.site/`。这个网址本身已经转去 `/admin`；
  再手动加 `/admin` 会变成 `/admin/admin` 并返回 404。
- `www.master7.best` 当前仍不可用；客户主网址 `master7.best` 正常。

## 验证证据

- Portal tests：164/164。
- Render database tests：3/3。
- Gateway tests：84/84。
- Production build：passed。
- Render application error/fatal logs：0。
- 加密备份：AES-256-GCM / RSA-OAEP-SHA256；恢复外键错误 0。
- 本轮只做只读跟进，没有建立付款、提款、钱包入账或发送推广信息。
