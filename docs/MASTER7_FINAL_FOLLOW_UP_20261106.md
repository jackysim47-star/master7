# MASTER7 Final Follow-up

更新时间：2026-11-06 15:35 MYT  
范围：Portal、Integration Gateway、VPay、GSPAY、1MPay、游戏目录、会员钱包保护、构建与交付。

## 已完成

- 本次上传的完整交接文件已核对；已核对的四份副本内容一致，SHA-256 为 `dd6ac6bc2000f66703221b102ac51ba7c13bd19c1eb0e9c35e5268378a606e2a`。
- 最新端到端检验报告的两份副本完全相同，已合并为一份；原件 SHA-256 为 `f62a33223356f94a0472bb88ecb5eebe75200eb77acd57147e66a537ae9631eb`，其中 15:39 的部署状态由 `.61` 最终回执更新。
- 错误归属于其他商户的 GSPAY 工单已从 MASTER7 的有效证据、测试资料和验收表移除。
- Gateway `1.10.1` 已上线：deploy `dep-dbmo2h4s728c739dilb0`，commit `6e9fb99f6575602d9f8e8089f51c70d88f5c834f`。
- GSPAY 在本商户建单响应未确认前固定关闭；建单、查单、回调结算和会员钱包入账都不会执行。
- Portal 最终版 `17.0.0-selfbuilt.61-full-platform-follow-up` 已通过 165/165 测试、ESLint 0 error/0 warning 和 Render production build；Portal 与 Gateway 的 GSPAY `createProgramReady` 均固定为 false。
- 支付三家公司各自保留独立状态与后台记录；没有用一个公司的证据代替另一家公司。
- 游戏前台保持按类别自动筛选，后台保留每个厂家和每款游戏的 Active、Maintenance、Close 独立控制。

## 线上实况

| 范围 | 当前结果 |
|---|---|
| Portal / database | `.61` 已上线，database ready；deploy `dep-dbmocd6c6qcc73e2mv4g` |
| GSPAY | credential 已登记；MASTER7 建单响应、回调 ACK/重试未确认；关闭 |
| 1MPay | API 1.3 适配与离线测试完成；字段映射、Content-Type、ACK/重试及生产 E2E 待厂家确认；关闭 |
| VPay | 程序与配置存在；生产 Deposit E2E、银行/Trade Code、IP 白名单与回调验收待厂家；关闭 |
| 游戏 | 目录可同步；真实启动、钱包与结算未验收；EpicWin、ClotPlay、Venus、EVO888H5 上游目录当前返回 502 |

## 厂家只需回复的内容

可直接发送的三段短信息在 `PAYMENT_VENDOR_MESSAGES_ZH.md`。厂家回复后，逐公司完成建单、独立查单/回调、防重复、单次钱包入账和后台对账；只打开已签收的那家公司。

## 保护状态

- `transactionsEnabled=false`
- `realPayments=false`
- `settlementVerified=false`
- `liveGames=false`
- `productionReady=false`

这些开关保持关闭，直到对应厂家交付本商户的生产证据并完成真实端到端验收。
