# MASTER7 v173 official-domain recheck

Evidence date: 2026-11-11 MYT

Classification: DNS and TLS follow-up required

Production go-live: Not approved

## Scope

This record covers the public DNS and routing state of the two customer and
staff domain pairs for `17.0.0-selfbuilt.173-staff-setup-route`. The checks were
read-only. No DNS record, URL-forwarding rule, Render domain, certificate,
service plan or application setting was changed.

## Render declaration

Render Blueprint `exs-dboff93rjlhs73b9hihg` manages service
`srv-dbl0iv7f3r2c73848ei0`. The remote Blueprint YAML declares:

```text
www.master7.best
www.master7.site
```

A fresh `plan_blueprint` result was `no_changes`. This confirms that the
Blueprint has no pending infrastructure diff. It does not prove that public
DNS points directly to Render, that Render currently verifies every hostname,
or that a TLS certificate has been issued.

## Public observations

| Host | Public DNS and route | Acceptance |
| --- | --- | --- |
| `master7.best` | A `15.197.162.184`; HTTP 302 through Render and then `/signin` | Not accepted: Spaceship forwarding |
| `www.master7.best` | DNS NODATA | Not accepted: no public address |
| `master7.site` | A `15.197.162.184`; HTTP 302 to `/admin` | Not accepted: Spaceship forwarding |
| `www.master7.site` | A `15.197.162.184`; HTTP 302 to `/admin` | Not accepted: Spaceship forwarding |

The four names therefore have no passing evidence for direct Render
custom-domain routing and TLS. URL forwarding is also unsuitable for payment
callbacks because a redirect can change or discard a POST method and body.

## Required change

In Spaceship:

1. Disable URL forwarding for both zones.
2. Set `www.master7.best` and `www.master7.site` as CNAME records to
   `master7-v17-staging.onrender.com`.
3. Remove any conflicting A or AAAA record for those `www` names.
4. Configure each apex with the current A or ALIAS value shown in the Render
   Custom Domains screen. A historical Render apex IP is not accepted as a
   current source of truth.

In Render:

1. Confirm the four intended apex and `www` names under Custom Domains.
2. Run domain verification and wait for TLS issuance.
3. Keep the Render subdomain enabled until official-domain acceptance passes.

## Acceptance

All of the following must pass before recording domain acceptance:

- DNS resolution from independent public resolvers;
- valid HTTPS and the intended certificate for every official hostname;
- GET and HEAD reach the intended customer or staff entry;
- Host routing preserves the expected customer and staff paths;
- payment callback POST requests reach the application without HTTP 3xx; and
- mobile and desktop checks finish on the official hostname.

The DNS correction does not require a Render compute-plan upgrade. The current
session has no authenticated Spaceship DNS write surface and no Render Custom
Domains write or verify tool, so it cannot apply or attest these changes.

## Conclusion

The Render declaration is prepared and has no pending Blueprint diff, but the
public names remain missing or routed through Spaceship forwarding. Official
domain and TLS acceptance has not passed. MASTER7 remains in integration/UAT.
