# U04 independent API review

Task: `ui-consistency-and-feedback`, U04, specification v0.1 and checklist/handoff v0.1. Reviewed the final scoped snapshot at base `66517a756bd4f477348783b97341964e36bb4c32` plus the final uncommitted implementation overlay. Snapshot root: `/private/tmp/ui-consistency-review`. The 18 source/test hashes in `logs/tasks/ui-consistency-and-feedback/review-source-manifest.json` all matched before review. No production or test files were changed by this review.

## Verdict

**Changes required.** One P2 contract mismatch remains in malformed profile input handling. The rest of the scoped API behavior inspected matches the R3 requirements. The assigned server regression suites pass. This review is an assessment only and does not authorize a merge.

## Finding

- **P2 — Malformed optional profile password is mislabeled as a missing email-change password.** In `src/codeclinic/server/account/routes.js:58-65,90-95`, `profileValidationError` classifies a lone malformed `currentPassword` value (for example `{ "currentPassword": null }`) as `currentPassword`, and the caller emits `CURRENT_PASSWORD_REQUIRED` with “Enter your current password to change your email address.” This happens even when the request contains no email change. The code therefore reports a condition that did not occur, contrary to the R3 distinction that this code represents a password missing for a changed email. Keep the current required-password response at the later email-change branch (`:100-103`); classify malformed standalone `currentPassword` input as a general safe validation error (or another accurately scoped approved response). Add a regression assertion for a malformed password field without an email change. This input does not cause a write or expose data, but it gives misleading remediation and collapses the missing-versus-malformed contract.

## R3 traceability

| R3 condition / requirement | Implementation and evidence | Assessment |
| --- | --- | --- |
| Verified current-password mismatch | `routes.js:101-103,131-138`; route tests assert the mismatch code/message and no password write after a real Argon2 comparison. | Pass |
| Missing password for changed email | `routes.js:100-103`; route test checks `CURRENT_PASSWORD_REQUIRED`, field, message, and no profile write. | Pass |
| Password attempt limit | `routes.js:127-138` reserves the existing rate slot before comparison and returns `PASSWORD_ATTEMPTS_EXCEEDED` if unavailable; test asserts status, code, one reservation, and no password write. | Pass |
| Missing/invalid session | `guards.js:17-20,67-71` gives self-account paths the stable session code after authentication failure and still clears the session cookie. Missing-cookie response is tested at route and guard level. Existing guard tests cover malformed and unknown sessions on a generic protected route; direct code assertion for those variants on `/account/profile` or `/account/password` is absent, but they take the same `!auth` branch. | Pass; narrow coverage follow-up recommended |
| Invalid name/email and byte limits | `routes.js:20-22,35-50,58-65,90-95`; tests cover empty and multibyte over-limit name, malformed/non-string/over-limit email, and no write. | Pass |
| Unavailable email | `routes.js:106-111` maps the store conflict to 409 with allowlisted message and `email` field; test verifies no input echo. | Pass |
| Invalid new password | `routes.js:23,53-56,115-122`; tests cover too-short and multibyte over-limit values, field, existing bounds, and generic response for unknown/malformed shapes. | Pass |
| Malformed, ambiguous, unknown-field and oversized requests | `routes.js:58-65,88-95,176-181`; strict allowlist and parser errors return safe general messages when field identification is unreliable. Tests cover ambiguous profile fields, unknown password field, malformed JSON and oversized profile request. The finding above is the exception for a lone malformed optional profile password. | Changes required for finding |
| Password mismatch vs rate/session/service/malformed failures | Mismatch code follows `argon2.verify(...) === false`; exhausted slot returns before comparison; thrown compare/service errors go through generic 503 handling; missing session is handled in guard middleware; parser errors return general 400. | Pass by code inspection and focused tests |
| Statuses, middleware order, rate accounting, writes and support compatibility | JSON parser and protected route order remain intact; rate reservation/release and successful session-preserving password update are unchanged. Support routes retain their prior message-only responses. Existing route, guard, R7, store, server-wiring and login suites passed. | Pass |
| Server authorization and sensitive output | Actor identity/role/manager state still comes from the session and stored account, and CSRF remains required on mutations. Failure response helper accepts only hard-coded code/message and allowlisted field values; request values are not echoed. Existing actor/CSRF/R7 tests passed. | Pass |

The R3-specific addition in guards also changes unauthenticated `GET /api/account` to use the account session code, while support routes keep their previous response shape. That additive behavior is not a security or compatibility defect in the inspected usage, but U04's stated response scope is profile/password; preserve or narrow it only if the orchestrator determines the GET response must remain byte-for-byte compatible.

## Verification

Exact commands and results are recorded in [`review-api.log`](../../../logs/tasks/ui-consistency-and-feedback/review-api.log). Formal verification passed: 7 suites, 135 tests. The scoped API implementation diff and associated tests were reviewed. The U06 report separately records the combined regressions, production build and visual checks; this API review did not rerun those checks.

A one-off direct Supertest probe for the malformed optional-password case could not bind its temporary listener under the default sandbox (`listen EPERM`). It is recorded as an unavailable probe, not as a product failure; the finding is evident from the validation branch and should be covered by a scoped Jest regression test when corrected.

## Remaining verification limits

- Direct account-route response assertion for malformed/unknown sessions is not present; code path uses the same account-specific unauthenticated helper and existing tests cover the session variants on another protected route.
- No build or visual check was rerun for this API-only review; see the U06 verification report.
- Runtime model/token metrics were unavailable to this reviewer.

## Review correction (2026-11-08)

The initial P2 finding above is **withdrawn**. Re-reading `profileValidationError` at `routes.js:58-65` shows that the function deliberately excludes `currentPassword` from the single-field return condition. A malformed standalone optional password therefore returns `null` from that helper, and the route emits `INVALID_REQUEST` at `:90-95`; it does not emit `CURRENT_PASSWORD_REQUIRED`.

A direct local Supertest probe against the frozen snapshot confirmed both `{ "currentPassword": null }` and a 1026-byte optional `currentPassword`, each without an email change, return HTTP 400 with `{ code: "INVALID_REQUEST", message: "Enter valid account details." }`. No production or test files were changed. The earlier probe failure was only the first attempt under the default sandbox; the authorized escalated retry succeeded.

The earlier GET `/api/account` note is also not a finding. The approved scope allows additive account API error fields, and neither the spec nor handoff requires byte-for-byte preservation of the GET error body. The account-specific session code is consistent with the account session feedback contract; support-route response shapes remain unchanged.

**Revised final verdict: pass.** No U04 production finding remains. The direct missing-cookie code response is covered; malformed/unknown-session variants are covered by existing guard tests on another protected route and use the same `!auth` branch for self-account requests. Runtime metrics remain unavailable.
