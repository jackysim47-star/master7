# MASTER7 full source candidate — 8 November 2026

The unified patch reconstructs `17.0.0-selfbuilt.96-api-automatic` from the immutable .94 archive at e3faa8ddc6b6fe87768e9e71f466ce48538bfad7. It contains the prior .95 repairs plus automatic customer deposit/game availability, retired manual status controls, preserved original vendor contracts, read-only backoffice connection records and MYT deposit reporting with full-history pagination.

VPay, GSPAY+ and 1MPay brand buttons and all 34 game platform entries remain. Only implemented and correctly configured vendor capabilities can be available. No configuration or test fixture is represented as live settlement acceptance.

The guarded candidate branch does not deploy to Vercel or Render. The exact source commit must pass every test, including hosted identity boundaries, and the actual Render build before its archive can be retained by the narrowly scoped publisher. Source includes the technical boundaries in docs/MASTER7_API_AUTOMATIC_20261108.md.
