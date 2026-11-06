# MASTER7 Malaysia · V17 全平台接手进度

记录日期：2026-11-03（Asia/Kuala_Lumpur）
最新产品基线（用户 2026-11-03 确认）：整个新平台以 MASTER7 V17 为唯一底版；先把可验证的旧资料迁入独立 V17 staging，再将 V17 升级为完整平台。V15 入口/模板不作为平台底版。客户移动端交付指 Android APK 与 iPhone App，不是 PWA 或“添加到主屏幕”。
目标：顾客前台 `www.master7.best` 与老板/员工共用的管理后台 `admin.master7.best`。平台地区 MY，币种 MYR，业务时区 Asia/Kuching。
状态口径：**已验证** = 有本轮可复核的代码、测试或云端证据；**历史记录** = 旧回执/报告中的观察；**阻塞** = 缺少访问、来源资料或授权，尚不能验收。此表不代表生产上线。

## 当前交付结论

工作区现包含门户候选源码、游戏/支付网关快照、部署配置、自动 Setup 只读预检，以及用户提供的修订 B 附件还原件。附件声明的 154 个文件已全部还原并逐项核验字节数与 SHA-256（**154/154**）；归档 ZIP 及哈希清单已生成。该附件仍不包含原 Sites 游戏平台的完整源码，也不包含生产数据副本。

本轮重新运行 staging 与 production 自动预检，二者均未就绪。当前代码通过 `SERVICE_ONLY_MODE` 保持支付、钱包和游戏业务关闭。没有部署、改 DNS、连数据库、迁移数据、创建交易或变更云端配置。

## 覆盖矩阵

| 工作项 | 当前证据与状态 | 完成验收所需结果 |
|---|---|---|
| 修订 B 源码收件 | 已验证：从用户附件还原 154/154 个文件，逐项通过声明字节数与 SHA-256；独立归档包 CRC/文件清单通过 | 保留原始还原树与校验清单；文件收件不代表原游戏平台源码已找到 |
| 原游戏平台源码 | 阻塞：Sites 项目 `appgprj_6abcd530747c81918fb5411fc42b24b3` 的当前连接查询返回 404；v105 回执来源仓库/分支已知 | 原项目所有者授权读取或导出源码，并核对 v105 提交 `2900208311c747f83886f391a6c990b12001e58c` |
| 门户/网关/入口分界 | 已验证：当前门户仓库是服务门户候选；网关为另一组件；V15 静态入口是技术入口页 | 保留三者独立版本与服务映射，不以门户候选覆盖原游戏站 |
| 前台/后台域名 | 本轮 HTTPS GET：`www.master7.best` 与 `admin.master7.best` 仍返回 404；`.vip` 返回 200。DNS 解析到 Cloudflare 地址，但应用映射仍未就绪 | 域名控制权、托管绑定与 TLS 证据齐备；两入口响应 HTTPS 200 并分别验收 |
| 登录规格（用户确认） | 前台 www.master7.best 会员登录用 ID+密码+OTP；后台 admin.master7.best 共用登录用 ID+密码；老板/员工共用后台，无第三入口。当前门户候选仅 ID+密码；已从旧 .vip 公开前端静态脚本定位短信 OTP 客户端契约（/api/auth/login/sms 与 /api/auth/login），但尚未验证其服务端、供应商返回或与 .best/v105 的映射 | 前台完成 OTP 发送/校验/限速/过期/重试与账号恢复；后台按 ID+密码及既有角色授权实测。短信/邮件 OTP 的服务端渠道尚未在代码中配置 |
| 管理后台与角色 | 代码包含角色隔离；本次权限默认按现有授权保留 | 老板与员工登录同一后台，各自执行已授权操作并留下记录；不自动授予银行/代付权限 |
| 三语、手机与桌面 | 本地三语代码与浏览器测试记录存在；未生产发布 | 在马来西亚 Android/iPhone Chrome 和桌面验证登录后页面、布局、语言及共用业务记录 |
| MYR/MYT/IP 定位 | 代码配置 MYR、Asia/Kuching、运行区 Singapore；访客地区 API 仅使用受信边缘头展示，缺省可为未知 | 正式代理链确认后测试访客定位；不把 IP 定位作为身份、支付、游戏或许可决策 |
| 游戏目录 | 已验证代码只读展示 MegaH5、JILI、918KISS；不启动游戏或使用钱包 | 取得原平台/供应商授权协议后，逐品牌测试登录、启动、返回大厅和结算 |
| 游戏品牌清单 | 已整理历史证据候选清单 [MASTER7_V15_Supplier_Evidence_Candidate_20261103.md](MASTER7_V15_Supplier_Evidence_Candidate_20261103.md)：33 个不同登记名称、6 条回调记录、4 个支付展示名；源文件自述一个上游供应商；382 是游戏条目快照。缺稳定 ID、合同授权和本轮 UAT，不能证明 70+ 品牌接通或支付商已开通 | 由有权人员确认最终名册；补唯一供应商/品牌/游戏/商户 ID，按 ID 去重并逐项验收；未核实项目保持关闭 |
| 游戏回调 | 历史登记 Cosmoplay、Creative Gaming、PGSOFT、Spade Gaming 四条路径，历史状态 POST 503 | 每家以正式协议验签、重试/幂等及业务结果完成 UAT 与对账 |
| 支付展示入口 | 历史预览有 VPAY、GSPAY、1MPAY、GSPAY+；不证明独立公司或交易已接通 | 核对商户归属和授权，逐渠道建单、回调验签、独立查单、金额核对、一次入账和对账 |
| VPay | 本地有结算状态机与合成测试；生产开关关闭，无厂家 UAT/真钱证据 | 厂家 UAT、白名单、服务器秘密、端到端测试和结算单核对 |
| GSPAY+ | 本地有协议/存储准备；建单响应契约不完整，内部回调固定关闭 | 补齐厂家响应与认证细节、UAT、回调/查单及账本对账；未完成前保持关闭 |
| 1MPAY | 仅有预览展示证据；本门户中未核实生产适配 | 取得官方 API/商户资料并独立实现和验收 |
| 提款、钱包、账本、报表 | 本地代码包含人工审核/账本流程；默认关闭，无真实资金闭环 | 核对冻结、拒绝释放、付款结果未知查原单、只扣一次、MYR/MYT 报表与外部账单一致 |
| 福利、客服、通知与推广 | 代码/历史预览范围不等于生产验收；RM188/12 倍流水方案仅保留为草稿 | 确认资格、适用游戏、期限、通知授权/退订、客服与资金流程分离并验证审计 |
| 顾客移动 App（APK/AAB 与 iPhone App） | 本地工作区未发现 APK/AAB/IPA、Capacitor/Flutter/原生移动工程或签名/商店发布材料；不可用 PWA 代替用户要求的下载 App | 在恢复后的 V17 项目内建设移动工程；由账号所有者通过受控渠道提供 Android/iOS 签名与商店权限；实机安装、登录、更新及回滚验证 |
| 教学视频 | 本轮没有可播放视频或出处/授权证据 | 核实充值通道与游戏厂牌的正式教程资源、出处/许可，在 V17 内标明对应厂牌/渠道后验收 |
| 旧数据库与运行文件 | 阻塞：旧 PostgreSQL ID 查询 404；无带哈希完整备份/隔离恢复证明；同步文件副本未取得 | 资源所有者确认存续与导出，保存原始副本/哈希/事件水位，在隔离环境核对会员、权限、余额、订单、账本 |
| staging 云部署 | Blueprint 存在；新暂存 DB 为单独测试资源；未确认连接、迁移或成功部署 | 正确原项目源码、TLS PostgreSQL、服务秘密、受限网络、固定 SHA、健康/登录/持久化和备份恢复验收 |
| 自动 Setup | 已验证命令只读预检；staging 和 production 均 `ready=false`、`canProvision=false` | 源码身份、数据恢复、供应商名册、HTTPS/PostgreSQL 及生产许可/域名/回滚/管理员证据满足后，再实现受控自动部署 |
| 唯一管理权交接 | 目标账号 `mastersupport7@gmail.com` 是既有目标；当前未验证其持有 Render、Sites、域名及仓库管理权 | 你本人验证登录与恢复；再以平台所有权/角色功能完成转移并审计回收临时权限 |
| 稳定性/巡检/安全数据 | 无本轮马来西亚终端性能基线、持续可用性或攻击数据 | 记录分地区真实时延、连续运行、DNS/HTTPS/版本巡检；攻击等级只引用可审计防火墙/日志数据 |

