# MASTER7 Payment Safety Release Receipt

候选版本：`17.0.0-selfbuilt.65-payment-safety`

发布状态：代码与构建验证完成；Render 人工部署待执行。

| 证据 | 当前记录 |
|---|---|
| Previous rollback release | `17.0.0-selfbuilt.64-game-controls` |
| Previous runtime commit / deploy | `1e243182e39aac52d3dfefa9f601134c5bd3240f` / `dep-dbmqj56tlv9c73bo3u6g` |
| Previous bundle SHA-256 | `01b946e4d04a8c02512e389993fe0939e344de6bef393a26e149bef780f8850a` |
| `.65` runtime commit / deploy | `PENDING` / `PENDING` |
| `.65` bundle SHA-256 | `PENDING` |
| `.65` live time | `PENDING` |

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

## 上线后必须回填

1. 记录实际 commit、部署包 SHA-256、Render deploy ID 和 `live` 时间。
2. `/health` 必须返回 `.65-payment-safety` 与 `database=ready`。
3. 三家支付总资金开关和新订单开关必须仍为 false；GSPAY 不得因本版自动开启。
4. 1MPay 应只显示既有订单查单可用：`queryReady=true`、`orderReady=false`。
5. 复查部署后的 error/fatal 与 5xx；如果任一闸门不符，回滚到上表 `.64` 部署。

## 仍需外部完成

- VPay：厂家生产环境、Render 出口白名单、查单和 callback 的受控验收。
- 1MPay：production-only，需受控真实充值验收；没有测试环境。
- GSPAY：准确 Operator Authentication Key、可保留 POST 正文的直达 callback 域名，以及受控真实充值验收。
- 公司银行：Owner 录入真实银行资料，并用获授权会员完成一次银行单、后台批准和钱包双分录验收。

这份回执只证明程序与离线验证。真实资金和厂家结算没有完成时，生产闸门继续关闭。
