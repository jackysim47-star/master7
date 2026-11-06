# MASTER7 完整实施与验收交接总册

日期 2026-11-06，古晋时间 MYT（UTC+8）。直接运行实测截至 15:14:20。交付给 MASTER7 用户与接手的 Codex。本文件汇总项目状态、实施范围、28 项平台核对、80 行游戏清单、18 个支付阶段和 28 项逐渠道测试用例。

## 0. Follow-up 修正（15:35 MYT）

- 用户本次上传的总册与之前已核对的副本完全一致：SHA-256 `dd6ac6bc2000f66703221b102ac51ba7c13bd19c1eb0e9c35e5268378a606e2a`，330 行，33,653 bytes。
- 先前引用的 GSPAY 工单不属于 MASTER7，已从有效证据移除。Gateway `1.10.1` 已上线，deploy `dep-dbmo2h4s728c739dilb0`，commit `6e9fb99f6575602d9f8e8089f51c70d88f5c834f`。
- 线上 GSPAY 状态已核实：`createProgramReady=false`、`orderRouteEnabled=false`、`transactionRoutesActive=false`、`liveReady=false`；不会向厂家建单或写入会员钱包。
- Portal 候选版更新为 `17.0.0-selfbuilt.60-full-platform-follow-up`；165/165 测试通过，ESLint 0 error/0 warning，Render production build 通过。
- 网关部署后出现的 4 个 HTTP 502 均来自游戏目录上游（EpicWin、ClotPlay、Venus、EVO888H5），不是支付建单或钱包入账错误；这些厂家仍按未连接处理。

## 1. 接手先看

**测试站已有可运行版本。正式前台域名、本人账号与旧资料是优先交接项。真实充值、游戏启动、退出回钱包仍待逐家验收。**

| 项目 | 本轮结论 | Codex 下一件事 |
|---|---|---|
| 正式客户前台 | `https://www.master7.best/` 的 Google DNS A/AAAA/CNAME 仍无地址答案。 | 对照权威 DNS 和 Vercel 项目的预期绑定，提供正式 www 入口的 DNS、HTTPS、手机及电脑结果。 |
| 共享后台 | `https://www.master7.site/` 返回 302，跳转后 MASTER7 页面 HTTP 200，两个 HTTP 请求合计 8.682 秒。 | 验收正式入口路径、原账号本人登录、权限、退出和受控恢复。 |
| 运行版本 | Render 测试站 15:02:48 新部署，15:14:20 健康页仍报告 V17 `.59`。 | 固定实际部署 ID、SHA、包哈希和正式目标版本。若交付 V15，列出明确候选、数据兼容及回滚证据。 |
| 旧资料 | 当前门户已有备份恢复演练记录，旧生产数据完整性待核。 | 确认源库、旧数据水位和可恢复副本，交源目标差异表。 |
| 游戏 | 76 个品牌目录行、4 个独立集成行。仓库记载有 769 条目录记录，80 行的启动、钱包、退出均未验收。 | 确认逐品牌映射和钱包模式，先验收测试环境开局、退出、断线、余额，再签收。 |
| 充值 | VPay、GSPAY、1MPay 都有代码或模拟证据。线上建单与真实付款关闭。 | 先利用已有源码与合同资料，补协议具体缺口。按三家分别交实测结果。 |

日期内先回传能够验证的结果。每个受阻项标清负责方、阻断证据及下一次复查时间。

## 2. 正式入口、部署、连接器与运行证据