## 手机 Wi-Fi IP/DNS 截图核对（2026-11-03）

截图中的数据是 Office Wi-Fi 的局域网配置：手机网关 `192.168.68.1`、手机 IPv4 `192.168.68.103`、Windows 电脑 IPv4 `192.168.68.120`、子网掩码 `255.255.255.0`、DNS `192.168.0.1` 和 `192.168.68.1`。Windows 截图显示 IP 与 DNS 都由 DHCP 自动分配。这些 `192.168.x.x` 地址只在办公室内网有效；它们不是公众可访问的服务器 IP，不能填到 `master7.best` 的公开 DNS，也不能据此推断 Render/Sites 的托管地址。IPv6 `fe80::...` 是链路本地地址，同样不能作为公网站点地址。

当前平台代码的访客国家展示依赖受代理提供的 `CF-IPCountry`，MYR 与 `Asia/Kuching` 是平台业务设置；办公室 Wi-Fi 截图不能决定访客国家、生产域名解析或云端部署位置。本轮没有改 DNS。重新验证结果：`www.master7.best` 404、`admin.master7.best` 404；当时的旧域名入口已退役并从平台链接清除，目标双入口仍阻塞。

## 自动地区与本地验证接续（2026-11-03）

- `shared/visitor-location.mjs` 将访客国家识别限定为 `CF-IPCountry` 展示元数据；不读取或回显访客原始 IP，也不用于访问授权、支付、游戏或合规判断。目标代码已测试 Malaysia 头、无效值、未知国家和缓存禁用行为。只有代理路径已核实后，才可把线上展示称为 IP 自动识别通过。
- 本轮重新通过：`npm run test:cloud` 6/6、`npm run test:i18n` 3/3、`npm run test:auto-setup` 4/4、`npm run build`、`git diff --check`。均为本地候选验证，不是生产验收。
- 自动预检依然为只读且 `canProvision=false`。本次没有执行数据库访问、供应商请求、生产登录、DNS 写入或云端部署。

## 2026-11-03 后续只读复核与自动接手代码

- Sites 按原项目 ID `appgprj_6abcd530747c81918fb5411fc42b24b3` 查询仍返回 `NOT_FOUND`。当前 Sites 可见列表中另有 `MASTER7 V17 · 服务门户与后台`（`appgprj_6ae447787f1c819193237856fd58b858`）和 `MASTER7 · V15 前台模板`（`appgprj_6ae33a9c71cc8191b259ee5351cb1b05`）；二者是不同项目，模板说明尚未连接真实账号、支付或游戏服务，不能替代 v105 原游戏平台。该账户未列出 v105 项目不证明其已删除。
- Render `ahbi` 只读列表仍只见 `master7-cloud-staging-db`（`dpg-dbkl1g3bc2fs739li01g-a`，available、免费 Singapore、记录到期 2026-12-03）；没有旧生产数据库的可恢复证明。`ahbi-service-portal-c3jm` 是另一独立门户候选服务；`master7-v15-malaysia-final` 是静态入口，不是完整游戏站。
- 当前公网复核：`www.master7.best` HTTP 404、`admin.master7.best` HTTP 404；V15 Render 静态入口 HTTP 200。没有改 DNS、触发部署或写入云端配置。
- 自动 Setup 新增原站源码清单校验：`standalone/original-source-manifest.mjs` 按 v105 项目/提交标识、完整文件集、路径安全、字节数与 SHA-256 校验源码导出；`standalone/auto-setup.mjs` 仅在此证据通过时更新源码检查结果，预检仍是只读，永远不会直接部署。清单完整性不等于源码归属证明。
- 本轮自动预检仍为 staging 8 项阻塞、production 14 项阻塞，二者 `ready=false`、`canProvision=false`。新增测试 `npm run test:auto-setup` 7/7 通过；`npm test`、`npm run test:postgres` 与 `npm run build` 通过，均为隔离本地验证。
- 更新的候选交付包为 `/workspace/deliverables/MASTER7_V15_AutoSetup_Candidate_20261103.zip`；187 个 ZIP 条目（含清单），CRC 校验通过，SHA-256 `dc8931ca3a9e01cf6f06cdc856c7b3c46b920be9ad19a145d6d03fbead93b5da` 与旁置 `.sha256` 一致。


## 登录规格补充（用户确认，2026-11-03）

- 只保留顾客前台与一个共用管理后台。
- 顾客前台：ID、密码、OTP。
- 管理后台：ID、密码；老板与员工使用同一后台登录，权限仍按已授权角色分配。
- 当前候选认证表单/测试仅覆盖 ID 与密码，未接短信或邮件 OTP 服务；因此 OTP 是明确待实现/验收项，不会标记成已可用。

## 修订 B 附件收件与本地验证（2026-11-03）

- 附件：`MASTER7_V15_Codex_Source_Update.md`；声明/实际还原文件数 154；目录数 6（portal 101、gateway 34、staged-entry 12、receipts 5、render 1、qa 1）。
- 原始还原目录：`/workspace/deliverables/master7-v15-codex-source-update-20261103/`。逐文件字节数与 SHA-256 均匹配附件内元数据。
- 固定归档：`/workspace/deliverables/MASTER7_V15_Codex_Source_Update_Restored_20261103.zip`；SHA-256 `053dc6be29a4ed322d2265f793eae86fda7eaa41fa904c819e6a04da0c96dbc5`；另有 zip 校验文件及 154 项 `SHA256SUMS`。
- 本地验证：门户构建、核心 SQLite 测试、PostgreSQL/PGlite、迁移、存储、生产启动保护、部署校验、提款、财务对账、支付/VPay 恢复、钱包 HTTP、结账、游戏目录、银行入金、老板初始化、会员身份、来源校验、桌面/手机对话框与客服流程均通过；三语言 12 页本地 HTTP 检查通过；网关 71/71 测试通过。
- 限制：网关要求 Node 22.x，本环境只有 Node 24，故目标运行时尚未验证。附件原始 `standalone/wallet.test.mjs` 有一项历史日期测试在真实当前日期下失败（测试数据固定为 2026-10-23，但读取默认最近 7 天）。未改动原始还原件；用当前候选仓库已有的明确日期范围修正，在临时副本中 SQLite 与 PGlite 均通过。
- 原 Sites 项目仍未找回：精确项目查询返回 404 / project not found；此附件只有发布回执，不含原项目全量源码。旧数据库/运行文件也没有备份恢复证明。因此未执行云端部署、域名变更、数据库写入或业务开关变更。 用户已确认发给供应商的 API 资料是正确版本，不需要重发；已收附件中的网关源码/接口登记将作为接入依据。网关含 VPay/GSPAY 及多家游戏目录适配、测试和 33 项历史登记；真钱业务仍须完成对应 UAT 与账务验收。清单见 `MASTER7_V15_Received_API_Materials_Inventory_20261103.md`。

## 整合候选包更新（2026-11-03）

除保留原始 154 文件来源归档外，自动 Setup 候选包把门户候选、独立 gateway、三语静态入口、Render 历史构建命令、QA、回执和自动 Setup 源码清单校验一并分目录打包。当前整合候选包有 188 个非 manifest 文件，不能把这个数量误报为原始附件文件数或原游戏平台全量源码。ZIP SHA-256 见同目录 sidecar 校验文件。

## 云端资源只读复查（2026-11-03）

- Sites 对原 v105 项目 ID appgprj_6abcd530747c81918fb5411fc42b24b3 的精确读取仍为 404 / project not found。
- GitHub 只读检索确认：platform-samples 的 08b276262ff69d5d32acacabe390a56dc4fcc6ed 仅新增 v105 发布回执（34 行）；该提交树完整读取 496 项，包含通用 GitHub 示例、master7-gateway 与回执，没有原 Sites 前后台应用源码。原 v105 源码提交 2900208311c747f83886f391a6c990b12001e58c 的全局提交搜索返回 0 项。
- Sites 当前可见的 V15 项目是 MASTER7 · V15 前台模板，ID appgprj_6ae33a9c71cc8191b259ee5351cb1b05；页面描述明确是设计预览，未连接真实账号、支付或游戏。另有 V17 服务门户项目，不能替代原游戏站。
- Render ahbi 工作区可读取，资源登记邮箱为 wbdream10@gmail.com；其中有 V15 静态入口与独立服务门户。该工作区不是 mastersupport7@gmail.com 已验证的唯一管理权。
- 未创建站点、未触发部署、未更改 DNS/域名、未修改服务或访问权限。

