# MASTER7 前台路线与 Render 整理记录

核对时间：2026-11-06 22:00 MYT  
目标版本：`17.0.0-selfbuilt.70-frontend-route-compat`

## 正式入口

| 用途 | 正式地址 | 当前事实 |
|---|---|---|
| 会员前台 | `https://www.master7.best/` | 代码已设为主入口；当前 DNS 尚未解析，域名方仍须补齐记录与 TLS |
| 会员前台备用 | `https://master7.best/` | 当前以 302 转入 Render，可作为临时备用入口 |
| 公司后台 | `https://www.master7.site/` | 当前可经 302 转入 Render `/admin` |
| Render 直达 | `https://master7-v17-staging.onrender.com/` | 当前 Portal 服务的可用直达入口 |

正式后台路线仍是 `/admin`。本次清理的是旧域名文字和失效链接，不删除后台功能、VIP 福利功能或数据库资料。

## 前台 404 原因与修复

Render 请求日志显示发生 404 的实际请求是 `/%60` 和 `/admin/%60`。`%60` 是反引号字符，来自复制地址时多带的结尾符号；正常 `/`、`/signin`、`/register` 和 `/admin` 均可返回有效页面。

本版增加服务器端 308 纠正：

- `/%60` → `/`
- `/admin/%60` → `/admin`
- `/games`、`/player/games`、`/home`、`/lobby`、`/player`、`/index.html` → `/`
- 保留 query string；未知路径继续返回 404
- 新增标准 `favicon.ico`，避免浏览器兼容请求产生无意义 404

## 旧链接清理

- 当前源码、测试、示例和交付文档中的旧 `.admin` 与 `.vip` 域名文字已移除。
- 当前发布仓库的可编辑文件也已完成相同清理。
- 用户上传的历史附件保留原始证据，不属于运行代码、发布包或网站链接，不会被部署。
- 发布前会重新生成压缩包，并对解包内容再次搜索旧域名。

## Render 当前资源归属

| 资源 | Render ID | 作用 | 处理 |
|---|---|---|---|
| `master7-v17-staging` | `srv-dbl0iv7f3r2c73848ei0` | 当前前台、后台与 Portal API | 保留并发布 `.70` |
| `master7-integration-gateway` | `srv-db6b7inlk1mc73ck6cmg` | 游戏/厂家集成网关 | 保留 |
| `master7-cloud-staging-db` | `dpg-dbkl1g3bc2fs739li01g-a` | 当前 Portal PostgreSQL | 保留 |

Render 工作区还存在旧 V15、静态站、演示、support、bot、platform-sync 等历史服务。它们已列为退役候选，但本次不在未知依赖下直接删除云资源。当前正式链路只以表中三项为权威资源；确认账单、DNS 和外部回调没有依赖后，才可在 Render 控制台逐项删除退役候选。

## 验收标准

1. `.70` 全套测试、TypeScript、lint、Render DB 测试及生产构建通过。
2. 新发布包解包后不含旧 `.admin` 或 `.vip` 域名。
3. Render 上线后 `/health` 返回 `.70` 和 `database=ready`。
4. 正常入口、误带反引号入口、旧游戏入口与 favicon 均不再产生前台 404。
5. VPay、1MPay 与 MegaH5 的既有启用状态保持；GSPAY 继续按现有关闭状态，不因本次路线修复改变资金开关。

`www.master7.best` 的 DNS/TLS 是域名配置事项。程序发布成功不等于该域名已经解析；在 DNS 完成前应使用 `master7.best` 或 Render 直达入口验收。
