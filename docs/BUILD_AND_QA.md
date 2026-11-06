# MASTER7 Build and QA

最后更新：2026-11-06 18:08 MYT
Portal 线上版：`17.0.0-selfbuilt.63-gspay-contract`

## 本轮代码范围

- GSPAY MYR Deposit：官方 MD5 建单、两分钟付款链接、独立 Get Payment 查单、Payment callback 验签、十分钟无回调拒绝、幂等订单及单次双分录。
- GSPAY 前台 Deposit 与后台 Active / Maintenance / Close 控制恢复；只有 `orderReady=true` 才可提交。GSPAY Payout 未实现，因此提款不显示 GSPAY。
- GSPAY callback alias 在 Origin/CSRF 检查前进入专用验签路径；DuitNow、USDT、Payout callback 保持安全关闭。
- 1MPay 成功回调 ACK 固定为 HTTP 200 + 小写 `ok`；厂家仅有 production，本轮不发送真钱测试。
- 公司银行 Deposit 重试复用幂等键，银行单等比例完整缩放；福利和广告不完整时只能保存草稿，不能发布。

## 自动验证

| 范围 | 命令 | 当前记录 |
|---|---|---:|
| Portal 全套测试 | `node --test tests/*.test.mjs` | 192/192 通过 |
| Portal lint | `pnpm lint` | 通过，0 error / 0 warning |
| Render SQL adapter | `pnpm test:render-db` | 3/3 通过 |
| Render production build | `pnpm build:render` | 通过 |
| 文档/补丁格式 | `git diff --check` | 通过 |
| 线上健康与日志 | health、callback、5xx、error/fatal | `.63` / database ready；后台与登录 200；应用 error/fatal 0；仅 1 次预期 GSPAY 503 探针 |

## 测试重点

- 固定签名向量、严格两位小数、受信 API/收银台 host、响应大小及无重定向。
- 建单幂等、两分钟链接期限、十分钟拒绝、callback 与独立查单全字段绑定。
- 错误签名、金额、会员、交易号或来源均不入账；重复/并发成功只写一次平衡账本。
- 1MPay、VPay、人工银行、提款、福利和广告回归不受 GSPAY 恢复影响。

## 签收边界

自动测试不发送真钱。GSPAY 仍因准确 Operator Key、callback 域名、受控真实 E2E 与商户结算证据未齐而关闭；DuitNow、USDT、Payout 不在本发布能力范围。真实银行、测试会员转账、福利条款、广告素材、支付及游戏营业开关继续等待业务资料和生产验收。
