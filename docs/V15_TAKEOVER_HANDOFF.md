# MASTER7 V15 技术接手说明

整理日期：2026-11-03（马来西亚时间，UTC+8）。本说明是源码定位与安全接手路线，不是源码全量包、数据库备份或上线证明。它以本次交接资料记载的时间和具体资源为准；旧报告保留原版本和时间，不作为升级指令。

## 目标和当前结论

主目标是接手并确认既有 V15 资产，同时保留原资料、域名和配置。当前证据不足以宣布正式前后台、原会员数据库、游戏或支付已恢复。

| 对象 | 定位 / 当前证据 | 边界 |
| --- | --- | --- |
| 门户代码仓库 | `https://github.com/wbdream10-cpu/master7`，`main`，提交 `1cd61e1ff49f4148c9bc1dfd9dc951a5a31c0273` | 仓库 README 描述的范围不等于完整原始游戏平台；Git 提交也不包含云端部署配置或生产数据 |
| 同名仓库 | `https://github.com/jackysim47-star/master7`；交接资料记载其 `main` 树 SHA 与上述版本相同 | 不能视为另一套 70+ 品牌源码；本工作副本 `codex/cloud-staging-readiness` 的提交 `be7b4029d94d7344ad18dc6712033e58311e58aa` 是独立 staging 准备分支 |
| 游戏/支付网关 | `https://github.com/wbdream10-cpu/platform-samples/tree/codex/master7-integration-gateway-20261012/master7-gateway`；子目录树 SHA `200446384f5db899627dcb47699924ed9ae437e8` | 这是网关代码定位，不证明生产业务已连接；本工作副本所附网关源码提交 `b7b46dbc7a41dfcdca2ee891afca144805ffd222` 属于另一份固定交付快照，勿混为同一 SHA |
| V15 静态入口 | Render `master7-v15-malaysia-final`，服务 ID `srv-dbia0ouc6qcc73d2v0fg` | 页面 HTML 由 Render 构建命令生成；完整保全须同时记录代码、构建命令、发布目录及域名配置 |
| 原服务门户 | `https://ahbi-service-portal.onrender.com`；交接报告记载本轮唤醒后 `/signin` 和 `/health` 为 200 | 未提交真实登录；健康响应不证明会员资料完整或数据源身份 |
| 新服务门户 | `https://ahbi-service-portal-c3jm.onrender.com`，Render 服务 `srv-dbkl79fb9u1s73fnoojg` | 2026-11-03 12:52 MYT 只读复核见到 4 次 `update_failed`；构建/测试成功后，启动日志显示缺少 `PORTAL_POSTGRES_URL`。它与不带 `-c3jm` 的原门户是不同资源 |
| 暂存 PostgreSQL | `master7-cloud-staging-db`，ID `dpg-dbkl1g3bc2fs739li01g-a` | 新的免费测试库；未证明导入旧数据或验证恢复，不能替代原数据库 |
| 原 PostgreSQL | `master7-platform-sync-db`，ID `dpg-dan1f2uk1f9s73f369h0-a` | 本次交接报告记载按 ID 查询 404。不能据此断言永久删除；存续、保留期限及副本待原账户持有人/Render 确认 |

V15 final 默认入口曾返回 200，但正式 `www.master7.best` 与 `admin.master7.best` 仍为 404；入口按钮仍跳转原门户。HTTP 可访问、部署记录为 live 或健康接口返回 ready，均不替代真实登录、数据完整性或生产业务验收。

## 支付、游戏和品牌证据分层

### 四个支付展示名称

保存的预览 HTML `MASTER7_三厂牌ClaimBonus_四支付_互动预览.html`（Library ID `libfile_abc2405bf38c81919d928cb0a946d8e5`）列出 `VPAY`、`GSPAY`、`1MPAY`、`GSPAY+`。该文件自述为预览，未接正式交易；其中 GSPAY+ 是否独立公司也未确认。

原始预览代码中的名称数组为：

```js
const paymentPreview = Object.freeze([
  {code:"vpay",label:"VPAY"},
  {code:"gspay",label:"GSPAY"},
  {code:"1mpay",label:"1MPAY"},
  {code:"gspay-plus",label:"GSPAY+"}
]);
```

门户当前 README/技术文档可支持 VPay 与 GSPAY+ 的不同程度实现/准备说明；本次证据没有证明 1MPAY 已接通生产交易。银行转账是支付方式，DuitNow 是支付网络，USDT 是币种，不能凑成另外的支付公司。四个展示入口不等于四家独立公司已连通。