| 对象 | 证据与边界 |
|---|---|
| 客户 DNS | 15:14:19 Google Public DNS，www.master7.best 的 A、AAAA、CNAME 都是 Status 0、Answer 空。Vercel 的 `master7s-agent` 已登记 www 域名的证据来自上轮。当前 DNS 无地址答案。历史 Cloudflare 1010 限制仍适用，前台 HTTP、证书和时延未测。 |
| 后台 DNS | 15:14:19，www.master7.site A 为 `15.197.162.184`，TTL 300 秒。AAAA/CNAME 无答案，Status 0。 |
| 后台 GET | 15:14:18 首跳 HTTP 302，6.499693 秒。15:14:20，最终 `https://master7-v17-staging.onrender.com/admin` HTTP 200，2.182525 秒，返回含 MASTER7 的未登录页面。14:58 上一轮同路径两跳合计 15.767 秒，两次均超过 5 秒。 |
| 测试门户 | Render 工作区 `tea-dakfo2h594qs73du231g`，服务 `srv-dbl0iv7f3r2c73848ei0`，部署 `dep-dbmnm0p5efls7384upu0`，SHA `d288fe6a00f8db76a518f4c7a9f3df111bb72e18`，15:02:48 MYT live。提交标题 Keep canonical admin redirect on HTTPS。 |
| 健康页 | 15:14:20 HTTP 200，8.567976 秒，版本 `17.0.0-selfbuilt.59-full-platform-handover`。数据库状态 ready，短信 OTP 配置状态 true。transactionsEnabled、realPayments、settlementVerified、liveGames、productionReady 均 false。VPay、GSPAY、1MPay、GSPAY+ 的建单开关均 false。 |
| GitHub | 仓库 `jackysim47-star/master7`，测试分支历史读数 `codex/v17-render-staging-20261104`。本册的项目细表来自已读的 .59 交接提交 `acd2a044a04a6a00abb5aca732d5b216779f26d9`。部署之后仍报告同一版本字符串，实际部署 SHA 以 Render 部署回执为准。仓库记录 165 项应用测试和 3 项数据库测试通过，未在本轮重跑或复算部署包。 |
| 网关 | `srv-db6b7inlk1mc73ck6cmg`，部署 `dep-dbmo2h4s728c739dilb0`，SHA `6e9fb99f6575602d9f8e8089f51c70d88f5c834f`，15:27:30 MYT live。健康接口版本 1.10.1、liveReady=false。部署后 4 个 502 已归因为 EpicWin、ClotPlay、Venus、EVO888H5 游戏目录上游未连通；支付路由没有 5xx。 |
| Render 其他资源 | 上轮同步服务部署 `dep-datto10u01pc73agkhig`、客服部署 `dep-dau8na5g1s2s73bttvn0` 显示 live。暂存 PostgreSQL `master7-cloud-staging-db` 显示 available。实际同步范围、客服会话和现行连接映射待签收。 |
| Supabase | 上轮项目列表可读，可见范围未找到名称匹配的项目。需项目引用和部署配置确认是否使用以及数据归属。 |
| Firecrawl | 上轮额度查询结果为 2,878/5,000，读取共享后台一次使用 5 credits，14:56:49 返回 HTTP 200 和登录字样。页面耗时另采用 curl 实测。 |
| HTTPS 与性能 | 成功请求 TLS 校验启用，curl verify result 为 0。环境走代理，源站证书颁发者、SAN、到期日未独立核实。计时是该次请求的累计阶段数据，不能用来代表马来西亚终端体验或生产 p95。 |

| curl 请求 | DNS 秒 | 连接秒 | TLS 秒 | 首字节秒 | 总秒 |
|---|---:|---:|---:|---:|---:|
| 后台首页 302 | 0.000077 | 0.000127 | 6.127645 | 6.499374 | 6.499693 |
| 后台跳转后 200 | 0.000026 | 0.000133 | 1.330804 | 2.138407 | 2.182525 |
| .59 健康 200 | 0.000023 | 0.001386 | 7.842091 | 8.567882 | 8.567976 |

## 3. 今日交接顺序

| 优先 | 主负责人 | 处理与验收 |
|---|---|---|
| P0-A | 域名管理员和 Codex | 固定用户指定的两个 www 入口。核实 DNS 权威区、托管项目和当前生产 SHA。手机与电脑打开相应首页，提供源站 HTTPS 证据和完整跳转链。 |
| P0-B | 用户本人和 Codex | 后台使用统一入口，以原账号验证 ID＋密码、退出、会话过期、本人恢复。前台小锁保留 OTP、旁边编号、过期/重发/限流及注册登录。角色在后台同入口验证，逐条记录 Owner、Staff、Member 权限。 |
| P0-C | 原数据保管人和 Codex | 用只读源做旧会员、订单、钱包、游戏分数差异。留存加密副本和隔离恢复校验。先确认回滚目标与现行数据库兼容性。 |
| P1-A | 支付实施方 | 以现有资料、源码追踪及模拟用例起步。在授权测试环境逐家补建单、可信查单/回调、重复与并发防重、钱包单次入账、后台流水及商户对账。 |
| P1-B | 游戏实施方 | 逐家确认品牌、产品、环境和钱包模式。验证开局、进入与退出、断线、未结局、重复操作及回钱包。 |
| P2 | 产品内容与运维负责人 | 完成三语、品牌素材、社交、活动、客服、报表、手机安装和告警。将实测、截图和使用方签收绑定同一版本。 |

## 4. F01–F28 全平台功能台账

