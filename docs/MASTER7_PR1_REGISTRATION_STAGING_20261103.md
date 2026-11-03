# MASTER7 PR #1 注册与 staging 接手记录

更新时间：2026-11-03（MYT）

## 本轮完成

- 注册页只显示 ID 和密码，不再要求联系邮箱；注册审批规则保留。服务端仍兼容已提交邮箱的旧表单请求。新账号在旧版必填邮箱列中使用不可投递的 `member.invalid` 内部标识，不将其作为联系地址展示。
- 为新会员登记增加稳定的 `members.user_id` 关联，并提供 SQLite 与 PostgreSQL 两份迁移；迁移会按旧邮箱关联回填既有会员，再对非空 `user_id` 建唯一索引。旧邮箱关联查询仅作为未迁移记录的兼容回退。
- 已批准的顾客在非测试运行环境中仍不能只凭密码创建会话。当前短信 OTP 服务端未接通，顾客登录明确返回未就绪；员工和后台沿用现有 ID＋密码及角色授权。恢复码仍是独立的账号恢复流程，不计作 OTP。
- 本地 `render.staging.yaml` 已把目标分支设为 `main` 并保持自动部署关闭；该 Blueprint 改动和本轮应用代码尚未推送/合并，所以 Render 云端配置没有因此改变。远端 `main` 当前仍是 PR #1 合并 SHA `845e2cb22d429302684301d4a17719e57d7c2fcd`。
- 本轮验证通过：生产构建；完整 `npm test`；SQLite 与 PostgreSQL/PGlite 注册、审批、隔离测试；会员身份迁移与重启测试；钱包、支付合约、VPay runtime、提款、银行存款、财务对账、游戏目录、促销草稿、老板初始化、云就绪、部署核验、i18n、存储 TLS 和生产保护测试。测试使用临时本地数据库与模拟供应商，没有真实交易。

## 当前云端状态

- PR #1 合并 SHA：`845e2cb22d429302684301d4a17719e57d7c2fcd`。本地 `codex/cloud-staging-readiness` 的 SHA 为 `be7b4029d94d7344ad18dc6712033e58311e58aa`，不得把二者标为同一部署版本。
- Render `ahbi` 工作区中，暂存数据库 `master7-cloud-staging-db`（`dpg-dbkl1g3bc2fs739li01g-a`）状态为 available，Singapore，免费计划，记录到期时间为 2026-12-03 11:10:56 MYT，外部 IP allowlist 为空。
- 当前服务清单未见 `master7-cloud-staging`。可见的 `ahbi-service-portal-c3jm` 指向旧仓库 `wbdream10-cpu/master7`；它不是 PR #1 的独立 staging 部署。
- 尚无 staging 服务通过受信 TLS 连接该数据库、运行迁移并完成 `/health`、版本和静态资源核验的证据。本地严格 TLS 配置不会关闭证书验证，但本轮没有读取数据库连接秘密或修改 Render 服务。
- 尚未创建或部署独立 staging 服务：当前可用的 Render 创建服务接口只能接收明文环境变量值，不能安全提交 `PORTAL_POSTGRES_URL` Secret；不能因此创建一个预计启动失败的服务。应由项目管理员在 Render Dashboard 按 Blueprint 建服务，并把测试库 URL 直接放入该服务的 Secret 配置。
- 正式域名未改动；旧数据恢复、原游戏平台源码、顾客短信 OTP 和供应商 UAT 仍是独立阻塞。

## 下一道 staging 验收门

1. Review 并合并本轮代码和 staging Blueprint 到 `jackysim47-star/master7` 的 `main`，保存实际发布 SHA；确保 Render 可读取该仓库。不要把当前本地工作树 SHA `be7b4029d94d7344ad18dc6712033e58311e58aa` 或 PR #1 SHA 误记为新改动的发布 SHA。
2. 通过 Render Dashboard/Blueprint 建立独立测试服务，在云端 Secret 配置中填入暂存库连接 URL；服务必须使用可信 TLS，不能把连接秘密贴到聊天或日志。
3. 记录 Render service/deploy ID 与实际 `RENDER_GIT_COMMIT`；仅当其与验收 SHA 一致时，运行 `npm run verify:deployment -- --origin <staging-https-origin> --commit <full-sha> --assets-dir standalone/dist`。
4. staging 的数据库 ready 只证明测试库连通与迁移可用，不等于旧会员数据恢复。SMS OTP 仍不可用前，不验收顾客正式登录；供应商交易开关继续关闭。
