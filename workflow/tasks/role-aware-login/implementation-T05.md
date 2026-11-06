# Implementation handoff — T05

Status: **Complete for T05; ready for independent review and orchestrator reconciliation.**  
Task: `role-aware-login`, Group 4 T05 only.  
Specification: `workflow/specs/role-aware-login.md`, version 0.2 (2026-11-05).  
Checklist: `workflow/tasks/role-aware-login/tasks.md`, version 0.2. T05 remains unchecked; this handoff does not update it or grant merge approval.

## Preflight and scope

Read the repository instructions, overview, workflow guide, implementer profile, approved specification and task artifacts, selected `openspec-apply-change` skill, existing implementation reports, review evidence, React source, Express source, and relevant tests. The repository's `workflow/README.md` defines the `workflow/specs/` adapter. The selected skill was auto-selected; its preflight says an absent OpenSpec root is not a reason to initialize OpenSpec and to continue normally. No OpenSpec files or CLI state were created or changed.

The shared worktree was already dirty with other agents' implementation and planning files. This task added only the T05 integration test and this scoped handoff plus factual log. No production source, dependency, config, shared report, checklist, spec, prior implementation/review evidence, service, or credential was changed or accessed.

## Implementation

Added `src/libconnect-mp4/test/LoginPage.integration.test.tsx`. It renders the real React `LoginPage`, routes its `fetch('/api/auth/login')` through Supertest into the actual Express `createLoginApp`, and supplies a synthetic repository, in-memory test auth store, and Argon2id-hashed synthetic accounts. It verifies the real request body and response, server-returned Librarian confirmation, protected cookie attributes, protected session read, CSRF rejection/acceptance, logout invalidation, uniform denial rendering, both real server rate-limit responses, and generic service failure with no console logging. The test submits an HTTP cookie explicitly because its required `Secure` attribute prevents a plaintext local test agent from automatically replaying it; the same server-issued cookie value is used for protected calls.

No production defect requiring T05 code changes was identified. The synthetic adapter intentionally does not claim to validate Firestore SDK durability or real transaction contention.

## Specification scenario evidence

| Scenario | Evidence and status |
| --- | --- |
| 1. Both fields blank; field errors, no request | `LoginPage.test.tsx`; direct component coverage, pass. |
| 2. Either field whitespace-only; field error, no request | `LoginPage.test.tsx`; direct component coverage, pass. |
| 3. One request with entered values, selected type, exact password | `LoginPage.test.tsx` asserts exact password and request count; new integration test verifies the real component request reaches Express. Pass. Email input whitespace is browser-sanitized by `type=email`; direct endpoint canonicalization is covered separately. |
| 4. Active Member success | `login.session.test.js`; direct endpoint coverage. New integration fixture has a synthetic active Member record but does not perform a separate React Member success path. |
| 5. Active Librarian success | New React→Express integration test; direct end-to-end test. |
| 6. Unknown email or wrong password; same error/no auth | New integration test covers unknown and wrong-password paths through React and Express; `login.session.test.js` verifies uniform endpoint body/no cookie. Pass. |
| 7. Both type mismatch directions; generic denial | `login.session.test.js` tests member-selected-as-librarian; T03/T04 tests cover the reverse. New integration test covers the Member account selected as Librarian. Pass across suites. |
| 8. Inactive account denial/no session | `login.session.test.js`; direct server endpoint test. No inactive account is exercised through React in the new integration suite. |
| 9. Forged role/manager/status/user ID/hash ignored | `login.session.test.js`; direct endpoint tests send forged fields and check server-stored authority. Not repeated through React integration. |
| 10. Malformed request or data-service failure; no authentication/sensitive output | `login.credentials.test.js` covers malformed input and synthetic repository failure response; new integration test covers repository failure as React-visible 503, no session, and no console output. Actual Firestore outage/logging is unverified. |
| 11. Email canonicalization and inconsistent mappings fail closed; registration collision | `login.credentials.test.js` covers canonical lookup and malformed/missing/duplicate mappings. Registration/email-change collision handling is outside this task and unimplemented; that clause is unverified here. |
| 12. Unknown account dummy hash and uniform 401 | `login.credentials.test.js` validates dummy Argon2id verification and generic 401; `login.session.test.js` checks denial body. Pass. |
| 13. Minimal 200, protected cookie, server-returned UI type | New integration test directly verifies React confirmation, actual Express 200 body, session creation and cookie flags. `login.session.test.js` covers both types and response minimization. Pass. |
| 14. Idle/absolute expiry, logout, status/role recheck, CSRF | `login.session.test.js` covers idle and absolute expiry, protected status/role rechecks, CSRF requirement, and logout invalidation. New integration test covers CSRF/logout lifecycle through Express. Expiry/status/role changes are server-level synthetic tests, not React integration. Firestore concurrency is unverified. |
| 15. Both rate thresholds, generic 429, no session/account lockout | New integration suite drives five canonical-email failures and thirty source failures through Express; it checks generic 429 and no session. `login.session.test.js` additionally checks active account status is unchanged. Pass with synthetic store. |

Browser direct access to account/hash records is absent from the inspected React login module; this test does not verify Firestore browser rules. Live Firebase and emulator access were not used.

## Verification

Commands run from `src/libconnect-mp4/`:

- `npm test -- --watchAll=false --runInBand test/LoginPage.integration.test.tsx` — passed: 1 suite, 7 tests.
- `npm test -- --watchAll=false --runInBand` — passed: 6 suites, 61 tests.
- `npm run build` — passed; optimized production build compiled successfully.

The test command emitted the dependency-tree Node `punycode` deprecation warning. The build emitted the existing Node `fs.F_OK` deprecation warning. Neither command failed.

## Changed files

- `src/libconnect-mp4/test/LoginPage.integration.test.tsx` (new)
- `workflow/tasks/role-aware-login/implementation-T05.md` (new)
- `logs/tasks/role-aware-login/implementation-T05.md` (new factual execution log)

## Remaining risks and unverified cases

- Firestore SDK behavior, durable cross-process sharing, and actual transaction conflict/retry behavior remain unverified; tests use an isolated synthetic repository/store.
- Browser Firestore security rules, least-privilege IAM, HTTPS deployment behavior, and trusted reverse-proxy deployment policy remain separately gated and were not accessed or changed.
- Registration/email-change canonical-collision handling remains outside login implementation and is unverified (scenario 11 clause).
- Scenarios 4, 8, 9, and 14 receive server-level suite evidence but not complete React integration repetition; scenario 10 uses a synthetic data-service failure only.
- T05's result is ready for independent review. No checklist status or approval was changed.
