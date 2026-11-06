# MASTER7 加密备份与恢复验收单

验收时间：2026-11-06T06:21:29.062Z  
上线版本：`17.0.0-selfbuilt.58-payment-startup-guard`  
备份格式：`MASTER7-ENCRYPTED-BACKUP-1`

## 验收结果

| 检查 | 结果 |
|---|---:|
| 真实上线数据库加密备份 | ✅ 完成 |
| 备份表数 | ✅ 30 张 |
| 备份记录数 | ✅ 244 条 |
| 逐表 SHA-256 清单检查 | ✅ 通过 |
| AES-256-GCM 内容认证 | ✅ 通过 |
| RSA-OAEP-SHA256 密钥解包 | ✅ 通过 |
| gzip 解压和明文哈希 | ✅ 通过 |
| 干净隔离数据库建库 | ✅ 通过 |
| 逐表恢复及记录数比对 | ✅ 通过 |
| 外键错误 | ✅ 0 |
| 密码会话恢复 | ✅ 0；所有人员恢复后须重新登录 |
| OTP challenge 恢复 | ✅ 0 |
| Rate-limit bucket 恢复 | ✅ 0 |
| 后台 Encrypted backup 状态 | ✅ Ready |
| 后台 Recovery rehearsal 状态 | ✅ Ready |

## 校验资料

- 加密备份文件：`MASTER7_ENCRYPTED_BACKUP_20261106T062129Z_PAYMENT_STARTUP_GUARD.json`（私人保管，不公开下载）
- 加密备份大小：`40128` bytes
- 加密备份 SHA-256：`c43e5dd949c5390ecf3f06bff066c5fca0d47f2b73b9fa644bf599df9c83705e`
- 恢复验收单 JSON SHA-256：`312d564debbae4df3a62168a0d3e83692b1d0e69c759279a072760635f9a578b`
- 恢复明文 SHA-256：`9e1a4a5598a95e0ca4cfb40ae7fc494bcf6beefbb4466b72e0f1e48464e44686`
- 恢复公钥 SHA-256：`922c18278bcd0521b73eb40166e3a111765157e4f0179fa18b07bb53cb151359`
- 恢复目标：isolated in-memory SQLite schema

## 密钥保护

恢复私钥与密码保存在源码、Git、Render 部署包以外；部署端只有公钥。源码交付压缩包已排除恢复私钥、私钥密码、Owner 密码、Android 签名密钥和本机构建缓存。

Render PostgreSQL 自动快照的保留期由数据库方案决定。本加密文件是独立的应用逻辑备份；两种保护层都应保留。
