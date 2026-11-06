# MASTER7 GSPAY 证据修正

日期：2026-11-06 MYT

## 已确认事实

- 先前引用的 GSPAY 工单不属于 MASTER7，不能作为 `MASTER7VIPMYR+` 的契约或验收证据。
- `MASTER7VIPMYR+` 的 credential 资料仍登记为已收到；秘密值不写入本文件。
- 通用建单响应解析器只保留作离线安全测试，测试值已改为完全虚构。
- MASTER7 商户的建单成功/失败响应、查单外层、回调 ACK 和重试规则仍待厂家确认。

## 程序处理

- Gateway `1.10.1` 固定返回 `createProgramReady=false`、`orderReady=false`。
- `POST /platform/gspay/order` 在任何厂家请求前返回 HTTP 503。
- 查询、回调结算、钱包入账和对账继续关闭。
- 本次修正没有建立订单、没有处理真实资金，也没有增加会员钱包余额。

## 厂家需要回复

请为 `MASTER7VIPMYR+` 新开工单，提供本商户的建单成功/失败完整响应、查单完整响应、Payment/DuitNow 回调字段与签名、成功 ACK 内容和重试规则。
