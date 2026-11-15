# MASTER7 V17 · 14 项持牌集成商交接清单

状态基线：2026-11-15 13:27:35 MYT

| # | 项目 | 状态 | 当前证据 | 完成条件 | 负责人 |
|---:|---|---|---|---|---|
| 1 | Git 发布来源 | PASS | commit `753ca2f4282f9270140fdac41a0fdbe128844c64` | 固定版本并保留回滚提交 | Owner + Integrator |
| 2 | Render Production | PASS | deploy `dep-dbs8ou67bikc73eu6bj0` live | 部署与代码 SHA 一致 | Integrator |
| 3 | Production DB | PASS | health reports `database=ready` | 备份与恢复另行验收 | Integrator |
| 4 | 顾客正式域名 | BLOCKED | `www.master7.best` unreachable | DNS/TLS/首页/健康路径直接 200 | DNS Owner + Integrator |
| 5 | Owner 正式域名 | BLOCKED | `www.master7.site` 302 to Staging | Production `/admin`; health paths direct 200 | DNS Owner + Integrator |
| 6 | Owner 登录 | NOT_RUN | 未提供受控验收会话 | 激活、登录、退出、恢复、会话撤销 PASS | Owner + QA |
| 7 | 顾客 OTP | BLOCKED | `smsOtpReady=false` | 授权号码完成成功/过期/重用/限流测试 | Integrator + SMS vendor |
| 8 | 三家 MYR 支付 | BLOCKED | `0/3`; all order switches false | VPay/GSPAY/1MPay 各六项能力 PASS | Integrator + vendors |
| 9 | 43 个游戏 profile | BLOCKED | `0/43`; 6 adapters implemented | 每个 profile catalogue/launch/wallet/recovery/settlement PASS | Integrator + vendors |
| 10 | 钱包与对账 | BLOCKED | 仅离线幂等测试 | 授权 UAT 的单次入账、重复通知、日终对账 PASS | Integrator + Finance |
| 11 | Telegram 两 Bot | BLOCKED | Owner outbound module exists; secrets not accepted | 两 Bot 独立、最小权限、无资金指令、通知实测 PASS | Integrator + Owner |
| 12 | 凭据与白名单 | BLOCKED | 聊天凭据视为泄露 | 全部轮换；Secret 路径、版本和 IP 证据齐全 | Security + vendors |
| 13 | 运维恢复能力 | BLOCKED | 历史备份资料存在 | 新版本备份、隔离恢复、告警送达、回滚演练 PASS | Integrator |
| 14 | 最终签收 | BLOCKED | 无当前双签 | Owner 与独立持牌技术负责人签字 | Owner + Independent reviewer |

任何 `BLOCKED` 或 `NOT_RUN` 未关闭时，结论保持 `PRODUCTION NO-GO`。
