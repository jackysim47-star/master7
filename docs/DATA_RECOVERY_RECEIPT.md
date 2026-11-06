# MASTER7 Data Recovery Receipt

更新时间：2026-11-06 14:46:44 MYT

## 已验证恢复演练

- 备份格式：`MASTER7-ENCRYPTED-BACKUP-1`
- 加密：AES-256-GCM；密钥封装 RSA-OAEP-SHA256
- 备份文件：`MASTER7_ENCRYPTED_BACKUP_20261106T062129Z_PAYMENT_STARTUP_GUARD.json`（仅保存在私有交付目录，不进入 Git）
- 备份 SHA-256：`c43e5dd949c5390ecf3f06bff066c5fca0d47f2b73b9fa644bf599df9c83705e`
- 明文 SHA-256：`9e1a4a5598a95e0ca4cfb40ae7fc494bcf6beefbb4466b72e0f1e48464e44686`
- 公钥 SHA-256：`922c18278bcd0521b73eb40166e3a111765157e4f0179fa18b07bb53cb151359`
- 表数量：30
- 记录数量：244
- 隔离恢复目标：isolated in-memory SQLite schema
- 外键错误：0
- 验证时间：`2026-11-06T06:21:29.062Z`

恢复演练证明当前门户备份可以被解密并恢复到隔离结构。它不等于旧生产平台的数据已全部迁移；旧会员、余额、未结订单和游戏分数仍需原始数据源对账后才能签收。

## 数据保全边界

- 未向生产数据库写入恢复数据。
- 未覆盖现有会员、余额、支付订单或游戏记录。
- 恢复后强制建立新会话，认证会话不随备份恢复。
- 私钥和后台登录资料不写入仓库或本文件。
