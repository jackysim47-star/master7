# MASTER7 Payment Source Trace

更新时间：2026-11-06 MYT  
目标版本：`17.0.0-selfbuilt.59-full-platform-handover`

## 结论

三家支付并非“没有代码”。当前 `.59` 候选包由线上 `.58` 的可部署源码包直接解出并修改，支付适配器、路由、订单表和双分录钱包账本均可审查。离线程序测试与厂家生产验收是两件事：以下代码证据不代表真实资金链已通过，运行开关继续关闭。

| 厂家 | 可审查实现 | 离线证据 | 生产验收结论 |
|---|---|---|---|
| VPay | `lib/vpay.ts`；路由在 `lib/backend.ts` | 配置绑定、建单、独立查单、回调认证、重复回调单次入账及双分录账本模拟测试通过 | 通道 `suspended`；生产建单、查询、回调、钱包与结算未签收 |
| GSPAY | `lib/gspay.ts`；路由在 `lib/backend.ts` | PG-12683 的 MYR 建单响应形状、付款 URL 约束、幂等订单及 fail-closed 测试通过 | 通道 `closed`；查单契约和回调 ACK/重试规则未确认，结算代码保持关闭 |
| 1MPay | `lib/onempay.ts`；路由在 `lib/backend.ts` | API 1.3 签名、建单、查单、回调、迟到成功、重复通知、事务回滚及单次入账共 17 组测试通过 | 通道 `suspended`；厂家生产端到端和结算未签收；`/payout` 未调用 |

## 部署包到源码的关系

- Render 服务：`srv-dbl0iv7f3r2c73848ei0`，仓库 `jackysim47-star/master7`，分支 `codex/v17-render-staging-20261104`。
- 仓库跟踪的部署物是 `master7-v17-render-staging.tar.gz`。`.59` 候选源码由当前线上 `.58` 对应部署包解出后，只新增后台规范路径、MYT 时区修正及交接材料；支付实现没有在本次改写。
- 路由挂载位于 `lib/backend.ts:177`、`lib/backend.ts:183`、`lib/backend.ts:186` 和 `lib/backend.ts:316-320`。
- 数据层使用 `deposit_orders` 保存本地订单，`wallet_ledger` 保存 `member` 与 `provider_clearing` 两条金额相反的账本记录；唯一约束与 `ON CONFLICT ... DO NOTHING` 防止重复入账。

## 1MPay 对照

已收到 API Specification Release 1.3、商户资料、合同标识、密钥与出款公钥。敏感值不写入本报告，也不再要求用户在聊天中重发。

| 协议要求 | 源码位置 | 实现状态 |
|---|---|---|
| 建单 token：Base64(raw SHA256(merchant + amount + refid + customer + apikey + currency)) | `lib/onempay.ts:24-26` `oneMpayOrderToken` | 已实现并有固定向量测试 |
| 回调/查单 token：Base64(raw SHA256(... + trxno)) | `lib/onempay.ts:27-29` `oneMpayCallbackToken` | 已实现并有固定向量测试 |
| `POST /fundtransfer/json` | `lib/onempay.ts:103-130` `createOneMpayOrder` | 先落本地幂等订单，再服务器建单；失败不入账 |
| `GET /transquery/{trxno}/{base64_token}`，token 再 Base64 一次 | `lib/onempay.ts:49-74` `settle` | 已实现双层 Base64、URL 编码、字段绑定及独立成功确认 |
| 回调验签及订单/金额/客户/交易号绑定 | `lib/onempay.ts:75-85` `callback` | 已实现；回调状态本身不直接建立成功，必须独立查单 |
| 迟到成功和重复通知只入账一次 | `lib/onempay.ts:49-73` | 已实现原子双分录、冲突保护和账本复核 |
| 出款 `POST /payout` | `lib/onempay.ts:5-6` | 明确没有调用；收到公钥不等于已获出款权限 |

测试：`tests/onempay.test.mjs:61-142` 共 17 组，覆盖官方签名向量、两位小数、幂等、超时不重建、错误签名、独立查单、迟到成功、重复回调、事务回滚和旧 VPay 数据迁移。

仍需厂家精确确认：合同标识/密钥与 `merchant`/`apikey` 的字段映射、建单 Content-Type、完整错误码、回调成功 ACK 正文、重试次数/间隔、状态枚举及无 `trxno` 时的恢复规则。确认后才安排获授权的端到端验收。

## GSPAY 对照

- `lib/gspay.ts:98-128` `createGSPayOrder` 实现会员权限、两位小数、幂等本地订单、受控网关调用和 `secured.gspay.online/channel` URL 绑定。
- `tests/gspay-portal.test.mjs:29-61` 以 PG-12683 的 `payment_id=35802335` 及已提供成功建单形状进行模拟测试；建单不会给钱包加钱。
- `lib/gspay.ts:130-135` `refreshGSPayOrder` 明确返回 `GSPAY_QUERY_CONTRACT_PENDING`。
- `lib/gspay.ts:37-49` `handleGSPayCallback` 只验证机器凭据和请求边界，随后返回 `GSPAY_SETTLEMENT_DISABLED`，不会入账。

需要厂家补齐精确的查单外层响应、回调签名/字段、成功 ACK 及重试规则。完成代码和模拟测试后，仍要单独执行真实的建单→付款→查询/回调→钱包→对账验收。

## VPay 对照

- `lib/vpay.ts:81-129` `handleVPay` 读取独立网关配置并要求门户与网关模式、商户号、回调和返回地址一致。
- `lib/vpay.ts:131-176` `createVPayOrder` 先写入幂等本地订单，再请求 `/platform/vpay/order`；部分建单响应会用 `/platform/vpay/order-query` 独立补核。
- `lib/vpay.ts:178-207` `callback` 要求独立 callback token，再查单核对商户、订单、金额、交易号及成功状态；双分录使用唯一约束只入账一次。
- `tests/api.test.mjs:102-156` 覆盖默认关闭、配置不泄密、模式不匹配、模拟建单、独立查单、重复回调及部分响应。

这些是 VPay 存款实现。客户提款、厂家 payout 和商户结算属于不同流程，不能因为存款程序存在就标为已完成。

## 上线闸门

生产开启前，每家都必须独立取得六项证据：Connected、Order、Query、Callback、Wallet、Reconcile。任何一项缺失时，渠道状态、订单开关、`realPayments`、`settlementVerified` 与 `liveReady` 保持关闭；浏览器返回页不得直接增加余额。

