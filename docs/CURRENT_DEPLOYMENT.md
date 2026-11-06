# MASTER7 Current Deployment Receipt

更新时间：2026-11-06 18:08 MYT
验收时区：Asia/Kuching（MYT，UTC+8）

## 当前线上版本

| 项目 | 已核实值 |
|---|---|
| Current live release | `17.0.0-selfbuilt.63-gspay-contract` |
| Runtime commit | `4d96bf18a89176f6225215aec828d444dfc8cb95` |
| Portal deploy | `dep-dbmqc9u417fc739hm0hg`，`live` |
| 上线完成 | 2026-11-06 18:06:41 MYT |
| Portal service | `srv-dbl0iv7f3r2c73848ei0` / `master7-v17-staging` |
| Render workspace | `tea-dakfo2h594qs73du231g` / ahbi |
| Branch | `codex/v17-render-staging-20261104` |
| Auto deploy | Portal Off；发布必须人工触发并记录 deploy ID |

## 本轮发布

| 项目 | 当前值 |
|---|---|
| Release | `17.0.0-selfbuilt.63-gspay-contract` |
| Portal commit / deploy | `4d96bf18a89176f6225215aec828d444dfc8cb95` / `dep-dbmqc9u417fc739hm0hg` |
| 部署包 SHA-256 | `296aca7361e243c4ca2283427bb6b9ae0864145d73e72ff4f0139ecb92bb828c` |
| 全套 QA | Portal 192/192；lint 通过；Render DB 3/3；production build 通过；diff check 通过 |
| 线上复测 | health HTTP 200；release `.63`；database ready；后台/登录 HTTP 200；应用 error/fatal 0 |

本版恢复并完成 GSPAY MYR Deposit 合约边界；同时保留 1MPay callback ACK、人工银行 Deposit 幂等与完整银行单、福利/Turnover 和公司广告发布验证。1MPay 凭证已存入 Render 环境变量，订单开关保持关闭。没有写入虚构业务资料，也没有开启真钱或游戏。

## GSPAY 当前边界

- 官方合约：`POST /payment` 建单、`GET /getpayment` 独立查单、Payment callback MD5 验签；金额固定两位小数。
- 收银台有效期 2 分钟；10 分钟没有成功回调/独立成功查单时转为拒绝或过期，不能增加钱包。
- 只有 `completed=true`、`success=true`、订单/会员/金额/厂家流水全部绑定，并经独立查单确认后，才能写一组金额相反的双分录；重复或并发通知只入账一次。
- DuitNow、USDT、Payout 尚未实现或启用；提款页不把 GSPAY 当成已连接 payout。
- 最后收到的 Operator Authentication Key 只有 31 个十六进制字符；必须取得准确 32 字符后才写入 Render。
- `master7.best` 当前以 HTTP 302 转发到 Render，不能可靠保留支付回调 POST。正式启用前必须改成 Render 直接自定义域名或保留方法/正文的反向代理。
- `74.220.52.132` 是 MASTER7 Render 新加坡出口 IP；`52.221.96.227` 是厂家提供的服务器 IP，具体用途仍须厂家确认。

## 营业准备顺序

1. Owner 录入真实公司银行名称、户名和账号。
2. 用获授权测试会员完成一次公司银行 Deposit、完整银行单、真实到账核对、后台批准及钱包双分录核对。
3. 输入并发布真实福利/Turnover 条款与公司广告；不完整资料保持草稿。
4. 修复 GSPAY callback 域名、写入准确凭证，并分别完成 Order、Query、Callback、Wallet、Reconcile 受控生产验收。
5. 最后只开启已经签收的支付能力；游戏仍须独立完成 Launch、Wallet 和 Settlement。

## 运行闸门

- `transactionsEnabled=false`
- `realPayments=false`
- `settlementVerified=false`
- `providerOrdersEnabled`: VPay=false、GSPAY=false、1MPAY=false、GSPAY+=false
- `liveGames=false`
- `productionReady=false`

## 入口与 DNS

- Portal：`https://master7-v17-staging.onrender.com`
- 客户根域：`https://master7.best/`，当前为 302 URL Forwarding；不适合 callback POST。
- 后台：`https://master7.site/`
- `www.master7.best`：仍缺 DNS。

线上复测已确认：所有支付订单开关为 false，GSPAY 未配置且 `orderReady=false`；Render 直连 callback 无重定向并按设计返回 503。唯一 5xx 是本次无凭证 callback 探针；应用 error/fatal 为 0。`master7.best` callback 仍返回 302，因此真实 GSPAY 订单继续关闭。
