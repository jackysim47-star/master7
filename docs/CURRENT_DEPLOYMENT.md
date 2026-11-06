# MASTER7 Current Deployment Receipt

更新时间：2026-11-06 17:07 MYT
验收时区：Asia/Kuching（MYT，UTC+8）

## 当前线上版本

| 项目 | 已核实值 |
|---|---|
| Current live release | `17.0.0-selfbuilt.62-operations-performance` |
| Release commit | `82cab3d5bf1e40804d4a9e657fbbe6f5b72d749b` |
| Portal deploy | `dep-dbmpfjm7bikc73bm623g`，`live` |
| 上线完成 | 2026-11-06 17:05:15 MYT |
| 部署包 SHA-256 | `efeb5d524692d0fc3252246b1eab5aee1cebb1cb5fbc565f3f6c82c48bfe7956` |
| Portal service | `srv-dbl0iv7f3r2c73848ei0` / `master7-v17-staging` |
| Render workspace | `tea-dakfo2h594qs73du231g` / ahbi |
| Region / plan | Singapore / `1c-2g` |
| Branch | `codex/v17-render-staging-20261104` |
| Auto deploy | Off；本次由 Render API 人工触发并记录 deploy ID |

## 发布验证

| 检查 | 结果 |
|---|---|
| 全套 Node 测试 | 173/173 通过 |
| ESLint | 0 error / 0 warning |
| Render SQL adapter | 3/3 通过 |
| Render production build | 成功；仅框架非阻断提示 |
| `git diff --check` | 通过 |
| `/health` | HTTP 200；release `.62`；database `ready` |
| `/admin` / `/signin` | HTTP 200 / 200 |
| 新版 `/assets/app.js` | HTTP 200；资金提示与分块名单代码已上线 |
| 匿名银行资料 / 资金事件 / 营销后台 | 均为 HTTP 401 |
| 部署后日志 | 09:03–09:06 UTC：应用 error/fatal 0，HTTP 5xx 0 |

## 当前入口

| 入口 | 结果 |
|---|---|
| `https://master7.best/` | HTTP 302 到当前 portal |
| `https://master7.site/` | HTTP 302 到当前 `/admin` |
| `https://master7-v17-staging.onrender.com/health` | HTTP 200，当前 `.62` |
| `www.master7.best` | 无 DNS 记录，未完成 |

## 本轮已上线范围

- 公司银行资料只有已登录且已批准会员可以从客户接口读取；匿名、未批准会员和后台角色被拒绝。
- 银行户口创建/修改、银行单提交、批准和拒绝与审计同事务；并发审核只有一个请求可取得 claim，钱包只入账一次。
- 后台首屏只加载摘要、健康和当前面板；其他面板按需加载、缓存并支持强制刷新。
- 资金事件改用轻量 cursor 接口；提示音可关闭，青色状态灯慢速呼吸，Audit log 独立滚动。
- 游戏大厅只渲染当前分类，首次 12 项、每次再载入 12 项；供应商和单游戏管理维持折叠。
- 联系人文件按 1 MiB 读取、每 1,000 条上传；后端使用导入锁、多行 UPSERT、持久计数和 600,000 硬上限。
- 获同意名单按 2,000 条复合索引 keyset 流式导出；保持标准 `+60` 电话格式，并对可编辑文字做 CSV 公式防护。

600,000 条生产数据库吞吐尚未使用非真实号码完成压测，因此该项仍需压力签收；当前已验证的是内存边界、批次、锁、硬上限和流式结构。

## 数据库与支援服务

- PostgreSQL：`dpg-dbkl1g3bc2fs739li01g-a` / `master7-cloud-staging-db`，Singapore。新实例启动完成 schema/index 初始化并报告 database ready。
- Integration gateway：`srv-db6b7inlk1mc73ck6cmg`。GSPAY 继续等待厂家提供本商户资料，程序与交易路由保持关闭。
- 本轮没有恢复或覆盖生产数据，没有建立真实支付、提款、payout、游戏启动或下注。

## 运行闸门

- `transactionsEnabled=false`
- `realPayments=false`
- `settlementVerified=false`
- `providerOrdersEnabled`: VPay=false、GSPAY=false、1MPAY=false、GSPAY+=false
- `liveGames=false`
- `productionReady=false`

这些值已在 `.62` 线上 `/health` 重验。后台状态灯只表示服务健康，不能代替厂家生产验收。

## 仍需外部资料

- GSPAY 等支付厂家本商户协议、白名单、建单/查单/回调/ACK/重试和结算证据。
- 游戏厂家真实启动、钱包、退出和下注结算验收。
- `www.master7.best` DNS。
- 正式 WhatsApp/SMS provider、获批模板、同意/退订和发送配额。
- Android/iPhone 真机及正式素材签收。
