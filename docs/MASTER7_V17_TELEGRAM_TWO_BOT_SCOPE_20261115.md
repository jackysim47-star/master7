# MASTER7 V17 · Telegram 两 Bot 安全范围

## Bot A · Owner Operations Bot

现有模块：`TELEGRAM_BOT_TOKEN` + `TELEGRAM_ADMIN_CHAT_ID`，仅 outbound admin alerts。

允许：服务/数据库/域名异常、部署结果、厂家状态变化、备份与告警测试通知。  
禁止：创建充值、批准提款、调整钱包、切换支付或游戏开关、显示 Token/Key/完整顾客资料。

当前状态：代码模块存在；安全 Token、Chat ID 与实际通知均未验收。任何发到聊天的 Token 必须作废。

## Bot B · Customer Support Bot

当前状态：`NOT IMPLEMENTED`。由持牌集成商实现独立 Bot、独立 Token 和独立 Webhook Secret。

允许：帮助菜单、客服工单创建、工单编号和一般平台公告。  
禁止：接收付款凭证、查询或修改余额、创建支付订单、提款审批、游戏启动、KYC 文件收集、将聊天内容直接写入财务账本。

## 安全与验收

- 两 Bot 不共用 Token、Webhook Secret、Chat ID allowlist 或权限。
- Telegram Webhook 必须验证官方 Secret header、限制内容类型/大小、去重 update ID、拒绝群组中的管理指令，并记录无敏感信息的审计事件。
- Token 只进入 Render Secret；日志、Git、文档、截图和聊天不得出现值。
- 验收包括：未授权用户拒绝、重复 update 幂等、超时、Telegram 5xx、错误 Secret、隐私字段过滤和停用/轮换演练。
- Bot 不属于支付 3/3 或游戏 43/43 的通过依据。
