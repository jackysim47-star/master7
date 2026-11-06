# MASTER7 Current Deployment

更新时间：2026-11-06 15:35 MYT
验收时区：Asia/Kuching（MYT，UTC+8）

## 当前线上版本

| 项目 | 已核实值 |
|---|---|
| Release | `17.0.0-selfbuilt.59-full-platform-handover` |
| Portal commit | `d288fe6a00f8db76a518f4c7a9f3df111bb72e18` |
| Portal deploy | `dep-dbmnm0p5efls7384upu0`，`live` |
| 上线完成 | 2026-11-06 15:02:48 MYT |
| Portal service | `srv-dbl0iv7f3r2c73848ei0` / `master7-v17-staging` |
| Render workspace | `tea-dakfo2h594qs73du231g` / ahbi |
| Region / plan | Singapore / `1c-2g` |
| Branch | `codex/v17-render-staging-20261104` |
| Auto deploy | Off；本次使用 Deploy latest commit |
| `.61` 候选部署包 SHA-256 | `2b81c0130b0f2b2b973f8d747d665b852cbbd0940826eedc1ccffd80a386e75a` |

Render 在新实例就绪后切换流量。期间一次人工 Rollback 取消了中间部署；旧版回滚完成后，最终提交重新部署成功。最终运行身份以上表为准。

## 入口与只读验收

| 入口/检查 | 结果 |
|---|---|
| `https://master7.best/` | 302 到当前 portal |
| `https://master7.site/` | 302 到当前 `/admin` |
| `https://master7-v17-staging.onrender.com/health` | 200，release `.59`，database `ready` |
| `/admin` | 200 |
| `/admin/admin?lang=zh` | 302 到 HTTPS `/admin?lang=zh`，`Cache-Control: no-store` |
| Owner 登录 | 私有凭据只读登录通过，role `owner` |
| 年度财务接口 | currency `MYR`，timezone `Asia/Kuching` |
| 游戏同步状态 | 9 个集成供应商、769 款，`playable=false` |
| 部署后日志 | 07:00:19–07:04:16 UTC：应用 error/fatal 0，HTTP 5xx 0 |

`www.master7.best` 仍无 DNS 记录，不列为已完成入口。

## 数据库与支援服务

- PostgreSQL：`dpg-dbkl1g3bc2fs739li01g-a` / `master7-cloud-staging-db`，PostgreSQL 18，Singapore，状态 `available`。
- Integration gateway：`srv-db6b7inlk1mc73ck6cmg`，deploy `dep-dbmo2h4s728c739dilb0`，commit `6e9fb99f6575602d9f8e8089f51c70d88f5c834f`，状态 `live`，健康 200，版本 1.10.1。GSPAY 本商户建单证据未确认，程序与交易路由均保持关闭。
- 本次没有恢复或覆盖生产数据，没有建立真实支付、提款、payout、游戏启动或下注。

## 运行闸门

- `transactionsEnabled=false`
- `realPayments=false`
- `settlementVerified=false`
- `providerOrdersEnabled`: VPay=false、GSPAY=false、1MPAY=false、GSPAY+=false
- 渠道控制：VPay `suspended`、GSPAY `closed`、1MPAY `suspended`、GSPAY+ `closed`
- `liveGames=false`
- `productionReady=false`

这些值说明程序与交接已部署，不代表三家资金链或游戏供应商已经通过生产验收。

## 构建与测试

- 全套 Node 测试：165/165 通过。
- ESLint：0 errors、0 warnings。
- Render 数据库适配器：3/3 通过。
- Render production build：通过。
- 代理下后台规范路径修正：专项测试 1/1 通过，修正后 production build 再次通过。
- 支付与游戏使用模拟/只读证据；没有用真实资金做验收。

## 交付边界

三家逐阶段状态见 `PAYMENTS_ACCEPTANCE.csv` 和 `PAYMENT_SOURCE_TRACE.md`；80 行游戏清单见 `GAMES_ACCEPTANCE.csv`；F01–F28 见 `ISSUES_AND_FIXES.md`。未通过的厂家项目继续保持 fail-closed。
