# Independent security review — account management continuation

Specification: `workflow/specs/account-management.md` v0.1. This is the independent security review for T02–T07 and affected T01 integration; it supersedes neither the AM-G1 review nor the implementer's self-check.

## Result

**Pass after approved fix.** One High-severity R7 allow-list bypass was confirmed, fixed with human approval, and independently rechecked. See R7-1 in [`review-report.md`](review-report.md).

## Security checks

- Account actor identity and active status are derived from the authenticated session and reloaded stored record. Support targets are loaded server-side before applying the stored account type and coordinator check. The reviewed support functions ignore client-provided role and manager fields.
- State-changing account routes use the timing-safe CSRF guard and strict request-field allow-lists. Email-key movement, status changes, and password-hash/session updates use the store's transaction boundaries. The reset response sets `Cache-Control: no-store` and contains the temporary password only in the success response.
- Password-change attempts use the existing email failure counter. Successful self-service changes retain the current session and clear `mustChangePassword`; support resets delete the target's sessions.
- The bootstrap requires an explicit project identifier, checks the existing Coordinator condition and stored target type, and prints generic outcomes. It was not executed against a cloud project.
- **R7 path case handling is fixed.** The guard normalizes the request path before checking its API prefix and allow-list. The new mounted-server regression tests and an independent synthetic probe confirm mixed-case account/support/notification operations are blocked while the password-change endpoint remains allowed.
- Main workspace production source and frozen review snapshot were byte-identical at initial review. The later approved production delta was limited to R7 path normalization; test-only deltas were the emulator-fixture setup and eight R7 regression cases.

Execution commands and before/after synthetic path probes are recorded in [`logs/tasks/account-management/review-continuation.md`](../../../logs/tasks/account-management/review-continuation.md). No real credential, account record, temporary password, or session ID was used or recorded. Human merge approval remains a separate gate.
