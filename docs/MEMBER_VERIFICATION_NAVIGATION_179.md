# Member verification navigation

The mobile layout hides the desktop top navigation and sidebar. Its bottom dock did not include identity verification, so a member blocked by an identity-review requirement had no visible navigation to the requested page.

Release `17.0.0-selfbuilt.179-verification-navigation` adds a member-only Verification shortcut immediately below the mobile header. The existing verification page still shows both review states and requires an explicit Request review action. The shortcut follows English, Chinese and Malay selection and stays hidden for guests, staff and owners. Desktop navigation remains available.

The review-required message in a deposit dialog also offers Go to verification. Clicking it closes the dialog and selects the existing review page. The action reads status; it does not submit a review, order or decision. A stale action cannot navigate after the account changes, and the existing request key is preserved.

Validation: 44 focused cashier, language and asset-version checks passed; 16 review API/UI and SQL-adapter checks passed. An isolated Chromium fixture verified access, direct navigation, three languages, role visibility and absence of horizontal overflow at 360, 390, 768, 1024 and 1440 pixels. The production build succeeded. The fixture allowed GET requests only. No live payment, callback replay or withdrawal was attempted.

This release changes the existing Production source archive and its reviewable patch. It does not include the separate Staging member-services branch. No account, approval, review decision, wallet, payment setting or transaction switch is changed. The previous compatible code release is commit `e4b45fc310c3e9155854dfc37bd1468eb147d0b3`, deploy `dep-dbuhjvu7bikc739vrplg`.