## 自动预检结果

命令：

```sh
npm run setup:auto:preflight -- --target staging
npm run setup:auto:preflight -- --target production
```

两次结果均为 `mode=read_only_preflight`、`ready=false`、`canProvision=false`。共同阻塞包括原项目 ID/源码访问、原游戏源码未在当前仓库、备份哈希与隔离恢复、canonical 供应商名册、HTTPS origin 和 PostgreSQL 配置。production 另缺供应商 UAT、许可/合同、域名控制、恢复/回滚测试、唯一 owner 访问和最终发布证据。预检只检查配置声明，不自行证明其背后的证据真实。

## 下一步及责任来源

| 顺序 | 工作 | 缺少项/责任来源 | 停止条件 |
|---:|---|---|---|
| 1 | 接收修订 B 完整 MD/ZIP 并校验 154 文件 | 用户通过当前对话附件提供完整文件 | 文件不完整、重复路径或任一哈希不匹配时停止还原 |
| 2 | 取回原 Sites 源码及当前所有权证明 | 原 Sites 项目所有者授权或工程导出 | 原游戏源代码身份不明时不得发布门户/网关替代 |
| 3 | 取得数据库和运行状态备份并隔离恢复 | 原 Render 资源所有者/官方支持提供可恢复副本 | 无完整副本、校验或关键业务一致性结果时不得迁移/切换 |
| 4 | 建立 staging 自动部署并完成测试 | 云端服务/数据库管理员提供受控秘密配置；独立 staging PostgreSQL | 源码不匹配、TLS 不通过、数据恢复不清楚时停止 |
| 5 | 逐家供应商 UAT 与报表对账 | 支付/游戏供应商提供许可协议、测试商户、测试账户和文档 | 任一协议或 UAT 缺失时对应功能保持关闭 |
| 6 | 生产发布与唯一权交接 | 域名及云资源所有者确认权限、回滚和目标账号 | 未通过最终预检或用户未验证自身恢复权限时不签收 |

## 本次操作边界

本记录根据当前工作区、既有交接材料和只读自动预检整理。没有对云端、DNS、数据库、账户权限或供应商执行写操作；没有恢复、迁移或清除会员资料；没有提交真实支付、提款、游戏启动或回调。


## 接续核查（2026-11-03）

- 再次执行 `setup:auto:preflight`：staging `ready=false`、`canProvision=false`，8 项阻塞；production 同为未就绪，14 项阻塞。两项安全保护 `SERVICE_ONLY_GUARD` 与 `TRANSACTION_SWITCHES_OFF` 均通过。预检只读，不创建资源或发布。
- GitHub 当前连接身份按 `wbdream10-cpu` 列仓库返回空列表；这只表示当前连接器视图没有列出仓库，不证明仓库已删除。此前对回执分支完整树的检查仍显示没有原 Sites 前后台源码。
- 整合候选包重新逐项核验：186 个非清单文件与 ZIP 内 SHA-256 清单完全匹配，ZIP CRC 通过。当前归档 SHA-256 `06d0fb939c637878a4d97969e98b612b19860e9ea9ef8f21a6a009fe864547cf`，侧车记录在 `deliverables/MASTER7_V15_AutoSetup_Candidate_20261103.zip.sha256`。
- 继续停在原站完整源码访问与旧数据可恢复证明；未发布、未改 DNS、未连接或写入生产数据库。已确认的供应商 API 文件继续保留，不要求用户重发。


## 顾客 OTP API 复核（2026-11-03）

已在历史《MASTER7_V17_Completion_Audit_20261029.md》与 GitHub Issue #1 评论中找到顾客 OTP 线索：隔离原型 `POST /api/login` 发挑战、`POST /api/login/otp` 验证六位 TOTP 后才建立会话；报告注明挑战 5 分钟、30 秒周期、允许前后一步、失败五次失效及防重放。它不是 SMS，也不是原站生产已接入证明。当前用户指定 SMS；待原站源码可读后定位原有短信 API 契约。当前 V15 门户仅有密码 `/auth/login`，已收到的 154 文件及网关材料没有短信发送端点或服务商契约。不得把 TOTP 原型接到生产，也不要求重发已有支付/游戏 API。


## 当前资源可见性复查（2026-11-03）

- 本轮连接器复查：Sites owner 列表可见 V17 服务门户与 V15 前台模板；editor 列表为 0；原 v105 项目 ID 精确读取返回 `NOT_FOUND`。这证明当前连接看不到原工程，不证明它已删除。
- Render 当前可见 `ahbi` 工作区，登记邮箱仍是 `wbdream10@gmail.com`。工作区服务列表有 16 个服务；其中 V15 final 静态入口的存量部署仍为 live，而新门户 `ahbi-service-portal-c3jm` 最近两次部署仍为 `update_failed`。另有 `master7-platform-sync` 指向 `wbdream10-cpu/-LUCKYWIN52-BOT`，不能作为原游戏平台源码或原会员数据库备份。
- Postgres 列表只有 `master7-cloud-staging-db` 这一暂存库（available）；旧库 ID 不在当前列表。本轮未查询或改写任何表，因此暂存库不等于旧资料恢复副本。仍需原账户持有人/官方支持核实旧库及可校验备份。
- 连接器当前 GitHub `wbdream10-cpu` 仓库列表仍为空。由于当前连接未提供原 Sites 源码和旧数据副本，继续不做生产部署、DNS/数据库写入或数据迁移。


## 原 .vip 顾客短信 OTP 前端契约复核（2026-11-03）

旧首页只读抓取当时返回 HTTP 200；公开 JS `/_next/static/chunks/0jabwjhnwx.5c.js` 显示 `POST /api/auth/login/sms`，JSON `{phone}` 请求短信，以及 `POST /api/auth/login` 的 SMS 模式 `{phone,smsCode,rememberMe}`；页面读取发送响应 `ok`、`retryAfterSec`、`error`。另有注册/忘记密码 SMS 路由。只检查静态前端，没有提交任何 POST，因此未发送短信，也未证明短信供应商/服务端/短信限流实际运行。该旧域名代码与 v105 Sites、`www.master7.best` 的对应仍待原工程访问确认。

## 新门户部署故障复核（2026-11-03）

- Render 当前列出的最近两次 `ahbi-service-portal-c3jm` 部署（`dep-dbklpfqjnfac739a7r50` 与 `dep-dbkljejncjis73em5dfg`）均为 `update_failed`，使用门户仓库提交 `1cd61e1ff49f4148c9bc1dfd9dc951a5a31c0273`。
- 只读读取 Render 运行日志，再次得到：`Production requires PORTAL_POSTGRES_URL; refusing ephemeral SQLite storage.` 这证明该次进程环境里缺少可用变量，应用按设计停止。Render 服务详情没有返回环境变量清单；没有读取、输出或更改任何密钥。
- 本机 HTTPS 复查：V15 静态入口返回 200；原门户 `/health` 与新门户 `/health` 在本次请求超时（HTTP 客户端状态 `000`）。这项本机网络观察不替代云端日志或马来西亚终端测试。
- 新暂存数据库目前仅是空白/内容未知的测试资源；未证明为原库恢复副本。不能将它自动连到候选门户后宣称业务恢复，也不能关闭拒绝临时 SQLite 的保护。没有触发重部署。

## 自动 Setup 原源码清单验证实现（2026-11-03）

- 修正了预检中 `ORIGINAL_GAME_SOURCE_IN_THIS_REPOSITORY` 永远硬编码为失败的问题。现要求源码导出目录包含 `MASTER7_SOURCE_MANIFEST.json`，并核对 v105 项目 ID、版本号、已知源码提交、每个文件的路径/字节数/SHA-256、完整文件集合与根哈希；拒绝路径穿越和符号链接。
- 新增 `npm run setup:auto:source-manifest -- --source-dir PATH` 为经持有人确认的原始导出生成完整性清单。生成器拒绝覆盖已有清单，但清单本身不证明所有权或导出来源，仍需原项目持有人独立核实。
- 预检仍只读且 `canProvision=false`；当前工作区没有原始导出，故阻塞项保持不变（staging 8 项、production 14 项）。没有连接旧库、部署、改 DNS 或执行交易。
- 验证通过：自动 Setup/source-manifest 7/7，核心 SQLite 测试、PostgreSQL/PGlite 测试、生产启动保护 15/15、云端检查 6/6、三语 3/3、构建与 `git diff --check`。


