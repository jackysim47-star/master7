# MASTER7 34 家游戏 API 生产跟进报告

检查时间：2026-11-07T08:56:38Z（UTC）
正式入口：`https://master7.best`（实际解析到当前 Render portal）
游戏网关版本：`1.13.1`

## 结论

- 34/34 个大厅供应商位置可以读取，位置与排序完整。
- 当前新鲜目录：4/34（MegaH5、JILI、918KISS H5、RECTANGLE）。
- EVO888H5 有旧缓存，但厂家当前拒绝网关 IP，所以按维护处理。
- JDB 与 Pragmatic Play 已有网关目录 adapter，但厂家生产接口拒绝访问。
- 其余 27/34 尚无可工作的生产目录 adapter。
- 34/34 的正式游戏启动、玩家钱包与结算仍未通过生产验收；当前可确认可玩的供应商数是 0。

## 已完成的修正

- JDB Action 49 已按厂家当前官方协议改为 JSON 请求，并改用 AES-CBC 右侧空格填充。
- 网关已部署为 1.13.1，完整测试 105/105 通过。
- 修正后 JDB 厂家仍返回 9001（No authorized to access），已经排除旧请求格式，剩余为厂家授权、账号权限或 IP 白名单。

## 逐家结果

| # | 厂家 | 目录 | 数量 | 启动 | 钱包/结算 | 当前阻塞 |
|---:|---|---|---:|---|---|---|
| 1 | MegaH5 (`megah5`) | ✅ 新鲜 | 166 | ❌ | ❌ | 只有目录；生产启动与钱包 adapter/验收未完成 |
| 2 | JILI (`jili`) | ✅ 新鲜 | 297 | ❌ | ❌ | 只有目录；生产启动与钱包 adapter/验收未完成 |
| 3 | 918KISS H5 (`918kissh5`) | ✅ 新鲜 | 91 | ❌ | ❌ | 只有目录；生产启动与钱包 adapter/验收未完成 |
| 4 | GAMEPLAY INTERACTIVE (`gameplay`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 5 | LION KING (`lionking`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 6 | SUNCITY (`suncity`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 7 | PGSOFT (`pgsoft`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 8 | GFG / G4 (`gfg`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 9 | SA GAMING (`sagaming`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 10 | PS9 (`ps9`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 11 | DRAGOONSOFT (`dragoonsoft`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 12 | JDB (`jdb`) | 🔴 厂家拒绝 | 0 | ❌ | ❌ | 厂家 9001；需授权 Action 49/生产 API 与两条 Render 出口 IP |
| 13 | BG (`bg`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 14 | ALLBET (`allbet`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 15 | QUICKSPIN (`quickspin`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 16 | ASTAR (`astar`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 17 | META GAMING (`metagaming`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 18 | FUMA (`fuma`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 19 | YL (`yl`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 20 | FUNKY (`funky`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 21 | GAMITECH (`gamitech`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 22 | SPADE GAMING (`spadegaming`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 23 | TURBO (`turbo`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 24 | CT855 (`ct855`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 25 | PRAGMATIC PLAY (`pragmaticplay`) | 🔴 厂家拒绝 | 0 | ❌ | ❌ | 厂家 HTTP 435；需确认生产 API 权限与两条 Render 出口 IP |
| 26 | JOKER (`joker`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 27 | CG (`cg`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 28 | ATG (`atg`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 29 | RECTANGLE (`rectangle`) | ✅ 新鲜 | 64 | ❌ | ❌ | 只有目录；生产启动与钱包 adapter/验收未完成 |
| 30 | M8BET (`m8bet`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 31 | AWC (`awc`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 32 | EVO888H5 (`evo888h5`) | 🟡 旧缓存 | 148 | ❌ | ❌ | 厂家报 IP 不在白名单；需加入 74.220.52.216、74.220.52.217 |
| 33 | COSMOPLAY (`cosmoplay`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |
| 34 | GEMINI UPDOWN (`geminiupdown`) | ⚪ 待接 | 0 | ❌ | ❌ | 已有资料多为凭据表；仍需完整 API 合同、品牌映射并实现 adapter |

## 厂家跟进（可直接发送）

您好，MASTER7 正在进行 34 家游戏生产 API 验收。请协助确认以下项目：

1. JDB：当前 Action 49 依官方 JSON/AES-CBC 协议请求，厂家返回 9001（No authorized to access）。请开通生产账号的 Action 49/Game List 权限，并确认白名单包含 `74.220.52.216` 与 `74.220.52.217`。
2. Pragmatic Play：生产 GetCasinoGames 返回 HTTP 435。请确认 secureLogin 的生产 API 权限、API 主机及白名单包含以上两条 Render 出口 IP。
3. EVO888H5：厂家明确返回 IP 不在白名单。请加入以上两条 Render 出口 IP。
4. 其余供应商：请提供对应品牌的完整 API 文档（目录、创建玩家、启动、余额、上分、下分、转账查单、回调/报表）、钱包模式、MYR 环境和白名单要求；单独的账号/密钥表不足以完成连接。

请厂家回复每个品牌对应 MASTER7 大厅名称及产品代码，避免把一个聚合商账号错误映射成其他品牌。谢谢。

## 验收标准

每家只有在目录、玩家建立、启动、余额、上分、下分、断线补查、退出回收、报表对账全部通过后，才标记为可玩。目录能显示不等于可以玩。
