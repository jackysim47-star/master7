# MASTER7 云端交付与验收

此分支用于独立 staging，不能作为原 V15/V17 完整游戏平台或旧会员数据恢复证明。
会员前台 `/` 与员工后台 `/admin` 使用同一套账号、租户和数据库。

当前全平台覆盖状态、自动 Setup 预检结果和接手责任见 [V15 全平台实施跟踪表](MASTER7_V15_IMPLEMENTATION_TRACKER_20261103.md)。

## 已接线的验收入口

总部登录后台后可打开 `/deployment-readiness`，或只读 API `/api/v1/deployment-readiness`。
只有总部 owner 可读取；会员、普通员工及租户老板不能读取部署诊断。
门户代码/文档覆盖 VPay 与 GSPAY+ 的不同阶段；保存的四支付预览 HTML 另列 VPAY、GSPAY、1MPAY、GSPAY+ 四个展示名称。该预览未接正式交易，GSPAY+ 是否为独立公司待核实；本次没有四家生产交易验收证据。
USDT 是币种，DuitNow 是支付网络，银行转账是支付方式，均不能冒充另外的支付公司。公司名称、预览按钮、协议准备和生产接通须分别记录。
每个已确认的支付供应商若要开通，均须独立通过厂家协议、商户配置、钱包与对账验收；不得因填写资料或目录可读而开放交易。

## Malaysia 与访客 IP 自动识别

- 平台地区固定为 `MY`，金额为 `MYR`，业务时区为 `Asia/Kuching`；Render Blueprint 将运行区配置为 `singapore`。Render 当前没有 Malaysia 机房选项，因此这不是“马来西亚服务器 IP”，也不会改写访问者的公网 IP。
- `GET /api/v1/visitor-location` 返回访客国家码、平台国家/币种/时区和声明的运行区。访客国家码仅从 Cloudflare 边缘头 `CF-IPCountry` 读取；没有该头或无法识别时返回 `null`，不会根据原始 IP 调用第三方地理定位服务。
- 前端仅把结果写入当前页面的 `document.documentElement.dataset`，不保存访客 IP 或国家记录。API 响应为 `no-store`。国家识别仅用于展示和本地化，不得用于登录授权、年龄/牌照判断、支付、钱包或游戏权限。
- 只有当正式域名确实经 Cloudflare 代理时，`CF-IPCountry` 才能代表边缘观察到的访客地区。应用原生 Render 域名仍可直接访问，所以此值可被直连请求伪造；本功能没有任何安全决策依赖该值。正式域名当前未映射到此应用，尚不能称为线上 IP 自动识别已验收。
- Singapore 是静态部署配置，不是按每位访客 IP 动态迁移服务。马来西亚用户延迟仍须从真实本地网络测量；砂拉越与西马延迟可能不同。

## 部署前检查

1. 保留旧站、现有域名和所有数据；不要使用原会员库试启动程序。
2. 取得一套新的、隔离的 PostgreSQL 数据库及其可信 TLS 连接资料，通过服务器秘密配置 `PORTAL_POSTGRES_URL`。
3. 固定并保留本分支提交，构建 `npm ci --include=dev && npm run build`。
4. 设置 `NODE_ENV=production`、实际 staging HTTPS `PUBLIC_ORIGIN` 和数据库秘密，执行 `npm run check:cloud`。
   可加 `-- --live`，仅向固定网关发一次公开 GET；使用会话 HTTP 代理时设置 `NODE_USE_ENV_PROXY=1`。该探测超时只表示本次读取失败，不证明网关停机。不发送凭据，不建单、不查会员或修改钱包。
   检查数据库 URL 格式不等于真实连接、备份或恢复已验收。
5. 审阅 `render.staging.yaml`；它不创建数据库、不绑定正式域名，也不更改现有 `render.yaml`。
   此服务名仅在确认不存在重复服务后用于 staging。免费实例不作为全天生产运行承诺。
6. `npm run start:staging` 先执行配置预检，失败则不会启动应用和迁移；成功后应用会初始化/迁移**指定的 staging 数据库**。
   这不是只读启动。真实旧库必须先有可信备份，并在副本恢复验收后再设计迁移。
7. 按 README 安全建立一次性总部管理员，不把开户码、密码或恢复码写入报告、仓库或聊天。
8. 用 `npm run verify:deployment -- --origin HTTPS_STAGING_ORIGIN --commit FULL_SHA --assets-dir standalone/dist`
   检查提交、登录页、匿名后台保护及资源哈希；再验证测试会员审批、登录、权限、停用和恢复流程。

