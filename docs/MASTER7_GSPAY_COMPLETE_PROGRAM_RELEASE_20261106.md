# MASTER7 GSPAY 完整程序跟进

检查日期：2026-11-06（MYT）  
Portal：`17.0.0-selfbuilt.56-gspay-complete-program`  
Gateway：`1.10.0`

## 已完成

| 项目 | 状态 |
|---|---:|
| 厂家正式 MYR credential 安全保存在 Render | ✅ |
| 厂家建单请求和成功响应样本 | ✅ 工单 `PG-12683` |
| 网关固定调用 `api.thegspay.com` | ✅ |
| 付款链接只允许 `secured.gspay.online` | ✅ |
| 建单签名、金额、订单号和会员代号验证 | ✅ |
| 会员钱包 GSPAY 入口 | ✅ 程序完成 |
| 幂等订单与后台记录 | ✅ 程序完成 |
| 网关、查单、回调使用三个独立内部令牌 | ✅ |
| Game checks 分开显示连接、目录、启动、钱包 | ✅ |
| 钱包自动入账 | ❌ 保持关闭 |
| 真钱建单 | ❌ 保持关闭 |

## 厂家仍需回复

1. 主动查单成功及失败的完整外层 JSON，和 `auth_key` 的准确位置。
2. Payment 与 DuitNow 回调成功时，MASTER7 应返回的 HTTP 状态和正文。
3. 回调重试间隔、最长重试时间和事件幂等规则。
4. 生产白名单应登记的稳定 MASTER7 出口方式，以及端到端测试签收。

在这些资料完成并通过钱包账本验收前，`GSPAY_MYR_ORDERS_ENABLED`、
`GSPAY_MYR_QUERIES_ENABLED` 与 `GSPAY_MYR_CALLBACKS_ENABLED` 都必须是
`false`。建单成功只代表取得收银台链接，不代表会员已付款或可加余额。

## 验证

- Gateway：84/84 tests passed。
- Portal：162/162 tests passed。
- Render database：3/3 tests passed。
- Portal production build：passed。
- JavaScript syntax check：passed。
- 真钱订单、提款、自动加余额：0。
- Portal bundle SHA-256：`3ae6a01fbabe45c384f823d59578fa33dd881d75bff614e8a80b788df53afbc6`。

部署提交、Render deploy ID、在线健康检查与备份恢复验收会在本次发布完成后写入本文。