| 编号 | 功能 | 已确认或现有缺口 | 应交回证据 |
|---|---|---|---|
| F01 | 客户前台 | 实测 www 无 DNS 地址答案 | DNS、托管目标、HTTPS、手机和电脑页面 |
| F02 | 共享后台 | 本轮公开页实测 HTTP 200。Owner 登录有仓库记录 | 本人用正式入口登录、退出、跳转与会话验证 |
| F03 | 账号恢复 | 有程序记录，本人待签收 | 保留原账号的受控恢复结果 |
| F04 | 注册/OTP | 运行状态显示配置就绪 | 实收、重发、过期、限流、注册及登录 |
| F05 | 权限 | 有仓库角色和越权测试记录 | Owner、Staff、Member 在对应环境验收 |
| F06 | 旧会员与余额 | 当前门户有恢复演练回执 | 原库与现库差异表、旧资料保全 |
| F07 | 品牌视觉 | 待确认素材 | 水蓝、金、白、公司名、前台小锁、Logo |
| F08 | 中英马三语 | 仓库记录已有实现 | 页面、错误提示、订单及手机截图 |
| F09 | MYR/MYT | 仓库记录 .59 时区调整 | 金额精度及古晋时间跨日/月/年验证 |
| F10 | 游戏区 | 有目录记录，真实游戏关闭 | Free/Paid 资格与展示 |
| F11 | 品牌入口 | 目录有记录，品牌图片待补 | 每家按钮、Logo、产品和环境映射 |
| F12 | 游戏启动 | 真实会话未签收 | 启动、拒绝、正确玩家、维护拦截 |
| F13 | 退出回钱包 | 钱包真实结算未签收 | 余额变动、并发退出、断线和未结局证据 |
| F14 | VPay 充值 | 有源码和模拟证据 | 六阶段验收与提款分开 |
| F15 | GSPAY 充值 | 仅有通用解析器；本商户建单响应、查单与回调合同均待确认 | 厂家为 `MASTER7VIPMYR+` 新开工单并交完整协议与链路结果 |
| F16 | 1MPay 充值 | 资料与离线实现已有记录 | 精确补项及厂家端到端结果 |
| F17 | 其他产品 | GSPAY+ 关闭，FPX 等范围待确认 | 产品与商户环境清单 |
| F18 | 统一钱包 | 真实资金与游戏开关关闭 | 可用、冻结、游戏余额及账本一致 |
| F19 | 提款 | 流程有仓库记录，实单未验收 | 申请、冻结、审批、失败释放与对账 |
| F20 | 财务报表/导出 | 仓库记录已具报表 | 充值、提款、注册、老客充值及 CSV 复算 |
| F21 | Bonus/VIP/红包/返水 | 正式活动规则待签收 | 规则、资格、上限和防重复领取 |
| F22 | 佣金/推荐 | 仓库有候选规则 | 用户确认后按真实流水复算 |
| F23 | 广告/教程 | 正式内容待补 | 公告、广告与三家充值教程各一条 |
| F24 | 社交入口 | 仓库记载未配置 | 用户确认的官方链接及跳转验证 |
| F25 | 客服 | Render 有部署，人工/AI 业务待签收 | 真正会话、转人工、与资金权限隔离 |
| F26 | 手机安装 | 有 APK 与 iOS 网页安装记录 | Android 与 iPhone 真机安装、更新、登录 |
| F27 | TLS/性能/监控 | 入口与健康请求超过 5 秒，网关有 error 样本 | 源站证书、马来西亚实测、日志归因与告警 |
| F28 | 最终交接 | 交接与备份资料已有部分 | 正式版本、两入口、源码哈希、旧数据对账和本人签收 |

补充范围。前台为水蓝、金、白，顶部放 MASTER7 公司名、Logo 与 OTP 小锁。游戏按品牌独立按钮，免费/付费分区和 FREE 标识应与实际试玩资格一致，JILI、KISS、MEGA H5 按用户要求不在大厅展开小游戏。充值显示三家各自 Logo、付款状态及各一条教学视频。手工银行转账若纳入交付，应单列到账核实、审核权限、私有凭证、重复处理和对账。社交只填经用户确认的 FB、TikTok、Instagram、X、Threads、Telegram、WeChat、WhatsApp、LINE 官方入口。APK 提供版本、来源与 SHA-256，iPhone 网页安装与原生应用分别标注。客户短信或 WhatsApp 推送单列授权名单、去重、退订、频率和后台审计。本轮没有读取或外发客户号码。

## 5. 游戏完整实施与验收

### 5.1 已有证据

逐品牌表取自 14:46:44 的仓库验收 CSV。76 条目录中 39 Active、37 Closed，另外 4 条为独立集成记录。80 条合计 69 未配置、5 部分证据、6 受阻。每条记录的启动、钱包、退出均未验收，图片字段均为 false。仓库另有 769 项游戏的目录总数记录。下方“目录数”是各行源字段，目录行与集成行可能重叠，不能相加当作可玩数量。Active 和“有记录”描述目录/连接记录状态。

### 5.2 流程和账本

- 先把品牌按钮、目录 ID、供应商产品、商户环境和钱包模式对应起来。逐项区分免费试玩、付费以及维护状态。
- 转账钱包验证进入前余额、转入编号和结果、供应商可回收余额、退出后的转出确认、主钱包恢复。遇超时或未结局，保留待核状态，使用已有受控查单机制处理。相同请求的重试、并发和重复退出只生效一次。
- 无缝钱包验证供应商按回合发出的余额查询、下注、结算和取消事件。平台钱包按独立事件流水同步，避免退出时额外制造一次转账。
- 关闭新开局时，应验证既有会话和未结交易的受控处理。维护、断线、重连和最终对账需单独留证。

