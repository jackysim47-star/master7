# MASTER7 custom-domain gateways

These Vercel routing projects keep the public domains in front of the MASTER7
Render service without duplicating application state.

- `front`: proxies the customer site to the Render service.
- `admin`: sends `/` to `/admin`, then proxies the full backoffice and API.

The Render service must include the public domains in
`PORTAL_ALLOWED_ORIGINS` so same-origin browser writes remain protected.
