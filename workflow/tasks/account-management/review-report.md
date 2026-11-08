# Independent review — account management continuation (T02–T07, affected T01)

Reviewer: independent reviewer agent
Date: 2026-11-08
Specification: `workflow/specs/account-management.md` v0.1 (human-approved)
Checklist and handoff: `workflow/tasks/account-management/{tasks.md,handoff.md}` v0.1 (human-approved)
Implementation: continuation report in this directory; base snapshot `652e8ee` in `/private/tmp/codeclinic-shared-review-20261108`; source/docs/test diff `shared-continuation.diff`.
Execution evidence: [`logs/tasks/account-management/review-continuation.md`](../../../logs/tasks/account-management/review-continuation.md).
Security findings: [`security-review.md`](security-review.md).

## Verdict

**Pass.** A High-severity R7 bypass was confirmed and corrected in the approved post-review security fix. The exact main-workspace delta was independently rechecked with the new R7 tests and a synthetic mounted-router probe. The human merge decision remains pending; this report does not grant it.

## Scope and snapshot controls

Reviewed the approved requirements and the complete supplied delta, concentrating on T02–T07 and T01 interactions: account routes and store/guards, login/R7, server wiring, bootstrap, account pages, dashboard routing/logout, and their tests. Notifications and AI shared features have separate independent reviewers; I checked their R7 integration point only. Feature-specific ticket and AI endpoints are outside this review.

The frozen snapshot has no `.git` metadata. I treated `shared-continuation.diff` and the supplied base identifier as the source boundary. At initial review, the reviewed production files matched the main workspace byte-for-byte. The main workspace already had a post-snapshot test-only edit to `test/account-emulator.integration.test.js`: it seeds synthetic fixtures through the existing registration persistence adapter to avoid consuming the HTTP source limiter. After the High finding, the human approved a narrow security fix: `server/auth/login.js` lowercases the request path before checking the `/api/` prefix and allow-list, and eight R7 regression cases were added to `account-r7-server.test.js`. I independently reviewed and tested this exact delta; no other production change was part of the recheck.

## Finding

| ID | Severity | Location | Evidence and requirement | Required action |
| --- | --- | --- | --- | --- |
| R7-1 | **High — resolved and independently rechecked** | `src/codeclinic/server/auth/login.js`, `createForcedPasswordChangeGuard` | Initially, Express route and mounted-router matching was case-insensitive while the guard's `/api/` prefix check was case-sensitive. A synthetic active forced-change session could read `/API/account` and change its profile. The approved fix normalizes `req.path` to lowercase before checking the API prefix and limited allow-list. Eight mounted-server regressions now cover mixed-case account, support, and notification reads/writes and the password endpoint. | Resolved in the approved narrow fix. Keep the new mixed-case regression coverage. |

## Acceptance traceability

| Requirement | Review result | Evidence / limitation |
| --- | --- | --- |
| R1 / T02–T03: endpoint authentication, active actor, CSRF, bounded input, status/error handling, R1 list fields | Code and focused tests reviewed; core controls present. | Account guards derive actor and support target from session/stored records; strict input allow-lists and 8 KiB JSON bound are present. Focused API/guard/store tests passed. Exact endpoint status matrix is not exhaustively exercised end-to-end. |
| R2 / T02: profile update, registration validation, current password, atomic email-key move | Implementation reviewed; transaction behavior is covered by AM-G1 tests and emulator collision/move flow. | No production defect found in reviewed paths. |
| R3 / T02: current-password check, shared login counter, fresh hash, keep current session, clear forced flag | Implementation reviewed; fake route tests verify a failed password reserves the email slot and success keeps the caller session. | Final emulator run is reported by the orchestrator; focused tests below independently passed. No production defect found. |
| R4–R6 / T03 and affected T01: stored-role matrix, status/session transaction, reset/session deletion, temporary secret/no-store | Store/guards/routes and tests reviewed. | AM-G1 guard tests cover the role matrix; emulator covers deactivation/reset session effects. No production defect found. |
| R7 / T04: temporary-password endpoint allow-list | Met after the approved fix and narrow independent recheck. | The updated server test suite covers mixed-case reads/writes; the synthetic probe verified lower/mixed-case, encoded account paths, and an allowed mixed-case password endpoint. |
| R8 / T05: explicit project, refusal rules, generic output | Script and fake/emulator paths reviewed. | Project ID is required and validated; no full email or credentials are printed. Bootstrap CLI was not run against a Firebase project, as prohibited by the handoff. |
| R9 / T06: account/support/forced-change pages, confirmations, one-time display, theme | Pages, route guards, and component tests reviewed. | Focused AccountPages tests passed; confirmation and in-memory temporary-password display are present. |
| T07 / evidence and guides | Guide changes and implementation evidence were inspected. | Orchestrator reports full regression/build and emulator results. No change to task checklist or spec was made. |

## Verification

Before the fix, independent focused checks passed: 13 suites, 209 tests; the mounted synthetic probe reproduced R7-1. After the approved fix, the focused R7 suite passed all 9 tests, including eight new mixed-case regressions. A second synthetic probe confirmed lowercase and mixed-case protected routes return 403, the encoded account path remains blocked, the encoded API-prefix path does not route (404), the mixed-case password endpoint reaches its handler (400 for the intentionally empty body), and a blocked profile mutation leaves the stored name unchanged. The orchestrator reports the updated integrated regression at 36 suites / 645 tests passed, 3 opt-in tests skipped; all three opt-in emulator integrations passed; production build compiled successfully. Those integrated results were read from task evidence and were not independently rerun in the frozen snapshot.

## Handoff

R7-1 has been corrected under T04 with human approval and independently rechecked. No other material findings remain. The orchestrator should present this review and its evidence for the separate human merge decision; do not infer approval from this pass or the passing tests.