| 编号 | 游戏验收用例 | 通过证据 |
|---|---|---|
| G01 | 品牌与环境 | 按钮映射到正确的品牌、产品、测试/正式商户及版本 |
| G02 | Logo/分类 | 各家素材来源明确，Free/Paid、语言和手机视图正确 |
| G03 | 真实可开局 | 合规测试账号获得有效会话，日志关联订单或回合 |
| G04 | 玩家绑定 | 同一会员重试时复用正确玩家，越权和未登录请求拒绝 |
| G05 | 钱包模式 | 厂家合同与实际接口共同确认模式、MYR 和金额精度 |
| G06 | 转入正常 | 本地、供应商引用和余额对上，同一笔只扣一次 |
| G07 | 转入结果不明 | 查单后收敛，避免重试时多扣余额 |
| G08 | 正常退出 | 已确认的可回收余额回主钱包，最终余额和流水对上 |
| G09 | 关闭页面或断线 | 会话可追踪，重连、补查及最终余额可核对 |
| G10 | 连点退出与双设备 | 并发仅处理一次，流水唯一 |
| G11 | 未结局 | 余额保留待结算，后续按厂家协议补记 |
| G12 | 无缝下注/派彩/取消 | 事件验真、回合关联、同一事件仅入账一次 |
| G13 | 回调异常 | 签名、金额、产品或玩家不符时有明确结果并记录 |
| G14 | 切换维护 | 拦截新开局，旧会话和未结交易按设计处理 |
| G15 | 厂家不可用或超时 | 给出清楚的状态，保留原订单与账本 |
| G16 | 报表和历史 | 按 MYT 对应投注、派彩、取消、净输赢和平台流水 |
| G17 | 多语言和真机 | Android/iPhone 开局、返回、重连和方向切换可用 |
| G18 | 备份与重启 | 会话、幂等键、待补查和已结算记录可追踪 |

### 5.3 80 行逐品牌与集成索引

