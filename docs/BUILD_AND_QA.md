# MASTER7 Build and QA

最后更新：2026-11-06 18:51 MYT
Portal 线上版：`17.0.0-selfbuilt.65-payment-safety`
回滚版：`17.0.0-selfbuilt.64-game-controls`

## 本轮代码范围

- VPay callback 在返回成功前，核对双分录属于同一订单会员、币种/金额一致且总额平衡；缺失、部分、跨会员或不平衡账本一律转 `review`，不查单、不写账、不 ACK 成功。
- VPay 写账使用数据库订单、Provider、订单状态和厂家流水作为条件；提交后再次核对订单和账本，避免把其他会员或其他订单的记录当成成功。
- 1MPay 的既有订单查单能力不再依赖新订单开关；关闭建单时仍可安全完成历史订单 reconciliation，不会因此开放新充值。
- 修复 AI 客服响应重复 `status` 的 TypeScript 阻断，并补齐现有 GSPAY Render 环境变量声明；没有配置 AI provider 或写入支付密钥。
- 全游戏线上审计覆盖 766 款；修复 Rectangle/GodeeZone 直连目录无法保存单游戏状态与图片的问题，未知厂家仍拒绝。
- MegaH5 是当前唯一具备 Launch 与 transfer-wallet 程序的厂家；gateway transfer/status 开关已开启，Portal 开关随本版部署。
- GSPAY MYR Deposit：官方 MD5 建单、两分钟付款链接、独立 Get Payment 查单、Payment callback 验签、十分钟无回调拒绝、幂等订单及单次双分录。
- GSPAY 前台 Deposit 与后台 Active / Maintenance / Close 控制恢复；只有 `orderReady=true` 才可提交。GSPAY Payout 未实现，因此提款不显示 GSPAY。
- GSPAY callback alias 在 Origin/CSRF 检查前进入专用验签路径；DuitNow、USDT、Payout callback 保持安全关闭。
- 1MPay 成功回调 ACK 固定为 HTTP 200 + 小写 `ok`；厂家仅有 production，本轮不发送真钱测试。
- 公司银行 Deposit 重试复用幂等键，银行单等比例完整缩放；福利和广告不完整时只能保存草稿，不能发布。
- Gateway `7f65d6a` 为 EPICWIN/ClotPlay 增加固定服务 User-Agent，并阻止 EVO/MegaH5 的 HTTP 200 业务拒绝进入成功缓存；不改资金、玩家或下注程序。

## 自动验证

| 范围 | 命令 | 当前记录 |
|---|---|---:|
| Portal 全套测试 | `node --test tests/*.test.mjs` | 199/199 通过 |
| Render TypeScript | `npx tsc -p tsconfig.render.json --noEmit` | 通过 |
| Gateway 全套测试 | `npm test`（gateway） | 85/85 通过 |
| Portal lint | `pnpm lint` | 通过，0 error / 0 warning |
| Render SQL adapter | `pnpm test:render-db` | 3/3 通过 |
| Render production build | `pnpm build:render` | 通过 |
| 文档/补丁格式 | `git diff --check` | 通过 |
| 线上健康与日志 | health、payment status、game readiness、5xx、error/fatal | `.65` / database ready；deploy `dep-dbmr15s9v7es73ahfaf0` live；新实例 error/fatal 0、5xx 0；Gateway deploy `dep-dbmqqqtg1s2s73d9msq0` live；目录 502 均为 EVO/EPICWIN/Venus/ClotPlay 厂家阻塞 |

## 测试重点

- 九个受信游戏来源、目录缓存、过期维护、分类、每次 12 款、单游戏状态/图片与 MegaH5 钱包恢复。
- 固定签名向量、严格两位小数、受信 API/收银台 host、响应大小及无重定向。
- 建单幂等、两分钟链接期限、十分钟拒绝、callback 与独立查单全字段绑定。
- VPay 跨会员/残缺/不平衡账本 fail-closed，以及 1MPay 在新订单关闭时仍能查询既有订单。
- 错误签名、金额、会员、交易号或来源均不入账；重复/并发成功只写一次平衡账本。
- 1MPay、VPay、人工银行、提款、福利和广告回归不受 GSPAY 恢复影响。
- 部署后复测：MegaH5 166 款目录正常；EVO 为 `code 130`；EPICWIN/ClotPlay 为上游 403；Venus 缺 `X-Sign`/`X-Ts`；GodeeZone `/token` 为 Cloudflare 403。

## 签收边界

自动测试不发送真钱。MegaH5 Portal 与 Gateway 开关已按 Owner 指示开启并持久保存；真实 Launch、Wallet、Exit、Disconnect、Settlement 仍需获授权会员做一笔受控验收。GSPAY 仍因准确 Operator Key、callback 域名、受控真实 E2E 与商户结算证据未齐而关闭；DuitNow、USDT、Payout 不在本发布能力范围。

`.65` 不改变任何支付、游戏或资金开关。上线复测确认总资金开关仍为 false、VPay/1MPay/GSPAY 新订单仍关闭；1MPay 只对既有订单报告 `queryReady=true`、`orderReady=false`。游戏仍为 766 款、618 Active、148 Maintenance，`playable=false`。