### 四个游戏通知/回调名称

网关 `integrations-status.json`（文件时间 2026-10-13）登记了下列回调路径：

| 名称 | 路径 | 文件中的历史状态 |
| --- | --- | --- |
| Cosmoplay | `/callbacks/cosmoplay` | POST 503；业务未启用 |
| Creative Gaming | `/callbacks/creative-gaming` | POST 503；业务未启用 |
| PGSOFT | `/callbacks/pgsoft` | POST 503；业务未启用 |
| Spade Gaming | `/callbacks/spade-gaming` | POST 503；业务未启用 |

这是历史代码/状态文件登记；本次没有发送回调或厂家请求，也未证明这些是否就是用户所指四家公司。

### 品牌数和游戏条目

| 证据来源 | 数量 | 能支持的结论 |
| --- | ---: | --- |
| 门户 `app/portal.tsx` 和独立赞助目录 | MegaH5、JILI、918KISS 三项 | 门户展示/只读目录范围 |
| 网关 `integrations-status.json` 的 `connections` | 33 个不同品牌名称 | 历史接入登记；不代表 33 家法人，也不代表全部适配完成 |
| 历史 `frontendCatalogue` | 382 个游戏条目（JILI 291、918KISSH5 91） | 2026-10-13 的目录快照，不是品牌数；本轮未在线复测 |
| 较早游戏大厅预览 | 文案为 30 家其他厂家 + 3 家赞助厂家 | 设计文案，不证明正式连接 |

当前没有证据证明“70 多个不同品牌全部完成并收录在同一 V15 源码包”。接手人应继续找原 B15/V15 工程、Site 源码、私有资料或供应商总表；以唯一品牌 ID 和唯一游戏 ID 分别去重，不能把缺少清单解释成旧源码不存在或据此重建/覆盖旧站。

### 网关历史登记的 33 个品牌

下表逐项转录自日期为 2026-10-13 的 `integrations-status.json`；登记状态是文件记录，不是当前线上状态或实时厂家验证。注册表自述为一个上游供应商、多个品牌，不能据此推定为 33 家独立法人供应商。

| # | 品牌 | 文件登记状态 |
| ---: | --- | --- |
| 1 | MegaH5 | 已取得清单 |
| 2 | EVO888H5 | 厂家拒绝 |
| 3 | CLOTPLAY | 厂家拒绝 |
| 4 | EPICWIN | 厂家拒绝 |
| 5 | 918KISSH5 | 已取得清单 |
| 6 | MEGA888 | 资料已收到 |
| 7 | PEGASUS | 资料已检查 |
| 8 | BT GAMING | 资料已收到 |
| 9 | MEGAWINS | 待取得 KEY |
| 10 | JILI | 已取得清单 |
| 11 | AWC | 文档不可访问 |
| 12 | Lion King | 历史文件已找到 |
| 13 | Cosmoplay | 业务回调未启用 |
| 14 | Creative Gaming | 业务回调未启用 |
| 15 | PGSOFT | 业务回调未启用 |
| 16 | Spade Gaming | 业务回调未启用 |
| 17 | MICRO GAMING | 待确认接口文档 |
| 18 | VENUS GAMING | 响应签名缺失 |
| 19 | LFC888 | 待确认接口文档 |
| 20 | SPRIBE | 待确认接口文档 |
| 21 | SABA SPORTS | 待确认接口文档 |
| 22 | CRAZY GAMING | 待确认接口文档 |
| 23 | PLAYTECH | 对接未完成 |
| 24 | IBEX | 待确认 API 地址 |
| 25 | FACHAI | 待确认接口文档 |
| 26 | MARIO | 待确认 API 地址 |
| 27 | T1 GAMING | 待读取后台文档 |
| 28 | GW99 | 待确认 API 地址 |
| 29 | EVO888 | 待确认接口文档 |
| 30 | HUAWEI | 待确认接口文档 |
| 31 | QUICKSPIN | 资料已检查，服务端配置已保存 |
| 32 | ASTAR | 资料已检查，服务端配置已保存 |
| 33 | ALLBET | 资料已检查，服务端配置已保存 |

## 安全接手顺序