| 序号 | 品牌 | 源 ID | 目录状态 | 集成记录 | 目录数 | 连接字段 | 验收 |
|---:|---|---|---|---|---:|---|---|
| 1 | 3WIN8 | slot:3win8 | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 2 | 5G GAMES | slot:5g-games | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 3 | 918KAYA | slot:918kaya | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 4 | 918KISS | slot:918kiss | Closed | 有映射 | 92 | 有记录 | 部分证据 |
| 5 | 918KISS H5 | slot:918kiss-h5 | Closed | 有映射 | 92 | 有记录 | 部分证据 |
| 6 | ACE333 | slot:ace333 | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 7 | ACEWIN | slot:acewin | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 8 | ADVANTPLAY | slot:advantplay | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 9 | ASTAR | slot:astar | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 10 | BOONGO | slot:boongo | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 11 | BT GAMING | slot:bt-gaming | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 12 | CLOTPLAY | slot:clotplay | Closed | 有映射 | 0 | 待核实 | 受阻 |
| 13 | CQ9 | slot:cq9 | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 14 | DRAGOON SOFT | slot:dragoon-soft | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 15 | EPICWIN | slot:epicwin | Closed | 有映射 | 0 | 待核实 | 受阻 |
| 16 | EVO888 | slot:evo888 | Closed | 有映射 | 150 | 待核实 | 受阻 |
| 17 | EVO888H5 | slot:evo888h5 | Closed | 有映射 | 150 | 待核实 | 受阻 |
| 18 | FACHAI | slot:fachai | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 19 | GREATWALL99 | slot:greatwall99 | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 20 | JDB | slot:jdb | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 21 | JILI00 | slot:jili00 | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 22 | JOKER | slot:joker | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 23 | KA GAMING | slot:ka-gaming | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 24 | LFC888 | slot:lfc888 | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 25 | LIVE22 | slot:live22 | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 26 | LUCKY365 | slot:lucky365 | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 27 | MARIO CLUB | slot:mario-club | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 28 | MEGA888 | slot:mega888 | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 29 | MEGAH5 | slot:megah5 | Closed | 有映射 | 166 | 有记录 | 部分证据 |
| 30 | META GAMING | slot:meta-gaming | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 31 | MICROGAMING | slot:microgaming | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 32 | NEXT SPIN | slot:next-spin | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 33 | PEGASUS | slot:pegasus | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 34 | PLAYSTAR | slot:playstar | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 35 | PLAYTECH | slot:playtech | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 36 | PRAGMATIC PLAY | slot:pragmatic-play | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 37 | PUSSY888 | slot:pussy888 | Active | 未配置 | 0 | 待核实 | 未配置 |
| 38 | PXPLAY | slot:pxplay | Closed | 未配置 | 0 | 待核实 | 未配置 |
| 39 | RELAX GAMING | slot:relax-gaming | Active | 未配置 | 0 | 待核实 | 未配置 |
| 40 | RICH GAMING | slot:rich-gaming | Active | 未配置 | 0 | 待核实 | 未配置 |
| 41 | RICH88 | slot:rich88 | Active | 未配置 | 0 | 待核实 | 未配置 |
| 42 | ROYAL SLOT GAMING | slot:royal-slot-gaming | Active | 未配置 | 0 | 待核实 | 未配置 |
| 43 | SPADE GAMING | slot:spade-gaming | Active | 未配置 | 0 | 待核实 | 未配置 |
| 44 | SUNCITY | slot:suncity | Active | 未配置 | 0 | 待核实 | 未配置 |
| 45 | VPOWER | slot:vpower | Active | 未配置 | 0 | 待核实 | 未配置 |
| 46 | XE88 | slot:xe88 | Active | 未配置 | 0 | 待核实 | 未配置 |
| 47 | YGR | slot:ygr | Active | 未配置 | 0 | 待核实 | 未配置 |
| 48 | ELOTTO | fast-game:elotto | Active | 未配置 | 0 | 待核实 | 未配置 |
| 49 | SPRIBE | fast-game:spribe | Active | 未配置 | 0 | 待核实 | 未配置 |
| 50 | ALLBET | live:allbet | Active | 未配置 | 0 | 待核实 | 未配置 |
| 51 | BBIN | live:bbin | Active | 未配置 | 0 | 待核实 | 未配置 |
| 52 | BIG GAMING | live:big-gaming | Active | 未配置 | 0 | 待核实 | 未配置 |
| 53 | CT855 | live:ct855 | Active | 未配置 | 0 | 待核实 | 未配置 |
| 54 | EVOLUTION | live:evolution | Active | 未配置 | 0 | 待核实 | 未配置 |
| 55 | GAMEPLAY INTERACTIVE | live:gameplay-interactive | Active | 未配置 | 0 | 待核实 | 未配置 |
| 56 | MICROGAMING | live:microgaming | Active | 未配置 | 0 | 待核实 | 未配置 |
| 57 | PLAYTECH | live:playtech | Active | 未配置 | 0 | 待核实 | 未配置 |
| 58 | PRAGMATIC PLAY | live:pragmatic-play | Active | 未配置 | 0 | 待核实 | 未配置 |
| 59 | SA GAMING | live:sa-gaming | Active | 未配置 | 0 | 待核实 | 未配置 |
| 60 | AWC SEXY BACCARAT | live:awc-sexy-baccarat | Active | 未配置 | 0 | 待核实 | 未配置 |
| 61 | WM CASINO | live:wm-casino | Active | 未配置 | 0 | 待核实 | 未配置 |
| 62 | YEEBET | live:yeebet | Active | 未配置 | 0 | 待核实 | 未配置 |
| 63 | BT GAMING | fish:bt-gaming | Active | 未配置 | 0 | 待核实 | 未配置 |
| 64 | JDB | fish:jdb | Active | 未配置 | 0 | 待核实 | 未配置 |
| 65 | JILI00 | fish:jili00 | Active | 未配置 | 0 | 待核实 | 未配置 |
| 66 | JOKER | fish:joker | Active | 未配置 | 0 | 待核实 | 未配置 |
| 67 | KA GAMING | fish:ka-gaming | Active | 未配置 | 0 | 待核实 | 未配置 |
| 68 | SPADE GAMING | fish:spade-gaming | Active | 未配置 | 0 | 待核实 | 未配置 |
| 69 | YOULIAN GAMING | fish:youlian-gaming | Active | 未配置 | 0 | 待核实 | 未配置 |
| 70 | AE ESPORT | sport:ae-esport | Active | 未配置 | 0 | 待核实 | 未配置 |
| 71 | IA E-SPORT | sport:ia-e-sport | Active | 未配置 | 0 | 待核实 | 未配置 |
| 72 | IBC BET | sport:ibc-bet | Active | 未配置 | 0 | 待核实 | 未配置 |
| 73 | M8BET | sport:m8bet | Active | 未配置 | 0 | 待核实 | 未配置 |
| 74 | SBOBET | sport:sbobet | Active | 未配置 | 0 | 待核实 | 未配置 |
| 75 | LOTTERY (4D LOTTERY) | others:lottery-4d-lottery | Active | 未配置 | 0 | 待核实 | 未配置 |
| 76 | AWC SV388 | others:awc-sv388 | Active | 未配置 | 0 | 待核实 | 未配置 |
| 77 | JILI | jili | 独立集成 | 集成记录 | 297 | 有记录 | 部分证据 |
| 78 | VENUS | venus | 独立集成 | 集成记录 | 0 | 待核实 | 受阻 |
| 79 | RECTANGLE | rectangle | 独立集成 | 集成记录 | 64 | 有记录 | 部分证据 |
| 80 | 精选游戏 | godeezone | 独立集成 | 集成记录 | 0 | 待核实 | 受阻 |

逐品牌后续证据格式：`品牌ID / 产品与环境 / 钱包模式 / 启动 / 余额前后 / 退出 / 断线 / 并发 / 结算 / 报表 / 证据时间 / 负责人`。

## 6. 三家充值完整实施与验收

### 6.1 业务流程

