# MASTER7 `.vip` 公开前端短信 OTP 只读核查

核查时间：2026-11-03 08:09:54 UTC（16:09:54 MYT）
方式：匿名读取公开首页及其静态 JavaScript；没有调用认证 API、提交手机号、发送短信或登录。

## 观察结果

- 已退役旧域名当时返回 HTTP 200。页面元数据声明 MY 地区与 Asia/Kuala_Lumpur。该旧页面不代表 `.best` 或目标 V15 的配置；需求时区仍记录为 Asia/Kuching。
- 当前首页加载的静态脚本包含顾客认证路由：`/api/auth/login/sms`、`/api/auth/login`、`/api/auth/register/sms`、`/api/auth/register`、`/api/auth/forgot-password/sms`、`/api/auth/forgot-password`，以及用户名检查、注册合约和图形验证码路由。
- 客户端发送短信请求时，已见 JSON 字段为 `{phone}`，使用 `POST` 和同源凭证。短信登录提交字段为 `{phone, smsCode, rememberMe}`；同一登录界面的账号密码分支使用 `{username, password, vcode, rememberMe}`。忘记密码提交字段为 `{phone, smsCode, newPassword, confirmPassword}`。这些是浏览器客户端代码形状，不是已核实的服务端协议完整定义。
- 公共脚本还包含“SMS verification is currently disabled / 暂未开放”及短信暂不可用错误文案；登录发送码函数在某个禁用状态为真时会先显示不可用提示并退出，不发起该次请求。Malaysia 号码选择项标记 `smsSupported=true` 只说明界面允许选择马来西亚号码，不证明短信供应商已配置或能成功送达。
- 2026-11-03 08:12 UTC 对公开只读配置 `GET /api/auth/register/contract` 收到 HTTP 200、JSON。仅提取非个人字段后，顶层 `smsRequired=true`，嵌套 `contract.smsRequired=false`；已见前端逻辑优先使用顶层布尔值，因此本次页面配置选择短信注册流程。两字段不一致已保留为待确认；该 GET 不验证短信实际发送。未读取或保存其他响应字段。
- 登录页组件的 `smsOtpAvailable` 属性默认值为 true，但可由调用方覆盖；目前未从服务端源码或完整页面运行时配置确认调用方最终值，故顾客登录短信发送是否开放仍待实测。
- 这些路由是相对路径并使用同源认证语义，属于已退役旧站点上下文。不能直接将旧页面路径当成 `www.master7.best` 的服务端实现，也没有证据显示 `/api/auth/login/sms` 可供外部前端跨域调用。

## 内容指纹

以下 SHA-256 用于识别本次读取的公开内容；脚本可能随站点发布而变化：

- 首页 HTML：`7cc4f92f198148e57609df7881bb8c4b346db7a3c04f0e0a556904766ec33563`
- 认证页面脚本 `/_next/static/chunks/0jabwjhnwx.5c.js`：`125a48e2c741dbddb5f0633e63c26478d16c681337a86ca9774a4ac51fed6952`
- 本地化错误文案脚本 `/_next/static/chunks/0qzzcn8tmocmc.js`：`a5143689c577c03d767d965a62e400b0b4b4049b6948ec6a275a28b666a18f2b`
- 会员登录/国家选择脚本 `/_next/static/chunks/186fbbe5g_-lf.js`：`3efe4bba96c8dd9faf32eaee1b7567f6bc45d309096901718c60c3d4e77804c8`

## 结论与边界

用户所说“OTP 在原平台 API 资料里”得到部分佐证：当前 `.vip` 公开客户端确有短信登录、注册及找回密码路由和请求字段；公开注册配置 GET 返回顶层 `smsRequired=true`，客户端因此选择短信注册流程。静态脚本含禁用/不可用状态和登录可用性开关，但没有服务端源码或短信发送成功证据，不能把 SMS OTP 报告为已接通。已收到的 154 文件源码包内没有上述短信发送端点；原 Sites v105 工程仍须由持有人恢复，才能确认 `.vip` 服务端是否保留了完整实现并将其安全接入目标 V15。