## 发布门槛

当前 service-only 保护保留，源码正常运行不会开放游戏或资金路由。
旧会员、余额和订单未恢复；不得导入示例余额或将健康空库当成旧数据备份。
必须取得原站源码/数据归属、可恢复备份、各家供应商协议和授权测试环境，逐家完成游戏启动、
钱包结算、支付签名回调、独立查单、重复通知一次入账、超时与并发恢复、外部对账。
供应商就绪自报、任何数量的目录记录和模拟测试均不能单独证明生产可用。

正式域名和旧站切换前，记录提交、数据库副本、迁移、回滚及供应商验收证据。
不能将客服门户覆盖原游戏平台，不能把回滚代码当成回滚数据库。

## 当前已知阻塞（不是自动恢复操作）

- 原 Sites 项目目前通过连接器读取返回未找到，尚未取得源码访问；不证明它已删除。
- 旧 Render PostgreSQL 查询返回 404、可见清单为空；无可信可恢复备份。
- 历史 Supabase 项目无权限；不能推断其中数据丢失。
- 四个支付展示名称来自预览 HTML，不能据此认定四家独立公司或生产连接；1MPAY 的门户生产实现和联调验收尚无证据，GSPAY+ 是否独立公司待核实。
- EPICWIN/CLOTPLAY 上游拒绝、VENUS 响应签名缺失，保持未接通状态。

## 复核命令

`npm run test:cloud` 测试权限、配置预检、四家公司与支付方式区分、固定 GET、响应大小/重定向、错误脱敏。
现有账号、迁移、钱包、支付、财务及浏览器测试见 package.json。模拟通过不替代真实供应商验收。

## 全平台自动 Setup 预检

运行 `npm run setup:auto:preflight -- --target staging` 或 `--target production`，输出不含密钥值的 JSON 检查结果；`--source-dir PATH` 指定原 v105 平台源码导出目录，`--v17-source-dir PATH` 指定作为目标底版的 V17 源码目录。两者分开校验项目 ID、固定版本/提交、文件清单、逐文件字节数和 SHA-256。缺少 V17/v105 任一源码与访问证明、备份哈希与隔离恢复证明、供应商名册哈希或 HTTPS/PostgreSQL 配置时会返回非零退出码。
生产目标还要求供应商 UAT、运营许可/合同、域名控制权、恢复/回滚、唯一管理员访问与发布批准证据。

确认原站来源后，将其完整导出到隔离目录，先用 `npm run setup:auto:source-manifest -- --source-dir /path/to/original-platform` 生成 `MASTER7_SOURCE_MANIFEST.json`；该命令只创建清单、拒绝覆盖已有清单，不验证 Sites 所有权或导出来源。清单校验只证明本地导出内容与清单一致，不能证明内容来自原站，仍需原项目持有人核对项目 ID、v105 提交和导出过程。

V17 目标底版需单独使用 `npm run setup:auto:v17-source-manifest -- --source-dir /path/to/v17-platform` 生成 `MASTER7_V17_SOURCE_MANIFEST.json`；也需由资源持有人确认导出来源。V17/v105 都未取得时，门户候选不满足完整平台 Setup 门槛。

staging 还要求 `MASTER7_ORIGINAL_SOURCE_ACCESS_CONFIRMED=true`、旧库备份路径 `MASTER7_DATA_BACKUP_PATH` 与其 SHA-256 `MASTER7_DATA_BACKUP_SHA256`、结构化恢复回执路径 `MASTER7_DATA_RESTORE_RECEIPT_PATH`、供应商清单路径 `MASTER7_VENDOR_MANIFEST_PATH` 与 SHA-256 `MASTER7_VENDOR_MANIFEST_SHA256`、两个互不相同且非生产域名的 HTTPS origin（`MASTER7_STAGING_CUSTOMER_ORIGIN`、`MASTER7_STAGING_ADMIN_ORIGIN`）、`MASTER7_CUSTOMER_SMS_OTP_UAT_CONFIRMED=true` 与 `MASTER7_SHARED_ADMIN_ROLE_UAT_CONFIRMED=true`。预检逐字节计算备份文件哈希，并要求恢复回执标明同一备份 SHA-256、隔离目标、成功状态及会员、员工角色、钱包余额、未结订单、账本五类核对结果（仅聚合记录数，不含会员明细）。供应商清单须为 JSON、`schemaVersion: 1`、`kind: "master7-vendor-manifest"`、`status: "canonical"`，且供应商、品牌、游戏与支付商户 ID 唯一、引用关系有效。生产还必须精确设置 `MASTER7_CUSTOMER_ORIGIN=https://www.master7.best` 和 `MASTER7_ADMIN_ORIGIN=https://admin.master7.best`，并另需 `MASTER7_VENDOR_UAT_CONFIRMED`、`MASTER7_LICENSE_AND_CONTRACTS_CONFIRMED`、`MASTER7_DOMAIN_OWNERSHIP_CONFIRMED`、`MASTER7_ROLLBACK_TEST_CONFIRMED`、`MASTER7_SOLE_OWNER_ACCESS_CONFIRMED`、`MASTER7_FINAL_RELEASE_APPROVED`。哈希必须为 64 位小写十六进制；OTP/UAT、许可、所有权等布尔值仍是外部验收声明，预检不会自动证明其真实性。

