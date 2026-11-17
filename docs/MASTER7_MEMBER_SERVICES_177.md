# Member services and presentation — release 177

This change repairs missing mobile account navigation and connects a visible customer conversation to the existing same-environment support inbox. The frontend and backend use one blue, navy and white palette, with readable admin cards, forms and tables. It does not connect separate Staging and Production databases.

| Customer entry | Customer can see | Backoffice counterpart |
| --- | --- | --- |
| Menu / wallet | Own balance and deposit records | Deposit reports and reconciliation remain admin-only |
| Withdraw | Own withdrawal form, availability and records | Approval, provider submission and settlement remain admin-only |
| Identity verification | Own status and request-review action | Identity and AML decisions remain owner-only |
| Account security | Own password account settings | Other members and administrative credentials stay private |
| Promotions / play settings | Published offers and own controls | Offer configuration and operational controls stay private |
| Floating support button / Menu | Own saved conversation, automated guidance, manual handoff and replies | Support inbox shows the same ticket and author history |
| AI customer support switch | Public effective mode only | Owner controls automatic replies; credentials stay server-only |

The member menu contains a fixed allowlist. Financial totals for other members, API settings, keys, audits, commissions administration, provider balances, maintenance and transaction switches are not added to it.

The chat accepts short greetings, handles Chinese/English/Malay navigation questions with grounded instructions for actual controls, and supports follow-up questions. Human handoff persists on the conversation. Owner replies also take over the conversation. Automatic replies stop when disabled, including a delayed generation that has not yet been saved. Turning automatic replies off leaves messaging available. Pending members can contact support using authenticated, CSRF-protected, rate-limited support endpoints; financial approval gates are unchanged. Retired staff logins remain blocked.

The existing external-model adapter is preserved. `GET /api/support/status` distinguishes `built_in_rules_v2` guidance from `openai_compatible` availability and from automation being off. No model credential is created, exposed or written by this release. A rules guide must not be described as a newly connected external model.

Verification includes real backend SQL tests for member isolation, inbox round trip, short messages, manual handoff, pending-member restrictions, automation off and delayed generation; full regression tests; TypeScript; lint; Render build; and an isolated Chromium run at 360×800, 390×844 and 1440×1000. The browser fixture uses synthetic users with real backend queries and SQLite, not real customer logins, OTP or Production data. It verifies three UI languages, native member dialog dismissal, admin mobile drawer, readable dashboard cards and zero wallet journal writes. Run with `PLAYWRIGHT_MODULE=<installed playwright entry> node scripts/verify-member-services-browser.mjs`.

Research informing the navigation/chat design:

- [NN/g: Hamburger Menus and Hidden Navigation Hurt UX Metrics](https://www.nngroup.com/articles/hamburger-menus/)
- [NN/g: Mobile navigation visibility](https://www.nngroup.com/articles/find-navigation-mobile-even-hamburger/)
- [Intercom: Messenger updates](https://www.intercom.com/help/en/articles/9319961-updates-to-the-messenger)

Deployment scope: existing Staging portal only. No domain, provider, real-payment, payout or game-launch switch changes.
