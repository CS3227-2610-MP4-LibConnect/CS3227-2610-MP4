# Planning security analysis

Task: `ui-consistency-and-feedback`; specification v0.1, draft (2026-11-08).
This is analyst evidence, not an independent implementation review or approval.

## Trust boundaries and mitigations

- Server session/stored account records remain the source of identity and
  Coordinator privileges. A shared header consumes verified presentation data;
  rendering or hiding a link grants no server permission.
- Distinguish an authenticated password mismatch from session expiry and rate
  exhaustion using explicit server codes. Never map every 401 to wrong password.
  Return no submitted passwords, account identifiers, hashes, tokens, or reasons
  that reveal another user's account. Keep email-unavailable wording generic.
- Keep public login/registration errors unchanged. New detailed credential
  feedback is restricted to an authenticated user's own account operations.
- Maintain existing rate accounting, CSRF checks, credential comparisons,
  password-change session invalidation, and forced-password route restrictions.
- Preserve fail-closed logout behavior. A pending/failed logout must not expose
  the inbox or other protected content through a new shared wrapper.
- Error bodies, notification text, and browser fields are untrusted. Use known
  codes and local plain-text copy; ignore unknown fields/codes safely. An error
  is never permission to write, retry a destructive action, or change roles.
- Keep screenshots' personal data out of fixtures and evidence; visual checks
  use synthetic data. No cloud access or secret inspection is needed.

## Required negative verification

Unauthenticated and forced-password users cannot fetch normal protected page
data. Forged manager/role inputs cannot reveal privileged links or authorize
requests. Wrong passwords cause no writes. Attempt exhaustion is not reported as
a comparison result. Network, CSRF, malformed response, and service failures do
not become password errors. Existing ownership, CSRF, role, and session tests
remain in force. Manager-lookup failure cannot expose the Coordinator link.

## Residual risks

The shared header crosses existing page and logout implementations, requiring
regression and independent review. The additive error contract requires server
and UI tests to agree on codes and retain status compatibility. Existing profile
and password attempt policies differ; this task does not change those policies.
Implementation and browser verification are pending; no runtime safety result
is claimed.

## Implementation assessment — 2026-11-09

The initial section above is retained planning evidence. Independent implementation
review is now complete: see review-api.md, review-navigation.md, review-feedback.md
and the reconciled review-report.md. The final API review passes after executing
the disputed malformed-password probes; there are no remaining security findings.
Identity/role/manager/CSRF/session/rate/ownership regressions remain passing.
Final combined verification passed 239 tests and the production build. Browser
evidence used only synthetic local responses and does not claim cloud testing.
This assessment does not approve commits, merging or any account/database action.
