# MASTER7 GSPAY MYR Contract Release Receipt

候选版本：`17.0.0-selfbuilt.63-gspay-contract`
日期：2026-11-06（MYT）

## 交付范围

- 恢复 GSPAY MYR Deposit 前台入口与后台三状态控制，默认关闭。
- Portal 直接连接固定的官方 GSPAY origin，并按 Payment、Get Payment 和 Payment Callback 合约实现。
- 两分钟付款 URL、十分钟无 callback 拒绝、独立查单、幂等订单及单次平衡账本。
- callback alias：`/api/payment/gspay/callback`；DuitNow、USDT、Payout 不启用。
- 保留 1MPay ACK、人工银行幂等/完整银行单、福利/广告发布保护。

## 生产阻塞

1. Operator Authentication Key 最新值只有 31 个十六进制字符；需要准确 32 字符。
2. `master7.best` 当前 HTTP 302 URL Forwarding 会危及 callback POST；必须直接绑定 Render 或改用保留 POST/正文的反向代理。
3. 厂家需确认 `52.221.96.227` 的用途；MASTER7 Render 出口 IP 为 `74.220.52.132`。
4. 没有 sandbox；真实 E2E、钱包和商户结算尚未执行。
5. 真实公司银行、测试会员银行单、福利条款与广告素材尚未录入。

## 发布回填

| 项目 | 结果 |
|---|---|
| Portal commit | 待回填 |
| Portal bundle SHA-256 | `296aca7361e243c4ca2283427bb6b9ae0864145d73e72ff4f0139ecb92bb828c` |
| Portal deploy / live time | 待回填 |
| Portal tests / lint / DB / build | 192/192；lint 通过；Render DB 3/3；build 通过 |
| Integration gateway | 不涉及；工作区未修改，不部署 |
| 线上 health / 5xx / error/fatal | 待回填 |
| Callback 非重定向验收 | 阻塞：DNS/域名修改后回填 |

## 上线检查

- [ ] `/health` 返回 `17.0.0-selfbuilt.63-gspay-contract` 且 database ready。
- [ ] GSPAY 渠道和订单开关默认关闭；无凭证时零出网、零订单、零钱包写入。
- [ ] 前台显示 GSPAY Maintenance；后台 Active / Maintenance / Close 可操作但不能绕过程序就绪条件。
- [ ] callback 无 `Location`，保留 POST 正文，并以无效签名测试得到应用层 4xx。
- [ ] 一笔受控正式订单完成 Order、Query、Callback、Wallet、Reconcile 后，Owner 才决定是否开启。
