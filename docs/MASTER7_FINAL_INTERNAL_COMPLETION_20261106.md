# MASTER7 内部一次性收尾验收单

验收时间：2026-11-06 21:38 MYT
线上版本：`17.0.0-selfbuilt.69-payout-safe-support`
Render deploy：`dep-dbmt6jmc6qcc73cghapg`（live）

## 本轮结论

所有不需要厂家资料、Owner 业务资料或真实资金授权的程序工作，已经完成并复查。已连接的 VPay、1MPay 与 MegaH5 保持开启，没有在本轮被关闭或改回测试模式。

平台仍显示 `productionReady=false`，线上返回的原因只有：

- `payout_provider_not_ready`
- `payment_settlement_not_verified`

这两个闸门必须由真实厂家 Payout contract、准确生产凭证、真实资金交易和结算对账证据解除；程序不会用假数据把它们改成完成。

## 已完成并复查

| 项目 | 验收结果 |
|---|---|
| Portal / database | `/health` HTTP 200；release `.69`；database `ready` |
| VPay Deposit | Active、production；Order / Query / Callback ready |
| 1MPay Deposit | Active、production；Order / Query / Callback ready |
| MegaH5 | wallet、live games、settlement、liveReady 全部 ready |
| 游戏目录 | 766 款；618 Active、148 Maintenance；766 Paid、0 Free |
| 游戏来源 | MegaH5 166、JILI 297、918KISS H5 91、EVO888H5 148、Rectangle 64 |
| 自动账目 | MYT 日结 scheduler 已运行；线上日志已有 accounting close 成功记录 |
| Android APK | HTTP 200；ZIP 完整；APK Signing Block v2+ 存在；SHA-256 `f7765f2787f6e50891d76eec1c9f58b9d1f978747fa43df0d11bb8f381822787` |
| iPhone / PWA | Manifest HTTP 200；standalone；192 / 512 图标 HTTP 200 |
| 公司内容状态 | 广告 0、Active 福利 0、公告 0；没有代造 Owner 业务内容 |
| 发布质量 | 238 / 238 tests、GSPAY Payout 7 / 7、TypeScript、lint、Render DB build 与 archive build 已通过 |
| 线上错误 | 新实例 application error / critical / fatal 0；request 5xx 0 |

## 保持开启的项目

- VPay Deposit：继续 Active。
- 1MPay Deposit：继续 Active。
- MegaH5：继续 enabled，会员登录与授权后进入真实启动流程。
- 已上线的后台、客服工单、内建中英双语回复、Referral ownership、报表、审计、CSV、通知声音、游戏分类与分页加载继续使用。

## 不能由代码代替的最后验收

1. **GSPAY**：须收到可复制的准确 Operator Authentication Key 与 Secret；完成 callback 直连、厂家 IP whitelist、`bank_target` 对照和 Settlement balance 后，才能做真实 Deposit / Payout 验收。当前 GSPAY 继续 Closed。
2. **VPay / 1MPay 结算**：各做一次获授权真实 Deposit，核对厂家记录、平台订单、钱包双分录和日结，才可把 `settlementVerified` 改为 true。
3. **三家 Payout**：VPay、1MPay 仍缺完整 Payout contract；GSPAY 程序已完成，但生产前置条件未齐。当前三家 Payout 继续 disabled。
4. **Owner 营业资料**：后台录入真实公司银行账号，并用测试会员完成银行 Deposit、上传银行单、Approve / Reject 与钱包入账验收。
5. **福利与内容**：Owner 输入正式福利、VIP、Turnover、佣金、广告和公告。没有真实条款前，不开启自动派发或提款 Turnover enforcement。
6. **游戏会员验收**：用获批准会员完成 MegaH5 Launch、Wallet transfer、Exit、Disconnect 与 Settlement 对账；其他厂家须提供各自 Launch / Wallet API 与 IP 放行。
7. **推广发送**：须连接正式 WhatsApp / SMS Provider、获批模板、联系人同意和退订流程，才可执行实际发送。
8. **域名**：`master7.best` 与 `master7.site` 仍使用 302 forwarding；`www.master7.best` 尚无 DNS。GSPAY callback 必须改成可保留 POST method/body 的直连域名或反向代理。
9. **当前版本恢复演练**：`.58` 的加密备份与隔离恢复验收曾完整通过；`.69` schema 已变化，须由已登录 Owner 创建新的 `.69` 加密备份，再在隔离环境完成恢复并登记新 receipt。
10. **真机**：APK 与 PWA 文件已验证；Android 安装、升级和 iPhone Add to Home Screen 仍须在真实设备点验。

## 对厂家只需发送的资料

- GSPAY：准确、可复制的 Operator Authentication Key 与 Secret；确认 callback 域名方案、Server IP whitelist、18 家 `bank_target` 值和 Settlement balance。
- VPay：完整 Payout API 文档、签名公式、callback、查单、余额接口、银行代码和白名单要求。
- 1MPay：完整 Payout API 文档、RSA / 签名方向、callback、查单、余额接口、银行代码和白名单要求。

## 发布与记录

- Source commit：`8238cca41d7915ca1fded90e9637105f50fcae60`
- Publication commit：`01d36683a0fe2b6fca162321e8aa85e9dac1bce2`
- Deploy：`dep-dbmt6jmc6qcc73cghapg`
- Bundle SHA-256：`a54219780d233cdd2ee2a11add887c820b20ff34e8888d7efd66d6d58ab12121`
- 详细剩余清单：`docs/MASTER7_REMAINING_WORK_20261106.md`