服务端先验会员身份、渠道开关、币种和金额 → 持久化本地唯一订单与幂等键 → 服务端向指定厂家建单 → 只使用验证后的付款链接 → 收到服务端可信回调或独立查单 → 验证商户、订单号、供应商流水、金额、币种和状态 → 单个数据库事务写唯一入账与双分录 → 用户钱包与后台订单显示一致 → 与供应商账单及商户实际结算核对。

超时或回调缺失时保留结果不明和原有订单号。接手方要测试重复、乱序、并发、重启和回调与查单同时发生的情况。浏览器返回页只呈现后端确认状态。已有订单的补查与新建单开关分开。使用服务端金额和订单数据，日志只保留可公开的脱敏引用。充值、提款、退款或冲正、商户结算分别留证。

### 6.2 三家精确缺口

| 厂家 | 已有材料、源码与测试 | 当前待处理 |
|---|---|---|
| VPay | `lib/vpay.ts`、`lib/backend.ts`、`tests/api.test.mjs`。已有本地幂等建单、独立查单、认证回调、重复通知防重及双分录模拟。 | 对照平台和网关商户、环境、回调与返回地址。实测订单、查单、钱包、后台及结算。提款曾显示回调配置缺口，另验申请、冻结、审批、出款及失败释放。 |
| GSPAY | `lib/gspay.ts`、`tests/gspay-portal.test.mjs` 有通用解析器、虚构测试值和 fail-closed 测试；先前样本不属于 MASTER7 验收证据。 | 厂家为 `MASTER7VIPMYR+` 新开工单，提供建单成功/失败响应、精确查单外层、回调签名和字段、成功 ACK 与重试规则。当前 `createProgramReady=false`，查单与结算也保持关闭。 |
| 1MPay | API 1.3 PDF、商户与客服账号用途、合同标识、API 密钥及出款公钥资料已收到。 `lib/onempay.ts` 与 `tests/onempay.test.mjs` 有 17 组离线测试记录。 | 核实 contract/secret_key 对应字段、Content-Type、准确状态枚举、ACK 与重试，以及未拿到 trxno 的查单恢复。无需用户整套重发。付款、出款和商户结算分别验收。 |

### 6.3 1MPay API 1.3 核对要点

| 环节 | 文档规则 | 实施关注 |
|---|---|---|
| 收款建单 | POST `/fundtransfer/json`，另有表单方式 `/fundtransfer`。JSON 成功示例 `code=0`、`redirect_url` 和 `data.trxno`。 | 必填 merchant、amount、refid、token、customer、currency、post_url、failed_return_url、return_url，bankcode 可选。金额两位小数，保存 trxno。建单返回后仍须核实收款。 |
| 建单签名 | Base64 包住 SHA-256 原始摘要，拼接顺序 merchant + amount + refid + customer + apikey + currency。 | 离线固定向量测试，金额原始两位小数。 |
| 回调签名 | 同样计算原始摘要的 Base64，最后一项是 trxno。 | 验签并关联本地订单。状态有异常或冲突时用独立查询复核。 |
| 查单 | GET `/transquery/{trxno}/{base64_token}`。查单路径中的 token 在回调算法结果外再做一次 Base64。 | 路径编码、原始金额、回调与查单解析分别验证，含 token 的 URL 仅留脱敏引用。 |
| 迟到成功 | PDF 描述初次超时后可能在 5 分钟内再发正确状态。 | 复核后允许迟到成功，只入账一次。ACK/完整重试规则另行确认。 |
| 出款 | POST `/payout`，外层 merchant/key/data/iv；示例用 PHP openssl_seal 与 AES-256-CBC。 | 以厂家测试向量确认互通、银行码和商户权限，单独验收。交接中的公钥资料只登记存在。 |
| 商户结算 | 用户资料注明从 1MPay 商户后台提交。 | 商户结算与客户提现分开；实际对账单、手续费、到账及权限留证。 |

### 6.4 18 个当前阶段记录

