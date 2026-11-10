# META GAMING API v3.4.8 catalogue candidate

This adapter is based only on the supplier-linked English API v3.4.8 document.
It is a read-only candidate and has not been deployed or used to call any player
or money operation.

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

## Privileged boundary

No META player, launch, balance, transfer, transfer-status, KickPlayer,
unfinished-round, report, or FlagLog route is exposed. Reserved peer tokens and
per-capability switches document the minimum boundary for a future separately
reviewed change, but environment changes cannot create a route in this release.

Even a successful `KickPlayer` response means only that the current play session
was temporarily kicked. It does not establish final round, wallet, log, or
settlement closure. Closure requires separate round and financial evidence.

## Legacy MegaH5 safety gate

The existing MegaH5 catalogue is unchanged. Its platform session, balance,
deposit, withdrawal, and transfer-status operations require the additional
`MEGA_PROVIDER_MAPPING_VERIFIED=true` gate. The default false value prevents all
five routes from making provider calls while the historical brand/account
mapping remains unverified.
