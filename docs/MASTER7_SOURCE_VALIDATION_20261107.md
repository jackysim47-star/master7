# MASTER7 .94 source validation

This development branch verifies the fixed release archive before offline code review. It does not change the live Render refs, service configuration, payment controls or customer data.

- Source commit: `e3faa8ddc6b6fe87768e9e71f466ce48538bfad7`
- Archive: `master7-v17-render-staging.tar.gz`
- Bytes: `3629527`
- Expected SHA-256: `6d1a96b5a5cfa6e88a87908485c6af32e5d4cfc6a57da49420b1be48b76598d2`
- Export retention: one day
- Runner permissions: contents read; no project secrets
- Package contents are not executed by the workflow.

The root and both existing domain gateway Vercel configurations disable automatic deployments on this branch. Do not merge these development controls into release branches. A completed workflow and a matching downloaded archive checksum are required before claiming source integrity validation.
