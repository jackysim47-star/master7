# MASTER7 Current Deployment Receipt

更新时间：2026-11-06 19:26 MYT
验收时区：Asia/Kuching（MYT，UTC+8）

当前线上版：`17.0.0-selfbuilt.66-operations-corrections`

回滚版：`17.0.0-selfbuilt.65-payment-safety`，commit `6b432399eabf09b22e6a309e4a547c700515cfbc`，deploy `dep-dbmr15s9v7es73ahfaf0`

## `.66` 正式发布

| 项目 | 线上记录 |
|---|---|
| Release | `17.0.0-selfbuilt.66-operations-corrections` |
| Runtime commit | `7cd1c0bc7cd4f364b73770b01f864abfbe1c07fc` |
| Portal deploy | `dep-dbmrhjbbc2fs73aompu0`，`live` |
| 部署包 SHA-256 | `bfdfcb22549911ca996b25b84617b4064cb9da2c425c3644c06b497f4e5b4285` |
| 上线完成 | 2026-11-06 19:26:02 MYT |
| 全套 QA | Portal 202/202；TypeScript 与 lint 通过；Render DB 3/3；production build 通过；diff check 通过 |
| 线上复测 | health HTTP 200、`.66`、database ready；支付/游戏生产闸门关闭；766 款游戏、`playable=false`；新实例 app error/critical/fatal 0、request 5xx 0 |

本版修正福利 Turnover 的零固定值和最低存款边界；后台铃铛只显示未关闭客服工单并进入 Support；Referral 数字明确为不可领取的 L1 原始预估。本版不改变支付、游戏、payout、callback、钱包或生产营业开关。

## 当前线上版本

| 项目 | 已核实值 |
|---|---|
| Current live release | `17.0.0-selfbuilt.66-operations-corrections` |
| Runtime commit | `7cd1c0bc7cd4f364b73770b01f864abfbe1c07fc` |
| Portal deploy | `dep-dbmrhjbbc2fs73aompu0`，`live` |
| 上线完成 | 2026-11-06 19:26:02 MYT |
| Gateway code deploy | `7f65d6a2527229f347bcd521d7c07ed8eb717c5f` / `dep-dbmqqqtg1s2s73d9msq0`，`live`（2026-11-06 18:35:52 MYT） |
| Portal service | `srv-dbl0iv7f3r2c73848ei0` / `master7-v17-staging` |
| Render workspace | `tea-dakfo2h594qs73du231g` / ahbi |
| Branch | `codex/v17-render-staging-20261104` |
| Auto deploy | Portal Off；发布必须人工触发并记录 deploy ID |

## 回滚版 `.65` 发布

| 项目 | 当前值 |
|---|---|
| Release | `17.0.0-selfbuilt.65-payment-safety` |
| Portal commit / deploy | `6b432399eabf09b22e6a309e4a547c700515cfbc` / `dep-dbmr15s9v7es73ahfaf0` |
| 部署包 SHA-256 | `2af1922f4018a4213e38fad7d5ab101188a183dbdd605f530d017e1ee70b4026` |
| 全套 QA | Portal 199/199；TypeScript 与 lint 通过；Render DB 3/3；production build 通过；diff check 通过 |
| Gateway QA | 85/85 通过；固定 EPICWIN/ClotPlay 服务身份；EVO/Mega 业务拒绝不再错误缓存 |
| 线上复测 | health HTTP 200；release `.65`；database ready；全部支付新订单开关为 false；Portal 新实例 error/fatal 与 5xx 均为 0 |

本版加强 VPay 订单/会员/双分录归属与平衡核对，并让 1MPay 在关闭新订单时继续 reconciliation 既有订单。游戏目录与状态保持 766 款、618 Active、148 Maintenance，`playable=false`；MegaH5 Portal/Gateway 配置不变，其他厂家仍未伪装成可玩。GSPAY 与所有支付新订单开关保持关闭。

