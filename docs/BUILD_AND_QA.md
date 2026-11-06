# MASTER7 Build and QA

最后更新：2026-11-06 22:00 MYT
Portal 发布候选：`17.0.0-selfbuilt.71-frontend-route-compat`

## 本轮代码范围

- 修复复制链接结尾多带反引号造成的 `/%60` 与 `/admin/%60` 404，并把旧 `/games`、`/player/games` 等前台入口永久重定向到有效首页。
- 会员主入口统一为 `www.master7.best`，公司后台入口统一为 `www.master7.site`；当前代码与新发布包移除旧 `.admin`、`.vip` 域名文字。
- 增加 `favicon.ico` 兼容资源；未知路径继续保持 404，不会把任意错误地址伪装成首页。
- VPay readiness 使用 Gateway 远程生产配置，避免已连接充值被旧本地条件误报未就绪。
- GSPAY Payout 支持官方 MD5 建单、回调签名、独立 status query、完整字段绑定、幂等、钱包预留、成功结算、失败释放及只查不重发的恢复流程。
- Provider POST 前使用数据库原子 claim；并发提交只有一个请求可以联系厂家。网络结果不明确时进入 processing/review，恢复流程只查单。
- 提款银行户名和账号加密保存；callback 不能单独标记成功，必须再向厂家查询并核对订单、账号、金额及签名。
- 前台提款公司由服务器能力动态生成；未满足生产条件的 Provider 不显示为可提交。
- 客服工单加入内建中英双语自动回复，覆盖充值、提款、游戏、福利/Turnover/VIP 与账户问题，并保留员工接手。
- `/health` 按真实 Deposit、Payout、Settlement 和游戏结算条件计算 readiness。

## 自动验证

| 范围 | 命令 | 结果 |
|---|---|---:|
| Portal 全套测试 | `node --test tests/*.test.mjs` | 239/239 通过 |
| GSPAY Payout 专项 | `node --test tests/gspay-payout.test.mjs` | 7/7 通过 |
| Render TypeScript | `pnpm exec tsc --noEmit -p tsconfig.render.json` | 通过 |
| Portal lint | `pnpm run lint` | 通过 |
| Render SQL adapter | `pnpm run test:render-db` | 3/3 通过 |
| Render production build | `pnpm run build:render` | 通过 |
| 发布包重建验证 | 解包、`pnpm install --frozen-lockfile`、DB test、TypeScript、build | 通过 |
| 文档/补丁格式 | `git diff --check` | 通过 |

所有 Provider 测试均使用本地合成响应，没有发送真实充值或出款请求。

## 线上验证

| 检查 | 结果 |
|---|---|
| Render deploy | `.71` 发布后填写；当前回滚版 `dep-dbmt6jmc6qcc73cghapg` 为 `.69` |
| 版本/数据库 | `.71` 发布后复测；当前 `.69` database ready |
| VPay Deposit | Active；production；order/query/callback ready |
| 1MPay Deposit | Active；production；order/query/callback ready |
| GSPAY Deposit | Closed；credential contract incomplete |
| Payout | VPay=false、GSPAY=false、1MPay=false |
| MegaH5 | configured/enabled/liveGames/settlement/liveReady 均 true |
| 游戏目录 | 766 款、9 个来源；匿名 `playable=false` |
| 公开内容 | 广告 0、Active 福利 0、公告 0 |
| 运行日志 | 新实例 app error/critical/fatal 0；request 5xx 0 |

## 签收边界

- `realPayments=true` 表示至少一个 Deposit Provider 可建单；它不等于资金 Settlement 已做真实验收。
- `productionReady=false` 的当前原因只有 Payout Provider 未就绪和 Payment Settlement 未验证。
- GSPAY Payout 程序存在但开关保持关闭；准确凭证、直接 callback、IP 白名单、18 家银行映射、Settlement balance 与受控真实验收必须全部完成。
- VPay 与 1MPay Payout 在取得各自完整 contract 前保持关闭。
- `master7.best` 对 callback 仍返回 302，不能用于需要保留 POST method/body 的生产回调。
- 公司银行、福利、VIP、Turnover、广告和公告必须使用 Owner 的真实业务资料发布。
