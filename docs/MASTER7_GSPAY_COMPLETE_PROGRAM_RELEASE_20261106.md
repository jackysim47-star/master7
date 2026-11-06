# MASTER7 GSPAY 完整程序跟进

检查日期：2026-11-06（MYT）  
Portal：`17.0.0-selfbuilt.56-gspay-complete-program`  
Gateway：`1.10.1`（证据修正版）

## 已完成

| 项目 | 状态 |
|---|---:|
| 厂家正式 MYR credential 安全保存在 Render | ✅ |
| MASTER7 建单成功/失败响应 | ❌ 先前引用的工单不属于 MASTER7，不能用于验收 |
| 网关固定调用 `api.thegspay.com` | ✅ |
| 付款链接只允许 `secured.gspay.online` | ✅ |
| 建单签名、金额、订单号和会员代号验证 | ✅ |
| 会员钱包 GSPAY 入口 | ✅ 程序完成 |
| 幂等订单与后台记录 | ✅ 程序完成 |
| 网关、查单、回调使用三个独立内部令牌 | ✅ |
| Game checks 分开显示连接、目录、启动、钱包 | ✅ |
| 钱包自动入账 | ❌ 保持关闭 |
| 建单程序就绪 | ❌ `createProgramReady=false`，保持关闭 |
| 真钱建单 | ❌ 保持关闭，网关在联系厂家前返回 503 |

## 厂家仍需回复

1. 为 `MASTER7VIPMYR+` 新开工单，并提供本商户建单成功及失败的完整响应。
2. 主动查单成功及失败的完整外层 JSON，和 `auth_key` 的准确位置。
3. Payment 与 DuitNow 回调成功时，MASTER7 应返回的 HTTP 状态和正文。
4. 回调重试间隔、最长重试时间和事件幂等规则。
5. 生产白名单应登记的稳定 MASTER7 出口方式，以及端到端测试签收。

在这些资料完成并通过钱包账本验收前，`GSPAY_MYR_ORDERS_ENABLED`、
`GSPAY_MYR_QUERIES_ENABLED` 与 `GSPAY_MYR_CALLBACKS_ENABLED` 都必须是
`false`。建单成功只代表取得收银台链接，不代表会员已付款或可加余额。

## 验证

- Gateway：84/84 tests passed。
- Portal：163/163 tests passed。
- Render database：3/3 tests passed。
- Portal production build：passed。
- JavaScript syntax check：passed。
- 真钱订单、提款、自动加余额：0。
- Portal bundle SHA-256：`606a6e541f07896522a98058c3bc1c4f1630fcbeff67a6d0cef087dc58f6ff3e`。

部署提交、Render deploy ID、在线健康检查与备份恢复验收会在本次发布完成后写入本文。