隔离恢复回执字段样例见 `MASTER7_ISOLATED_RESTORE_RECEIPT_TEMPLATE_20261103.json`。把 `status` 保持为 `example_not_verified` 的样例不能通过预检；必须由实际执行隔离恢复并核对数据的负责人填写，写入已验证备份文件哈希和时间，并将五项检查都标为通过。回执只存放聚合数量，不写会员 ID、姓名、联系方式、余额明细或凭据。

双入口配置只验证完整 HTTPS origin、不同主机和固定生产域名，不会验证 DNS 实际指向或 TLS 证书；数据备份哈希只证明本地文件字节与声明值一致，不证明来源、范围或可恢复性。结构化恢复回执只校验声明的备份哈希、隔离标记与核对项目格式，仍须由负责人保存实际恢复日志并独立复核；短信 OTP、供应商 UAT、许可、域名与共享后台角色仍需真实验收。只有完成对应测试并保存证据后才能设置这些变量。

该命令只做只读预检，不创建服务/数据库、不连数据库、不运行迁移、不写 DNS、不触发部署，`canProvision` 始终为 `false`。当前仓库是会员/客服服务门户候选，没有原平台目录和来源清单，所以源码门槛仍失败。清单通过后还须独立核实来源、数据备份恢复及其他门槛；不能通过设置环境变量或伪造清单绕过原平台来源审查。

## 本轮实施与验证（2026-11-02 UTC）

- 新增总部接入验收页面、只读 API 和启动前预检；配置页面不请求游戏或支付供应商。
- 新增 6 项权限、失效会话、部署配置、响应边界及脱敏测试，全部通过。
- 既有 18 组账号、SQLite/PGlite、迁移、钱包、支付、游戏目录、提现和对账测试全部通过。
- 桌面 1440px、手机 390px 的完整会员流程和弹窗测试通过；公开首页在 320–1440px 检查无横向溢出。
- 新验收页面在桌面和手机验证，普通会员不显示入口，直接访问也拒绝。
- 网关固定源码 b7b46dbc7a41dfcdca2ee891afca144805ffd222 的 71 项模拟测试通过。
- 钱包回滚测试原使用 2026-10-23 固定时间，却按现实日期最近七天查单；改为显式查询该测试日期，保留全部回滚、复核和重试断言。没有修改结算逻辑。
- Render staging Blueprint 通过 2026-11-02 读取的官方 JSON Schema 校验；未应用到云端。
- 本环境缺少 staging HTTPS origin、隔离 PostgreSQL 秘密；预检按预期返回非零。
  固定网关的本轮 CLI 读取也未成功，不能当作供应商停机或已经验收的证据。
- 未创建云端数据库、未修改原站/域名、未运行生产迁移或真实交易。源码交付和测试通过不代表完整游戏平台上线。

## 2026-11-03 云端资源进展

已在现有 Render `ahbi` 工作区创建独立免费测试库：

- 名称：`master7-cloud-staging-db`
- ID：`dpg-dbkl1g3bc2fs739li01g-a`
- 区域：Singapore，PostgreSQL 17，Free
- 创建记录到期时间：2026-12-03 03:10 UTC
- 控制台：https://dashboard.render.com/d/dpg-dbkl1g3bc2fs739li01g-a

这是新的空测试库，不是旧会员数据库或恢复副本；免费库不支持托管备份，且会到期，不能承载正式会员或资金数据。
创建时外部 IP 允许列表为空。连接器的只读 SELECT 1 被该访问设置阻止；未将其改为全公网开放。
现有 Render 连接器没有读取数据库连接秘密或创建/同步 Blueprint 的工具，执行环境也没有 Render API 凭据。
因此测试服务尚未创建/发布，不能声称数据库真实连接、迁移或云端验收已完成。

