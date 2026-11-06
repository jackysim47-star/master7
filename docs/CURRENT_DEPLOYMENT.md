# MASTER7 Current Deployment Receipt

更新时间：2026-11-06 22:00 MYT
验收时区：Asia/Kuching（MYT，UTC+8）

当前发布候选：`17.0.0-selfbuilt.71-frontend-route-compat`
当前回滚版：`17.0.0-selfbuilt.69-payout-safe-support`

## `.71` 路线与域名清理

- 正式会员前台统一为 `https://www.master7.best/`，正式公司后台统一为 `https://www.master7.site/`。
- 404 日志证明用户请求曾误带结尾反引号，形成 `/%60` 与 `/admin/%60`；`.71` 自动纠正这些地址。
- `/games`、`/player/games`、`/home`、`/lobby`、`/player` 和 `/index.html` 会回到有效前台。
- 当前源码和新发布包删除旧 `.admin`、`.vip` 域名文字；正式 `/admin` 后台路线和 VIP 福利功能保留。
- `www.master7.best` 当前仍缺 DNS；发布程序不能替代域名方设置。DNS 完成前使用 `master7.best` 或 Render 直达入口。
- 详细记录见 `docs/MASTER7_FRONTEND_ROUTE_AND_RENDER_CLEANUP_20261106.md`。

## 正式发布记录

| 项目 | 已核实值 |
|---|---|
| Source commit | `8238cca41d7915ca1fded90e9637105f50fcae60` |
| Publication commit | `01d36683a0fe2b6fca162321e8aa85e9dac1bce2` |
| Portal deploy | `dep-dbmt6jmc6qcc73cghapg`，`live` |
| 部署包 SHA-256 | `a54219780d233cdd2ee2a11add887c820b20ff34e8888d7efd66d6d58ab12121` |
| 上线完成 | 2026-11-06 21:19:03 MYT |
| Portal service | `srv-dbl0iv7f3r2c73848ei0` / `master7-v17-staging` |
| Render workspace | `tea-dakfo2h594qs73du231g` / ahbi |
| Branch | `codex/v17-render-staging-20261104` |
| Auto deploy | Off；本版已人工触发并记录 deploy ID |

## 线上验收

- `/health` 与 `/api/version` 均为 HTTP 200，版本 `.69`，`database=ready`，`smsOtpReady=true`。
- VPay Deposit 为 Active、production，order/query/callback 均 ready。
- 1MPay Deposit 为 Active、production，order/query/callback 均 ready。
- 已连接的 VPay、1MPay 与 MegaH5 设置在部署后保持开启。
- MegaH5 wallet、live games、settlement 均 ready；`liveGames=true`。
- 游戏目录返回 766 款、9 个来源。匿名访问 `playable=false` 是会员登录闸门；获批准会员才进入启动流程。
- GSPAY Deposit 为 Closed；当前凭证合约未通过，order/query/callback 均不启用。
- 三家 Payout 均关闭：VPay/1MPay 缺完整 payout contract；GSPAY 程序已实现，但生产前置条件未齐。
- `productionReady=false`，准确 blockers 为 `payout_provider_not_ready` 与 `payment_settlement_not_verified`。
- 新实例 application error/critical/fatal 为 0，request 5xx 为 0。

## 本版完成

- VPay readiness 改为读取 Gateway 远程合约，已连接充值不会再被本地旧判断错误阻挡。
- GSPAY Payout 已完成签名、回调、独立查单、幂等、钱包预留、失败释放、不确定状态恢复、数据库原子单调用锁和加密银行资料。
- GSPAY Payout 默认关闭；缺任一生产条件时，前台不显示为可用提款公司。
- 客服工单已接入内建中英双语自动回复；员工可继续接手、回复和关闭。
- 健康页使用真实充值、提款、支付结算与游戏结算条件计算营业状态。

## 当前公开业务内容

- 已发布公司广告：0。
- Active 福利：0；福利计算为 preview-only，领取、钱包派发与 Turnover enforcement 均关闭。
- 已发布公告：0。
- 提款银行目录：18 家；当前可提交的 Payout Provider：0。
- 公司银行账号只允许已登录会员读取，公开检查得到 401，符合权限设计。账号内容需由 Owner 在后台确认。

## GSPAY 尚需厂家/域名方完成

1. 提供可复制的准确 Operator Authentication Key；当前收到的文字只有 31 个十六进制字符，不能写入生产环境。
2. `master7.best` 当前对 callback 路径返回 HTTP 302。须改为 Render 直接自定义域名或保留 POST method/body 的反向代理。
3. 厂家确认 Render Singapore 完整出站 IP 范围白名单。单次观测 IP 不能当作稳定白名单证明。
4. 提供准确的 18 家 `bank_target` 对照与可用 Settlement balance，再做一笔获授权的真实 Payout 验收。
5. 分别完成 Order、Query、Callback、Wallet、Reconcile 与 Payout 六阶段生产签收后，才打开对应开关。

## Owner 营业资料

Owner 仍需在后台录入并核对公司银行账号、正式福利/Turnover/VIP 条款、公司广告与公告。这些内容属于业务资料，程序不会代造。VPay、1MPay 与 MegaH5 维持现有开启状态。

## 入口

- Portal：`https://master7-v17-staging.onrender.com`
- 正式会员前台：`https://www.master7.best/`，当前仍需 DNS/TLS。
- 会员前台备用：`https://master7.best/`，当前为 302 URL forwarding。
- 正式后台：`https://www.master7.site/`，当前可经转发进入 `/admin`。

## 最终内部收尾

不需要厂家、Owner 业务资料或真实资金授权的项目已全部复查完成。完整验收证据与外部输入清单见 `docs/MASTER7_FINAL_INTERNAL_COMPLETION_20261106.md`。
