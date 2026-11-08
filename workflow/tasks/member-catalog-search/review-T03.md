# T03 independent review — pass with follow-up

Task `member-catalog-search`, batch 2. Reviewed canonical specification v0.1 (SHA-256 `AE609123AD4151616BADFEA10C1EE91B710E1C441E17D43FE77C8703D91A4842`), checklist/handoff v0.2, approved T01 final contract, batch manifest, T03 implementation report/log, current untracked catalog route/contract and endpoint tests, plus tracked `server/auth/login.js` and `server/index.js` against clean HEAD. The manifest records the shared-workspace exception; this separate reviewer made no production change. Factual checks are in `logs/tasks/member-catalog-search/review-T03.md` after staging transfer.

## Verdict and criteria

**Pass with follow-up.** The production `createServerApp` registers `GET /api/member/catalog` through `createLoginApp`. The route reuses its private `authenticateRequest`, which checks the cookie-backed stored session, current account, active status, role consistency, and session touch on each request. Authentication precedes query parsing and Book access. A valid librarian gets 403; missing, expired, inactive, or role-changed sessions get 401. Strict allowed-key, duplicate-key, text, year, page-size, and cursor checks return 400 before Book access. Session or Book service failure returns a fixed 503 body. Success exposes only four Book display fields and five pagination/state keys, with `Cache-Control: no-store`; no query/Book/session logging or Book writes were introduced. Existing login, CSRF, and logout behavior is unchanged apart from route registration.

| T03 acceptance | Evidence | Status |
| --- | --- | --- |
| R5, scenarios 11–12: trusted active-member enforcement and forged claims | endpoint tests for no session, expired/inactive, librarian, role change, and forbidden query keys; login session regression suite | Pass in synthetic tests |
| R5: query/cursor validation, bounded response, 400/401/403/503 | `contract.js` inspection and 26 combined catalog tests; endpoint tests assert denials before Book access, cursor mismatches, service failure, and output shape | Pass in synthetic tests |
| R6, scenarios 10 and 13: safe server output and error isolation | endpoint tests assert fixed 503, no private Book field, and markup-like synopsis returned as data; static inspection found no raw-content logging | Pass at server boundary; client rendering unverified |
| Combined T02+T03 and existing server behavior | 39/39 focused and regression Jest tests | Pass locally |

## Findings and limits

- **Low — validation boundary coverage, `test/member-catalog.endpoint.test.js`:** The tests cover common malformed/forged inputs but do not directly exercise the 8,192-byte request-target boundary, 256-code-point pretrim boundary, 4,096-character cursor boundary, invalid UTF-8 cursor JSON, or every invalid document-ID form. Code inspection found the corresponding guards. Add boundary cases in T06 verification or when the endpoint is next touched.
- **Low — response/logging verification, `test/member-catalog.endpoint.test.js`:** Synthetic tests assert fixed error bodies and minimal output, but do not spy on logging or exercise an account-repository failure separately from a session-store failure. Static inspection found no newly introduced content logging; a focused failure-path check would strengthen evidence.
- **Low — local-only integration limit:** No emulator or cloud query was run, in keeping with the human's explicit local-only constraint. Installed SDK query construction and synthetic fakes cannot verify actual Firestore data or instance edition. The conditional read budget and absent/empty `books` collection behavior remain to be verified operationally when external access is separately authorized.

No blocking T03 finding or unauthorized policy change was found. The combined server path correctly passes normalized validated filters and raw-ID continuation to T02. Frontend denial, stale-response, empty/no-match presentation, and safe text rendering remain T04–T06 work, not T03 passes. This review does not grant merge or later-batch approval.
