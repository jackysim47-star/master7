# MASTER7 Operations

营运时区：`Asia/Kuching`（MYT，UTC+8）  
金额币种：MYR；财务金额使用整数 sen 或固定两位小数。

## 每日操作

1. 打开后台 Dashboard，确认 Database、SMS、Payment checks 和 Game checks 状态。
2. 先处理待审核银行转账、提款、客服单与安全告警；资金操作必须关联会员、订单、金额和后台流水。
3. 每日 MYT 00:00 后核对前一日充值、提款、福利、佣金与净现金流；月、半年和年度报表从同一账本汇总。
4. 渠道或厂家出现超时、状态冲突或金额不符时，保持订单待复核，不手工重复入账。
5. 新广告、福利或银行户口先保存草稿，再由 Owner 检查前台显示、有效期和规则。

## 健康与告警

- Portal health：`https://master7-v17-staging.onrender.com/health`
- Gateway health：`https://master7-integration-gateway.onrender.com/health`
- 资金通知在后台有新充值或提款记录时播放提示音；浏览器必须先由员工点击页面以允许音频。
- 监控 HTTP 5xx、应用 error/fatal、数据库状态、登录失败突增、待处理订单积压和供应商超时。
- 状态灯只代表对应检查结果；`LIVE` 或绿色灯不能单独证明资金或游戏已生产验收。

## 支付运行规则

- 每家公司独立检查 Connected、Order、Query、Callback、Wallet 和 Reconcile。
- 任一阶段未验收时，渠道保持 Suspended/Closed，不能用浏览器返回页增加钱包余额。
- 回调、独立查单和账本必须绑定同一商户、会员、订单、金额、币种与厂家流水。
- 重复、乱序、并发通知只能产生一笔会员账和一笔相反的 provider-clearing 分录。
- Deposit、客户提款/Payout 与商户 Settlement 分开验收和对账。
- 三家当前精确厂家问题见 `PAYMENT_VENDOR_MESSAGES_ZH.md`。

## 游戏运行规则

- 目录、图片、按钮状态、真实启动与钱包分别检查。
- 转账钱包记录进入前余额、转入引用、厂家余额、退出引用和回主钱包结果。
- 无缝钱包按下注、派彩、取消事件逐笔验真与幂等处理。
- 维护、断线、重复退出和未结局保留可复核状态；未完成时不把游戏标为可玩。

## 备份与恢复

- 升级前保存应用提交、部署包 SHA-256、数据库快照或加密备份及当前开关。
- 先在隔离环境恢复，核对表数、记录数、外键、会员、余额、未结订单和账本。
- 回滚必须同时考虑应用版本、数据库兼容性和正在投递的回调；不得只回滚页面。
- 密码、OTP、API key、银行资料和私钥只能存放在受控秘密管理或加密备份中。

## 发布顺序

1. 本地测试、lint 与 production build。
2. 提交并推送准确分支；记录 commit、bundle SHA-256 和 Render deploy ID。
3. Render 显示 live 后检查 health、数据库、入口、Owner 只读登录、支付/游戏关闭状态和日志。
4. 厂家端到端验收逐家进行；完成一家公司只打开该公司的已签收能力。
5. 更新 `CURRENT_DEPLOYMENT.md`、验收 CSV 与恢复回执，再由 Owner 做最终签收。

## 当前外部待办

- 正式前台 `www.master7.best` 的 DNS/HTTPS 与手机、电脑实测。
- Owner 本人原账号、恢复流程和真实 OTP 收码。
- 旧生产会员、余额、未结订单和游戏分数的源目标对账。
- VPay、GSPAY、1MPay 的商户专属生产协议与端到端验收。
- 各游戏厂家的真实启动、钱包、退出和结算验收。
- Android/iPhone 真机安装与正式素材授权签收。
