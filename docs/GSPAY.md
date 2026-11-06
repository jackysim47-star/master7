# GSPAY MYR Deposit 接入边界

更新时间：2026-11-06 17:43 MYT
适用候选版：`17.0.0-selfbuilt.63-gspay-contract`

## 当前决定

GSPAY 不停用。MASTER7 保留并完成 MYR Payment Deposit 程序，但在准确凭证、callback 域名和生产六阶段证据齐全前保持 Closed / Maintenance，订单开关为 false。

本候选只处理普通 MYR Payment：

- `POST https://api.thegspay.com/v2/integrations/operators/{auth_key}/payment`
- `GET https://api.thegspay.com/v2/integrations/operators/{auth_key}/getpayment`
- Payment callback：`https://master7.best/api/payment/gspay/callback`

DuitNow、USDT 与 Payout 文件已收到，但不在本候选的可启用范围；相关路径不得产生资金动作。

## 合约和安全规则

- 建单签名：MD5(`transaction_id + player_username + amount(2dp) + operator_secret_key`)。
- callback / Get Payment 签名：MD5(`payment_id + amount(2dp) + transaction_id + operator_secret_key`)。
- 只有 callback 的 `completed=true` 与 `success=true`、auth key、签名、订单、会员及金额匹配，并经独立 Get Payment 确认成功，才可增加钱包。
- 收银台 URL 只接受受信 HTTPS host，付款链接只存活 2 分钟。10 分钟没有成功 callback 或独立成功查单时，订单转为拒绝/过期。
- 重试复用同一请求键；重复、并发或乱序通知只产生一组 `member` / `provider_clearing` 平衡分录。
- Operator Authentication Key 与 Secret Key 只存 Portal Render 环境变量，不进入 Git、前台、日志或文档。

## Callback 与 IP 阻塞

厂家后台当前填写：

- Payment：`https://master7.best/api/payment/gspay/callback`
- DuitNow：`https://master7.best/api/payment/gspay/duitnow/callback`
- Payout：`https://master7.best/api/payment/gspay/payout/callback`
- Crypto：与 Payment 相同

`master7.best` 当前返回 HTTP 302 到 Render，无法保证保留 callback POST 方法和正文。正式启用前必须把根域直接绑定 Render，或改用可保留 POST/正文的反向代理；验收时 callback 响应不得含 `Location`。

`74.220.52.132` 已确认是 MASTER7 Render Singapore 出口 IP，适合厂家端商户出站白名单。厂家另提供 `52.221.96.227` 为服务器 IP，但用途/所有权仍须书面确认；不能替换出口 IP，也不能只凭 `X-Forwarded-For` 建立信任。auth key、MD5 与独立查单是主要验证。

## 凭证状态

用户名、密码和 Secret Key 已由用户提供，但不写入本文件。最后一次粘贴的 Operator Authentication Key 只有 31 个十六进制字符；在取得准确 32 字符前不得配置或尝试真实建单。

## 生产验收

依次完成 Connected、Order、Query、Callback、Wallet、Reconcile。没有 sandbox，真实测试必须由 Owner 安排一笔受控金额并保存厂家 BO、平台订单、callback、双分录和结算证据。任一阶段不通过，GSPAY 保持关闭。
