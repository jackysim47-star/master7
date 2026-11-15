# MASTER7 V17 · 持牌集成商权威交接

观察时间：2026-11-15 13:27:35 MYT  
最终判断：`STAGING LIVE / PRODUCTION NO-GO`

## 1. 交接目标

目标会员体验为类似 Win1Win 的统一入口：会员登录、选择支付渠道、主钱包、游戏目录、进入／退出游戏及客服支持。真钱支付、钱包入账、游戏下注、结算和提款只能由取得合法授权的单一持牌集成商与厂家实施和签收。

本交接不授权任何人绕过玩家保护、Self-exclusion、KYC／AML、厂家 UAT 或本地监管要求。

## 2. 冻结基线

| 项目 | 当前基线 |
|---|---|
| Git repository | `jackysim47-star/master7` |
| Production branch | `release/v17.3-production` |
| Git commit | `753ca2f4282f9270140fdac41a0fdbe128844c64` |
| Render service | `master7-v17-production` / `srv-dbrkn8rl550s73cnur8g` |
| Render deploy | `dep-dbs8ou67bikc73eu6bj0` / `live` |
| Runtime release | `17.0.0-selfbuilt.174-uat-preview` |
| Production database | `master7-cloud-production-db` / `available` |
| Customer domain | `www.master7.best` · unresolved/unreachable |
| Owner domain | `www.master7.site` · HTTP 302 to Staging |
| Payment acceptance | VPay MYR, GSPAY MYR, 1MPay MYR · `0/3` |
| Game acceptance | `0/43`; 6 profiles have adapter code only |

The Owner retains ownership of GitHub, Render, DNS/registrar, database and vendor accounts. The integrator receives named, least-privilege accounts only; shared Owner passwords are prohibited.

## 3. Current safety state

```text
newDepositsEnabled=false
newGameLaunchesEnabled=false
newPayoutsEnabled=false
transactionsEnabled=false
realPayments=false
productionReady=false
```

These values must remain false until every acceptance gate in section 7 is signed. The current frontend may display provider names, but it must not be described as deposit-ready or game-ready.

## 4. Integration work owned by the licensed integrator

### Domains and identity

1. Bind `www.master7.best` and `www.master7.site` directly to `master7-v17-production` with valid TLS.
2. Remove all Staging URL forwarding. `/health` and `/health/live` must return direct HTTP 200; payment callbacks must never pass through 301/302/307/308 redirects.
3. Validate Owner activation/login/logout/recovery and customer OTP success, expiry, reuse rejection, invalid-attempt limits and rate limits.

### MYR payments

For VPay, GSPAY and 1MPay separately: rotate every credential previously shared in chat; use an approved UAT or vendor-controlled test; verify create-order, cashier redirect, signed callback, independent query, duplicate callback, timeout recovery, exactly-once wallet credit and merchant reconciliation. A provider remains disabled if any capability lacks immutable evidence.

GSPAY USDT and GSPAY+ outside the three primary MYR profiles remain separate and disabled.

### Games

For each of the 43 profiles: obtain the official contract, UAT account, currency/unit scale and IP allowlist; verify catalogue, GameLogin, launch, transfer-wallet behavior, callback, retry/recovery, exit balance and settlement. `implemented=true` means code exists only; it is not acceptance.

### Telegram

Use two independent bots only after secret rotation:

- Owner Operations Bot: outbound health, deployment and provider-status alerts.
- Customer Support Bot: support-ticket intake and status messages only.

Neither bot may create payment orders, approve withdrawals, change balances, enable providers, expose secrets or bypass Owner authentication. See `MASTER7_V17_TELEGRAM_TWO_BOT_SCOPE_20261115.md`.

## 5. Interface policy

- No new public Customer API is authorized by this handover.
- Existing read-only endpoints `/health`, `/api/payment-channels`, `/api/games` and `/uat-preview` remain the current status sources.
- Provider additions must use the existing adapter and acceptance-ledger boundaries. Contract-specific callback routes require vendor documentation, strict authentication, bounded payloads, idempotency and independent query verification.
- Telegram Bot tokens, provider credentials and database URLs are Render Secrets only. No secret belongs in Git, documentation, screenshots, Telegram or chat.

## 6. Required evidence record

Every acceptance event must contain:

```text
environment
release/version
provider/profile
capability
observed_at_MYT
verified_by
evidence_reference
evidence_sha256
result
```

Evidence is append-only. Corrections create a superseding event; they never overwrite the original record.

## 7. Production release gates

Production GO requires all of the following:

```text
official domains: 2/2 PASS
customer OTP: PASS
Owner login and recovery: PASS
MYR payments: 3/3 PASS
game profiles: 43/43 PASS
wallet and reconciliation: PASS
credential rotation: PASS
backup / isolated restore / alerts / rollback / IP allowlists: PASS
Owner signoff: PASS
independent licensed technical signoff: PASS
```

Code gates must also pass from a clean checkout: maintenance `12/12`, release probe `27/27`, full regression `1461/1461`, Render DB `3/3`, TypeScript, ESLint and production build.

## 8. Authoritative artifacts

- `MASTER7_V17_14_ITEM_HANDOVER_CHECKLIST_20261115.md`
- `MASTER7_V17_CURRENT_PAYMENT_ACCEPTANCE_20261115.csv`
- `MASTER7_V17_CURRENT_GAME_ACCEPTANCE_20261115.csv`
- `MASTER7_V17_EVIDENCE_INDEX_20261115.csv`
- `MASTER7_V17_ACCESS_SECRET_REGISTER_20261115.md`
- `MASTER7_V17_TELEGRAM_TWO_BOT_SCOPE_20261115.md`
- `MASTER7_V17_OWNER_TECHNICAL_SIGNOFF_20261115.md`

All older handover and acceptance documents remain historical evidence. If an older document conflicts with this file or current live endpoints, this file and new immutable evidence take precedence.
