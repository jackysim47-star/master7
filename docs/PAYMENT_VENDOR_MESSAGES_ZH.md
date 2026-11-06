# MASTER7 三家厂家短信息

以下三段分别发送给对应厂家。无需附上整份技术报告，也不要在聊天中重发密码或密钥。

## GSPAY

您好，我们是 MASTER7，商户账号是 `MASTER7VIPMYR+`。请为本商户新开一个工单，并提供：建单成功和失败完整响应、查单完整响应、Payment/DuitNow 回调字段与签名、成功 ACK 内容和重试规则。请不要套用其他商户的工单资料。谢谢。

## 1MPay

您好，MASTER7 已收到 API 1.3。请确认：contract ID 是否对应 `merchant`，secret_key 是否对应 `apikey`；`/fundtransfer/json` 使用的 Content-Type；回调成功须回复的 HTTP 状态和正文；回调重试次数、间隔及完整状态枚举；并确认 MYR Deposit 权限已开通，可安排一笔端到端测试。现阶段只验收 Deposit，不测试 Payout。谢谢。

## VPay

您好，请确认 MASTER7 的 VPay MYR Deposit 商户已正式启用，并提供：可用银行/Trade Code、API IP 白名单要求、Payment Callback URL 规则，以及一组属于 MASTER7 商户的建单、查单和成功回调测试资料。现阶段只验收 Deposit，不测试 Payout。谢谢。