| 渠道 | 阶段 | 验收状态 | 当前证据/断点 |
|---|---|---|---|
| VPay | 连接证据 | 部分证据 | 本地配置/程序有证据，通道暂停 |
| VPay | 建单 | 未通过签收 | 已有幂等建单模拟；线上下单关闭 |
| VPay | 查单 | 未通过签收 | 有独立查单绑定模拟；线上未验收 |
| VPay | 回调 | 未通过签收 | 有认证回调模拟；线上未验收 |
| VPay | 钱包 | 未通过签收 | 唯一入账及双分录有模拟；无正式实单 |
| VPay | 对账/结算 | 未通过签收 | 缺供应商、手续费及到账核对 |
| GSPAY | 连接证据 | 部分证据 | credential 配置有证据；本商户建单契约未确认，通道关闭 |
| GSPAY | 建单 | 未通过签收 | 只有虚构值的通用解析测试；`createProgramReady=false`，线上下单关闭 |
| GSPAY | 查单 | 未通过签收 | 返回 GSPAY_QUERY_CONTRACT_PENDING，需精确查单契约 |
| GSPAY | 回调 | 未通过签收 | 返回 GSPAY_SETTLEMENT_DISABLED，需签名、ACK 和重试规则 |
| GSPAY | 钱包 | 未通过签收 | 真实结算关闭，未验收会员入账 |
| GSPAY | 对账/结算 | 未通过签收 | 缺供应商流水与账本核对 |
| 1MPAY | 连接证据 | 部分证据 | 已有 API 1.3、商户资料和本地配置证据，通道暂停 |
| 1MPAY | 建单 | 未通过签收 | /fundtransfer/json 有离线实现；线上下单关闭 |
| 1MPAY | 查单 | 未通过签收 | /transquery 双层 Base64 有离线实现；线上未验收 |
| 1MPAY | 回调 | 部分证据 | 回调处理器配置有记录，真实送达及 ACK 未验收 |
| 1MPAY | 钱包 | 未通过签收 | 有独立查单、迟到成功和单次入账模拟；正式未验收 |
| 1MPAY | 对账/结算 | 未通过签收 | 缺商户结算证据；出款另列 |

### 6.5 P01–P28 逐家复测清单

对 VPay、GSPAY、1MPay 分别填写。下表列的是通过标准，实际结果以 6.4 和新增的带环境、时间的证据为准。

| 编号 | 测试 | 通过条件 |
|---|---|---|
| P01 | 商户与环境身份 | 产品、MYR、测试／生产及商户范围对应正确 |
| P02 | 协议版本 | URL、方法、字段、签名、状态、通知回复均有官方来源 |
| P03 | 密钥保护 | 前端包、普通日志和报告无商户密钥 |
| P04 | 正常建单 | 本地与供应商订单可关联，金额／币种一致 |
| P05 | 非法金额／币种／权限 | 服务端拒绝，无不应发生的对外建单 |
| P06 | 维护模式 | 新建单按预期禁止；已有订单处理不丢失 |
| P07 | 重复点击 | 相同业务请求不重复建单 |
| P08 | 建单超时 | 保留结果不明，通过官方规则消除歧义，不盲目重试 |
| P09 | 正常可信通知 | 验真、订单关联和状态映射正确 |
| P10 | 伪造／篡改通知 | 不产生成功状态或余额 |
| P11 | 金额／币种／商户不符 | 不入账，记录差异 |
| P12 | 重复通知 | 余额与流水只增加一次 |
| P13 | 并发重复／通知与查单竞态 | 数据库层面确保唯一一次入账 |
| P14 | 乱序通知 | 不被旧事件错误覆盖，不重复记账 |
| P15 | 客户未返回页面 | 仍能依服务端证据正确确认 |
| P16 | 数据库处理中断 | 恢复后不漏账、不重复 |
| P17 | 待支付／失败／过期 | 不误加余额，按官方最终规则处理 |
| P18 | 通知丢失／补查 | 未决订单可追踪，有来源地核实 |
| P19 | 服务重启后 | 订单、事件、去重和余额证据持久保留 |
| P20 | 前台和后台一致 | 同一付款对应同一订单、金额、渠道及状态 |
| P21 | 账本核对 | 余额与不可变流水、订单一致 |
| P22 | 商户对账／结算 | 供应商记录、费用和实际结算证据可关联 |
| P23 | 测试与生产隔离 | 不串密钥、商户、订单或账本 |
| P24 | 权限与隐私 | 客户不能查看他人订单，普通日志不泄露个人资料 |
| P25 | 出款／退款（若范围获准） | 独立验收、去重、结果不明与失败处理完备 |
| P26 | 老资料与备份 | 有可验证副本与恢复记录，无覆盖或丢失 |
| P27 | 交接开关 | 与用户明确签收要求一致，有实际状态证据 |
| P28 | 文档与部署一致 | 报告列明当前SHA、部署ID、环境、时间和未通过项 |

## 7. 旧数据、账号与恢复

- 当前门户有仓库记录的加密备份和隔离恢复，30 表、244 条记录、外键错误 0，演练时间 14:21:29 MYT。隔离目标为内存 SQLite。以回执取得的备份哈希和原始文件做独立复核。
- 原始数据源登记原 v105、V15、V17 Sites、Render 测试门户、旧 PostgreSQL、暂存库、可能的 Supabase 和同步临时文件。按源项目、所有者、时间、表/字段、行数、用途、读写方向和现有副本分别登记。
- 差异表至少有会员 ID、账户关联、有效状态、各钱包分类和总金额、未结充值/提款、游戏未结分数、订单/账本断点及处理人。保留原始备份与独立副本，先验证隔离恢复。
- 仓库 Owner 交接书记录过实施方只读登录。最终由用户本人验证原账号、登录恢复及恢复资料的保存。凭据、验证码、个人资料、银行字段和私钥放受控保管位置。
- 回滚交件包含应用 SHA、数据库兼容性、订单/回调处理策略、触发条件、负责人和复验指标。生产数据处理以明确授权和已核对的恢复范围为准。