## 双入口与旧站即时复查（2026-11-03）

普通 HTTPS GET 结果：`https://www.master7.best/` HTTP 404；`https://admin.master7.best/` HTTP 404；当时的旧域名 HTTP 200。未提交登录或业务请求。该结果只能确认旧站当时公开可读、两个目标 `.best` 入口仍未返回应用页面；不能据此证明旧站与 v105 Sites 工程或目标域名的托管映射。


## `.vip` 公共 API 路由线索（2026-11-03）

只读扫描旧 `.vip` 首页的 34 个同源脚本，发现 46 个路径模式；包含顾客短信 OTP、账号、会员、游戏启动、公共页面/推送/上传及 Lotto97 字符串。完整列表见 `deliverables/MASTER7_V15_VIP_Public_API_Route_Inventory_20261103.md`。这些只是前端引用，不证明服务端存在、授权、功能成功，也不证明与 v105/.best 映射一致。没有调用 API 或提交表单。

## v105 回执分支源码定位复核（2026-11-03）

- GitHub 只读确认 `wbdream10-cpu/platform-samples` 的 `codex/master7-gaming-backoffice-20261013` 分支存在，当前分支头为回执提交 `08b276262ff69d5d32acacabe390a56dc4fcc6ed`。该仓库当前连接权限为 `pull=true`、`push=false`。
- 该提交只新增 `master7-site-ops/releases/2026-10-15-v105.md` 回执；回执本身声明完整源码留在原 Sites 源码库。仓库顶层 README 将自身描述为 GitHub Platform API/GraphQL 示例集合；其中 `master7-gateway` 是另一独立组件。
- 按回执记录的源码 SHA `2900208311c747f83886f391a6c990b12001e58c` 在该仓库取 commit 返回 GitHub 422 “No commit found”，全局 GitHub commit 搜索也没有结果。该结果只说明这份 SHA 不在当前可读仓库/公开搜索结果中，不能证明它不存在于原 Sites 或其他私有位置。
- 因此，当前已定位的是发布证据，不是原游戏平台源码；源码导出与原数据备份仍为发布阻塞项。本次只读 GitHub，无代码推送或线上变更。

## `.vip` API 主机与目标域名 DNS 复核（2026-11-03）

- `.vip` 前端脚本中看到的 API 均为相对路径（如 `/api/auth/login/sms`），因此浏览器会向当前站点主机发请求；静态脚本没有揭示独立 API 主机名。本次没有调用 API 路由。
- 已退役旧域名当时的公开 DNS 解析到 Cloudflare Anycast 地址；HTTPS 响应包含 Next.js 和 Cloudflare 边缘标头。这只能确认公开请求经过 Cloudflare 并返回 Next.js 页面，不能识别隐藏源站、Render 服务或 v105 Sites 的归属。
- `www.master7.best` 与 `admin.master7.best` 公开 DNS 也解析到 Cloudflare 地址，但本次 HTTPS GET 仍分别为 404。DNS 有记录不等于正确应用已绑定。候选应用的 IP 国家展示使用 `CF-IPCountry`，只有目标域名确实代理到该应用且应用收到可信边缘头后才能验收；不用于身份、支付或授权。

## 可见 V17 门户存档只读检查（2026-11-03）

- 当前 Sites 账户拥有一个独立的 `MASTER7 V17 · 服务门户与后台` 项目；最新保存版本为 v9，来源提交 `295af6bc29fca1ff3521e5749b9cb241326bed66`，存档清单记录 75 个文件、1,556,480 字节及 SHA-256 `aff883a924a0964a5f55bb8dd8d0d4d3ad069ec070118ced4073fbc8919f146a`。这是服务门户项目，不能替代 v105 原游戏平台。
- Sites 版本元数据读取成功；尝试用本地文件下载工具读取该存档时，返回 `file could not be authorized or resolved`。没有取到源码内容，也没有改动该项目。此存档可作为后续门户组件来源线索，但当前不能据其做代码复用或全量源码校验。
- 以存档来源提交 SHA `295af6bc29fca1ff3521e5749b9cb241326bed66` 和项目 slug 在当前 GitHub 公开搜索均无结果；不能据此认定私有/平台内存档不存在，只能确认目前没有查到可公开读取的仓库镜像。

## 双入口和登录 UAT 自动门槛补强（2026-11-03）

- 自动预检此前只检查通用 HTTPS origin 与生产域名“所有权”标志，不能证明它配置了顾客和后台两个不同主机，也不能单独证明 OTP 与共用后台角色已实测。现新增 staging 双 HTTPS 主机、顾客短信 OTP UAT、共享后台角色 UAT 三项门槛；production 另要求精确匹配 `https://www.master7.best` 与 `https://admin.master7.best`。
- 域名门槛只校验配置值，不代替实时 DNS、托管绑定或 TLS 验收；OTP/角色确认值是外部验收声明，不会自动测试短信服务或身份权限。所有交易开关仍关闭，预检仍 `canProvision=false`。
- 更新后当前实际预检为 staging 11 项阻塞、production 18 项阻塞（此前 8/14 是补强前的旧口径）。新增自动 Setup 测试 8/8 通过，覆盖错误协议、前后台共用域名及非目标生产后台域名。
- 更新候选包已同步新门槛和测试：`/workspace/deliverables/MASTER7_V15_AutoSetup_Candidate_20261103.zip`；186 个 payload 文件逐项哈希通过，ZIP CRC 通过。该变化没有部署或修改云端服务。

## 原 Render 数据库保留邮件证据（2026-11-03）

- 在旧 Render 工作区邮箱只读搜索并读取 Render 官方发件人 `no-reply@render.com` 的到期邮件（2026-10-19 06:23:22 UTC；主题 `[ACTION REQUIRED] Your free Render database has expired: master7-platform-sync-db`；Gmail message ID `1a152d439c36cf67`）。邮件明确说数据库因免费试用结束暂停；暂停后 14 天内升级可恢复并保留数据，逾期数据库、数据与备份会删除。
- 按邮件时间计算的 14 天点为 2026-11-02 06:23:22 UTC（MYT 14:23:22）。这是据邮件推算的窗口，不是 Render 对实际删除时刻或删除结果的确认。当前数据库 ID 查询仍 404，因此实际存续、是否仍在恢复宽限期、是否另有快照都需 Render 官方确认。
- 已把邮件原文的关键信息和计算时间补进 `docs/MASTER7_P0_Render_Data_Preservation_Request_20261103.md`，请求原账户持有人向支持确认是否已删除、是否尚可无损恢复及有无备份。没有发送工单、付费升级、连接数据库或写入资源。
- 候选包随即纳入这份保全申请草稿；最新包的 payload 文件数与哈希清单会以压缩包内 `SHA256SUMS.txt` 为准。

## Sites 与 Render 只读复核（2026-11-03，后续补查）

- 按 v105 原项目 ID `appgprj_6abcd530747c81918fb5411fc42b24b3` 重新查询 Sites，仍返回 `NOT_FOUND / Sites project not found`。当前 Sites owner 清单中未出现该 ID；这只能说明当前连接可见范围内查不到，不能证明项目被删除。
- 当前可见的 `MASTER7 · V15 前台模板` 是另一项目 `appgprj_6ae33a9c71cc8191b259ee5351cb1b05`，公开状态，最新版本 2，提交 `f057e9cba648147a868babb132551f01a1517e4d`，归档清单仅 4 个文件、51,200 字节；版本没有部署编号。项目说明称其尚未连接真实账户、支付或游戏服务，不能代替原站。
- 当前可见的 `MASTER7 V17 · 服务门户与后台` 是项目 `appgprj_6ae447787f1c819193237856fd58b858`，公开状态，版本 9，提交 `295af6bc29fca1ff3521e5749b9cb241326bed66`，版本归档列 75 个文件、1,556,480 字节。它是会员审批、客服工单、公告和员工管理门户，不是已确认的原游戏平台源码。
- 两个 Sites 版本归档的 `sediment_file_id` 均经文件下载接口尝试，返回 `file could not be authorized or resolved`；归档元数据可读，源码正文未能取得。没有将该下载失败解释为项目或文件已删除。
- Render `ahbi` 数据库列表本次仍只返回暂存库 `dpg-dbkl1g3bc2fs739li01g-a`；按旧数据库 ID `dpg-dan1f2uk1f9s73f369h0-a` 查询仍为 404。无新旧数据等同、恢复成功或备份可用证据。
- 最新候选 ZIP 已包含本节与上述邮件证据：188 个 payload 文件（另含 `SHA256SUMS.txt`），ZIP CRC 通过，SHA-256 `d444f0074d0e54ea552be34d4a5d3b46d0d66ea03a5e39f6138e97110a048472`；sidecar 位于同名 `.zip.sha256`。
- 以上均为只读核查；没有发布 Sites 版本、变更域名、操作数据库或发送支持请求。


