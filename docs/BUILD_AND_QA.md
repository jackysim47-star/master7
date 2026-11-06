# MASTER7 Build and QA

最后更新：2026-11-06 15:28 MYT  
Portal：`17.0.0-selfbuilt.60-full-platform-follow-up`  
Gateway：`1.10.1`

## 本轮修正

- 移除不属于 MASTER7 的 GSPAY 工单及真实样本标识。
- GSPAY 建单能力固定为未确认；网关在任何厂家请求前返回 HTTP 503。
- GSPAY 离线测试改用完全虚构的 payment ID 与 checkout key。
- 补齐三家厂家短信息、证据修正、完整交接、素材清单和营运手册。
- ESLint 排除 `.next` 与 `.output` 编译产物，避免把生成代码当作源码问题。
- 删除未使用的后端图片辅助函数和测试变量；保留有验收覆盖的独立游戏控制流程。

## 自动验证

| 范围 | 命令 | 结果 |
|---|---|---:|
| Integration gateway | `npm test` | 84/84 passed |
| Portal 全套测试 | `node --test tests/*.test.mjs` | 165/165 passed |
| Render SQL adapter | 包含在全套测试内 | 3/3 passed |
| Portal lint | `pnpm lint` | 0 errors；0 warnings |
| Render production build | `pnpm build:render` | passed |
| 文档/补丁格式 | `git diff --check` | passed |
| 错误 GSPAY 证据扫描 | 精确工单号、订单号、checkout key 与签名扫描 | 0 matches in active source/docs |

构建工具只报告 Vinext/Nitro 的动态导入与可选依赖追踪提示；产物成功生成。真实资金、真实游戏启动和真实出款没有用于自动测试。

## 安全状态

- Portal：`transactionsEnabled=false`、`realPayments=false`、`settlementVerified=false`、`liveGames=false`、`productionReady=false`。
- GSPAY：`createProgramReady=false`、`orderReady=false`、查询/回调/结算关闭。
- VPay、1MPay：程序与离线用例存在；生产建单和钱包结算保持关闭。
- 所有测试使用虚构资料或只读运行状态，没有写入厂家资金记录。

## 签收边界

代码、构建、测试、默认关闭保护和交付材料已由自动化验证。DNS、本人账号、真机安装、旧生产数据以及每家厂家真实端到端资金/游戏链仍需要对应负责人提供外部证据，未取得前不会标为完成。
