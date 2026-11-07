# MASTER7 payment status display repair

Prepared: 2026-11-07 MYT. Target observed runtime: `17.0.0-selfbuilt.94-readiness-split`.

## 已完成与范围

本修复包纠正一个已复现的显示错误：某个支付状态 GET 失败、返回空对象/错误对象或缺失必要布尔字段时，旧页面把读取异常显示成该公司七项全部 ❌。修复后，该行显示“状态读取失败，请刷新重试”，其他公司的真实状态继续显示。

同时为现有七列表头与读失败提示补齐中文、英文和马来文。布尔条件不变；出款、商户余额和钱包结算未验收时仍是 ❌。可访问性文案使用“是/否”，不再把所有配置勾号都称作“验收通过”。

仅修改归档源码中的 `public/assets/app.js` 两个原有函数附近的显示逻辑。不会调用 POST、建立订单、发起出款、写钱包、切换业务开关或修改 verified。仓库的运行归档 `master7-v17-render-staging.tar.gz` 未修改；本修复包未合并、未部署。

## 确认的七列

| 原表头 | 中文含义 | 保留的判定 |
|---|---|---|
| Deposit configured | 充值已配置 | `capabilities.deposit.configured === true` |
| New order | 新建充值单 | `capabilities.deposit.enabled === true` |
| Query | 查单 | `queryReady === true` |
| Callback | 回调 | `callbacksReady === true` |
| Payout | 出款 | `capabilities.payout.enabled === true && capabilities.payout.submissionEnabled === true` |
| Balance | 商户余额 | `capabilities.balance.enabled === true` |
| Wallet verified | 钱包结算已验收 | `settlementVerified === true && liveReady === true` |

以上判定读自实际部署的公开 JavaScript，未根据截图猜测字段。

## 状态来源不一致：独立问题，仍待修复

2026-11-07 20:47 MYT 的只读检查发现，同一 `.94` 运行版本中：

- `/health` 的 VPay payout `configured/enabled/submissionEnabled` 均为 `true`。
- `/api/payments/vpay/status` 对应三项均为 `false`，并报告 `payout_configuration_incomplete`、`submission_disabled`。
- 前端表格采用 `/api/payments/vpay/status`，因此显示出款 ❌。GSPAY+ 与 1MPAY 使用各自的 status 端点。
- 前端 `api()` 使用 `cache: "no-store"`，当前 `.94` service worker 对 `/api/` 不缓存。现有证据不支持仅用旧浏览器缓存解释两处返回值相反。

本包不会任选 `/health` 为真值覆盖表格，也不会把未验收状态改为成功。`parity.mjs` 和 `check-live.mjs` 只报告差异；真实结算验收仍待完成。

发布清单声明的 Portal 源码提交 `a0b3b2ede1f0e51f4dfeccc666637ca5f0643c05` 在当前仓库查询返回 422（No commit found）。发布提交 `e3faa8ddc6b6fe87768e9e71f466ce48538bfad7` 提供了归档及清单；当前 GitHub 读取工具不能交付该二进制归档的内容。本包因此使用已读取的公开 `.94` JavaScript 函数制作可复用补丁，不虚构可直接修改的后端源码。

## 文件

- `payment-status-display.patch`：针对真实 `public/assets/app.js` 路径的统一 diff。
- `before.js` / `after.js`：精确的原显示函数与候选替换代码，供审阅和离线验证。
- `apply.mjs`：默认只检查；应用前校验完整 SHA-256，保存原文件备份；支持校验回滚。
- `test.mjs`：DOM 行为、真实假值保留、三语、错误不泄漏、只读调用、差异检测和应用保护的离线测试。
- `parity.mjs` / `check-live.mjs`：比较 health 与 provider status 的只读回归探针。
- `evidence.json`：最小公开状态证据及文件校验值，不含会员、订单、银行账号或凭据。

## 使用方式

先从已授权来源取得并校验 `.94` 发布归档，在隔离目录解压。发布清单归档 SHA-256 为：

`6d1a96b5a5cfa6e88a87908485c6af32e5d4cfc6a57da49420b1be48b76598d2`

在本修复包目录运行；以下路径应替换为实际解压源码目录：

```sh
node --test test.mjs
node apply.mjs /absolute/extracted/source --check
node apply.mjs /absolute/extracted/source --apply
node --check /absolute/extracted/source/public/assets/app.js
```

如原文件与本次读取的完整 asset SHA-256 不同，工具会拒绝写入，需要先审查新版本差异。它不会覆盖其他版本或已有未知备份。

只回滚这次显示修复：

```sh
node apply.mjs /absolute/extracted/source --rollback
```

原文件备份保留在 `public/assets/app.js.master7-payment-status-display.bak`。工具仅在当前文件和备份均匹配预期校验值时回滚。

在允许访问目标域名的环境中执行公开 GET 一致性检查：

```sh
node check-live.mjs https://master7-v17-staging.onrender.com
```

退出码：0 表示能力字段一致；1 表示字段不一致；2 表示本次读取失败、不能得出能力结论。没有用户名、密码、cookie 或其他凭据，也不会写生产。

## 本次验证

- Node.js `v24.22.1`。
- **14/14 离线测试通过，0 失败、0 跳过**，包含原错误复现及完整公开 asset 的检查、应用、重复应用、回滚验证。
- 完整候选 JavaScript 的 `node --check` 通过。
- 原公开 asset SHA-256：`ba2a9a390d008cf338d8db36a735aa2a76f7e0732f6012e29bfc728e2b28c118`。
- 候选 asset SHA-256：`b5146b9f05e73cbcc682bf4764f963e3672e013b29d497f22e1a7dec92fdfc70`。
- 源文件仅在本地临时副本中替换与回滚。没有运行生产交易或修改线上服务。

完整 asset 回滚集成测试使用以下形式执行，源码路径仅用于读取本地副本：

```sh
MASTER7_INSPECTED_APP_JS=/absolute/inspected/app.js node --test test.mjs
```

离线测试通过不表示 VPay 后端状态差异已修复，更不表示供应商结算、出款或余额功能已验收。

## 来源

- 运行 JavaScript：<https://master7-v17-staging.onrender.com/assets/app.js>
- 当前 service worker：<https://master7-v17-staging.onrender.com/service-worker.js>
- 健康状态：<https://master7-v17-staging.onrender.com/health>
- VPay：<https://master7-v17-staging.onrender.com/api/payments/vpay/status>
- GSPAY+：<https://master7-v17-staging.onrender.com/api/payments/gspay/status>
- 1MPAY：<https://master7-v17-staging.onrender.com/api/payments/1mpay/status>
- `.94` 发布清单：<https://github.com/jackysim47-star/master7/blob/e3faa8ddc6b6fe87768e9e71f466ce48538bfad7/docs/MASTER7_READINESS_SPLIT_RELEASE_SHA256_20261107.txt>