## `.vip` 公开短信 OTP 前端核查（2026-11-03）

- 匿名读取公开首页与静态 JS 后确认客户端含 `/api/auth/login/sms`、`/api/auth/login`、`/api/auth/register/sms`、`/api/auth/forgot-password/sms` 等相对路由及请求字段；未调用任何认证路由。
- 同一客户端静态资源包含“SMS verification is currently disabled / 暂未开放”文案及发送前禁用检查。马来西亚号码选项 `smsSupported=true` 仅表示前端支持选择，不证明供应商能发送。
- 另对公开配置 `GET /api/auth/register/contract` 进行只读读取，HTTP 200；顶层 `smsRequired=true`，嵌套 `contract.smsRequired=false`。前端优先读取顶层布尔值，故页面按需短信注册。两字段不一致留待服务端核查。登录组件的 `smsOtpAvailable` 默认 true，但调用方可覆盖；顾客登录短信当前是否开放仍未确认。没有发短信或调用登录/验证码 API。
- 路由依赖 `.vip` 同源上下文；没有服务端实现、成功响应、签名或短信送达证据。已收到的 154 文件包不含该短信发送端点。完整页面、字段、脚本 SHA-256 与边界见 `docs/MASTER7_VIP_PUBLIC_FRONTEND_OTP_AUDIT_20261103.md`。
- `.vip` 页面声明 `MY` 与 `Asia/Kuala_Lumpur`，而目标规格要求 `Asia/Kuching`；目标 V15 需按明确产品设置验收。未调用接口、发短信、登录或改线上设置。

## 两正式入口当前公网复查（2026-11-03 08:14 UTC）

- 匿名 HTTPS GET：`https://www.master7.best/` 返回 404，正文包含 `No site here`。
- 匿名 HTTPS GET：`https://admin.master7.best/` 返回 404，正文包含 `No site here`。
- V15 Render 静态入口 `https://master7-v15-malaysia-final.onrender.com/` 返回 200 并显示 `MASTER7 V15 Malaysia`；它仍只是静态入口，不是完整游戏平台。
- 本次没有更改 DNS、托管或部署。正式交付状态仍为未完成。

## 原 Sites 源码取回准备（2026-11-03）

- 已为原项目持有人整理只读取回单 `docs/MASTER7_P0_Sites_Original_Source_Recovery_20261103.md`，列出项目 ID、v105 源码提交、发布编号、请求的源码校验清单及保留原站要求。
- 当前仍未取得原项目访问权或完整源码导出；此文档只是可交给项目所有者的请求草稿，没有发送工单或修改 Sites。源码取回前不以 V15 四文件模板或 V17 服务门户替代原游戏平台。

## 自动 Setup 证据哈希校验加固（2026-11-03）

- 供应商名册与数据库备份预检不再只接受格式正确的 64 位哈希：现在需要配置证据文件路径并逐字节计算匹配 SHA-256。
- 供应商 JSON 清单必须标为 `canonical`，包含唯一供应商、品牌、游戏、支付商户 ID，并通过父级引用校验；历史候选登记不满足此门槛。
- `npm run test:auto-setup` 10/10 通过，`git diff --check` 通过。预检仍只读且 `canProvision=false`，本轮未部署或改云端设置。
- 当前没有旧库备份文件或最终 canonical 名册，因此门槛仍阻塞；校验逻辑加固不代表证据已到齐。

## Sites 支持案件回复核对（2026-11-03）

- 在已连接 Gmail 只读查看案件 `18596084`（2026-10-29）的支持回复。回复说明不存在通过自定义域名/CNAME 找回 ChatGPT Site 的受支持流程；必须从所属账户/工作区的 Sites、Shared with you 或创建/发布该站的对话中定位。也建议检查归档/锁定对话；工作区 owner/admin 可在所属工作区内查找并转移。
- 支持要求原始 `*.chatgpt.site` URL（或旧链接/截图）和个人账户/工作区归属线索；当前材料缺这两项。支持回复为 AI 辅助指引，不证明原项目已找到。
- 已把答复边界写入 `docs/MASTER7_P0_Sites_Original_Source_Recovery_20261103.md`。没有发送邮件、DNS 变更、Sites 修改或新建站点。

## Render 监听地址与 Node 22 网关复验（2026-11-03）

- 服务启动地址改为按环境选择：本地默认 `127.0.0.1`，Render/Railway/production 默认 `0.0.0.0`，显式 `HOST` 仍优先。
- 云端只读配置预检新增 `PUBLIC_BIND_ADDRESS`；托管公网服务若覆盖为回环地址会阻止 staging/production 就绪。
- Render 官方 Web Service 文档确认公网 HTTP 服务必须绑定 `0.0.0.0`。网关按其 `engines.node=22.x` 在 Node v22.23.4 下复跑，71/71 通过。
- `npm test`、`npm run build`、`npm run test:production`、`npm run test:cloud`、`npm run test:auto-setup` 以及支付、VPAY runtime、钱包、结账、游戏目录、银行充值、提款、财务对账、迁移、存储、老板开户、会员身份、部署、来源限制和 i18n 各套件均通过；使用本地 SQLite/PGlite 和模拟供应商，未触发真实交易。staging 与 production 预检仍未就绪，新的监听地址检查通过，分别还有既有 11 项和 18 项阻塞。
- 本轮没有修改 Render 环境变量、DNS、站点或部署；公网入口和原游戏平台源码/数据状态未改变。

## 桌面与手机浏览器回归（2026-11-03）

- 安装了 Playwright Chromium 到本地缓存（未修改项目依赖或云端资源）。
- `npm run test:browser:dialogs`：桌面 1440px 与手机 390px 均通过，检查初始焦点、焦点圈定、Escape 行为、焦点恢复、无横向溢出及保存后状态。
- `npm run test:browser:journey`：320/360/390/414/768/1440px 首页布局通过；桌面与手机会员流程均通过，覆盖注册、审批、登录、后台拒绝顾客、客服提交/回复、品牌设置持久化、财务界面渲染、停用与会话撤销，无页面错误。
- 这些是本地候选的浏览器回归，不代表原游戏平台或公网生产验收；未触发真实资金/供应商操作，也未修改 DNS、Render 环境变量或部署。

## 自动 Setup 门槛复查（2026-11-03）

- 刚复跑 staging 与 production 只读预检：两者均 `ready=false`、`canProvision=false`。staging 阻塞 11 项，production 阻塞 18 项；源码目录、原站访问、备份恢复、canonical 供应商清单、双 HTTPS 入口、PostgreSQL、短信 OTP 和后台角色 UAT 等证据仍缺。
- `PUBLIC_BIND_ADDRESS`、服务模式保护及交易开关关闭检查通过。预检没有执行云端变更、数据库迁移、DNS 修改或部署；`git diff --check` 通过。

## 隔离恢复证据校验加固（2026-11-03）

- 移除了“设置 `MASTER7_DATA_RESTORE_CONFIRMED=true` 即视为通过”的弱门槛。现在要求 `MASTER7_DATA_RESTORE_RECEIPT_PATH` 指向结构化回执，且回执绑定已逐字节验证的备份 SHA-256、声明隔离目标与成功状态，并逐项记录会员、员工角色、钱包余额、未结订单和账本的聚合核对数。
- 回执不接受符号链接或缺失核对项；预检输出只显示核对状态与记录数，不读取/输出会员明细。新增覆盖错误备份哈希和缺项回执的测试。
- `npm run test:auto-setup` 12/12 通过。staging 与 production 只读预检仍分别 11/18 项阻塞、`canProvision=false`。结构化回执仍是外部恢复证明，格式校验本身不认证出具者，也不代替独立核实恢复过程。
- 更新 `docs/CLOUD_DELIVERY.md` 的环境变量和证据说明。本轮没有连接数据库、改云端配置、DNS 或部署；`git diff --check` 通过。

