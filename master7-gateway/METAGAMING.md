# META GAMING API v3.4.8 gated runtime candidate

This adapter is based only on the supplier-linked English API v3.4.8 document.
It has not been deployed or used to call any player or money operation. Runtime
routes are compiled for offline contract testing but every capability is off by
default and remains `productionQa: not_verified` / `liveReady: false`.

## Public route

`GET /providers/metagaming/games?account=normal|free`

The default account is `normal`. The success response is:

```json
{
  "provider": "metagaming",
  "apiVersion": "3.4.8",
  "account": "normal",
  "currency": "MYR",
  "games": [
    {
      "gameCode": "10001",
      "name": "Game name",
      "gameType": 1,
      "imageUrl": "https://provider.example/game.png",
      "hasDemo": false
    }
  ]
}
```

Artwork must be an HTTPS URL; a missing or empty image becomes `null`. An
invalid non-empty image or any malformed game rejects the upstream response.
Only the documented public fields are returned.

## Account separation

The normal account uses `META_GAMING_NORMAL_*` variables. The free-credit
account uses `META_GAMING_FREE_*` variables. Neither account falls back to the
legacy `MEGA_*` variables or to the other META account. Secret values belong in
the deployment secret store and must not be committed.

`GetGameList` is signed as lowercase MD5 of:

```text
GetGameList + RequestDateTime + OperatorId + SecretKey
```

`RequestDateTime` uses the exact documented UTC `yyyy-MM-dd HH:mm:ss` form. The
request sends only `OperatorId`, `RequestDateTime`, and `Signature`; the current
v3.4.8 request does not document `Currency` or `Lang` for this method.

## Privileged routes

Every runtime request must contain one of these exact profile/account pairs:

| Profile | Account |
|---|---|
| `metagaming_normal_myr` | `normal` |
| `metagaming_free_myr` | `free` |

The gateway rejects a missing, unknown or crossed pair before provider traffic.
It selects provider URL, operator ID, secret and currency from that binding; a
caller cannot submit any of those connection values.

| Route | Supplier method | Peer token | Capability switch |
|---|---|---|---|
| `POST /platform/metagaming/player` | `CreatePlayer` | `PLATFORM_METAGAMING_PLAYER_TOKEN` | `META_GAMING_PLAYER_ENABLED` |
| `POST /platform/metagaming/launch` | `GameLogin` | `PLATFORM_METAGAMING_PLAYER_TOKEN` | `META_GAMING_LAUNCH_ENABLED` |
| `POST /platform/metagaming/balance` | `CheckBalance` | `PLATFORM_METAGAMING_PLAYER_TOKEN` | `META_GAMING_BALANCE_ENABLED` |
| `POST /platform/metagaming/deposit` | `Deposit` | `PLATFORM_METAGAMING_WALLET_TOKEN` | `META_GAMING_TRANSFER_ENABLED` |
| `POST /platform/metagaming/withdraw` | `Withdraw` | `PLATFORM_METAGAMING_WALLET_TOKEN` | `META_GAMING_TRANSFER_ENABLED` |
| `POST /platform/metagaming/transfer-status` | `CheckTransferStatus` | `PLATFORM_METAGAMING_WALLET_TOKEN` | `META_GAMING_TRANSFER_STATUS_ENABLED` |
| `POST /platform/metagaming/kick` | `KickPlayer` | `PLATFORM_METAGAMING_RECOVERY_TOKEN` | `META_GAMING_KICK_ENABLED` |
| `POST /platform/metagaming/unfinished-rounds` | `GetUnfinishRound` | `PLATFORM_METAGAMING_RECOVERY_TOKEN` | `META_GAMING_UNFINISHED_ROUND_ENABLED` |
| `POST /platform/metagaming/reports` | `PullLog` | `PLATFORM_METAGAMING_REPORT_TOKEN` | `META_GAMING_REPORT_ENABLED` |
| `POST /platform/metagaming/flag-log` | `FlagLog` | `PLATFORM_METAGAMING_REPORT_TOKEN` | `META_GAMING_FLAG_LOG_ENABLED` |

Tokens must be independent from one another, administrator credentials and both
provider secrets. A missing switch, missing/aliased token or invalid provider
account returns before provider traffic. Provider responses are parsed into
strict safe projections; raw bodies and undocumented fields are never returned.
Balance and transfer responses must return the configured account currency.

`FlagLog` is deliberately separate from `PullLog`. The gateway never flags a
record automatically because only the platform's durable ingestion receipt can
prove that a pulled record is safe to acknowledge.

Even a successful `KickPlayer` response means only that the current play session
was temporarily kicked. It does not establish final round, wallet, log, or
settlement closure. Closure requires separate round and financial evidence.

The document demonstrates only `en-us` for `GameLogin`. This candidate therefore
accepts the platform language `en` and sends `en-us`; other languages remain
closed until the supplier confirms their exact codes for these merchant accounts.

## Legacy MegaH5 safety gate

The existing MegaH5 catalogue is unchanged. Its platform session, balance,
deposit, withdrawal, and transfer-status operations require the additional
`MEGA_PROVIDER_MAPPING_VERIFIED=true` gate. The default false value prevents all
five routes from making provider calls while the historical brand/account
mapping remains unverified.
