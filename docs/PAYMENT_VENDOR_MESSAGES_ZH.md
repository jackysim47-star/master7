# MASTER7 厂家短信息

只发送仍需厂家回答的项目。不要发送密码、Operator Key、Secret Key 或公钥全文。

## GSPAY

> 您好，MASTER7 已收到 MYR Payment、Get Payment、Payment Callback、DuitNow、USDT 与 Payout 文件。本轮先验收普通 MYR Payment Deposit。请确认：
> 1. Operator Authentication Key 必须是 32 个十六进制字符，并请在 BO 提供可直接复制的准确值；
> 2. `52.221.96.227` 是贵司 callback 固定来源 IP，还是需要我方加入的其他白名单；
> 3. Payment callback 的成功 ACK body、HTTP code、重试次数与间隔；
> 4. Get Payment 的请求方式和完整成功/失败状态枚举；
> 5. 付款链接 2 分钟过期后，10 分钟无 callback 的订单是否可直接标记 rejected。
> 我方 Render 出口 IP 为 `74.220.52.132`，当前只验收 Payment Deposit，不启用 DuitNow、USDT 或 Payout。谢谢。

## 1MPay

> 您好，MASTER7 已确认 contract 对应 `merchant`、secret_key 对应 `apikey`，MYR Deposit 权限已开通，callback 成功将回复 HTTP 200 + `ok`。请再确认 `/fundtransfer/json` 接受的 Content-Type、完整状态/错误码、callback 重试次数与间隔，以及没有 `trxno` 时的恢复方法。贵司没有 sandbox，因此真实 Deposit 只在双方约定时间做一笔受控验收。现阶段不测试 Payout。谢谢。

## VPay

> 您好，请确认 MASTER7 的 VPay MYR Deposit 商户已正式启用，并提供可用银行/Trade Code、API IP 白名单、Payment Callback URL 规则，以及一组属于 MASTER7 商户的建单、查单和成功 callback 测试资料。现阶段只验收 Deposit，不测试 Payout。谢谢。
