# MASTER7 Build and QA

最后更新：2026-11-06 17:07 MYT
Portal 线上版：`17.0.0-selfbuilt.62-operations-performance`
Gateway：`1.10.1`

## 本轮代码整改

- 人工银行户口创建/修改、客户银行单提交、批准与拒绝统一使用事务写入审计。
- 客户银行户口接口只允许已批准会员读取；匿名、未批准会员及后台角色均被拒绝。
- 人工充值批准加入单次 claim；并发或重复审核返回 409，只有成功取得 claim 的请求可以增加钱包。
- 审计只保存配置 ID 或订单 ID，不保存银行账号、户名或银行单内容。
- 后台首屏改为轻量加载；隐藏面板首次点击才请求，缓存、强制刷新和并发去重分开处理。
- 增加轻量 `/api/admin/financial-events` 游标接口；15 秒轮询不再重复读取三份最多 500 行的完整资金列表。
- 增加可关闭的资金提示音、浏览器音频解锁、青色慢速状态灯、选中菜单灯及 Audit log 独立滚动。
- 600,000 联系人导入改为 1 MiB 分块读取和每 1,000 条上传；后端以导入锁、最多 10 个多行 UPSERT、持久计数及硬上限处理；CSV 导出改为带复合索引的每页 2,000 条 keyset 流式输出并防公式注入。
- 游戏大厅保持按选中分类显示、每次 12 项加载；供应商与单游戏管理保持折叠，未接通的真实启动继续关闭。

## 自动验证

| 范围 | 命令 | 当前记录 |
|---|---|---:|
| 本轮相关 Node 测试 | `node --test tests/admin-loading.test.mjs tests/lobby-render.test.mjs tests/api.test.mjs tests/manual-bank-review.test.mjs tests/marketing-stream.test.mjs` | 通过；银行权限 39/39，营销/API/迁移 43/43 |
| Portal 全套测试 | `node --test tests/*.test.mjs` | 173/173 通过 |
| Portal lint | `pnpm lint` | 通过，0 error / 0 warning |
| Render SQL adapter | `pnpm test:render-db` | 3/3 通过 |
| Render production build | `pnpm build:render` | 成功；仅框架非阻断提示 |
| 文档/补丁格式 | `git diff --check` | 通过 |
| Render 线上健康与日志 | health、入口、5xx、error/fatal | `.62` / database ready / 0 / 0 |

所有发布门槛均已通过。Commit、压缩包 SHA-256、Render deploy ID、上线时间与日志结果见 `CURRENT_DEPLOYMENT.md`。

## 测试覆盖重点

- 银行充值：重复提交、批准、拒绝、并发批准/拒绝、审计脱敏和钱包单次入账。
- 后台：首屏请求数、面板首次加载、缓存、强制刷新、用户切换和轻量事件游标。
- 营销：UTF-8 跨块、残行、1,000 条分批、跨页无重漏、退订排除、CSV 转义和 Referral link。
- 600,000 条生产数据库吞吐尚未实测；自动测试证明的是分块内存边界、批次上限、并发锁、数据库硬上限和流式导出结构。
- 大厅：分类切换、每次 12 项、Active/Maintenance/Close、800×600（4:3）图片要求和状态显示。

## 安全状态

- Portal：`transactionsEnabled=false`、`realPayments=false`、`settlementVerified=false`、`liveGames=false`、`productionReady=false`。
- GSPAY：等待厂家本商户资料；建单、订单、回调、查询和结算继续关闭。
- VPay、1MPay：程序与离线用例存在；生产建单和钱包结算保持关闭，直至各自验收完成。
- 营销模块只建立获同意名单、内容草稿、Referral link 和导出；真实 WhatsApp/SMS 发送需要正式 provider、模板、同意记录与退订处理。
- 自动测试不发送真实资金、不启动真实游戏，也不向真实客户发信息。

## 签收边界

本轮可以由源码完成的后台稳定性、审计、性能和大名单处理先完成。DNS、真机、旧生产数据、支付厂家、游戏厂家和真实消息 provider 仍需要外部证据，未取得前保持待验收或关闭。
