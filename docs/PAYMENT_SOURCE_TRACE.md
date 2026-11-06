# MASTER7 Payment Source Trace

更新时间：2026-11-06 17:43 MYT
目标版本：`17.0.0-selfbuilt.63-gspay-contract`

离线程序证据不等于真实资金验收。VPay、GSPAY 与 1MPay 的渠道和订单开关保持关闭；每家必须分别完成 Connected、Order、Query、Callback、Wallet、Reconcile。

| 厂家 | 可审查实现 | 离线证据 | 生产阻塞 |
|---|---|---|---|
| VPay | `lib/vpay.ts`；`lib/backend.ts` | 配置绑定、幂等建单、独立查单、callback、双分录与重复通知测试 | 生产 E2E、钱包及商户结算未签收 |
| GSPAY | `lib/gspay.ts`、`lib/backend.ts` | 官方 MD5 建单/查单/callback、两分钟链接、十分钟拒绝、全字段绑定及单次平衡账本测试 | Operator Key 仍缺一位；callback 根域为 302；无真实 E2E/结算 |
| 1MPay | `lib/onempay.ts`；`lib/backend.ts` | API 1.3 签名、幂等、独立查单、callback、迟到成功、精确 `ok` ACK 与单次账本测试 | 仅 production；Content-Type/状态枚举/重试和真实 E2E 未签收 |

## GSPAY 源码对应

| 合约要求 | 实现边界 |
|---|---|
| `POST /v2/integrations/operators/{auth}/payment` | `lib/gspay.ts` 由 Portal 固定官方 origin；JSON 只含 transaction ID、两位小数金额、平台会员标识及 MD5 签名 |
| 收银台 | Portal 只接受 `secured.gspay.online` 的受信 HTTPS URL；本地记录 2 分钟期限 |
| `GET .../getpayment` | 独立查单绑定 payment ID、transaction ID、会员、金额、completed/success 与签名 |
| Payment callback | `/api/payment/gspay/callback` 在普通 Origin/CSRF 之前进入专用验证；auth key + MD5 + 独立查单后才能结算 |
| 无 callback | 10 分钟后拒绝/过期，不因浏览器返回页或过期 QR 增加余额 |
| Wallet | `deposit_orders` + 两条金额相反 `wallet_ledger`；唯一约束防重复 |

DuitNow、USDT、Payout 的文档不等于程序完成，本候选不调用这些端点。

## 1MPay 对照

- `contract` 对应 merchant，`secret_key` 对应 apikey；成功 callback 固定回复 HTTP 200 + `ok`。
- 建单、独立查单、迟到成功、重复 callback、事务回滚和单次账本有离线测试。
- 没有 sandbox；`/payout` 不调用。真实 E2E 只能在最后由 Owner 安排。

## 部署边界

Portal 部署物为 `master7-v17-render-staging.tar.gz`。本轮 GSPAY 由 Portal 直连官方 origin；integration gateway 工作区未修改且不部署。凭证只在 Portal Render 环境。`master7.best` 当前 302 URL Forwarding 必须改成直接 Render 域名或 body-preserving reverse proxy，之后才可接受 GSPAY callback。
