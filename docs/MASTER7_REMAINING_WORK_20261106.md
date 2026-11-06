# MASTER7 唯一剩余工作清单

核对时间：2026-11-06 22:15 MYT
线上版本：`17.0.0-selfbuilt.71-frontend-route-compat`
当前回滚版本：`17.0.0-selfbuilt.69-payout-safe-support`
Render deploy：`dep-dbmu1cdbedkc73dgl8s0`（live）

## 已完成并保持开启

- 前台 404 路线修复、旧游戏入口兼容、favicon 和旧 `.admin`/`.vip` 域名清理已随 `.71` 上线；正式入口为 `www.master7.best` 与 `www.master7.site`。
- VPay Deposit：Active，production，Order/Query/Callback ready。
- 1MPay Deposit：Active，production，Order/Query/Callback ready。
- MegaH5：wallet、live games、settlement 与 liveReady 均 ready。
- 游戏目录：766 款；618 Active、148 Maintenance；游戏分类与每次 12 款加载已上线。
- 自动 MYT 日结程序已运行；线上日志已观察到会计关闭任务成功完成。
- 客服工单、内建中英双语回复、后台通知、审计、报表、CSV、Referral ownership、Android APK 与 iOS Web App 程序已上线。
- 新实例 application error/critical/fatal 0，request 5xx 0。

## 仍未完成

1. **GSPAY Deposit**
   - 当前收到的 Operator Authentication Key 文字只有 31 个十六进制字符；程序要求厂家完整的 32–128 位原文。
   - `master7.best` callback 目前返回 HTTP 302，须直绑 Render 或使用能保留 POST method/body 的反向代理。
   - 完成凭证与 callback 后，仍须做一次真实 Order→Query→Callback→Wallet→Reconcile 验收。

2. **三家 Payout**
   - VPay、1MPay 尚未提供完整 Payout contract。
   - GSPAY Payout 程序已完成，但仍缺准确凭证、厂家 IP 白名单确认、18 家 `bank_target` 对照、Settlement balance 与真实验收。
   - 当前三家 Payout 均保持 disabled。

3. **支付结算签收**
   - VPay 与 1MPay Deposit 已可建单，但尚未用获授权真实付款完成厂家记录、平台订单、钱包双分录与对账签收。
   - 当前 `settlementVerified=false`。

4. **公司银行 Deposit**
   - Owner 须在登录后的后台确认银行名称、户名与账号。
   - 须用测试会员走一次选择银行、复制资料、上传银行单、后台 Approve/Reject 与钱包入账。

5. **游戏真实会员验收**
   - MegaH5 程序 ready；仍须获批准会员完成一次 Launch、Wallet transfer、Exit、Disconnect 与 Settlement 记录核对。
   - 其他目录厂家仍需各自 Launch/Wallet API 与厂家 IP 放行；它们不能仅凭目录图片标成可玩。
   - 当前 766 款全部是 Paid zone；Free zone 尚未配置。

6. **福利、VIP、Turnover 与佣金**
   - 已发布福利 0，VIP tier 0。
   - Benefit claiming、自动钱包派发与 Turnover enforcement 仍关闭。
   - Referral ownership 可用；佣金结算、领取、自动钱包入账及可信 wager source 仍未验收。

7. **公司内容**
   - 已发布广告 0，已发布公告 0。
   - Owner 须输入真实广告图文、福利规则、最低存款、Turnover、领取限制与有效期。

8. **推广发送**
   - 600,000 联系人分块导入、流式导出、活动文案/图片与 Referral 链接程序存在。
   - WhatsApp/SMS 实际发送 Provider 尚未连接；仍需正式 Provider、获批模板、联系人同意与退订流程。

9. **域名与设备**
   - `www.master7.best` 没有 DNS；这是正式会员入口当前唯一的直接域名阻塞。
   - `master7.best` 与 `www.master7.site` 目前使用 302 URL forwarding。
   - APK 已完成 HTTP、SHA-256、ZIP 完整性与 APK Signing Block v2+ 检查；Web Manifest 与 192/512 图标均为 HTTP 200。
   - Android/iPhone 真机安装、升级与 Add to Home Screen 仍需设备验收。

10. **恢复演练**
    - `.58` 真实上线数据库的加密备份、密码学校验与独立恢复演练已通过。
    - `.69` schema 已变化；须由已登录 Owner 创建新的 `.69` 加密备份，并在独立环境完成恢复与新 receipt 登记。旧 receipt 不会被误当成当前版本验收。

## 当前总闸门

`productionReady=false` 的线上原因只有：

- `payout_provider_not_ready`
- `payment_settlement_not_verified`

已连接的 VPay、1MPay 与 MegaH5 保持开启；本清单不要求关闭它们。

本轮完整收尾证据见 `docs/MASTER7_FINAL_INTERNAL_COMPLETION_20261106.md`。