1. **冻结资产映射。** 先保存仓库、分支、提交、Render 服务/部署 ID、构建命令、发布目录、域名记录及数据源身份的只读清单。明确区分 V15 静态入口、原门户、新门户和网关。
2. **分别保全数据来源。** 由原资源持有人和 Render 核实旧 PostgreSQL 的存续、官方保留期限及可导出/恢复选项。若 `master7-platform-sync` 的运行 JSON 仍需保全，应作为另一条数据线处理，记录来源实例、采集时间、字节数、SHA-256 和事件水位。取得原始副本前，不重启/重部署、不运行迁移、不覆盖路径或创建空库替代。
3. **隔离验证副本。** 只在隔离环境恢复副本，核对表/记录范围、关键 ID、时间跨度和账务汇总；记录恢复差异及回滚点。暂存库可用于新 staging 验证，但空库连接成功不是旧数据恢复。
4. **确认目标服务和数据源。** 核实正式的“域名→项目→服务→提交→数据源”映射及所有者。新门户缺少 `PORTAL_POSTGRES_URL` 时应保持启动保护；只有确认该服务、隔离数据库和 TLS 参数后，才由有权人员在 Render 秘密设置中配置。不要将暂存库冒充旧生产库。
5. **先做 staging 验收。** 使用固定提交、独立域名和已确认隔离数据库；验证健康版本、匿名权限、顾客注册/审批/登录、员工角色隔离、会话撤销、持久化和备份恢复。保留真实账户与生产秘密，不进行真实交易。
6. **最后处理正式域名与业务。** 只有目标项目和回滚方案明确、备份恢复已验收后，才安排域名及生产配置变更。游戏、支付、钱包、回调和对账必须按真实厂家协议与授权 UAT 分项验收；预览入口、登记状态和模拟测试不能作为上线证明。

### 当前停止条件

- 正式前后台域名仍记录为 404，服务映射与所有权未完成核实。
- 原数据库 ID 查询 404，尚无完整备份、校验值和隔离恢复成功证明。
- 新门户因缺少 `PORTAL_POSTGRES_URL` 部署失败；原门户与新门户不可互相代替。
- 四个支付展示名称均没有生产建单、到账、单次钱包入账和外部对账的完整证据；这些名称不证明对应四家独立公司。游戏目录代码也不等于真实启动/结算。

## 2026-11-03 12:52 MYT Render 只读复核

- 新门户仍在 `wbdream10-cpu/master7` 的 `main` / 提交 `1cd61e1ff49f4148c9bc1dfd9dc951a5a31c0273` 上，未部署 staging 准备分支。
- 已见 4 次失败部署：`dep-dbkl7a7b9u1s73fnoql0`、`dep-dbklea6k1f9s73dam3cg`、`dep-dbkljejncjis73em5dfg`、`dep-dbklpfqjnfac739a7r50`。构建与测试日志成功；运行阶段因缺少 `PORTAL_POSTGRES_URL` 退出 1。其后出现的端口扫描超时是进程退出后的现象，不是另一项已确诊根因。
- 暂存 PostgreSQL 仍为 `available`，到期记录为 2026-12-03 03:10:56 UTC；外部 IP allowlist 为空。未读取数据库连接秘密，也未修改 allowlist 或设置环境变量。
- 原 PostgreSQL ID `dpg-dan1f2uk1f9s73f369h0-a` 查询仍返回 404；这不证明数据永久删除。
- 本次只读 Render 元数据、部署与日志；未触发部署、重启、数据库连接或公开健康请求。

## 2026-11-03 12:59 MYT Supabase 候选检查

- 当前授权只列出 `shspbmnghbgyzcsjukui`（`mastersupport7-creator's Project`，`ap-northeast-2`，状态 `ACTIVE_HEALTHY`）。只读目录查询显示 `public`、`portal_private` 没有业务表，Supabase migration 清单为空。
- 历史资料提及的 `aarihmvlnlssxulktbmb` 仍不在可见项目列表；详情查询返回无权限。不能据此判断项目已删除或没有数据。
- 受检项目与 V15 原会员生产库的关系未证明。当前可用 Supabase 工具没有备份/快照清单读取接口；未取得备份文件或隔离恢复证据。
- 本次仅读取项目、schema/表清单和迁移清单；没有查询会员明细、创建/修改数据库或执行 SQL 写入。

上述项目未解除前，交付状态保持“待接手/未完成生产验收”。本说明不授权 DNS 写入、服务部署、数据库操作、付费升级、凭据变更或第三方供应商请求。
