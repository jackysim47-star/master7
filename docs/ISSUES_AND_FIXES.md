# MASTER7 Issues and Fixes · F01–F29

更新时间：2026-11-06 22:15 MYT
当前线上：`17.0.0-selfbuilt.71-frontend-route-compat`

| 编号 | 功能 | 当前状态 | 已取得/已整改证据 | 下一验收动作 |
|---|---|---|---|---|
| F01 | 正式前台 | 路线已修/域名部分 | Render 入口 HTTP 200；`.71` 纠正 `/%60`、旧游戏入口并补 favicon；`master7.best` 可转入。 | 域名方增加并验证 `www.master7.best` DNS/TLS。 |
| F02 | 共享后台 | 已上线 | `.71` 已上线；Owner/Staff 权限、按需面板、通知和审计程序存在。 | Owner/Staff 各做一次只读抽验。 |
| F03 | 账号恢复 | 程序就绪 | 修改密码与 Owner 恢复程序存在；本轮未改变账户密码。 | 本人保存恢复资料后做一次受控演练。 |
| F04 | 注册/OTP | 程序就绪 | 线上 `smsOtpReady=true`。 | 用获授权号码验收收码、过期、重发、限流、注册与登录。 |
| F05 | 角色权限 | 已验证 | 自动测试覆盖 Owner/Staff/Member 与越权拒绝。 | 生产按角色各抽验一条只读流程。 |
| F06 | 旧会员与余额 | 部分 | 加密备份与隔离恢复程序存在。 | 仍需旧生产源与现库差异表及恢复演练。 |
| F07 | 品牌视觉 | 程序就绪/缺正式素材 | Logo、Provider 与广告图片上传程序存在。 | Owner 上传并签收正式素材。 |
| F08 | 中英马三语 | 已实现 | 三语界面和词典测试通过。 | 手机逐页抽验业务文案。 |
| F09 | MYR/MYT | 已验证 | 财务固定 MYR 与 Asia/Kuching。 | 有真实流水后核对跨日、月、半年和年报。 |
| F10 | 游戏分类/免费付费区 | 已上线 | 766 款、9 来源、七分类、每次 12 款、Active/Maintenance/Close 与 Free/Paid 控制存在。 | Owner 完成 Free/Paid、正式图片及逐厂家验收。 |
| F11 | 品牌入口与 Logo | 部分 | 品牌入口与独立图片管理存在。 | 按厂家逐项补正式图和映射。 |
| F12 | 游戏启动/会话 | MegaH5 ready | 线上 MegaH5 configured/enabled/liveGames/settlement/liveReady 均 true。 | 获批准会员真实启动一款并保存记录。 |
| F13 | 退出回钱包 | 程序开启/待真实会员签收 | MegaH5 wallet 与 settlement 健康状态 ready。 | 验收进入、退出、重复、断线、未结局和账本。 |
| F14 | VPay Deposit | Active/待资金签收 | 线上 production、order/query/callback ready；双分录和异常 review 已测试。 | 做一笔获授权真实付款并核对厂家与平台账。 |
| F15 | GSPAY Deposit | 程序完成/Closed | Payment、Get Payment、callback、签名、幂等及对账已实现；线上 credential contract incomplete。 | 厂家给准确 32+ hex auth key；修复 callback 302，再做受控 E2E。 |
| F16 | 1MPay Deposit | Active/待资金签收 | 线上 production、order/query/callback ready；success ACK 为 HTTP 200 `ok`。 | 做一笔获授权真实付款并核对厂家与平台账。 |
| F17 | GSPAY 其他产品 | 部分 | MYR Deposit 与 Payout 程序存在；DuitNow/USDT 继续关闭。 | 每个产品分别做 contract、权限、回调、查单与结算验收。 |
| F18 | 统一钱包 | 游戏 ready/资金待验收 | MegaH5 ready；VPay/1MPay Deposit active；payment settlement 未验证。 | 用受控真钱完成 Deposit→Wallet→Game→Exit→Reconcile。 |
| F19 | Payout | 程序完成/全部关闭 | GSPAY fail-closed adapter 已实现；VPay/1MPay 无 payout contract；三家线上均 disabled。 | 补 GSPAY 凭证、直连 callback、IP 白名单、18 银行映射、余额和真实验收。 |
| F20 | 财务报表/公司银行 | 程序就绪/Owner 资料待确认 | 日/月/半年/年、CSV、公司银行、银行单和并发审核程序存在。 | Owner 录入银行并完成一次上传、到账核对、Approve 与钱包验收。 |
| F21 | Bonus/VIP/Turnover | 程序就绪/0 个 Active | 公开 API 显示 Active 福利 0；计算 preview-only；派发与 Turnover enforcement off。 | Owner 输入并发布真实规则，再验收账本和提款限制。 |
| F22 | 佣金/Referral | 程序就绪/结算待验收 | 推荐归属、三层规则与预览存在；自动钱包入账关闭。 | 用真实推荐关系验收周期、hold、cap 和可领取金额。 |
| F23 | 广告/推广 | 程序就绪/0 个发布 | 公开 API 显示广告 0；名单分块导入、流式导出和 Referral 链接存在。 | Owner 提供图文；接合规 Provider、模板、同意与退订后发送。 |
| F24 | 社交入口 | 未配置 | 社交链接保持关闭。 | 只录入 Owner 确认的官方链接。 |
| F25 | 客服 | 已上线 | 工单、员工接手及内建中英双语回复已上线。 | 用会员工单抽验五类问答和转人工。 |
| F26 | Android/iPhone | 已实现/真机待验 | APK 与 iOS Web App 入口存在。 | Android/iPhone 真机安装、登录和更新测试。 |
| F27 | DNS/TLS/性能/监控 | callback 阻塞 | Render 直达可用；新实例 error/critical/fatal 0、5xx 0；`master7.best` callback 返回 302。 | 把 apex 直绑 Render 或使用保留 POST 的反向代理。 |
| F28 | 发布/备份/恢复 | `.71` 已发布 | Source `524bab0`、publication `99c16ae`、bundle `b40e…d874`、deploy `dep-dbmu1cdbedkc73dgl8s0`；QA 239/239。 | 在独立恢复环境完成一次全量恢复演练。 |
| F29 | 旧域名与 Render 整理 | 代码/发布包已清理 | 当前源码和新发布包不含旧 `.admin`、`.vip` 域名；正式 `/admin` 与 VIP 功能保留。当前权威 Render 资源为 Portal、integration gateway 与 PostgreSQL。 | 历史 Render 服务确认无 DNS、回调或账单依赖后再删除。 |

状态原则：程序存在、配置 ready、真实资金签收与整个平台营业是不同证据。没有真实结算证据的能力继续保持 fail-closed。