Gateway 后续修复 `7f65d6a` 已上线：EPICWIN 与 ClotPlay 请求带固定 `MASTER7-Integration-Gateway/<version>` User-Agent；EVO 与 MegaH5 的 HTTP 200 业务拒绝不会再缓存五分钟。部署后复测仍显示 EVO `code 130`、EPICWIN/ClotPlay 上游 403、Venus 缺少响应签名头、GodeeZone `/token` 被 Cloudflare 403；这些项目仍须厂家处理，未标为连接成功。

## 支付安全发布证据：`.65-payment-safety`

| 项目 | 线上记录 |
|---|---|
| Release | `17.0.0-selfbuilt.65-payment-safety` |
| Portal commit / deploy | `6b432399eabf09b22e6a309e4a547c700515cfbc` / `dep-dbmr15s9v7es73ahfaf0` |
| 部署包 SHA-256 | `2af1922f4018a4213e38fad7d5ab101188a183dbdd605f530d017e1ee70b4026` |
| 全套 QA | Portal 199/199；TypeScript 通过；受影响文件 lint 通过；Render DB 3/3；production build 通过 |
| 资金与渠道开关 | 不改变；真实新订单、callback、payout 与自动钱包结算继续关闭 |

本版修复 VPay callback 对账本会员归属、币种、金额和平衡的强制核对；异常或跨会员账本转 `review`，不返回成功。1MPay 则允许在新订单关闭时查询和 reconciliation 已存在的订单。AI 客服重复 `status` 的 TypeScript 问题及 GSPAY 环境声明一并修复。Render deploy 已到达 `live`，`/health` 返回 `.65`，三家支付状态保持 fail-closed。

## GSPAY 当前边界

- 官方合约：`POST /payment` 建单、`GET /getpayment` 独立查单、Payment callback MD5 验签；金额固定两位小数。
- 收银台有效期 2 分钟；10 分钟没有成功回调/独立成功查单时转为拒绝或过期，不能增加钱包。
- 只有 `completed=true`、`success=true`、订单/会员/金额/厂家流水全部绑定，并经独立查单确认后，才能写一组金额相反的双分录；重复或并发通知只入账一次。
- DuitNow、USDT、Payout 尚未实现或启用；提款页不把 GSPAY 当成已连接 payout。
- 最后收到的 Operator Authentication Key 只有 31 个十六进制字符；必须取得准确 32 字符后才写入 Render。
- `master7.best` 当前以 HTTP 302 转发到 Render，不能可靠保留支付回调 POST。正式启用前必须改成 Render 直接自定义域名或保留方法/正文的反向代理。
- `74.220.52.132` 只是此前一次出口观测值，不能当作固定白名单；厂家应使用 Render Singapore 完整出站范围。`52.221.96.227` 是厂家提供的服务器 IP，具体用途仍须厂家确认。

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
- `megaWallet`: configured=true、enabled=true、settlementVerified=false、liveReady=false
- `liveGames=false`（尚无真实会员 E2E 签收记录）
- `productionReady=false`

## 入口与 DNS

- Portal：`https://master7-v17-staging.onrender.com`
- 客户根域：`https://master7.best/`，当前为 302 URL Forwarding；不适合 callback POST。
- 后台：`https://master7.site/`
- `www.master7.best`：仍缺 DNS。

线上复测已确认：MegaH5 Portal/Gateway 开关部署后保持开启且三个 Gateway channel 均 `configurationReady=true`；目录 766 款、618 Active、148 Maintenance。Portal 应用 error/fatal 与 5xx 均为 0。Gateway 的目录 502 来自 EVO、ClotPlay、Venus、EPICWIN 的已知厂家阻塞；GodeeZone 是 Portal 直连首跳 403。厂家应完整放行 Render Singapore 出站范围 `74.220.52.0/24` 与 `74.220.60.0/24`，不能只登记一次观测到的单一 IP。所有支付订单开关仍为 false。
