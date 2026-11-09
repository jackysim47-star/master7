# MASTER7 V17 .130 — 公司银行、会员钱包与人工出款

2026-11-09 · Asia/Kuala_Lumpur · 生产真钱验收仍须单独记录。

## 本轮实现

- 公司银行为充值页首个入口。VPay、GSPAY MYR、GSPAY USDT、1MPay 各自保留独立入口与真实能力状态。
- 会员选择公司账户并上传银行单；原有订单的查询、审核与恢复不受新增交易维护开关影响。
- 员工或老板核对公司银行实际到账，填写银行流水号、实际 MYR 金额、银行交易时间并上传银行凭证后，才可批准入账。
- `manual_bank_transactions` 用公司银行账号的规范化摘要及规范化流水号作唯一键，同一银行流水只能对应一笔入金或出款。去空白、连字符及大小写差异后仍会去重。
- 账号财务资料改变时创建新版本，停用旧版本；历史订单继续指向原收款账户。展示图片、排序及启用状态可更新，原账号资料不覆盖。
- 提现先冻结可用金额；老板批准后才可开始人工银行转账。转账动作在银行完成，平台没有自动网银转账。
- 老板记录出款银行、流水号、实际金额、时间及银行凭证后，提现才变成 paid 并解除冻结。重复确认返回原结果；未知结果保持冻结，之后可凭核实的银行凭证结清。
- 提现沿用现有 `withdrawal_requests` / `provider_payouts` 的钱包投影，仅扣一次余额。`wallet_ledger` 的 deposit 外键不改变，不伪造充值记录来表达提现。
- 老板与员工使用同一后台。员工可以核销银行入金、查看脱敏提现；批准、开始出款、查看完整收款账户及确认人工出款仅限老板。
- 前台可见且已审批的会员定时刷新自己的钱包和记录。手机底部导航宽度已修复；银行页面的 English、简体中文、Bahasa Melayu 及 390 / 1280 像素布局已联测。

## 接口

现有 `/api/manual-bank/accounts`、`/api/manual-bank/deposits`、`/api/admin/manual-bank/account`、`/api/admin/manual-bank/review` 保留。

`POST /api/admin/manual-bank/review` 批准时要求：`bankAccountId`、`bankReference`、`bankAmount`、`currency=MYR`、`bankOccurredAt`（Unix 秒）、`proofData`、`bankConfirmed=true`。拒绝不要求银行付款凭证。

新增老板接口：

- `POST /api/admin/manual-bank/settings`：closed / qa / live；QA 只允许已批准的指定会员。
- `POST /api/admin/manual-bank/acceptance`：关联同一 QA 会员已入账的充值及已支付的提现，验证双分录、银行凭证、出款证据与余额一致性。
- `GET /api/admin/manual-bank/proof?id=...`：老板与员工私有读取凭证。
- `GET /api/admin/manual-bank/payout?id=...`：老板查看已批准提现的银行收款资料，访问写审计。
- `POST /api/admin/manual-bank/payout/start`：绑定实际使用的公司银行，开始人工转账，保留冻结。
- `POST /api/admin/manual-bank/payout/unknown`：结果未知，保留冻结与复核状态。
- `POST /api/admin/manual-bank/payout/confirm`：核实出款凭证后原子结清。

`GET /api/admin/manual-bank` 返回银行版本、入金审核及银行核销记录。财务中心增加人工银行凭证汇总，其范围是已人工核实的记录，不代表完整银行对账单。

## 启用与维护

默认银行模式 closed，新增人工银行出款控制为关闭。QA / live 不绕过 `PORTAL_NEW_DEPOSITS_ENABLED`、`PORTAL_NEW_PAYOUTS_ENABLED` 或银行渠道暂停控制。未完成真实银行验收不能切 live。

两阶段发布：

1. 发布 .130 兼容读取、审计、备份与恢复代码，保持新增交易关闭。
2. 确认实际公司账户和正式入口后，其他自动支付订单及出款开关保持 false，仅开启全局入金 / 提现并配置指定 QA 会员。使用实际银行最小允许金额完成一笔充值及一笔提现，记录匹配证据，老板签收后才开放银行。

`/health.manualBankReady` 动态验证已签收的银行订单、双分录、出款凭证及钱包一致性；独立于全部厂家及支付的 `productionReady`。配置或目录存在不视为真钱验收。

## 数据与回滚

迁移 `0115-manual-bank-funds` 保留原订单、提现及账本，扩展 manual_bank 出款类型、银行账户版本关系与银行交易证据表。PostgreSQL 在原有启动事务及 advisory lock 内执行。

加密备份版本更新为 `0115-manual-bank-funds`，包含银行凭证、账号版本、出款来源账户。旧 0113 及更早备份仍可隔离恢复，收据明确标记缺少银行核销证据覆盖。

发生业务异常时先将银行模式设 closed 或关闭全局新增入金 / 提现；保留查询、已收款核销、已出款确认和恢复。已有 .130 银行交易后，回滚基线不得低于 .130；不得删除凭证、已支付提现或再次手工加减钱包。

## 证据范围

本轮自动化、浏览器与 PostgreSQL 演练使用合成数据，未进行实际银行转账。生产签收仍要求实际入金、实际出款及正式入口验证。VPay / GSPAY 的新接入按用户最新要求排在银行及游戏之后；既有订单恢复继续。
