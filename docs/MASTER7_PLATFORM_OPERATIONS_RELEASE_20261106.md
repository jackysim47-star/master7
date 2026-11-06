# MASTER7 Platform Operations Release · 2026-11-06

线上版本：`17.0.0-selfbuilt.62-operations-performance`
上一版本：`17.0.0-selfbuilt.61-full-platform-follow-up`
营运时区：Asia/Kuching（MYT，UTC+8）
状态：已部署并完成线上健康、入口、权限边界与日志复测。

## 1. 本轮目标

在等待支付厂家补齐商户资料期间，先完成不依赖厂家的平台工作：人工银行转账安全、后台速度、资金提示、长记录浏览和 600,000 联系人名单处理。支付和游戏生产闸门不因本轮改动打开。

## 2. 已完成的源码范围

### 2.1 人工银行转账

- 公司银行户口接口只允许已登录且已批准的会员读取；未登录、未批准及后台角色不能从客户接口取得账号资料。
- 银行户口创建/修改、客户银行单提交、批准和拒绝与对应 Audit 写入同一数据库事务。
- Audit 目标只保存银行配置 ID 或订单 ID，不保存银行账号、户名或银行单内容。
- 批准/拒绝先取得单次 claim；未取得 claim 的并发请求返回 409。
- 钱包入账和订单状态在同一批处理中，避免重复审批导致二次增加钱包。
- 重复客户提交维持幂等，不产生重复 Audit。

### 2.2 后台性能与通知

- 后台首屏只加载摘要、`/health` 和当前面板。
- 隐藏面板首次点击时加载；成功结果缓存；同一面板并发请求去重；手动刷新强制重读。
- 新增轻量 `GET /api/admin/financial-events?after=<cursor>`，每次最多 50 个事件。
- 首次取得最新游标但不播放旧记录；同一游标不会重复返回事件。
- Owner 可接收充值、人工银行转账和提款事件；Staff 只接收人工银行转账事件。
- 事件响应只含 cursor、type 和 ID，不含客户、金额、银行、账号或银行单。

### 2.3 后台操作界面

- 顶栏增加资金提示音开关、浏览器音频解锁和试听。
- 新事件使用三音提示；偏好保存在当前浏览器。
- 当前菜单显示青色小灯；健康状态 `LIVE` 以青色慢速呼吸显示。
- 长菜单限制在视口内滚动；Audit log 独立滚动并显示接口返回的最多 100 条。
- 游戏管理继续使用折叠层级；大厅只渲染所选分类，首次 12 项、每次再载入 12 项。

### 2.4 600,000 联系人名单

- 浏览器不再以 `file.text()` 把整份文件载入内存。
- 文件按 1 MiB 分块读取，`TextDecoder` 以 streaming 模式处理 UTF-8 跨块和残行。
- 每 1,000 条合格联系人立即上传；当前批次在内存去重，跨批次由数据库唯一约束去重。
- 后端以导入锁串行处理批次，每 1,000 条最多执行 10 个多行 UPSERT；持久计数负责 600,000 条硬上限，只有计数缺失或损坏时才重新 COUNT。
- CSV 导出使用 `ReadableStream`，每页 2,000 条，以 `(created_at,id)` keyset 分页，最多 600,000 条。
- 数据库增加 `(consent_status,created_at,id)` 导出索引；只导出 `opted_in`，保留 Referral link，并防止 spreadsheet formula 注入。
- 双引号 CSV 名称可以包含逗号或分号；退订记录不会被后续导入重新打开。

上述改动已经完成内存边界、流程、权限和自动测试；尚未在生产数据库实际导入 600,000 条，因此生产吞吐仍需使用非真实号码资料压测后签收。

## 3. 发布验证记录

| 验证 | 结果 |
|---|---|
| 相关专项测试 | 银行权限 39/39；营销/API/迁移 43/43；均通过 |
| `node --test tests/*.test.mjs` | 173/173 通过 |
| `pnpm lint` | 通过，0 error / 0 warning |
| `pnpm test:render-db` | 3/3 通过 |
| `pnpm build:render` | 成功；仅框架非阻断提示 |
| `git diff --check` | 通过 |
| Bundle SHA-256 | `efeb5d524692d0fc3252246b1eab5aee1cebb1cb5fbc565f3f6c82c48bfe7956` |
| Git commit | `82cab3d5bf1e40804d4a9e657fbbe6f5b72d749b` |
| Render deploy ID / status | `dep-dbmpfjm7bikc73bm623g` / `live` |
| 线上 health / database | HTTP 200；`.62`；database `ready` |
| 部署后 error/fatal / HTTP 5xx | 0 / 0（09:03–09:06 UTC） |

以上发布验证已全部通过，`.62` 已写为当前线上版本。

## 4. 保持关闭的项目

- `transactionsEnabled=false`
- `realPayments=false`
- `settlementVerified=false`
- VPay、GSPAY、1MPay、GSPAY+ 的生产建单保持关闭或暂停。
- `liveGames=false`
- `productionReady=false`
- 真实 WhatsApp/SMS 群发未接 provider；后台只提供获同意名单管理、活动草稿、Referral link、Share/CSV。

GSPAY 当前等待厂家提供本商户可验证资料。本轮不猜测接口、不使用其他商户样本，也不提前启用。

## 5. 线上复测结果

1. `/health` 已返回 `.62`，database 为 `ready`。
2. `/admin`、`/signin`、`master7.best` 和 `master7.site` 均正常，无循环跳转。
3. 匿名银行资料、资金事件和营销后台均返回 401；Owner/Staff 权限与按需加载由自动测试覆盖。
4. 提示音、青色状态灯与分块名单代码已从线上静态资源核对；浏览器实际音量仍由使用者设备控制。
5. 分块上传、重复过滤、退订保护、600,000 硬上限和流式 CSV 已自动测试；600,000 条生产吞吐仍待非真实号码压测。
6. 并发银行单审核自动测试确认只有一个请求成功，其余返回 409，钱包只增加一次。
7. Render 新部署日志的应用 error/fatal 和 HTTP 5xx 均为 0。
8. 所有资金、游戏和生产开关在 `.62` 线上仍为 false。

## 6. 仍需外部资料

- 支付厂家商户专属协议、白名单、建单/查单/回调/ACK/重试和结算证据。
- 游戏厂家真实启动、钱包、退出及下注结算协议和验收。
- `www.master7.best` DNS。
- 正式消息 provider、获批模板、同意/退订和速率配额。
- Android/iPhone 真机与正式素材签收。