## 修订 B 附件恢复与源码包复验（2026-11-03）

- 找到当前对话的完整附件 `MASTER7_V15_Codex_Source_Update.md`，按内嵌 `M7COUNT`、每文件字节数和 SHA-256 清单恢复到独立目录 `/workspace/MASTER7_V15_source_update_restored_20261103`，154/154 文件校验通过。目录组成：portal 101、gateway 34、staged-entry 12、receipts 5、render 1、qa 1。现在可以登记“修订 B 的 154 个文件已收到并校验”。
- 恢复包入口 QA 12/12 页通过；portal 在 Node 24.19.0 下 `npm ci --include=dev`、`npm run build` 与核心 `npm test` 通过（SQLite 临时库）；gateway 在 Node 22.23.4 下 `npm test` 71/71 通过。
- 文件包按其交接说明是门户、网关、静态入口和历史回执的组合；没有提供可与原 Sites 项目/v105 提交核对的完整原游戏平台目录。该包收件通过不解除原站源码与旧库恢复阻塞，也不代表线上/真钱交易验收。
- 未推送源码、未改数据库/DNS/Render、未部署或触发真实供应商请求。门户安装依赖与构建产物仅生成在上述隔离恢复目录。

## v105 回执 GitHub 分支核对（2026-11-03）

- 只读确认 `wbdream10-cpu/platform-samples` 的回执分支 `codex/master7-gaming-backoffice-20261013` 可见，分支头与回执记录的 `08b276262ff69d5d32acacabe390a56dc4fcc6ed` 一致。
- 该分支树共 397 个文件；`master7-site-ops` 仅含 v102–v105 四份发布回执，`master7-gateway` 有 26 个文件。未见原 Sites 工程导出或独立游戏平台源码目录。这与附件中“完整 Sites 源码仍在 Sites 源仓库”的说明一致。
- 因此 GitHub 回执分支能佐证发布历史和网关来源，但不能替代原 Sites 项目源码或其所有者授权。没有向仓库推送、没有 Sites/Render/DNS/数据库变更。

## 核验包打包交付（2026-11-03）

- 从已校验的 154 个源文件制作便携 ZIP：`/workspace/MASTER7_V15_verified_source_update_20261103.zip`；内含 154 个文件及 `SHA256SUMS.txt`（共 155 个条目），排除本地测试依赖与构建产物。
- ZIP CRC、条目数及每个文件内容均复核通过；大小 504,100 字节，SHA-256 `13da80efb63a66e439a88697583d0844f5c150ae31902399e9abef17e9193e6e`，侧车校验文件为同路径 `.sha256`。
- 此便携包仍是已说明的门户/网关/静态入口/回执源码更新，不包含可核实的原游戏平台源码或旧数据库备份。

## 正式域名线上只读复查（2026-11-03，附件接收后）

- 当前 DNS 查询两域名均解析到 Cloudflare 公网地址；HTTPS 请求证书校验通过（curl `ssl_verify_result=0`），但 `https://www.master7.best/` 与 `https://admin.master7.best/` 均返回 HTTP 404，未发生跳转。
- 两个正式入口目前仍不能交付使用。未更改 DNS、站点绑定或托管配置。

## 隔离恢复回执模板（2026-11-03）

- 新增 `docs/MASTER7_ISOLATED_RESTORE_RECEIPT_TEMPLATE_20261103.json`，列出预检需要的五类核对结果与汇总记录数，不收集会员明细或敏感数据。模板状态固定为 `example_not_verified`、检查结果固定为失败，不能直接通过自动 Setup。
- 在 `docs/CLOUD_DELIVERY.md` 补充实际填写和外部独立复核说明。模板只帮助资源持有人记录真实恢复结果，不替代恢复操作或证明出具者身份。
- `git diff --check` 通过；无云端或数据库操作。
- 回执解析器现要求顶层和各项检查严格使用白名单字段，拒绝额外字段，防止把会员明细或其他资料混入聚合回执；新增顶层与嵌套私有字段负向测试。`npm run test:auto-setup` 12/12 通过。

## 原站原生发布 URL 只读访问（2026-11-03）

- 对 v105 回执中的 `https://white-label-platform-shell.wbdream10.chatgpt.site/` 进行匿名 HTTPS GET，TLS 校验通过，但返回 HTTP 403；无法读取页面内容来核对原游戏平台运行版本。
- 该 403 不能证明原项目被删除或停运。没有尝试绕过访问控制、登录或更改 Site 权限。
- 随后使用当前 Sites 连接器按已知项目 ID 查询，也返回 `404 / Sites project not found`。这表示当前连接无法看到该项目；既不能确认 Site 仍可管理，也不能据此判断它已删除。未修改访问策略或项目。

## 已收源码包短信 OTP 路由复核（2026-11-03）

- 在已校验的 `portal/app`、`portal/standalone`、`gateway` 源码中搜索短信发送/验证/找回密码路由及 OTP 字段，没有找到 `/api/auth/login/sms` 或可对应的服务端实现；唯一命中是测试断言不得向会员响应泄露 `otp` 字段。
- 这只说明 154 文件交接包不包含 OTP 服务实现，不否定用户此前提交给原站的接口资料。此前从 `.vip` 公开前端观察到的路由是客户端线索，且客户端当时标示短信功能禁用；不能将它接到门户候选或视为正式服务端 API。
- 因此短信登录仍属 staging UAT 阻塞项；没有调用认证/发短信接口，也未要求重发 API。

## 源码更新包凭据模式扫描（2026-11-03）

- 对便携 ZIP 的 154 个源码文件做了高置信度凭据模式扫描（常见云密钥/令牌前缀、私钥头及硬编码 secret assignment）；未发现匹配项。扫描跳过测试文件中的模拟凭据。
- 这是有限规则扫描，不等于完整安全审计或保证没有任何秘密格式；没有输出匹配值，也没有把源码包发送到外部服务。

## 门户生产依赖漏洞只读审计（2026-11-03）

- 在隔离恢复包的 portal 目录运行 `npm audit --omit=dev --json`；npm 当前 advisory 数据报告生产依赖漏洞 0（info/low/moderate/high/critical 均为 0）。没有运行自动修复或升级依赖。
- 该结果仅覆盖 npm 已知公告及生产依赖树，不涵盖应用逻辑、浏览器测试开发依赖、运行时配置或供应商服务安全；也不构成正式上线安全认证。

## 手机静态前台视觉检查（2026-11-03）

- 以 Playwright 390×844 视口检查恢复包中的静态入口：标题、MYR/古晋时区标识、三语切换、会员登录/注册/员工入口和说明卡片均正常显示；页面宽度为 390px，无横向溢出、无页面错误，语言链接 3 个、主要入口链接 3 个。
- 本地截图保存于 `/workspace/MASTER7_front_mobile_390_20261103.png`。这只验收静态入口的手机布局，不涉及登录后页面或公网实际域名。
- English 与 Bahasa Melayu 的 390×844 视口复核也通过：均无横向溢出或页面错误，3 个语言链接与 3 个主要入口均显示；截图分别保存为 `/workspace/MASTER7_front_en_mobile_390_20261103.png` 与 `/workspace/MASTER7_front_ms_mobile_390_20261103.png`。

## 云端资源和稳定 IP 说明复核（2026-11-03 17:54 MYT）

- 用户确认电脑的 `192.168.68.x` 局域网地址长期不变。它可在该路由器的局域网内稳定使用，但仍属于私有地址，不能作为 `www.master7.best` / `admin.master7.best` 的公网服务器 IP。
- 只读 Render 复核：`ahbi-service-portal` 仍为 Free Singapore 服务，最近 4 次部署均 `update_failed`；部署提交为门户候选 `1cd61e1ff49f4148c9bc1dfd9dc951a5a31c0273`。它不包含已核实的原游戏平台源码。
- 现有 `master7-cloud-staging-db` 为 Free PostgreSQL，状态 available，计划到期时间为 2026-12-03；它是暂存测试库，不是旧库恢复副本。免费资源适合非生产测试，不能据此承诺正式平台持续在线。
- 再运行只读自动预检：staging `ready=false`、`canProvision=false`、11 项阻塞；production `ready=false`、`canProvision=false`、18 项阻塞。源码/数据库恢复、供应商 UAT、双 HTTPS 入口、短信 OTP/后台角色等关键门槛仍未通过。
- 未创建或升级收费资源，未读取/设置密钥，未改 DNS/数据库/云端配置，未触发部署。

