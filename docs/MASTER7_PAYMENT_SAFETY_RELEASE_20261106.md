# MASTER7 Payment Safety Release Receipt

发布版本：`17.0.0-selfbuilt.65-payment-safety`

发布状态：Render deploy `live`，线上复测完成。

| 证据 | 当前记录 |
|---|---|
| Previous rollback release | `17.0.0-selfbuilt.64-game-controls` |
| Previous runtime commit / deploy | `1e243182e39aac52d3dfefa9f601134c5bd3240f` / `dep-dbmqj56tlv9c73bo3u6g` |
| Previous bundle SHA-256 | `01b946e4d04a8c02512e389993fe0939e344de6bef393a26e149bef780f8850a` |
| `.65` runtime commit / deploy | `6b432399eabf09b22e6a309e4a547c700515cfbc` / `dep-dbmr15s9v7es73ahfaf0` |
| `.65` bundle SHA-256 | `2af1922f4018a4213e38fad7d5ab101188a183dbdd605f530d017e1ee70b4026` |
| `.65` live time | 2026-11-06 18:51:17 MYT |

## 修复内容

- VPay callback 在任何成功 ACK 前，强制核对钱包双分录属于订单会员、币种和金额一致、借贷总额为零。
- 找不到账本、只有一边、金额/币种错误、跨会员或不平衡时，订单进入 `review`；系统不再继续查询、补写或返回成功。
- VPay 的资金写入由数据库内的订单、Provider、订单状态和厂家流水共同约束；提交后再次读取订单和账本，确认才返回成功。
- 1MPay 的 `queryReady` 由既有程序配置决定，不再被新订单开关错误关闭。因此停止接新订单时，历史订单仍可查单和 reconciliation。
- 修复 AI 客服响应对象重复 `status` 的 TypeScript 阻断；补齐现有 GSPAY Render 环境变量的类型声明。没有写入或变更任何 secret。

## 发布前验证

| 范围 | 命令 | 结果 |
|---|---|---:|
| TypeScript | `npx tsc -p tsconfig.render.json --noEmit` | 通过 |
| Portal 全套测试 | `node --test tests/*.test.mjs` | 199/199 通过 |
| 受影响文件 lint | `npx eslint ...` | 通过 |
| Render SQL adapter | `pnpm test:render-db` | 3/3 通过 |
| Render production build | `pnpm build:render` | 通过 |

测试包含 VPay 正常双分录、缺失/部分/跨会员账本 fail-closed，以及 1MPay 关闭新订单后继续查询既有订单。全部测试使用本地或模拟 provider 回包；没有发送真钱、建立真实订单、执行 payout、启动游戏转账或改变会员钱包。

## 上线验证

1. `/health` HTTP 200，返回 `.65-payment-safety` 与 `database=ready`。
2. `transactionsEnabled=false`、`realPayments=false`、`settlementVerified=false`、`productionReady=false`；所有 `providerOrdersEnabled` 均为 false。
3. 1MPay 为 `programReady=true`、`queryReady=true`、`callbacksReady=true`、`orderReady=false`。
4. VPay order/query/callback 均为 false，渠道为 Suspended；GSPAY `programConfigured=false`，order/query/callback 均为 false，渠道为 Close。
5. 游戏保持 766 款、618 Active、148 Maintenance，`playable=false`。新实例启动后的 Portal 日志 error/fatal 为 0，5xx 为 0。

## 仍需外部完成

- VPay：厂家生产环境、Render 出口白名单、查单和 callback 的受控验收。
- 1MPay：production-only，需受控真实充值验收；没有测试环境。
- GSPAY：准确 Operator Authentication Key、可保留 POST 正文的直达 callback 域名，以及受控真实充值验收。
- 公司银行：Owner 录入真实银行资料，并用获授权会员完成一次银行单、后台批准和钱包双分录验收。

这份回执只证明程序与离线验证。真实资金和厂家结算没有完成时，生产闸门继续关闭。
