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
