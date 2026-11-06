# MASTER7 三家厂家短信息

以下三段分别发送给对应厂家。无需附上整份技术报告，也不要在聊天中重发密码或密钥。

## GSPAY

您好，我们已按贵司指示分别使用 MYR 与 USDT Key 做只读余额请求。MYR 请求得到 HTTP 200、业务 `code=400`、`IP Network Unauthorized`，说明 Key 已被识别但来源 IP 未获授权；USDT 请求得到 HTTP 200、业务 `code=400`、`Invalid keys`。请协助确认：

1. MASTER7 Render Singapore 网关应登记固定三组专用出口 IP，还是贵司可接受 Render 出口 CIDR；请勿登记一次性探测 IP。
2. USDT 商户是否已启用，以及 USDT 是否使用同一个 `/v2/integrations/operator/{auth_key}/get/balance` 接口。
3. MYR 建单成功/失败完整 JSON、`getpayment` 完整请求示例及 `auth_key` 位置。
4. Payment、DuitNow、Crypto 回调成功应回复的 HTTP 状态和正文，以及重试间隔、次数和幂等规则。

商户账号为 `MASTER7VIPMYR+`；密码和 Key 不在聊天中重发。请为本商户独立记录，不要套用其他商户工单资料。谢谢。

## 1MPay

您好，MASTER7 已收到 API 1.3。请确认：contract ID 是否对应 `merchant`，secret_key 是否对应 `apikey`；`/fundtransfer/json` 使用的 Content-Type；回调成功须回复的 HTTP 状态和正文；回调重试次数、间隔及完整状态枚举；并确认 MYR Deposit 权限已开通，可安排一笔端到端测试。现阶段只验收 Deposit，不测试 Payout。谢谢。

## VPay

您好，请确认 MASTER7 的 VPay MYR Deposit 商户已正式启用，并提供：可用银行/Trade Code、API IP 白名单要求、Payment Callback URL 规则，以及一组属于 MASTER7 商户的建单、查单和成功回调测试资料。现阶段只验收 Deposit，不测试 Payout。谢谢。
