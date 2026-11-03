# MASTER7 P0 — Render 原数据保全申请单

整理日期：2026-11-03（MYT）。用途：由实际拥有 `ahbi` 工作区的账户所有者，从 Render 控制台登录后通过 **? → Contact Support** 提交。此文件只是申请草稿；没有替用户发出工单。

## 资源定位

- Workspace：`ahbi`，ID `tea-dakfo2h594qs73du231g`
- PostgreSQL：`master7-platform-sync-db`，ID `dpg-dan1f2uk1f9s73f369h0-a`
- 相关服务：`master7-platform-sync`，ID `srv-dan1fkuk1f9s73f38ft0`
- 运行 JSON 线索：`/tmp/master7-platform-sync.json`。这与旧 PostgreSQL 是两条独立数据保全线，尚未证明内容相同或互为备份。

2026-11-03 的交接记录称：在已授权 `ahbi` 工作区按 PostgreSQL ID 查询返回 404，列表中未见旧库。该观察不能证明数据库已永久删除，也不能确认数据仍可恢复。此前记录的 suspended/billing 状态和到期估算均属历史证据；请 Render 按此资源的实际记录答复。

**新增官方邮件证据：**原工作区邮箱收到 Render 官方发件人 `no-reply@render.com` 于 `2026-10-19 06:23:22 UTC` 发出的邮件，主题为 `[ACTION REQUIRED] Your free Render database has expired: master7-platform-sync-db`。邮件写明数据库因免费试用期结束而暂停，暂停后有 14 天时间升级以恢复数据库并保留数据；若未在 14 天内升级，数据库及数据将删除。按邮件发送时间加 14 天推算，窗口结束约为 `2026-11-02 06:23:22 UTC`（MYT `2026-11-02 14:23:22`）。这是按邮件时间推算的时间点，不是 Render 对实际删除时间的单独确认；当前 ID 404 仍不能证明底层数据已删除。

## 可直接提交给 Render Support 的英文正文

**Title:** Urgent read-only preservation and retention confirmation for existing MASTER7 data

**Message:**

> I am the account owner or authorized owner of the `ahbi` workspace (`tea-dakfo2h594qs73du231g`). Please verify the current status and ownership of the following resources:
>
> - PostgreSQL `master7-platform-sync-db` (`dpg-dan1f2uk1f9s73f369h0-a`)
> - Web service `master7-platform-sync` (`srv-dan1fkuk1f9s73f38ft0`)
>
> A read-only lookup by the database ID returned 404 in our current workspace view. Please confirm whether this resource still exists, was moved or removed, the actual data-retention/deletion deadline, whether any snapshot or backup exists, and the supported non-destructive export or recovery options. Please state any cost or billing action separately before it is taken.
>
> Render's official notice received on 2026-10-19 says the database was suspended after its free period and could be restored by upgrading within 14 days; it also says the database and data would be deleted if not upgraded within that period. Our calculated 14-day point is 2026-11-02 06:23 UTC. Please confirm whether deletion actually occurred, whether any recovery grace period or backup remains, and whether a non-destructive recovery is still possible.
>
> The service has historically logged a temporary data path `/tmp/master7-platform-sync.json`. Please advise whether any current or prior instance file can be preserved or exported without restarting, redeploying, replacing, upgrading, or changing the running service.
>
> This is a read-only preservation and ownership-verification request. Do not recreate, delete, modify, restart, redeploy, upgrade, enable paid resources, or charge any resource without the account owner's separate explicit approval. Please provide the support case number and written findings.

## 提交后应保存的回执

- 工单编号、提交时间和 Render 对资源归属的确认。
- 旧 PostgreSQL 的实际状态、数据保留期限、是否存在快照/备份及无损导出/恢复选项。
- 相关费用或计费操作的书面报价；没有另行批准前不执行。
- `/tmp` 文件是否仍可由官方支持的路径保全；若不可恢复，明确说明适用的实例与时间范围。

工单创建不等于数据已保全。取得答复前，不把新暂存库当作旧库，不重启或重新部署相关服务，不运行迁移，也不覆盖任何数据源。请只分享脱敏回执，不要发送数据库 URL、密码、访问令牌、会员明细或文件原始内容。
