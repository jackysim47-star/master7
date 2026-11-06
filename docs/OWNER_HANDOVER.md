# MASTER7 Owner Handover

更新时间：2026-11-06 17:27 MYT
候选版本：`17.0.0-selfbuilt.63-gspay-contract`

## 正式入口

- 客户：`https://master7.best/`
- 后台：`https://master7.site/`
- Render 直达后台：`https://master7-v17-staging.onrender.com/admin`
- Android：`https://master7-v17-staging.onrender.com/downloads/MASTER7-Android-v17.0.52.apk`
- iPhone：Safari 打开客户入口后使用“加入主画面”。

`www.master7.best` 仍缺 DNS。重复后台路径 `/admin/admin` 会返回标准 `/admin`。

## 管理权与账号

- Owner、Staff 与 Member 使用各自账号；银行或厂家测试会员不得使用老板账号。
- 账号 ID、密码、恢复码、API key 和私钥只保存在受控秘密管理或用户私有交付位置，不进入 Git、文档或前台。
- 后台账号安全可修改 ID/密码并撤销旧会话；执行前应离线保存新的恢复资料。

## 当前经营边界

- GSPAY MYR Deposit 合约已取得并恢复前台/后台程序，但渠道和订单开关保持关闭。最后收到的 Operator Key 只有 31 个十六进制字符，且 callback 根域仍是 302 转发；两项修正和受控 E2E 完成前不能启用。DuitNow、USDT、Payout 继续关闭。
- 1MPay 的正式凭证字段、正式 API 域名与成功 ACK 已确认，程序离线用例通过；厂家没有 sandbox，本轮未执行真实入款，渠道和订单开关继续关闭。
- VPay 仍需独立生产 E2E 和结算验收。
- 游戏目录存在，但真实启动与钱包结算未验收，`liveGames=false`。
- 公司银行户口、广告、福利和推广联系人不会由系统自行填写。未收到真实资料时保持空白或草稿。
- `transactionsEnabled=false`、`realPayments=false`、`settlementVerified=false`、`productionReady=false`。

## 开工前顺序

1. Owner 录入真实公司银行名称、户名、账号，只开放确认要使用的账户。
2. 用获授权测试会员进行一次公司银行 Deposit；上传完整银行单，后台以真实银行流水核对后批准，再核对会员钱包只增加一次。
3. 输入真实福利名称、奖励、最低存款、唯一 Turnover 规则、领取次数、有效期和提款上限；先预览计算，再发布。
4. 上传正式公司广告图和标题；目标链接如有必须为 HTTPS；手机前台确认后才启用。
5. GSPAY 先把 `master7.best` 改成不会丢失 POST 的直接域名/反向代理并写入准确凭证；再逐家公司完成真实 Order、Query、Callback、Wallet 与 Reconcile，才开启对应支付。游戏 Launch、Wallet 与 Settlement 同理。

当前缺少真实银行资料、获授权测试交易、福利条款和广告素材，因此候选版没有编造或公开这些内容，也没有开启营业开关。

## 已完成的安全保护

- 人工银行 Deposit 在断线、超时和刷新后复用同一幂等键，避免重复待审订单。
- 高图与宽图银行单按比例完整缩放，不再居中裁掉内容。
- 同一银行单只允许一个后台审核取得处理权，重复或并发批准不会重复增加钱包。
- 不完整福利可保存草稿，但零奖励、Turnover 冲突、缺领取次数/有效期不能发布。
- 广告缺少有效标题/图片或使用不安全目标链接时不能启用。

## 备份与源码

- 当前运行源码包：`master7-v17-render-staging.tar.gz`。
- 私有加密备份及恢复回执位于 `/workspace/deliverables/private/`。
- 公开恢复摘要见 `DATA_RECOVERY_RECEIPT.md`。
- 当前线上 `.62` 与候选 `.63` 状态见 `CURRENT_DEPLOYMENT.md`。最终业务签收以 `ISSUES_AND_FIXES.md`、Acceptance CSV 和真实厂家生产验收记录为准。
