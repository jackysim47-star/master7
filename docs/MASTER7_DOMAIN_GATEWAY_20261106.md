# MASTER7 Public Domain Gateway

更新时间：2026-11-06 16:08 MYT  
验收时区：Asia/Kuching（MYT，UTC+8）

## 已完成

- Vercel 项目 `master7s-agent` 已从无关的 AI 模板改为 MASTER7 公网路由网关。
- Production deployment：`dpl_GipvCwucuuPWtsMHYGi6j1APDcis`，状态 `READY`。
- 网关只把请求代理到当前 Render portal：`https://master7-v17-staging.onrender.com`。
- `https://master7s-agent.vercel.app/health` 返回 200，并显示 release `17.0.0-selfbuilt.61-full-platform-follow-up`、database `ready`。
- `/signin` 与 `/admin` 返回 200；根路径返回 303 到 `/signin`。
- Vercel 当时把 `master7.best`、`www.master7.best`、两个现已退役并移除的平台旧域名，以及两个 `vercel.app` 别名分配到该 production deployment。

## 仍需域名托管方完成

`www.master7.best` 的权威 DNS 位于 Spaceship：

- `launch1.spaceship.net`
- `launch2.spaceship.net`

当前 `www.master7.best` 没有 A、AAAA 或 CNAME，浏览器无法解析。请在 Spaceship Advanced DNS 添加以下唯一记录：

| Type | Host | Value | TTL |
|---|---|---|---|
| CNAME | `www` | `509875808ef8d9bd.vercel-dns-017.com` | Auto |

不要再指向旧 AI 部署。添加后须复核公网 DNS、HTTPS、`/signin`、`/admin`、`/health`，以及马来西亚手机网络。

## 旧 `.vip` 状态

两个旧域名当时由 Cloudflare 权威 DNS 代理，但公网请求返回 502；它们现已从平台链接清除。目标客户入口以 `master7.best` 为准。
