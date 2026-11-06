# MASTER7 PR #1 注册与 staging 接手记录

更新时间：2026-11-03（MYT）

## 本轮完成

- 注册页只显示 ID 和密码，不再要求联系邮箱；注册审批规则保留。服务端仍兼容已提交邮箱的旧表单请求。新账号在旧版必填邮箱列中使用不可投递的 `member.invalid` 内部标识，不将其作为联系地址展示。
- 为新会员登记增加稳定的 `members.user_id` 关联，并提供 SQLite 与 PostgreSQL 两份迁移；迁移会按旧邮箱关联回填既有会员，再对非空 `user_id` 建唯一索引。旧邮箱关联查询仅作为未迁移记录的兼容回退。
- 已批准的顾客在非测试运行环境中仍不能只凭密码创建会话。当前短信 OTP 服务端未接通，顾客登录明确返回未就绪；员工和后台沿用现有 ID＋密码及角色授权。恢复码仍是独立的账号恢复流程，不计作 OTP。
- PR #2 已于 2026-11-03 合入 `main`。合并提交 SHA：`4bd12b48b164a8057554caa45a0b1e51863fefdf`。其中包含 staging Blueprint 代码配置；合入并不代表 Render 云端 staging 已建立。
- 本轮验证通过：生产构建；完整 `npm test`；SQLite 与 PostgreSQL/PGlite 注册、审批、隔离测试；会员身份迁移与重启测试；钱包、支付合约、VPay runtime、提款、银行存款、财务对账、游戏目录、促销草稿、老板初始化、云就绪、部署核验、i18n、存储 TLS 和生产保护测试。测试使用临时本地数据库与模拟供应商，没有真实交易。

## 当前云端状态

- PR #1 的基线合并 SHA 为 `845e2cb22d429302684301d4a17719e57d7c2fcd`；PR #2 的代码提交 SHA 为 `0e7cceba8e6cc2fe1cb50adbd60277328f75161e`；其合并提交为 `4bd12b48b164a8057554caa45a0b1e51863fefdf`。
- Render `ahbi` 工作区中，暂存数据库 `master7-cloud-staging-db`（`dpg-dbkl1g3bc2fs739li01g-a`）状态为 available，Singapore，免费计划，记录到期时间为 2026-12-03 11:10:56 MYT，外部 IP allowlist 为空。
- 最新服务清单未见 `master7-cloud-staging`。可见的 `ahbi-service-portal-c3jm` 指向旧仓库 `wbdream10-cpu/master7`；它不是 PR #2 的 staging 部署。
- 尚无 staging 服务通过受信 TLS 连接该数据库、运行迁移并完成 `/health`、版本和静态资源核验的证据。本轮没有读取数据库连接秘密或修改 Render 服务。
- 该 Render 连接器目前只能以明文值创建/更新环境变量，不能安全传入 `PORTAL_POSTGRES_URL` Secret；未创建预计会因缺少数据库配置而失败的服务。应由 Render 工作区管理员在 Dashboard 为独立 staging 服务安全配置该 Secret，再部署固定 SHA。
- 正式域名未改动；旧数据恢复、原游戏平台源码、顾客短信 OTP 和供应商 UAT 仍是独立阻塞。

## 下一道 staging 验收门

1. 以合并提交 `4bd12b48b164a8057554caa45a0b1e51863fefdf` 为 staging 候选版本；确认 Render 服务连接 `jackysim47-star/master7` 的 `main`。
2. 通过 Render Dashboard/Blueprint 建立独立测试服务，在云端 Secret 配置中填入暂存库连接 URL；服务必须使用可信 TLS，不能把连接秘密贴到聊天或日志。
3. 记录 Render service/deploy ID 与实际 `RENDER_GIT_COMMIT`；仅当其与候选 SHA 一致时，运行 `npm run verify:deployment -- --origin <staging-https-origin> --commit <full-sha> --assets-dir standalone/dist`。
4. staging 的数据库 ready 只证明测试库连通与迁移可用，不等于旧会员数据恢复。SMS OTP 仍不可用前，不验收顾客正式登录；供应商交易开关继续关闭。


## 2026-11-03 追加：域名与 Render 只读复核

- Render 完整服务清单包含多个既有服务；其中 `master7-v15-malaysia-final`、`master7-v15-malaysia`、`master7-v15-live` 三个 V15 静态服务均为 Starter 且未暂停。此只读检查未核实实际账单金额，应由账户持有人在 Render Billing 查看；本轮未暂停任何服务。仍没有独立的 `master7-cloud-staging`。旧门户 `ahbi-service-portal-c3jm` 连接 `wbdream10-cpu/master7`，不是 PR #2 合并后的 staging 部署；V15 静态站是模板入口，不是完整游戏平台。
- Sites 只读域名记录：V17 服务门户的 `master7.best` 与 `www.master7.best` 处于待验证状态（Sites 显示 provider active、SSL active）；V15 模板曾列有已退役的错误管理域名，现已从平台链接清除。尚未发现 `admin.master7.best` 已绑定到正确的管理后台。
- V17 Site 的说明范围是会员审批、客服工单、公告和员工管理，不能据此把这两个顾客域名切到该服务门户。没有改域名、DNS、证书或正式服务。
- 下一步仍由 Render 工作区管理员在 Dashboard/Blueprint 建立独立 staging，并在该服务的 Secret 配置中填写暂存库 URL；部署前确认服务使用仓库 `jackysim47-star/master7` 的固定合并 SHA。原 v105 工程与旧数据恢复证据仍未取得。


## 管理端 VPN 使用要求

- 老板可用日常工作电脑上的 VPN，通过 HTTPS 登录共用管理后台；顾客前台保持公开访问，不要求顾客使用 VPN。
- 不按办公室或 VPN 出口 IP 锁定后台，避免 VPN 地址变化造成管理者无法登录。若以后另设访问限制，必须先验证管理员备用登录方式。


## 2026-11-03 本地复核与收件校验

- 找到完整附件后，按 MD 内 154 个 M7FILE 项逐一核对：154/154 通过，字节数和 SHA-256 全匹配；无缺项、差异或额外文件。此包是 V15 源码更新交接，不是原 Sites v105 游戏平台源码。
- V17 Site v9 源码目录通过内置清单验证：140 个文件，源提交 `295af6bc29fca1ff3521e5749b9cb241326bed66`。Site 范围仍是服务门户；它没有旧会员、余额、未结订单或真实游戏/支付服务。
- 当前代码分支是合并后 `main` 的祖先。该分支本地验证通过：根项目生产构建、`npm test`、云就绪测试 7/7、部署核验测试 18/18、会员身份测试 2/2、生产保护测试 16 项；V15 门户先构建后测试通过，网关 71/71，三语入口 HTTP 检查 12 页通过。测试全部是本地/模拟环境，不代表线上验收。
- staging 只读预检未就绪，18 项阻塞；V17 源码校验已通过。阻塞集中在原 v105 源码、备份与隔离恢复、供应商名册/授权和 UAT、APK/iPhone 安装包与设备验收、HTTPS staging 地址、PostgreSQL Secret、短信 OTP 和共享后台角色实测。
- Render 有 3 个未暂停的 Starter V15 静态服务；账单金额尚未核实。没有停服、创建资源、配置 Secret、改 DNS 或更改生产数据。