## Sites 账户现存 MASTER7 项目盘点（2026-11-03）

- 只读列出当前 Sites 账户可见项目：`MASTER7 V17 · 服务门户与后台`（项目 `appgprj_6ae447787f1c819193237856fd58b858`，公开 live version 9，提交 `295af6bc29fca1ff3521e5749b9cb241326bed66`，75 个归档文件）和 `MASTER7 · V15 前台模板`（项目 `appgprj_6ae33a9c71cc8191b259ee5351cb1b05`，version 2，4 个归档文件）。两者的 Sites URL 当前 HTTPS 均返回 200。
- v17 项目说明为自建服务门户（会员审批、客服工单、公告、员工管理）；V15 项目明确为前台模板预览，尚未连接真实账户、支付或游戏服务。它们都不是回执指定的 v105 项目 `appgprj_6abcd530747c81918fb5411fc42b24b3`。
- 对原 v105 项目按 ID 再次 `get_site` 仍返回 `Sites project not found`；当前项目列表中也没有该项目。该观察只说明此账户/连接看不到原项目，不证明其已删除。
- 因此没有把 V17 门户或 V15 模板绑定到 `www.master7.best` / `admin.master7.best`，也没有发布新版本；两个正式域名仍返回 HTTP 404。避免把候选组件误标为完整游戏平台。

## V17 游戏目录五类筛选（2026-11-03）

- 在本地候选门户加入五类游戏筛选：老虎机/电子、真人、体育、捕鱼、街机/小游戏，并补齐中文、English、Bahasa Melayu 标签。
- 分类只映射白名单内的明确供应商标签；无法识别的类别不会猜测归类。分类按钮只在供应商目录读取成功后启用；游戏目录仍为只读，游戏启动、玩家下注与钱包结算保持关闭。
- `npm run test:games` 通过（原目录测试 12 项 + 分类测试 3 项）；`npm run build` 通过；`npm run test:i18n` 通过 3 项。当前仅是本地候选代码，未同步/发布到 Sites V17，也未绑定正式域名。

## 奖励规则后台草稿工作流（2026-11-03）

- 本地 V17 门户候选新增返水、红包、Bonus、VIP、分红/合作分成五类规则草稿，支持创建、编辑、提交审核、老板/租户老板审核或退回。记录按租户隔离并写入后台审计。
- 审核通过仍是 `approved_draft`，系统没有活动启用或发奖操作。未定义的分红规则仍需负责人确认；任何奖励计算、钱包入账与对账尚未实现。
- `npm run test:promotions`（SQLite 与 PostgreSQL）、`npm run build`、`npm run test:i18n`、`git diff --check` 均通过。HTTP 测试确认普通会员和跨租户访问被拒、员工不能审核、审核有审计记录且钱包流水保持为零。
- 变更仅在本地候选；没有推送 Sites/Render、绑定正式域名或改云端数据库。原游戏平台源码与旧数据恢复证明仍阻塞整体接手/生产发布。
- 后续加固：奖励规则采用双人复核，创建者自批会被服务端拒绝（HTTP 409），界面不展示自批按钮；SQLite/PostgreSQL 测试均通过。
- 奖励规则草稿补充结构化 MYR 金额、比例、流水倍数、单人次数、游戏类别和 Asia/Kuching 起止日期字段；服务端校验范围/日期/类别并存入新迁移。SQLite 与 PostgreSQL HTTP 测试覆盖超额金额和反向日期拒绝、规则读回、权限与钱包为零；构建、三语和核心 SQLite 回归通过。
- 奖励规则新增租户级 CSV 导出，包含结构化规则和审核记录；仅后台身份可访问，CSV 公式注入文本会中和且不缓存。SQLite/PostgreSQL 导出/权限测试通过；没有会员资料导出，也没有奖励账务变动。

## 自动预检复核与测试门禁（2026-11-03）

- 重跑只读 Setup 预检：staging `ready=false / canProvision=false`，11 项阻塞；production `ready=false / canProvision=false`，18 项阻塞。共同阻塞包括原 Sites 项目/源码、旧数据备份与隔离恢复、供应商清单哈希、HTTPS 双入口、PostgreSQL 配置、短信 OTP UAT 与共享后台角色 UAT；生产还缺供应商 UAT、许可/合同、域名所有权、恢复回滚、独立管理员访问和最终发布批准。
- 预检仅本地读配置，没有云端变更。更新 `npm test`，让核心 SQLite 测试自动运行奖励规则 SQLite/PostgreSQL HTTP 测试；全部通过，`git diff --check` 通过。
- 本轮重新只读查询原 v105 Sites 项目仍返回 `project not found`。当前 Sites 列表仍只有 V17 服务门户和 V15 前台模板；没有取得原游戏平台源码或可下载的归档。没有保存新版本、部署 Sites、改 DNS 或触碰 Render 数据库。

## V17 唯一底版与顾客下载 App 要求（用户 2026-11-03 最新确认）

- 产品口径更新：新平台整体以现有 `MASTER7 V17 · 服务门户与后台` 为唯一底版，先将可验证旧资料恢复并迁入 V17 独立 staging，再升级成完整平台。V15 模板不作为全平台底版。公开入口仍为顾客 `www.master7.best` 与共用管理后台 `admin.master7.best`。
- 顾客移动端要求是平台本身提供可安装的 Android App（APK）和 iPhone App（iOS），不是一段 App 说明、只有下载按钮、PWA 或浏览器主屏幕快捷方式。本地工作区未找到 APK/AAB/IPA、Android/iOS 工程、签名资料或应用商店发布材料；因此尚不能生成并交付可安装 App。
- 本轮 Sites 元数据复核：V17 现有版本为 v9，来源提交 `295af6bc29fca1ff3521e5749b9cb241326bed66`，归档记录 75 个文件、1,556,480 字节、SHA-256 `aff883a924a0964a5f55bb8dd8d0d4d3ad069ec070118ced4073fbc8919f146a`。下载该归档仍返回授权/解析失败，未取得源文件字节；因此没有把候选工作区代码覆盖或发布到 V17。
- 原 v105 Sites 项目本轮查询仍返回 404 / project not found；Render 旧库可恢复备份和隔离迁移证据也仍缺。故不能开始真实旧资料迁移，亦未使用空库冒充迁移。预检未就绪时保留 V17 与原资料现状，不做线上切换。
- 只读查看 V17 已部署 D1 数据库概览（未读取任何行/个人资料）：绑定名为 `DB`，现有表为 `announcements`、`audit`、`password_credentials`、`password_sessions`、`providers`、`rate_limits`、`replies`、`settings`、`tickets`、`users`。概览中没有可识别的钱包账本、充值/提款订单或游戏会话表；需先取得 V17 源码与旧数据映射，再按迁移设计新增完整业务结构，不能把现有服务门户数据误认为完整游戏平台数据。

## V17 底版与旧站迁移双源码门槛（2026-11-03）

