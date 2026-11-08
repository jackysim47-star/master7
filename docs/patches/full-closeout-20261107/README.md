# MASTER7 full source candidate — 8 November 2026

The unified patch reconstructs `17.0.0-selfbuilt.99-provider-entry` from the immutable .94 archive at e3faa8ddc6b6fe87768e9e71f466ce48538bfad7. It includes the verified .95–.98 repairs, automatic API availability, independent payment cashiers and MYT financial reporting.

This candidate fixes provider-name search leaking into game filtering, stale catalogue responses after leaving a vendor, missing read-only retry on failed catalogue reads, delayed catalogue loading behind unrelated payment requests, and owner/staff attempts to launch member-only games. Root and selected-provider status continue to come from actual APIs; no vendor launch URL or successful settlement evidence is invented.

The original vendor signing, payment and game-wallet contracts are preserved. No additional launch or wallet adapter is represented as complete. The 34 brand entries and all three payment brands remain.

The guarded candidate branch does not deploy to Vercel or Render. Every test, including hosted identity boundaries, and the actual Render build must pass before the scoped publisher retains the source archive. No simulated result is a live payment or game acceptance test. See source docs/MASTER7_PROVIDER_ENTRY_20261108.md for behavior and external contract boundaries.
