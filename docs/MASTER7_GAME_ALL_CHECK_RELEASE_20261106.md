# MASTER7 Full Game Check Release Receipt

发布版本：`17.0.0-selfbuilt.64-game-controls`
检查时间：2026-11-06 18:10 MYT

部署包 SHA-256：`01b946e4d04a8c02512e389993fe0939e344de6bef393a26e149bef780f8850a`

Portal commit / deploy：`1e243182e39aac52d3dfefa9f601134c5bd3240f` / `dep-dbmqj56tlv9c73bo3u6g`

Gateway code commit / deploy：`7f65d6a2527229f347bcd521d7c07ed8eb717c5f` / `dep-dbmqqqtg1s2s73d9msq0`

Portal 上线时间：2026-11-06 18:21:09 MYT；Gateway 修复上线：2026-11-06 18:35:52 MYT

## 线上目录结果

| 厂家 | 游戏数 | 连接 | 目录 | Launch | Wallet | 当前说明 |
|---|---:|---:|---:|---:|---:|---|
| MegaH5 | 166 | ✅ | ✅ | 待真实会员验收 | 待真实会员验收 | 唯一已有启动与转账钱包程序的厂家 |
| JILI | 297 | ✅ | ✅ | ❌ | ❌ | 只有目录，没有启动/钱包 API 程序 |
| 918KISS H5 | 91 | ✅ | ✅ | ❌ | ❌ | 只有目录，没有启动/钱包 API 程序 |
| Rectangle | 64 | ✅ | ✅ | ❌ | ❌ | 直连目录；本版补齐单游戏控制 |
| EVO888H5 | 148 | ❌ | 旧缓存 | ❌ | ❌ | 上游 HTTP 200 / `code 130`：厂家 IP 白名单失败；自动显示 Maintenance |
| EPICWIN | 0 | ❌ | ❌ | ❌ | ❌ | 固定 User-Agent 已部署；生产来源仍被厂家/WAF/账号权限 403 |
| Venus | 0 | ❌ | ❌ | ❌ | ❌ | `Code: 0` 响应缺少文档要求的 `X-Sign`、`X-Ts` |
| ClotPlay | 0 | ❌ | ❌ | ❌ | ❌ | 固定 User-Agent 已部署；生产来源仍被厂家/WAF/Token 权限 403 |
| GodeeZone | 0 | ❌ | ❌ | ❌ | ❌ | Portal 直连第一步 `/token` 被 Cloudflare HTML 403；单游戏控制已补齐 |

总计 766 款；618 款目录状态 Active，148 款 EVO 旧缓存处于 Maintenance。全部游戏编号和名称完整，没有重复 `(provider, gameCode)`，公开图片地址完整，跨五家抽查 11 张图片均为 HTTP 200 和正确图片类型。

## 程序检查

- ✅ 七个前台分类、每次加载 12 款、收藏、Free/Paid、图片 fallback。
- ✅ 38 个厂家按钮、76 个品牌目录、厂家和单游戏 Active / Maintenance / Close。
- ✅ Rectangle / GodeeZone 加入固定九家受信单游戏控制名单；未知厂家仍拒绝。
- ✅ MegaH5 建立 session、Deposit、Withdraw、status recovery、幂等及单次游戏结果账本程序。
- ✅ Gateway 的 MegaH5 transfer/status 凭证和开关已配置，无 configuration blocker。
- ✅ Portal 与 Gateway MegaH5 transfer/status 开关已持久开启；三个 Gateway channel 均 `configurationReady=true`。
- ✅ Gateway `7f65d6a` 修复 EPICWIN/ClotPlay 固定 User-Agent，并避免缓存 EVO/MegaH5 业务拒绝；Gateway 85/85 测试通过。
- ⏳ 必须用获授权会员做一次零/小额 Launch、Wallet、Exit、Disconnect、Settlement 验收。
- ❌ JILI、918KISS、EVO、EPICWIN、Venus、ClotPlay、Rectangle、GodeeZone 尚无 Launch/Wallet adapter，不能标为可玩。

厂家网络动作：完整放行 Render Singapore 出站范围 `74.220.52.0/24` 与 `74.220.60.0/24`。EVO 必须解除 `code 130`；EPICWIN、ClotPlay 与 GodeeZone 还须检查 WAF 和商户/Token 权限；Venus 必须返回可验证的响应签名头。

连接目录不等于真实可玩。本回执只对已经取得的证据打 ✅，不会把目录同步冒充成钱包和结算验收。

当前 Portal 线上版 `17.0.0-selfbuilt.65-payment-safety` 只加强 VPay/1MPay 结算安全并修复构建声明，不改变本回执中的游戏数量、厂家开关或 Launch/Wallet 验收状态。其部署证据单独记录在 `MASTER7_PAYMENT_SAFETY_RELEASE_20261106.md`。
