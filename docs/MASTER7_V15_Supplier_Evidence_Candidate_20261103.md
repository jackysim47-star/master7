# MASTER7 V15 供应商与品牌历史证据候选清单

日期：2026-11-03（Malaysia）
性质：历史资料整理，不是最终 canonical 名册、合同证明、UAT 结果或生产接通证明。

## 来源与范围

主要来源为用户提供的修订 B 包 `gateway/integrations-status.json`。文件自述时间为 2026-10-13，范围为“一个上游供应商、多个品牌”；本次按名称去重得到 33 个品牌登记名称，但源文件没有稳定的供应商 ID、品牌 ID 或完整游戏 ID。故本清单只能作为待复核候选，不能据此宣称有 33 家独立供应商或 70+ 个品牌已完成接入。

- 来源文件 SHA-256：`f2d7786f5534f19fdfda99007647a89d19970895ba7c1316141f17242f5e3e48`
- 历史品牌登记名称：33 条；按名称去重：33 个。
- 历史目录快照：382 个游戏条目；JILI 291；918KISSH 91。游戏条目不等于品牌数。
- 历史网关标记 `gameLaunchAvailable`：`false`。

## 品牌登记（历史状态原样保留）

| # | 登记名称 | 文件当时状态 | 文件当时环境备注 | 稳定品牌 ID | 本轮线上验收 |
|---:|---|---|---|---|---|
| 1 | MegaH5 | 已取得清单 | UAT | 未提供 | 未执行 |
| 2 | EVO888H5 | 厂家拒绝 | 生产资料；网关整体标记 UAT | 未提供 | 未执行 |
| 3 | CLOTPLAY | 厂家拒绝 | Production | 未提供 | 未执行 |
| 4 | EPICWIN | 厂家拒绝 | Production | 未提供 | 未执行 |
| 5 | 918KISSH5 | 已取得清单 | Production / MYR、MY1 | 未提供 | 未执行 |
| 6 | MEGA888 | 资料已收到 | MYR | 未提供 | 未执行 |
| 7 | PEGASUS | 资料已检查 | Production / MYR | 未提供 | 未执行 |
| 8 | BT GAMING | 资料已收到 | Production / MYR | 未提供 | 未执行 |
| 9 | MEGAWINS | 待取得 KEY | Production / MYR | 未提供 | 未执行 |
| 10 | JILI | 已取得清单 | Production / MYR 1:1、1:100 | 未提供 | 未执行 |
| 11 | AWC | 文档不可访问 | Production | 未提供 | 未执行 |
| 12 | Lion King | 历史文件已找到 | 未验证 | 未提供 | 未执行 |
| 13 | Cosmoplay | 业务回调未启用 | 未验证 | 未提供 | 未执行 |
| 14 | Creative Gaming | 业务回调未启用 | 未验证 | 未提供 | 未执行 |
| 15 | PGSOFT | 业务回调未启用 | 未验证 | 未提供 | 未执行 |
| 16 | Spade Gaming | 业务回调未启用 | 未验证 | 未提供 | 未执行 |
| 17 | MICRO GAMING | 待确认接口文档 | Production / MYR | 未提供 | 未执行 |
| 18 | VENUS GAMING | 响应签名缺失 | Production / MYR | 未提供 | 未执行 |
| 19 | LFC888 | 待确认接口文档 | Production / MYR | 未提供 | 未执行 |
| 20 | SPRIBE | 待确认接口文档 | Production / MYR | 未提供 | 未执行 |
| 21 | SABA SPORTS | 待确认接口文档 | Production / MYR | 未提供 | 未执行 |
| 22 | CRAZY GAMING | 待确认接口文档 | Production / MYR | 未提供 | 未执行 |
| 23 | PLAYTECH | 对接未完成 | Production / MYR | 未提供 | 未执行 |
| 24 | IBEX | 待确认API地址 | Production / MYR | 未提供 | 未执行 |
| 25 | FACHAI | 待确认接口文档 | Production / MYR | 未提供 | 未执行 |
| 26 | MARIO | 待确认API地址 | Production / MYR | 未提供 | 未执行 |
| 27 | T1 GAMING | 待读取后台文档 | Production / MYR | 未提供 | 未执行 |
| 28 | GW99 | 待确认API地址 | Production / MYR | 未提供 | 未执行 |
| 29 | EVO888 | 待确认接口文档 | Production / MYR | 未提供 | 未执行 |
| 30 | HUAWEI | 待确认接口文档 | Production / MYR | 未提供 | 未执行 |
| 31 | QUICKSPIN | 资料已检查，服务端配置已保存 | MYR；资料未明确标注测试/生产 | 未提供 | 未执行 |
| 32 | ASTAR | 资料已检查，服务端配置已保存 | MYR；资料未明确标注测试/生产 | 未提供 | 未执行 |
| 33 | ALLBET | 资料已检查，服务端配置已保存 | MYR；资料未明确标注测试/生产 | 未提供 | 未执行 |

## 回调路径（历史记录）

| 名称 | 路径 | 历史状态 | 本轮处理 |
|---|---|---|---|
| Cosmoplay | `/callbacks/cosmoplay` | POST 503；业务未启用 | 未重发；未做厂家联调 |
| Creative Gaming | `/callbacks/creative-gaming` | POST 503；业务未启用 | 未重发；未做厂家联调 |
| PGSOFT | `/callbacks/pgsoft` | POST 503；业务未启用 | 未重发；未做厂家联调 |
| Spade Gaming | `/callbacks/spade-gaming` | POST 503；业务未启用 | 未重发；未做厂家联调 |
| VPay | `/callbacks/vpay/payment` | 配置检测通过；业务未验收 | 未重发；未做厂家联调 |
| VPay | `/callbacks/vpay/withdrawal` | 配置检测通过；业务未验收 | 未重发；未做厂家联调 |

## 支付展示入口（名称证据）

| 展示名称 | 证据边界 | 正式商户/法人 ID | 生产交易验收 |
|---|---|---|---|
| VPAY | 原始四支付预览代码 | 未核实 | 未验收 |
| GSPAY | 原始四支付预览代码 | 未核实 | 未验收 |
| 1MPAY | 原始四支付预览代码 | 未核实 | 未验收 |
| GSPAY+ | 原始四支付预览代码；独立商户归属待查 | 未核实 | 未验收 |

## 可用于后续核验的结论

- 此登记的历史范围自述为一个上游供应商和多个品牌；不能把 33 个品牌名称换算成 33 个独立法人或供应商。
- 历史目录记有 382 个游戏条目，并明确 `gameLaunchAvailable=false`；不证明生产游戏启动、钱包结算或当前在线目录。
- 四个支付名称来自展示预览；不证明四家独立支付公司、正式商户开通或真实充值成功。
- 四条游戏回调曾记录为业务未启用；VPay 两条回调曾记录配置检测通过但业务未验收。此处均为 2026-10-13 快照，不代表当前服务状态。
- 最终名册仍需取得授权来源，按供应商 ID、品牌 ID、游戏 ID 和支付商户 ID 去重，并补充合同/授权、UAT 环境、测试账号及逐项结果。未核实项保持关闭。
