# MASTER7 V17 · 访问权限与 Secret 登记表

本文件只登记名称和责任人，不记录任何 Secret 值。

## 所有权原则

- Owner 保留 GitHub、Render、域名/DNS、数据库和所有厂家后台的最终所有权。
- 集成商使用实名独立账号与最小权限；禁止共享 Owner 密码。
- UAT、Production 和个人账号必须分离。
- 聊天中出现过的全部密码、API Key、Bot Token 和恢复码均标记为 `ROTATE_REQUIRED`。

## 访问矩阵

| 系统 | Owner 权限 | 集成商权限 | 退出时处理 |
|---|---|---|---|
| GitHub | Admin | Write/PR；发布分支受保护 | 撤销成员与 token |
| Render | Owner/Admin | 指定 Production 服务 Developer | 撤销账号与 deploy hook |
| DNS/Registrar | Owner | 仅 DNS 编辑；不得转移域名 | 撤销 DNS 权限 |
| Production DB | Owner | 通过 Render 私网应用访问 | 轮换 DB 密码 |
| VPay/GSPAY/1MPay BO | Owner | 厂家批准的技术账号 | 撤销技术账号与 Key |
| Game vendor BO | Owner | 厂家批准的 UAT/技术账号 | 撤销账号与白名单 |
| Telegram/BotFather | Owner | 不授予 BotFather 所有权 | 轮换 Token |

## Secret 名称登记

| 分类 | Secret 名称/前缀 | 当前状态 | 交接要求 |
|---|---|---|---|
| Database | `PORTAL_POSTGRES_URL` | PRESENT / value undisclosed | 保持 Render Secret；不得复制到报告 |
| Owner Bot | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID` | ROTATE_REQUIRED / NOT VERIFIED | Owner 直接在 Render 输入；通知测试后记录版本 |
| Support Bot | `TELEGRAM_SUPPORT_BOT_TOKEN`, `TELEGRAM_SUPPORT_WEBHOOK_SECRET` | NOT IMPLEMENTED | 由集成商实现后直接注入 Secret |
| VPay | `VPAY_*`, `PORTAL_VPAY_*` | ROTATE_REQUIRED | 厂家重发 UAT/Production 分离凭据 |
| GSPAY | `GSPAY_*`, `PORTAL_GSPAY_*` | ROTATE_REQUIRED | 厂家确认完整 32 字符 Key 与回调合约 |
| 1MPay | `ONE_MPAY_*`, `PORTAL_ONE_MPAY_*` | ROTATE_REQUIRED | 厂家确认 merchant/key、回调及查单合约 |
| Games | provider-specific `*_API_KEY`, `*_SECRET`, `*_TOKEN` | ROTATE_REQUIRED / INCOMPLETE | 每个 profile 独立版本与负责人 |
| OTP | `ANCHOR_SMS_*`, `OTP_HASH_SECRET` | NOT VERIFIED | UAT 与 Production 分离并完成 OTP 验收 |

Secret 轮换证据只记录：变量名、版本、更新时间、执行人、撤销旧版本的确认和证据 SHA-256。
