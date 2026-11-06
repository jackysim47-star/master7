# MASTER7 Issues and Fixes · F01–F28

更新时间：2026-11-06 20:39 MYT
当前线上：`17.0.0-selfbuilt.68-connected`
回滚版：`17.0.0-selfbuilt.67-complete`

`.68` 已上线：MegaH5 wallet live-ready；1MPay Deposit configured/enabled；VPay 本地 Active 但远端 contract readiness 尚未通过；GSPAY 因厂家 Authentication Key 只有 31 位而保持 unavailable。Payout 未实现，未随 Deposit 开启。

| 编号 | 功能 | 当前状态 | 已取得/已整改证据 | 下一验收动作 |
|---|---|---|---|---|
| F01 | 正式前台 | 受限 | master7.best 根域可进入；www.master7.best 无 DNS 记录。 | 需域名托管方增加 www 记录并做马来西亚手机验收。 |
| F02 | 共享后台 | 已上线/自动验证 | `.66` 已上线；后台保留首屏轻量加载、按需面板和轻量资金通知；铃铛只统计未关闭客服工单，并直接进入 Support 与刷新列表。待审批会员仍在原会员入口显示。 | Owner/Staff 各做一次生产只读抽验。 |
| F03 | 账号恢复 | 程序就绪/未执行 | 修改密码和老板恢复程序存在；本轮未改变密码。 | 本人保存恢复资料后执行一次受控恢复验收。 |
| F04 | 注册/OTP | 程序就绪/未实发 | smsOtpReady=true；未发送新的真实 OTP。 | 获授权号码完成收码、过期、重发、限流、注册和登录。 |
| F05 | 角色权限 | 已验证 | 自动测试覆盖 Owner/Staff/Member 权限和越权拒绝。 | 生产签收时各角色各执行一条只读流程。 |
| F06 | 旧会员与余额 | 部分 | 加密备份与隔离恢复回执存在。 | 仍需旧生产源与现库会员/余额/未结单差异表。 |
| F07 | 品牌视觉 | 程序就绪/缺素材 | 品牌与供应商上传程序存在；正式素材未完成。 | 上传用户确认的 Logo、品牌图及逐页视觉验收。 |
| F08 | 中英马三语 | 已实现 | 三语词典及界面已存在，自动测试通过。 | 发布后手机逐页抽验错误提示和订单文字。 |
| F09 | MYR/MYT | 已验证 | 财务接口固定 MYR、Asia/Kuching；`.66` 未改变币种与时区。 | 有真实已验收流水后再核对跨日与各周期金额。 |
| F10 | 游戏分类/免费付费区 | 已上线/需业务配置 | 766 款目录、七分类、每次 12 款、Active/Maintenance/Close 和 Free/Paid 程序已上线；当前 618 Active、148 Maintenance、Free 0。Gateway `7f65d6a` 已修复 User-Agent 与业务拒绝缓存。 | Owner 设置 Free/Paid 与正式图片；厂家放行 `74.220.52.0/24`、`74.220.60.0/24` 后重验 EVO/EPICWIN/ClotPlay/Godee，Venus 补响应签名。 |
| F11 | 品牌入口与 Logo | 部分 | 品牌入口和图片管理存在；正式品牌图未齐。 | 按 GAMES_ACCEPTANCE.csv 逐品牌补图和真实映射。 |
| F12 | 游戏启动/会话 | MegaH5 已开启/待实测 | MegaH5 Portal 与 Gateway 开关已持久开启；其他厂家没有 Launch adapter。 | 获授权会员完成一款 MegaH5 真实启动；其他厂家需各自 Launch API。 |
| F13 | 退出回钱包 | 程序开启/待实测 | MegaH5 Deposit、Withdraw、Status recovery 三项 configurationReady；真实 settlement 仍未签收。 | 用受控会员执行进入、退出、重复、断线、未结局及账本核对。 |
| F14 | VPay 充值 | Active/远端阻塞 | 本地渠道与订单配置已启用；会员、金额、币种、双分录和独立查单保护完整。线上仍返回 `gateway_contract_not_ready`，所以不会向厂家提交订单。 | 厂家/网关把 payment contract readiness 调整为 true，再做生产 Deposit E2E；提款另行验收。 |
| F15 | GSPAY 充值 | 程序完整/厂家 Key 阻塞 | 官方 MYR Payment、Get Payment、callback、恢复任务及 MD5 验证已实现。厂家 Authentication Key 当前只有 31 位，严格校验不会启动。 | 厂家重发准确 32–128 位十六进制 Authentication Key，并把 callback 直接指向 Render URL。 |
| F16 | 1MPay 充值 | 已启用/待真实验收 | `contract→merchant`、`secret_key→apikey`、production-only、查询/callback 与 HTTP 200 + `ok` ACK 已配置；`.68` health 显示 Deposit configured/enabled。 | 用获授权会员完成一笔最小生产 Deposit、callback、独立查询和双分录核对；`/payout` 不调用。 |
| F17 | 其他渠道 | 受限 | GSPAY DuitNow、USDT、Payout 与其他产品不在本轮启用范围。 | 每项另行取得合同、权限、回调、查单和结算证据后独立实现。 |
| F18 | 统一钱包 | 阻塞 | 真实付款和游戏结算关闭。 | 可信支付/游戏结算后验收可用、冻结及游戏余额。 |
| F19 | 提款 | 程序就绪/未验收 | 客户当前只可选 VPay、1MPay；GSPAY Payout 文件已收到但程序和生产验收未完成。 | 真钱前完成幂等出款、独立查单、回调、失败释放、钱包扣账及对账。 |
| F20 | 财务报表/公司银行 | 程序加强/缺真实资料 | 日/月/半年/年与 CSV 存在；断线/刷新复用请求键，银行单完整缩放，并发审核只入账一次。 | 录入真实公司银行，用获授权测试会员完成 Deposit、银行单、实际到账核对、批准和钱包验收。 |
| F21 | Bonus/VIP/红包/返水 | 程序已上线/无规则 | `.66` 固定 Turnover 只有大于零时采用；零固定值会使用 multiplier。低于最低存款时奖励与流水都为 0；不完整规则只能保存草稿，自动钱包派发关闭。 | 输入真实奖励、最低存款、Turnover、领取次数和有效期，再验收领取账本与提款限制。 |
| F22 | 佣金/推荐 | 程序已上线/无业务记录 | `.66` 会员卡明确显示“L1 原始预估（不可领取）”，API 标记该数字不可提款；三层规则和预览存在，自动钱包入账未验收。 | 真实推荐关系与资金结算后复算周期、hold、cap 和可领取金额。 |
| F23 | 广告/推广 | 程序就绪/无正式内容 | 广告启用要求有效标题、图片和可选 HTTPS 链接；大名单分块导入与流式导出存在。 | 提供正式广告图/文案；真实发送前接 provider、核准模板、同意与退订流程。 |
| F24 | 社交入口 | 未配置 | socialEnabled=false。 | 只录入用户确认的官方链接。 |
| F25 | AI 客服 | 部分 | 人工工单与接手可用；`.65` 修复响应重复 `status` 的 TypeScript 问题，AI providerReady 仍为 false。 | 连接正式 AI provider 后验证回复、转人工与权限隔离。 |
| F26 | Android/iPhone | 已实现 | APK 下载和 iOS manifest 存在。 | 发布签收需 Android/iPhone 真机安装与更新测试。 |
| F27 | DNS/TLS/性能/监控 | 阻塞 callback/部分 | `master7.best` 当前 302 转发会丢失 callback POST；Render 直达可用，后台轻量加载与告警已实现。 | 把 apex 直接绑定 Render 或使用保留 POST 的反向代理，并验证无 Location、TLS 和 callback 路由。 |
| F28 | 备份/恢复/源码素材 | `.66` 已发布/恢复待演练 | `.66` commit `7cd1c0bc7cd4f364b73770b01f864abfbe1c07fc`、bundle SHA `bfdfcb22549911ca996b25b84617b4064cb9da2c425c3644c06b497f4e5b4285`、deploy `dep-dbmrhjbbc2fs73aompu0` 与线上 health/log 已回填；Portal 202/202、TypeScript、lint、Render DB 3/3 与 production build 均通过；`.65` 保留为回滚点。 | 在独立恢复环境执行一次完整恢复演练。 |

状态原则：只有真实证据支持的项目才标为“已验证”。真实资金、厂家结算和游戏启动未验收时继续保持关闭。

详细逐品牌及支付结果见 `GAMES_ACCEPTANCE.csv`、`PAYMENTS_ACCEPTANCE.csv` 与 `PAYMENT_SOURCE_TRACE.md`。
