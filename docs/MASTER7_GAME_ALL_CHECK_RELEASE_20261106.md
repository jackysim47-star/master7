# MASTER7 Full Game Check Release Receipt

候选版本：`17.0.0-selfbuilt.64-game-controls`
检查时间：2026-11-06 18:10 MYT

候选包 SHA-256：`01b946e4d04a8c02512e389993fe0939e344de6bef393a26e149bef780f8850a`

## 线上目录结果

| 厂家 | 游戏数 | 连接 | 目录 | Launch | Wallet | 当前说明 |
|---|---:|---:|---:|---:|---:|---|
| MegaH5 | 166 | ✅ | ✅ | 待真实会员验收 | 待真实会员验收 | 唯一已有启动与转账钱包程序的厂家 |
| JILI | 297 | ✅ | ✅ | ❌ | ❌ | 只有目录，没有启动/钱包 API 程序 |
| 918KISS H5 | 91 | ✅ | ✅ | ❌ | ❌ | 只有目录，没有启动/钱包 API 程序 |
| Rectangle | 64 | ✅ | ✅ | ❌ | ❌ | 直连目录；本版补齐单游戏控制 |
| EVO888H5 | 148 | ❌ | 旧缓存 | ❌ | ❌ | 厂家 IP 白名单失败，自动显示 Maintenance |
| EPICWIN | 0 | ❌ | ❌ | ❌ | ❌ | 上游 403 |
| Venus | 0 | ❌ | ❌ | ❌ | ❌ | 厂家响应缺少签名 |
| ClotPlay | 0 | ❌ | ❌ | ❌ | ❌ | 上游 403 |
| GodeeZone | 0 | ❌ | ❌ | ❌ | ❌ | 上游 403；本版补齐单游戏控制 |

总计 766 款；618 款目录状态 Active，148 款 EVO 旧缓存处于 Maintenance。全部游戏编号和名称完整，没有重复 `(provider, gameCode)`，公开图片地址完整，跨五家抽查 11 张图片均为 HTTP 200 和正确图片类型。

## 程序检查

- ✅ 七个前台分类、每次加载 12 款、收藏、Free/Paid、图片 fallback。
- ✅ 38 个厂家按钮、76 个品牌目录、厂家和单游戏 Active / Maintenance / Close。
- ✅ Rectangle / GodeeZone 加入固定九家受信单游戏控制名单；未知厂家仍拒绝。
- ✅ MegaH5 建立 session、Deposit、Withdraw、status recovery、幂等及单次游戏结果账本程序。
- ✅ Gateway 的 MegaH5 transfer/status 凭证和开关已配置，无 configuration blocker。
- ⏳ Portal 开关上线后，必须用获授权会员做一次零/小额 Launch、Wallet、Exit、Disconnect、Settlement 验收。
- ❌ JILI、918KISS、EVO、EPICWIN、Venus、ClotPlay、Rectangle、GodeeZone 尚无 Launch/Wallet adapter，不能标为可玩。

连接目录不等于真实可玩。本回执只对已经取得的证据打 ✅，不会把目录同步冒充成钱包和结算验收。
