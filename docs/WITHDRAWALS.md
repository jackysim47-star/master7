# MASTER7 提款记录与当前边界

更新时间：2026-11-06 17:43 MYT
适用候选版：`17.0.0-selfbuilt.63-gspay-contract`

当前会员提款表单只列出 VPay 与 1MPay。GSPAY Payout 文档虽已收到，但程序、权限、白名单、出款查单、callback、钱包扣账和结算均未完成，因此不显示为可用提款公司。

## 已实现

- 只有已批准 Member 可以提交 MYR 提款资料。
- 支持 18 家马来西亚银行；账号对会员只显示尾四位，完整资料以 AES-256-GCM 加密。
- 提交前检查游戏钱包已结清、没有另一笔处理中提款，以及可用余额足够。
- Owner 可读取后台记录；Staff 无权读取完整提款银行资料；后台状态仍由厂家可验证流程驱动，不能手工标成已付款。

| 用途 | 路径 | 当前行为 |
|---|---|---|
| 银行与 provider 列表 | `GET /api/withdrawal-banks` | 当前只返回 VPay、1MPay |
| 会员记录 | `GET /api/withdrawals` | 本人最近 100 条及钱包状态 |
| 会员提交 | `POST /api/withdrawals` | 记录尚未生产验收的 provider 请求 |
| 后台记录 | `GET /api/admin/withdrawals` | Owner 只读，最多 500 条 |
| 后台手工改状态 | `POST /api/admin/withdrawals/status` | HTTP 405，只读 |

## GSPAY Payout

官方 Payout 端点、字段、签名和 callback 文件仅作为后续输入。本候选不会调用 `/payout`，也不会接收 Payout callback 改变会员钱包。未来必须另行完成幂等出款、账号验证边界、白名单、独立查单、callback 验签、失败/超时释放、钱包扣账、商户余额和日终对账。

收到 1MPay payout 公钥或 GSPAY Payout 文档都不会自动开启出款。
