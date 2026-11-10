# MASTER7 official-domain recheck

Checked: 2026-11-10 10:10 UTC

## Render

- Blueprint: `exs-dboff93rjlhs73b9hihg`
- Service: `srv-dbl0iv7f3r2c73848ei0`
- Blueprint domains: `www.master7.best`, `www.master7.site`
- Fresh Render plan: `no_changes`
- Direct origin: `https://master7-v17-staging.onrender.com`

## Authoritative DNS

Both zones remain on `launch1.spaceship.net` / `launch2.spaceship.net`.

| Host | A | AAAA | CNAME | Observed HTTPS |
|---|---|---|---|---|
| `master7.best` | `15.197.162.184` | none | none | 302 to Render `/` through Spaceship forwarding |
| `www.master7.best` | none | none | none | unresolved / unreachable |
| `master7.site` | `15.197.162.184` | none | none | 302 to Render `/admin` through Spaceship forwarding |
| `www.master7.site` | `15.197.162.184` | none | none | 302 to Render `/admin` through Spaceship forwarding |

Google Public DNS returned status 0 with authoritative negative answers for every missing record. The relevant A TTL is 300 seconds and NS TTL is 1800 seconds.

## Required registrar change

In Spaceship DNS:

1. Set `www.master7.best` to `CNAME master7-v17-staging.onrender.com`.
2. Set `www.master7.site` to `CNAME master7-v17-staging.onrender.com`.
3. Remove conflicting `www` A/AAAA records and URL forwarding for those two hostnames.
4. Leave apex records unchanged until an exact Render apex target is intentionally selected.

## Write-path result

No Spaceship connector, API credential, environment secret, connected local-browser control tool or logged-in registrar session is available in this task. The cloud environment reports zero secret bindings and zero browser capabilities. Therefore no registrar mutation was attempted. Render is already prepared; the remaining change is solely at Spaceship.
