# MASTER7 Deposit 流程

更新时间：2026-11-06 17:28 MYT
适用候选版：`17.0.0-selfbuilt.63-gspay-contract`

平台保留公司银行人工转账，以及 VPay、GSPAY、1MPay 厂家收银台。三家都按独立状态显示；正式支付与游戏营业开关继续关闭。

## 公司银行人工转账

1. Owner 在后台录入银行名称、户名、账号、排序与是否向会员显示。
2. 只有已批准会员能读取已启用的公司银行户口，并复制银行名称、户名和账号。
3. 会员选择银行、输入 MYR 金额、上传 JPG/PNG/WebP 银行单后提交。
4. Owner 或 Staff 在后台查看原始银行单，并到公司银行核对真实到账。
5. `Approve` 在同一数据库事务中取得唯一审核 claim、写入金额相反的 `member` 与 `provider_clearing` 双分录、把订单改成 `credited` 并写审计。
6. `Reject` 只把订单改成失败并写审计，不增加会员钱包。

主要 API：

| 用途 | 路径 | 权限 |
|---|---|---|
| 会员读取可用公司银行 | `GET /api/manual-bank/accounts` | 已批准 Member |
| 会员提交银行单 | `POST /api/manual-bank/deposits` | 已批准 Member |
| 会员查看本人记录 | `GET /api/manual-bank/deposits` | Member |
| 后台银行与待审记录 | `GET /api/admin/manual-bank` | Owner / Staff |
| 后台查看银行单 | `GET /api/admin/manual-bank/receipt?id=...` | Owner / Staff |
| 新增或修改公司银行 | `POST /api/admin/manual-bank/account` | Owner |
| 批准或拒绝 | `POST /api/admin/manual-bank/review` | Owner / Staff |

客户端会为一次提交意图保存并复用同一个 `requestKey`。断线、超时或页面刷新后的重试不会生成第二笔待审订单；提交成功、金额改变、会员改变或明确重置后才生成新键。银行单按原比例完整缩放，不居中裁切；高图和宽图均保留完整内容，并逐级压缩到服务器允许的 350 KB 内。

自动测试覆盖未批准会员拒绝、银行户口权限、银行单上传、重复请求、并发批准/拒绝、重复审核 409、双分录单次入账及审计脱敏。测试使用合成资料，不等于正式后台已经录入真实公司银行，也不等于已用真实测试会员完成银行转账。

## VPay 与 1MPay

- VPay 与 1MPay 适配器具备离线建单、查单、回调和单次钱包入账测试。
- 1MPay 的 `contract → merchant`、`secret_key → apikey` 已由厂家确认；成功回调固定回复 HTTP 200 + 小写 `ok`。
- 1MPay 没有 sandbox，只能在最后的受控正式步骤进行真实 Deposit；当前不自动发起真钱测试。
- 厂家通道、订单开关、`realPayments`、`settlementVerified` 与 `productionReady` 继续关闭。

## GSPAY

普通 MYR Payment Deposit 按官方文档实现：建单、两分钟付款链接、Get Payment 独立查单、callback 验签、十分钟无回调拒绝及单次双分录。只有后端状态 `orderReady=true` 时前台才可提交。当前因 Operator Key 长度不正确、`master7.best` callback 仍为 302 转发且没有生产六阶段证据，通道保持关闭。DuitNow、USDT 与 Payout 不启用。详情见 [GSPAY 接入边界](GSPAY.md)。

## 正式营业前必须完成

- 录入并由本人确认真实公司银行资料。
- 用获授权测试会员执行一次受控人工银行 Deposit、上传银行单、后台核对及批准，并逐笔核对钱包双分录。
- 取得 VPay、GSPAY、1MPay 各自真实建单、查单、回调、钱包与对账证据；先修复 GSPAY callback 域名。
- 上述证据齐全后，才分别开启所需支付渠道；游戏营业开关仍须独立验收。
