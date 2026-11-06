# MASTER7 三家 Payment Gateway 完整跟进

检查时间：2026-11-06 14:22 MYT  
Portal：`17.0.0-selfbuilt.58-payment-startup-guard`  
Gateway：`1.10.0`

## 一眼看状态

| 公司 | 前台按钮/钱包入口 | 后台记录 | 厂家程序 | 真钱可用 |
|---|---:|---:|---:|---:|
| VPay | ✅ | ✅ | ✅ UAT 程序 | ❌ |
| GSPAY | ✅ | ✅ | ✅ 正式建单程序 | ❌ |
| 1MPAY | ✅ | ✅ | ✅ 程序与回调配置 | ❌ |

## VPay

- ✅ 平台入口、订单程序、记录与签名程序保留。
- ✅ 公网状态接口正常返回。
- ❌ 当前 `channelStatus: suspended`、`enabled: false`、`liveReady: false`。
- ❌ 不能当作已完成生产充值。

## GSPAY

- ✅ 正式 MYR credential 已安全放在 Render，没有写入源码或报告。
- ✅ 工单 `PG-12683` 已确认建单请求与成功响应。
- ✅ 网关签名、固定厂家域名、固定收银台域名、会员钱包入口、幂等订单和后台记录完成。
- ✅ 三个独立内部令牌已配对；错误回调令牌拒绝，正确令牌在关闭状态返回安全 503。
- ✅ `configured: true`、`createProgramReady: true`。
- ❌ `orderReady: false`、`queryReady: false`、`callbacksReady: false`、`liveReady: false`。
- ❌ 厂家仍需确认主动查单完整外层、回调确认正文/HTTP 状态和重试/幂等规则。

## 1MPAY

- ✅ 平台入口、订单/查单程序、回调配置和后台记录结构保留。
- ✅ 公网状态接口正常返回。
- ✅ `programReady: true`、`callbacksReady: true`。
- ❌ 当前 `channelStatus: suspended`、`orderReady/queryReady: false`、`settlementVerified: false`、`liveReady: false`。
- ❌ 厂家端到端付款、回调入账与对账验收尚未通过。

## 本次上线

- ✅ Portal deploy：`dep-dbmn2cff3r2c73b4q6d0`，`live`。
- ✅ Gateway deploy：`dep-dbmmmj5g1s2s73bbh7e0`，`live`。
- ✅ Gateway tests：84/84。
- ✅ Portal tests：164/164。
- ✅ Render DB tests：3/3。
- ✅ Production build：passed。
- ✅ 加密备份恢复：30 张表、244 条记录、外键错误 0。
- ✅ 启动保护：凭证齐全不会再自动把支付通道变成 Active。
- ❌ `realPayments: false`、`settlementVerified: false`、`productionReady: false`。

三家在前台和后台已经分开显示；有程序的项目打 ✅，厂家与资金验收未通过的项目打 ❌。当前不会创建真实付款、不会提款，也不会自动给会员钱包加钱。