- 自动预检现分别校验 v17 目标源码（项目 `appgprj_6ae447787f1c819193237856fd58b858`、v9、提交 `295af6bc29fca1ff3521e5749b9cb241326bed66`）与原 v105 迁移映射源码（项目 `appgprj_6abcd530747c81918fb5411fc42b24b3`、v105、提交 `2900208311c747f83886f391a6c990b12001e58c`）。单独提供任一方均不能满足门槛。
- 新增 `MASTER7_V17_SOURCE_MANIFEST.json` 文件清单校验器及 `npm run setup:auto:v17-source-manifest -- --source-dir PATH`。它核对固定项目/版本/提交、完整文件集合、字节数与 SHA-256；独立的 `MASTER7_V17_SOURCE_ACCESS_CONFIRMED=true` 仍需由真实资源所有者证实。生成哈希清单本身不证明来源或所有权。
- V17 当前归档尚未能下载到本工作区，预检仍应失败关闭；没有把本地候选门户冒充为已取回的 Sites 源码。自动预检测试 14/14 通过，覆盖 V17 与 v105 双来源、缺文件、错误提交和本地文件完整性；预检只读且永不自动部署。
- App 交付明确为平台本身的 Android/iPhone 可安装 App；后续需移动工程、签名/分发权限、实机安装和登录验收。只提供说明页或下载链接、PWA 或主屏幕快捷方式不能算通过。
- 按 V17/v105 双源码门槛重跑本地预检：staging 14 项阻塞、production 22 项阻塞，均 `ready=false / canProvision=false`。新增的 3 项阻塞分别是 V17 项目身份、V17 资源访问确认、V17 固定版本源码完整性。阻塞仍包括 v105 映射源码、旧库哈希/隔离恢复、供应商清单、HTTPS/PostgreSQL、OTP/后台角色 UAT；production 还需域名、许可、供应商 UAT、回滚、独立管理权及最终发布批准。
- 将可安装 App 纳入自动交付门槛：staging 需要 Android `.apk` 和 iOS `.ipa` 文件及 SHA-256，并要求签名核验和真机安装 UAT；production 还需 Android/iOS 正式入口安装验收。文件哈希可本地复核，但签名和真机 UAT 是外部证据，不能靠设置环境变量替代平台侧验证。测试仅用合成 APK/IPA 字节验证文件类型和哈希，不代表已构建或签名真实 App。
- 最新预检复跑包含 App 门槛后：staging 有 20 项、production 有 28 项阻塞，均未就绪。验证：`npm run test:auto-setup` 15/15、`npm test`、`npm run build`、`git diff --check` 均通过。预检失败是证据不足时的预期停点，不是部署尝试；没有改云资源、DNS、数据库或 Sites 发布。

## 本轮继续推进记录（2026-11-03）

- 再次只读列出 Sites：可见 V17 服务门户 v9 与 V15 前台模板；原 v105 项目 ID 仍返回 `project_not_found`。V17 v9 存档仍列为 75 个文件、1,556,480 字节、固定提交 `295af6bc29fca1ff3521e5749b9cb241326bed66`，但 Sediment 下载仍返回授权/解析失败，因此没有 V17 源文件字节可供导入或版本提交。GitHub 全局按 V17/v105 固定提交搜索均无结果。
- 公网即时复测：`www.master7.best` 与 `admin.master7.best` 返回 HTTP 404；当前 V17 门户 Sites URL 返回 HTTP 200。正式域名仍未指向已验收的 V17 全平台。
- 本地完整回归发现 V17 游戏目录赞助厂牌区在 390px 英文界面产生横向溢出；已将游戏布局网格与子项设为可收缩并允许长标题换行。重建后 `npm run test:browser:i18n` 在中/英/马来文、390px/1440px 均通过无溢出检查。
- 其余本地回归通过：支付合约/runtime、VPay、钱包 SQLite/PostgreSQL 与 HTTP、游戏目录、银行转账存款、提款、财务对账、生产安全/角色/会员身份、迁移、存储、浏览器对话框、顾客注册/登录旅程、奖励草稿。线上供应商与真钱行为仍未被调用。
- 未找到 Android/iOS 工程；这轮没有通过空壳 WebView 伪造 App。真实源码、旧数据恢复副本、签名构建环境、正式域名控制及供应商 UAT 仍是自动交付停点。
- 自动 Setup CLI 现可使用 `--source-dir` 和 `--v17-source-dir` 分别指向两份源码导出；README 与云交付指南已同步说明。验证 `npm run test:auto-setup` 15/15 与 `git diff --check` 通过；以不存在目录验证 CLI 能正常解析两参数并保持失败关闭。
- 再跑云就绪/HTTP 门禁 7/7、部署验收门禁 18/18、PostgreSQL/PGlite 核心回归通过。所有测试均为本地或模拟环境，不证明线上服务可用。
- Render ahbi 工作区再次只读检查：V17 门户候选服务最近部署仍因生产启动缺少 `PORTAL_POSTGRES_URL` 失败；同一工作区存在可用的 Free PostgreSQL staging 实例，计划到期时间为 2026-12-03。没有读取数据库行或改写环境变量。把这只空/未验证的暂存库接到候选门户只会启动服务门户，不能证明旧数据已恢复，也不能替代 V17 完整平台，故未做该连接或重部署。
- GitHub 权限复核：当前本地仓库 remote `jackysim47-star/master7` 对已登录用户有管理员/写权限；Render 现有门户服务连接的是 `wbdream10-cpu/master7`，当前 GitHub 连接对此仓库只有读取权限。两者不是同一个仓库，因此本地变更不能直接推入 Render 当前发布源；本轮没有推送代码或更改 Render 仓库绑定。
- 对用户提供的完整 MD 附件重新运行内嵌恢复器：临时目录成功还原 154/154 文件，并逐个通过字节数与 SHA-256。对隐藏文件一并搜索后，portal/gateway 包仍没有 SMS OTP 路由或短信发送实现；唯一 OTP 命中是测试要求不泄露该字段。因此可确认交付包完整，但短信 OTP 实现属于该包之外的原站/供应商服务，不会按猜测端点接入。
- 对附件中原样归档的 `portal/` 独立重建并执行其自身测试：`npm run build`、`npm test`、`npm run test:postgres`、`npm run test:migrations` 和 `npm run test:production` 全部通过；数据库测试使用临时 SQLite/PGlite，仅验证服务门户候选代码。该结果不代表 V17 完整游戏平台、短信 OTP 或生产数据已验收。
- 再跑自动 Setup 只读预检：staging 20 项、production 28 项阻塞，均为 `ready=false / canProvision=false`。`SERVICE_ONLY_GUARD`、`TRANSACTION_SWITCHES_OFF` 与公网绑定预检通过；双源码、旧库备份/隔离恢复、供应商清单、APK/IPA、HTTPS、staging PostgreSQL、双入口、短信 OTP 与后台角色 UAT 均未满足。
- 重新核对 Sites 账户：可见 V17 服务门户 v9（75 文件，提交 `295af6bc29fca1ff3521e5749b9cb241326bed66`），v105 原项目仍查无此项目。V17 上 `master7.best` 与 `www.master7.best` 域名记录均为 `pending`（提供方与 SSL 状态为 active）；没有 `admin.master7.best` 绑定。没有调整域名，因为当前 Site 是服务门户，尚未通过完整游戏平台验收，绑定后台域名会错误地把生产入口指向候选服务。
- 通过 V17 Site 绑定源码仓库的只读克隆取回 v9 固定提交，并生成 `MASTER7_V17_SOURCE_MANIFEST.json`；140/140 个源码文件逐项核验，清单根 SHA-256 为 `2fe8fbdb06d6ebd4e34e23e4b4cc07f4a4b7a27d1c8a129f55211d5ffb1e3a36`。独立交接包：`/workspace/deliverables/MASTER7_V17_Site_v9_Source_20261103.zip`，SHA-256 `d015d01cef0abd8cbc72ef44e202a133c7b76b110c79e37adc1fa673e1c36dde`。包内不含访问令牌。
- 取回的固定提交本地 `npm run build` 通过；Node/SQLite 31 项、Cloudflare Worker 14 项、JS 语法及 TypeScript 检查通过。Site 的 `HANDOVER.md` 明确说明它是独立服务门户，不含 v105 游戏平台源码或旧会员迁移，真实游戏/支付/提款未接通。Sites 版本接口列出的 tar 元数据为 75 文件，仓库固定提交含 140 个跟踪文件；因 tar 文件下载被拒，二者差异仍待 Sites 归档副本对照。
- 将实际 V17 源目录和 owner 仓库读取权限用于只读自动预检后，V17 身份、访问、固定提交完整性三项由失败转为通过；staging 17 项、production 25 项阻塞，均 `ready=false / canProvision=false`，没有触发云端配置、部署、数据库连接或域名切换。
- 再查 Render ahbi 工作区：门户候选 `ahbi-service-portal` 最近四次部署均 `update_failed`，同一错误为生产启动缺少 `PORTAL_POSTGRES_URL`；服务绑定 `wbdream10-cpu/master7`，部署提交仍是 portal 候选 `1cd61e1ff49f4148c9bc1dfd9dc951a5a31c0273`。独立 Free PostgreSQL `master7-cloud-staging-db` 状态 available、Singapore、计划到期 2026-12-03。未读数据库行、未改环境变量/连接、未重部署；该 DB 没有旧数据恢复证明，服务仓库也不是已校验的 V17 Sites 固定源码，故不能以连空库的方式把候选门户伪装成 staging 全平台。
