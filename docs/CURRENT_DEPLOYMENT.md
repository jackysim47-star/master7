# MASTER7 Current Deployment Receipt

更新时间：2026-11-06 18:36 MYT
验收时区：Asia/Kuching（MYT，UTC+8）

下一候选版：`17.0.0-selfbuilt.65-payment-safety`（代码验证完成，人工部署回执待回填）

## 当前线上版本

| 项目 | 已核实值 |
|---|---|
| Current live release | `17.0.0-selfbuilt.64-game-controls` |
| Runtime commit | `1e243182e39aac52d3dfefa9f601134c5bd3240f` |
| Portal deploy | `dep-dbmqj56tlv9c73bo3u6g`，`live` |
| 上线完成 | 2026-11-06 18:21:09 MYT |
| Gateway code deploy | `7f65d6a2527229f347bcd521d7c07ed8eb717c5f` / `dep-dbmqqqtg1s2s73d9msq0`，`live`（2026-11-06 18:35:52 MYT） |
| Portal service | `srv-dbl0iv7f3r2c73848ei0` / `master7-v17-staging` |
| Render workspace | `tea-dakfo2h594qs73du231g` / ahbi |
| Branch | `codex/v17-render-staging-20261104` |
| Auto deploy | Portal Off；发布必须人工触发并记录 deploy ID |

## 本轮发布

| 项目 | 当前值 |
|---|---|
| Release | `17.0.0-selfbuilt.64-game-controls` |
| Portal commit / deploy | `1e243182e39aac52d3dfefa9f601134c5bd3240f` / `dep-dbmqj56tlv9c73bo3u6g` |
| 部署包 SHA-256 | `01b946e4d04a8c02512e389993fe0939e344de6bef393a26e149bef780f8850a` |
| 全套 QA | Portal 192/192；lint 通过；Render DB 3/3；production build 通过；diff check 通过 |
| Gateway QA | 85/85 通过；固定 EPICWIN/ClotPlay 服务身份；EVO/Mega 业务拒绝不再错误缓存 |
| 线上复测 | health HTTP 200；release `.64`；database ready；MegaH5 Portal/Gateway 开关开启；Portal error/fatal 与 5xx 均为 0 |

本版完成 766 款全游戏检查，补齐 Rectangle/GodeeZone 单游戏控制，并按 Owner 指示持久开启 MegaH5 Portal 与 Gateway transfer/status 开关。其他厂家只有目录或仍被上游阻塞，未伪装成已可玩。GSPAY 与其他支付开关保持原状态。

Gateway 后续修复 `7f65d6a` 已上线：EPICWIN 与 ClotPlay 请求带固定 `MASTER7-Integration-Gateway/<version>` User-Agent；EVO 与 MegaH5 的 HTTP 200 业务拒绝不会再缓存五分钟。部署后复测仍显示 EVO `code 130`、EPICWIN/ClotPlay 上游 403、Venus 缺少响应签名头、GodeeZone `/token` 被 Cloudflare 403；这些项目仍须厂家处理，未标为连接成功。

## 下一候选发布：`.65-payment-safety`

| 项目 | 发布前记录 |
|---|---|
| Release | `17.0.0-selfbuilt.65-payment-safety` |
| Portal commit / deploy | `PENDING` / `PENDING` |
| 部署包 SHA-256 | `PENDING` |
| 全套 QA | Portal 199/199；TypeScript 通过；受影响文件 lint 通过；Render DB 3/3；production build 通过 |
| 资金与渠道开关 | 不改变；真实新订单、callback、payout 与自动钱包结算继续关闭 |

候选版修复 VPay callback 对账本会员归属、币种、金额和平衡的强制核对；异常或跨会员账本转 `review`，不返回成功。1MPay 则允许在新订单关闭时查询和 reconciliation 已存在的订单。AI 客服重复 `status` 的 TypeScript 问题及 GSPAY 环境声明一并修复。只有 Render deploy 到达 `live`、`/health` 返回 `.65` 且三家支付状态仍 fail-closed 后，才把这张表改为正式上线回执。

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
