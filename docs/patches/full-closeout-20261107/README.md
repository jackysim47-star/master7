# MASTER7 完整候选隔离 CI 交接

目标分支：codex/master7-full-repair-20261107。

候选版本：17.0.0-selfbuilt.95-repair-candidate。它是待审查构建，不是已部署状态。

本目录的 CI 和发布提案尚未写入远端、触发 Actions 或部署。普通提交与手动 dispatch 只运行 contents:read 的验收 job。主线程已经核对 17 个 Render 服务，确认没有服务跟踪该候选分支，因此已把候选专用发布 job 加入 workflow：只有完整提交信息恰好为 [publish-repair-candidate] 的固定分支 push，且验收成功后，才获得 contents:write 并写回候选 tar 与回执。publish-job.proposal.yaml 保留相同 job 作为审查记录，本身不被 GitHub 当作 workflow。

## 本地已验证范围

LOCAL_VALIDATION.json 记录实际完成的检查：两个 Python 脚本语法、workflow/提案 YAML 和权限条件、全部固定 Action SHA、网络 guard 的 10 条拒绝路径、889 项锁文件完整性结构，以及用真实原始 archive 和当前候选临时 diff 跑通 prepare 阶段（476 个源文件）。主线程最终统一 patch 尚未用于这项 prepare 检查，CI 会重新核验。

发布器另外完成 6 项合成验证：默认不写入、错误源提交拒绝、错误分支拒绝、错误 tar SHA 拒绝、远端 HEAD 前进时在复制前停止，以及仅暂存 tar/回执并构造固定分支普通 push。远端 fetch/push 在这些合成验证中被显式替身拦截，实际远端调用为 0；测试回执不作为真实构建证据输出。

完整依赖安装、真实 Render build 和 GitHub runner 的 namespace 执行尚未在本地完成。不能把以上检查写成全量 CI 已通过。

## 接入文件

将本目录中的 .github/workflows/master7-full-repair.yml 和 ci/full-repair/ 原样复制到指定独立分支。不要修改生产分支。

主线程统一补丁必须放在：

    docs/patches/full-closeout-20261107/master7-full-closeout.patch

三个部署配置必须已经保留原有路由并设置 git.deploymentEnabled 为布尔 false：

- vercel.json
- domain-gateway/front/vercel.json
- domain-gateway/admin/vercel.json

CI 只检查这三个设置，不自动重写配置或启停任何服务。缺少任一配置或使用字符串 "false" 都会失败。

## 默认流程

