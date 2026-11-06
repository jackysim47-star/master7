# MASTER7 Current Deployment and Candidate Receipt

更新时间：2026-11-06 16:48 MYT
验收时区：Asia/Kuching（MYT，UTC+8）

## 当前线上版本

| 项目 | 已核实值 |
|---|---|
| Current live release | `17.0.0-selfbuilt.61-full-platform-follow-up` |
| Runtime commit | `ec09115c1ec528952c7beeb044fba61b6e35cefc` |
| Portal deploy | `dep-dbmocd6c6qcc73e2mv4g`，`live` |
| Portal service | `srv-dbl0iv7f3r2c73848ei0` / `master7-v17-staging` |
| Render workspace | `tea-dakfo2h594qs73du231g` / ahbi |
| Region / plan | Singapore / `1c-2g` |
| Branch | `codex/v17-render-staging-20261104` |
| Auto deploy | Off；发布必须人工触发并记录 deploy ID |

## 本轮候选版本

| 项目 | 当前值 |
|---|---|
| Candidate release | `17.0.0-selfbuilt.62-operations-performance` |
| Portal commit | 发布后回填 |
| Portal deploy | 发布后回填 |
| 候选部署包 SHA-256 | `efeb5d524692d0fc3252246b1eab5aee1cebb1cb5fbc565f3f6c82c48bfe7956` |
| 全套 QA | 173/173；lint 通过；Render DB 3/3；production build 成功 |
| 线上复测 | 尚未执行；Render 显示 `live` 后才可填写 |

候选版完成的是平台自有代码范围：人工银行转账审计与并发审批保护、后台按需加载、轻量资金事件通知、提示音控制、青色慢速状态灯、独立滚动的 Audit log，以及 600,000 联系人分块导入和流式 CSV 导出。候选版尚未部署时，这些项目不得写成线上已完成。

## 当前入口与只读状态

| 入口/检查 | 结果 |
|---|---|
| `https://master7.best/` | 根域已解析；当前 portal 入口 |
| `https://master7.site/` | 当前后台入口 |
| `https://master7-v17-staging.onrender.com/health` | 线上 `.61`，database `ready` |
| `/admin` | 当前线上可访问 |
| `www.master7.best` | 无 DNS 记录，未完成 |

候选版发布后必须重新检查 `/health` 的 release、database 状态、`/admin`、`/signin`、HTTP 5xx 及应用 error/fatal；复测完成后再回填本页。

## 数据库与支援服务

- PostgreSQL：`dpg-dbkl1g3bc2fs739li01g-a` / `master7-cloud-staging-db`，Singapore，状态以 Render 发布时检查为准。
- Integration gateway：`srv-db6b7inlk1mc73ck6cmg`。GSPAY 仍等待厂家提供本商户资料，程序与交易路由保持关闭。
- 本轮不会恢复或覆盖生产数据，不会建立真实支付、提款、payout、游戏启动或下注。

## 运行闸门

- `transactionsEnabled=false`
- `realPayments=false`
- `settlementVerified=false`
- `providerOrdersEnabled`: VPay=false、GSPAY=false、1MPAY=false、GSPAY+=false
- 渠道控制：VPay `suspended`、GSPAY `closed`、1MPAY `suspended`、GSPAY+ `closed`
- `liveGames=false`
- `productionReady=false`

这些值说明平台继续 fail-closed。后台状态灯、程序就绪或目录资料都不能代替厂家生产验收。

## 候选版 QA 边界

- 人工银行转账创建、提交、批准和拒绝与审计记录写在同一事务；重复或并发审批只有取得 claim 的请求可以改变钱包。
- 后台初次进入只加载摘要、健康与当前面板；其他面板首次打开时加载并缓存，手动刷新才强制重读。
- 资金提示轮询只取得事件类型、ID 和游标，不返回姓名、金额、银行、账号或银行单。
- 600,000 联系人导入按 1 MiB 读取、每 1,000 条上传，并由后端导入锁、多行 UPSERT、持久计数及硬上限保护；导出按 2,000 条复合索引 keyset 分页流式输出，只包含 `opted_in`。生产 600,000 条吞吐仍待非真实号码压测。
- 真实资金、真实游戏启动和真实出款不属于自动测试，本轮不把它们标成完成。

三家逐阶段状态见 `PAYMENTS_ACCEPTANCE.csv` 和 `PAYMENT_SOURCE_TRACE.md`；游戏逐项状态见 `GAMES_ACCEPTANCE.csv`；F01–F28 见 `ISSUES_AND_FIXES.md`。