## 8. Codex 要交回的完整文件与签收包

| 交付件 | 最低内容 |
|---|---|
| CURRENT_DEPLOYMENT.md | 两个 www 入口、权威 DNS/TLS、托管项目、运行/正式版本、服务 ID、SHA、包 SHA-256、数据库映射及状态 |
| ISSUES_AND_FIXES.md | F01–F28、责任人、复测时间和证据。区分候选、已部署、实测和最终签收 |
| GAMES_ACCEPTANCE.csv | 80 行原验收索引，加 G01–G18 实测、品牌映射、钱包、断线、退出、对账与缺项 |
| PAYMENTS_ACCEPTANCE.csv | 三家各六阶段、P01–P28 独立结果、失败用例、订单引用、钱包账本及商户结算 |
| PAYMENT_SOURCE_TRACE.md | 实际部署包与可审查源码、测试和规范映射。定位到函数/行，并写明与当前 SHA 的关系 |
| DATA_RECOVERY_RECEIPT.md | 当前备份与旧库资料分别列来源、哈希、隔离演练、差异、回滚和保管人 |
| OWNER_HANDOVER.md | 本人登录、权限、恢复、两个正式入口、管理归属、安装方式及签收 |
| ASSETS_MANIFEST.csv | 素材/代码的相对路径、用途、来源/授权、格式、版本、SHA-256 与线上位置 |
| BUILD_AND_QA.md | 依赖锁文件、构建命令、回归测试结果、产物、环境和操作记录 |
| OPERATIONS.md | 时区、每小时巡检、告警联系人、性能、日志、账单责任与故障回滚 |

回执最小格式：`编号 | 负责人 | 环境 | 状态 | 具体断点 | 证据时间 MYT | SHA/部署ID | 脱敏链接 | 下一步 | 复查时间`。

签收顺序：先核实域名与本人账号、旧数据，再分签支付与游戏，最后确认内容、安装、运维和正式管理权。当前实测真实支付和游戏关闭。本次执行范围为只读状态核查、资料整合与 MD 交付。

## 9. 可核查来源

- [最新测试站 Render 部署](https://dashboard.render.com/web/srv-dbl0iv7f3r2c73848ei0/deploys/dep-dbmnm0p5efls7384upu0) · [最新 SHA](https://github.com/jackysim47-star/master7/commit/d288fe6a00f8db76a518f4c7a9f3df111bb72e18) · [测试站健康入口](https://master7-v17-staging.onrender.com/health)
- [网关 Render 部署](https://dashboard.render.com/web/srv-db6b7inlk1mc73ck6cmg/deploys/dep-dbmmt02jnfac73aunkl0)
- [Google 前台 DNS](https://dns.google/resolve?name=www.master7.best&type=A) · [Google 后台 DNS](https://dns.google/resolve?name=www.master7.site&type=A)
- [F01–F28 仓库状态表](https://github.com/jackysim47-star/master7/blob/acd2a044a04a6a00abb5aca732d5b216779f26d9/docs/ISSUES_AND_FIXES.md) · [游戏 CSV](https://github.com/jackysim47-star/master7/blob/acd2a044a04a6a00abb5aca732d5b216779f26d9/docs/GAMES_ACCEPTANCE.csv) · [支付 CSV](https://github.com/jackysim47-star/master7/blob/acd2a044a04a6a00abb5aca732d5b216779f26d9/docs/PAYMENTS_ACCEPTANCE.csv)
- [支付源码追踪](https://github.com/jackysim47-star/master7/blob/acd2a044a04a6a00abb5aca732d5b216779f26d9/docs/PAYMENT_SOURCE_TRACE.md) · [备份恢复回执](https://github.com/jackysim47-star/master7/blob/acd2a044a04a6a00abb5aca732d5b216779f26d9/docs/DATA_RECOVERY_RECEIPT.md) · [账号交接记录](https://github.com/jackysim47-star/master7/blob/acd2a044a04a6a00abb5aca732d5b216779f26d9/docs/OWNER_HANDOVER.md)
- [1MPay API 1.3 用户提供 PDF](https://chatgpt.com/library?file_id=libfile_fde3_f-5759dcf91b548191a8d7b867d8519a73_d20b3cd80aec8191a04f49e80462f2e8&account_id=personal)
- [上轮复查跟进交件](https://chatgpt.com/library?file_id=libfile_fde3_f-2bd1e90824008191be4e01869429305a_d20b3cd80aec8191a04f49e80462f2e8&account_id=personal) · [三家支付详细交接](https://chatgpt.com/library?file_id=libfile_fde3_f-c23e5e8135f48191823f00dd5dd26ec4_d20b3cd80aec8191a04f49e80462f2e8&account_id=personal) · [历史全功能与资产总册](https://chatgpt.com/library?file_id=libfile_050ab62937208191afbbd7f20e842639&account_id=personal)