下一步在 Render 控制台使用本分支的 `render.staging.yaml` 建立独立 staging，
把该新库的 External Database URL 安全配置为 `PORTAL_POSTGRES_URL`，同时限制外部允许列表到测试服务的已确认出站 IP。
现有存储适配强制验证 TLS 证书；不要填入使用自签名证书的内部 URL，也不要关闭证书验证来绕过连接失败。
连接秘密不能放入聊天、源码或报告。

控制台安全接线后再部署固定提交、检查 `/health` 和登录权限，并按上文验证备份恢复。
旧站、正式域名、原库和所有交易开关未变更。

## 2026-11-03 三语界面交付

已接入简体中文、英文、马来文共享词典与语言切换，覆盖前后台及独立登录、注册、密码恢复、账号管理、接口管理和接入验收页面。
明确选择通过浏览器偏好 cookie 记忆；未选择时使用当前品牌默认语言。公告、工单、回复、品牌内容和游戏名称保留原文。
货币仍为 MYR，业务时区仍为 Asia/Kuching，状态提交值和 JSON API 契约不变。详见 [I18N.md](I18N.md)。

本轮验证包含 20 组非浏览器回归，以及三语 390px / 1440px 页面、语言记忆、品牌默认回退、草稿保留、原文保留和权限检查；具体结果随交付包提供。
语言代码已准备审阅，不代表已经部署到 Render。既有 ahbi-service-portal 控制台部署使用 main 旧版本，日志提示缺少 PORTAL_POSTGRES_URL；它不属于已验收发布。

## 2026-11-03 V15 源码与资产交接补充

完整资产定位、四个支付预览名称与四个历史游戏回调、品牌数量口径及安全接手顺序见 [V15 技术接手说明](V15_TAKEOVER_HANDOFF.md)。该说明按资源和时间区分证据，不将历史状态当作本轮线上验证。

- 门户仓库 `wbdream10-cpu/master7` 的固定 `main` 提交为 `1cd61e1ff49f4148c9bc1dfd9dc951a5a31c0273`；同名 `jackysim47-star/master7` 的 `main` 树 SHA 据交接资料相同，不是另一套 70+ 品牌完整源码。
- V15 静态入口 Render 服务为 `srv-dbia0ouc6qcc73d2v0fg`；其 HTML 由 Render 构建命令生成，保全时还要保存构建与发布配置。
- 网关 `integrations-status.json` 记录的 33 个品牌是历史登记；历史目录的 382 是游戏条目，不是品牌数。本次未找到可证明 70+ 个不同品牌都已完成接入的同一版本清单。
- 2026-11-03 交接记录中，正式域名仍 404；原 PostgreSQL ID `dpg-dan1f2uk1f9s73f369h0-a` 查询返回 404，不能据此断言永久删除；新门户部署因缺少 `PORTAL_POSTGRES_URL` 失败。暂存数据库不证明旧资料已恢复。
- 原门户 `ahbi-service-portal.onrender.com` 与新门户 `ahbi-service-portal-c3jm.onrender.com` 是不同资源；不得互换其健康、部署或数据源状态。
- 继续接手时，先由资源所有者确认并保全原数据、在隔离副本验证恢复，再确认服务/域名/数据源映射。不得用空库替代、盲目迁移或先重启/重部署可能含原始资料的实例。

### 2026-11-03 12:52 MYT Render 只读复核

新门户 `srv-dbkl79fb9u1s73fnoojg` 仍指向原仓库 `main` 固定提交，并非 staging 准备分支。本次列表到 4 次 `update_failed`；构建及本地测试成功后，运行日志显示 `PORTAL_POSTGRES_URL` 缺失，进程退出码为 1。后续端口扫描超时发生在进程退出后。暂存库仍 available，但外部 allowlist 为空；旧数据库 ID 查询仍为 404。没有读取秘密或修改服务/数据库配置，也没有触发部署或健康请求。

### 2026-11-03 12:59 MYT Supabase 候选检查

当前 Supabase 授权只列出 `shspbmnghbgyzcsjukui`（ACTIVE_HEALTHY）；只读查询显示 `public` 与 `portal_private` 无业务表，迁移清单为空。历史项目 `aarihmvlnlssxulktbmb` 仍返回无权限。本次没有证据将任一项目映射到原会员生产数据；可用工具没有备份/快照清单读取能力，不能据此断言其它位置没有备份。
