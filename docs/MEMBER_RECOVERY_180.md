# Member recovery after unfinished staff setup

An account converted to staff receives an unusable password verifier until private staff setup is completed. Returning that account to membership alone does not recover its earlier member password. A pending identity-review request also disappears from the owner inbox while the account is staff, because that inbox lists members.

This release adds a narrow maintenance operation that returns an approved account with unfinished staff setup to membership. It requires an approved owner actor, an exact credential version and the pending staff setup record. The role, unusable credential, private member-password grant, session revocation and audit events commit together. It preserves the same user identity, existing review and financial records. The operation cannot recover an owner, ordinary member or completed staff account.

The member chooses their password through `/member-reset` and `/api/auth/reset-member`. A 256-bit, 30-minute, single-use grant is bound to the member's login ID and credential version; only its SHA-256 verifier is stored. Recovery cannot reset staff or owners, grant roles, approve identity review, or create a session. Normal member sign-in still requires SMS OTP. Conditional writes and atomic audit recording prevent partial password changes and replay. Failed grant, origin, account-state and version checks leave the password unchanged.

A private URL fragment is consumed before startup and removed from browser history before API requests. Its credential stays in memory and is cleared when the member leaves or completes recovery. The code is absent from the displayed form when supplied through a valid private link. Manual code entry remains available. The interface supports English, Chinese and Malay and returns to member sign-in after setup.

Validation: 22 focused recovery, staff-link, review and version checks passed; 74 authentication, cashier and SQL compatibility checks passed. Type checking and the Render build succeeded. Isolated Chromium checks at 360, 390 and 1440 pixels verified fragment removal, manual password submission, no automatic POST, no horizontal overflow and return to member OTP sign-in. No live payment, withdrawal, callback replay or SMS was tested.

Operational recovery targets only the explicitly selected `master7` account after deployment. The owner `master7777`, identity/risk review decisions and transaction configuration are outside that mutation. The previous compatible release is commit `5e89b1a9c233cbe2f891d5a6d8824c6015c8f31b`.
