# MASTER7 Owner Handover

更新时间：2026-11-06 14:46:44 MYT

## 正式入口

- 客户：`https://master7.best/`
- 后台：`https://master7.site/`
- Render 直达后台：`https://master7-v17-staging.onrender.com/admin`
- Android：`https://master7-v17-staging.onrender.com/downloads/MASTER7-Android-v17.0.52.apk`
- iPhone：Safari 打开客户入口后使用“加入主画面”。

`www.master7.best` 仍缺 DNS。`.61` 保留 `.59` 的重复后台路径 `/admin/admin` 增加了回到 `/admin` 的保护。

## 管理权与账号

- 本轮已使用私有交付资料完成老板身份只读登录，角色为 Owner。
- 账号 ID、密码、恢复码和私钥只保存在用户的私有交付位置，不进入 Git。
- 后台的账号安全功能可修改 ID/密码并撤销旧会话。执行前应离线保存新的恢复资料。
- 员工和会员必须使用各自账号；厂家测试会员不得使用老板账号。

## 当前经营边界

- 支付通道：VPay suspended、GSPAY closed、1MPAY suspended、GSPAY+ closed。三家源码对应见 `PAYMENT_SOURCE_TRACE.md`；离线程序测试通过不等于生产资金验收。
- 游戏：目录 769，真实启动与钱包结算未验收，`liveGames=false`。
- 公司银行户口、广告、福利和推广联系人目前均为 0，系统不会自行填写。
- 不应在厂家验收前打开真钱充值、自动入账、游戏转账钱包或自动佣金入账。

## 备份与源码

- 当前运行源码包：`master7-v17-render-staging.tar.gz`。
- 私有加密备份及恢复回执位于 `/workspace/deliverables/private/`。
- 公开恢复摘要见 `DATA_RECOVERY_RECEIPT.md`。
- 当前 `.61` 部署身份与复测结果见 `CURRENT_DEPLOYMENT.md`。最终业务签收仍以 `ISSUES_AND_FIXES.md`、两份 Acceptance CSV 和实际厂家生产验收记录为准。
