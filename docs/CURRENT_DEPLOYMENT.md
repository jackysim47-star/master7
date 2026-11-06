# MASTER7 Current Deployment Receipt

更新时间：2026-11-06 18:23 MYT
验收时区：Asia/Kuching（MYT，UTC+8）

## 当前线上版本

| 项目 | 已核实值 |
|---|---|
| Current live release | `17.0.0-selfbuilt.64-game-controls` |
| Runtime commit | `1e243182e39aac52d3dfefa9f601134c5bd3240f` |
| Portal deploy | `dep-dbmqj56tlv9c73bo3u6g`，`live` |
| 上线完成 | 2026-11-06 18:21:09 MYT |
| Gateway configuration deploy | `dep-dbmqh9nf3r2c73bcq95g`，`live` |
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
| 线上复测 | health HTTP 200；release `.64`；database ready；MegaH5 Portal/Gateway 开关开启；Portal error/fatal 与 5xx 均为 0 |

本版完成 766 款全游戏检查，补齐 Rectangle/GodeeZone 单游戏控制，并按 Owner 指示持久开启 MegaH5 Portal 与 Gateway transfer/status 开关。其他厂家只有目录或仍被上游阻塞，未伪装成已可玩。GSPAY 与其他支付开关保持原状态。

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
- `megaWallet`: configured=true、enabled=true、settlementVerified=false、liveReady=false
- `liveGames=false`（尚无真实会员 E2E 签收记录）
- `productionReady=false`

## 入口与 DNS

- Portal：`https://master7-v17-staging.onrender.com`
- 客户根域：`https://master7.best/`，当前为 302 URL Forwarding；不适合 callback POST。
- 后台：`https://master7.site/`
- `www.master7.best`：仍缺 DNS。

线上复测已确认：MegaH5 Portal/Gateway 开关部署后保持开启且三个 Gateway channel 均 `configurationReady=true`；目录 766 款、618 Active、148 Maintenance。Portal 应用 error/fatal 与 5xx 均为 0。Gateway 的 8 次 502 是 EVO、ClotPlay、Venus、EPICWIN 目录同步的已知厂家阻塞。所有支付订单开关仍为 false。
