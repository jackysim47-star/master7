# MASTER7 Operations Corrections Release Receipt

发布版本：`17.0.0-selfbuilt.66-operations-corrections`

发布状态：Render deploy `live`，线上复测完成。

| 证据 | 当前记录 |
|---|---|
| Rollback release | `17.0.0-selfbuilt.65-payment-safety` |
| Rollback runtime commit / deploy | `6b432399eabf09b22e6a309e4a547c700515cfbc` / `dep-dbmr15s9v7es73ahfaf0` |
| `.66` runtime commit / deploy | `7cd1c0bc7cd4f364b73770b01f864abfbe1c07fc` / `dep-dbmrd2s9v7es73aialp0` |
| `.66` bundle SHA-256 | `bfdfcb22549911ca996b25b84617b4064cb9da2c425c3644c06b497f4e5b4285` |
| `.66` live time | 2026-11-06 19:16:31 MYT |

## 修复内容

- 福利规则的固定 Turnover 只有大于零时才采用。固定值为零时，后台 API、规则摘要和前台预览都会使用已配置 multiplier。
- 会员低于最低存款时，福利计算同时返回奖励 0 与 Turnover 0，避免把不符合资格的预估流水交给后续程序。
- 后台铃铛数字只统计未关闭客服工单；Owner/Staff 点击后直接进入 Support 并刷新工单列表。待审批会员继续由会员管理入口显示。
- Referral 卡把当前数字标为“L1 原始预估（不可领取）”；API 返回 `commissionEstimateType=l1_all_time_gross` 与 `commissionWithdrawable=false`。正式周期、hold、cap 和钱包入账保持独立并继续关闭。

## 发布前验证

| 范围 | 命令 | 结果 |
|---|---|---:|
| TypeScript | `npx tsc -p tsconfig.render.json --noEmit` | 通过 |
| Portal 全套测试 | `node --test tests/*.test.mjs` | 202/202 通过 |
| Portal lint | `pnpm lint` | 通过 |
| Render SQL adapter | `pnpm test:render-db` | 3/3 通过 |
| Render production build | `pnpm build:render` | 通过 |
| 文档/补丁格式 | `git diff --check` | 通过 |

验证覆盖零固定 Turnover、最低存款不合格、Referral 元数据、铃铛工单计数、Support 跳转与角色限制。没有发送真钱、建立真实订单、执行 payout、启动游戏转账或改变会员钱包。

## 上线验证

1. `/health` HTTP 200，返回 `.66-operations-corrections` 与 `database=ready`。
2. `transactionsEnabled=false`、`realPayments=false`、`settlementVerified=false`、`productionReady=false`、`liveGames=false`；所有 `providerOrdersEnabled` 均为 false。
3. VPay 为 Suspended，order/query/callback 均为 false；1MPay 为 Suspended，program/query/callback 为 true、order 为 false；GSPAY 为 Close，program/order/query/callback 均为 false。
4. 游戏保持 766 款、618 Active、148 Maintenance，`playable=false`。线上 `app.js` SHA-256 为 `0c098d367afa05ee8324f2941ef927da0b3a6cd60277c18e5b47996025d9d05f`。
5. 新实例 application error/critical/fatal 为 0，request 5xx 为 0。

## 保持关闭的项目

- 真实支付、新订单、callback 结算、payout 与自动钱包派发。
- 游戏真实 Launch、Wallet、Exit 与 Settlement 的生产签收。
- Referral 佣金钱包入账及福利自动钱包派发。
- AI 自动回复与 WhatsApp/SMS 正式群发。

## 仍需外部完成

- Owner 录入真实公司银行资料，并以获授权会员完成一次银行单、后台批准与钱包双分录验收。
- 输入实际福利、Turnover、佣金规则和公司广告内容。
- VPay、1MPay、GSPAY 与游戏厂家完成各自生产端、白名单和受控真实验收。
- 配置正式 AI provider、WABA/BSP、批准模板、Webhook，并完成 Android/iPhone 真机验收。

这份回执证明 `.66-operations-corrections` 程序、离线验证和线上健康检查已经完成。真实资金、厂家结算和游戏启动仍需独立受控验收；`.65-payment-safety` 保留为回滚版本。