1. 精确 checkout 本次候选提交，关闭凭据持久化。
2. 单独 checkout 原发布提交 e3faa8ddc6b6fe87768e9e71f466ce48538bfad7，只取原 tar。即使之后候选分支的同名 tar 已更新，下一次 CI 仍使用这个固定基线。
3. 验证原归档 SHA-256 为 6d1a96b5a5cfa6e88a87908485c6af32e5d4cfc6a57da49420b1be48b76598d2。安全解压只接受固定顶层目录、常规文件/目录，拒绝路径跳转、重复路径、链接、特殊文件、运行环境文件和超限内容。
4. 对统一补丁先执行 git apply --check，再在全新临时副本应用。检查后端候选版本，记录补丁、锁文件和每个源文件的 SHA-256。依赖清单与锁文件必须仍等于原始归档；变更依赖需单独审查。
5. 安装 Node 24.22.1 与 pnpm 11.25.0。pnpm 从官方 npm registry 的精确版本取得，核对官方 SHA-512、实际安装版本和无额外传递依赖。完整应用依赖使用 pnpm install --frozen-lockfile --prod=false，先不执行安装脚本。
6. 新建无外网的 Linux network namespace，然后立即降回普通 runner UID/GID。依赖构建、测试和应用构建都在这里运行；不会以 root 执行源码。
7. 使用原有 allowBuilds 白名单离线执行 pnpm rebuild --pending；任何网络尝试都令 CI 失败。
8. 运行全部 tests/*.test.mjs，不能筛掉 hosted-identity-boundary.test.mjs。沿用并加强既有网络 guard，拒绝 global fetch、HTTP/HTTPS、HTTP2、TCP/TLS、UDP 和 DNS lookup；NODE_OPTIONS 将 guard 传给 Node 子进程，网络 namespace 同时限制非 Node 子进程。
9. 要求所有测试通过，fail/cancelled/skipped/todo 均为 0，再执行真实 pnpm run build:render。要求产生 .output/server/index.mjs；不以语法检查或模拟构建代替。
10. 检查安装、测试和构建未改动审查过的源文件。只将补丁完成后登记的源文件打包，排除 node_modules、缓存、临时数据库和构建产物。生成候选 tar、JSON 回执及 SHA256SUMS，再上传成功 artifact。

任一检查失败就不生成成功候选。失败日志可以单独保存；不能据此标记构建通过。namespace 不可用时失败，不取消隔离后重跑。

## 依赖与身份边界测试

本次静态核对原锁文件：

| 项目 | 已确认值 |
| --- | --- |
| pnpm lockfile 格式 | 9.0 |
| 包条目 | 889 |
| resolution | 每个条目均为 SHA-512 integrity；未发现 git/tarball/file/link/workspace 来源 |
| pnpm | 11.25.0 |
| Wrangler | 4.92.0，保留 devDependency |
| Wrangler 内使用的 esbuild | 0.27.3，由锁文件锁定 |
| 依赖构建白名单 | esbuild、fsevents、sharp、unrs-resolver、workerd |
| 现有策略 | strictDepBuilds=true、trustLockfile=false、minimumReleaseAge=10080 |

这些策略保留原样，不使用 force、no-frozen-lockfile、ignore-manifest-check、update-checksums 或跳过身份测试来换取绿灯。

此前 406 项基线测试的唯一失败来自未安装 wrangler/package.json。该身份测试随后需要 Wrangler 依赖的 esbuild 来真正打包路由并验证调用方伪造身份头不会产生管理员身份。CI 安装开发依赖后必须执行它；不能拿另一个全局 esbuild 替代，也不能把该项标为 skipped。

这里尚未完成官方 registry 的完整下载和实际 CI 构建，因此不能声明依赖已安装或完整构建已通过。若 registry 不再提供某个精确版本、SHA 不符、最小发布时间策略拒绝元数据、原生依赖离线构建失败，CI 会记录具体包和错误后停止。没有自动降级或改锁路径。

## 凭据与业务边界

应用及测试子进程使用显式环境白名单，只包含运行时路径、临时目录、测试/构建模式、关闭遥测及 npm 的空用户配置。不会继承 GitHub token、DATABASE_URL、Supabase、Render、Vercel、游戏或支付密钥。没有数据库 service、真实连接串、部署 action、云端登录、钱包操作或厂商订单请求。

源码本身含有调用支付与数据库的正常程序，这不等于 CI 可以执行生产操作。测试使用既有 SQLite 和合成 adapter；真实网络被禁止。真实 PostgreSQL 恢复演练仍需另设隔离数据库验收，本 CI 不拿 SQLite 或 mock 成功替代它。

## 产物

成功 artifact 名称为 master7-full-repair- 加本次源提交的完整 SHA，包含：

- master7-v17-render-staging.tar.gz：可由现有 Render 构建方式读取的完整候选源码归档。
- MASTER7_FULL_REPAIR_CANDIDATE_20261107.json：候选 .95 版本、原发布提交、原 archive SHA、原发布清单声明的 source commit、补丁 SHA、锁文件 SHA、工具版本、实际测试计数、构建结果、构建入口 SHA，以及候选 tar SHA。
- SHA256SUMS 和安装、依赖构建、全量测试、Render 构建日志。

回执中 baseDeclaredSourceCommit 是旧清单声明的 a0b3b2ede1f0e51f4dfeccc666637ca5f0643c05，仍明确区别于本轮独立核验的归档 SHA。sourceCommit 是产生补丁与 CI 的候选提交；后续发布 tar 的提交会是另一个 SHA，不应混写。

## 已审查的两文件写回方案

主线程审查并确认 Render 分支绑定后，publish-job.proposal.yaml 中的 job 已加入同一 workflow。脚本 publish-candidate.py 单独调用仍默认只验证；只有通过精确标记条件的发布 job 才传 --publish，进行候选分支提交和 push。

仅当固定候选分支收到 push，且该 HEAD 提交的完整 message 恰好等于 [publish-repair-candidate] 时才运行发布 job。不是包含标记的任意句子，也没有其他 workflow_dispatch input。手动 dispatch 仍只验收。这样无需为注册 workflow 改动 main。

标记提交应同时包含审查后启用的 workflow 或统一补丁变更，满足既有 push paths 过滤器；空提交不会触发此 workflow。根目录 tar/回执两文件的后续写回不在过滤器内。

发布约束：

- 只从同一次成功 workflow run 下载精确源 SHA 命名的 artifact，不使用 workflow_run、外部 run ID、PAT 或部署令牌。
- 唯一获得 contents:write 的是独立发布 job。它不安装依赖、不执行应用或测试。
- 验证 artifact 的源提交、仓库、固定分支、补丁 SHA、原 archive SHA、候选版本、tar SHA、完整测试通过和真实构建证据。
- 再检查三个 Vercel 禁止部署配置。
- fetch 后要求远端候选分支 HEAD 仍等于本次 sourceCommit；已前进就停止。
- 仅允许改动根目录同名 tar 和 docs/MASTER7_FULL_REPAIR_CANDIDATE_20261107.json。
- 使用普通 fast-forward push；检查与 push 之间若又有提交，服务器仍会拒绝非 fast-forward。没有 force、rebase、merge、tag、GitHub Release 或生产分支修改。

### 具体风险和处理

1. contents:write 是仓库级权限，GitHub 不把这个 token 限成某个路径或分支。本脚本有严格边界，但生产分支仍应依靠既有分支保护；发布 job 不能执行候选应用代码。
2. tar 写回会产生 GitHub push webhook。三个 Vercel 配置全部禁用部署；主线程本次已经确认所有 17 个 Render 服务均未跟踪候选分支：本仓库 Portal 跟踪原 .94 分支且自动部署/preview 均关闭，gateway 跟踪其独立分支且 preview 关闭。若以后服务分支配置改变，应先暂停此发布 job；CI 不持有 Render 凭据，不会自行修改绑定。
3. 旧 run 构建期间分支前进会被拒绝，需要对新 HEAD 重跑；不能强推旧 artifact。
4. GITHUB_TOKEN 创建的普通 push 不会自动开启另一个同类 Actions run；此外当前 paths 过滤器没有包含 tar 或发布回执，避免循环。不要改用 PAT 来触发链式部署。
5. registry 可用性、GitHub runner 镜像、npm 发布策略仍是外部依赖。Action 代码、Node、pnpm 和项目包版本固定不等于底层 runner 镜像字节可重复；回执记录足够追溯，构建不宣称字节级完全复现。

## 固定官方 Action 来源

以下 tag→commit 映射已于本次读取官方 GitHub API 核对；workflow 实际使用完整 commit SHA，未使用浮动 tag：

| Action | 固定 SHA | 官方代码 |
| --- | --- | --- |
| actions/checkout | d23441a48e516b6c34aea4fa41551a30e30af803 | [固定提交](https://github.com/actions/checkout/tree/d23441a48e516b6c34aea4fa41551a30e30af803) |
| actions/setup-node | 249970729cb0ef3589644e2896645e5dc5ba9c38 | [固定提交](https://github.com/actions/setup-node/tree/249970729cb0ef3589644e2896645e5dc5ba9c38) |
| actions/upload-artifact | b7c566a772e6b6bfb58ed0dc250532a479d7789f | [固定提交](https://github.com/actions/upload-artifact/tree/b7c566a772e6b6bfb58ed0dc250532a479d7789f) |
| actions/download-artifact，仅发布提案 | 018cc2cf5baa6db3ef3c5f8a56943fffe632ef53 | [固定提交](https://github.com/actions/download-artifact/tree/018cc2cf5baa6db3ef3c5f8a56943fffe632ef53) |

参考：[pnpm frozen install](https://pnpm.io/cli/install)、[pnpm rebuild --pending](https://pnpm.io/cli/rebuild)、[GitHub token 行为](https://docs.github.com/en/actions/concepts/security/github_token)。
