# Student tickets preimplementation test coverage

Status: tests revised against approved specification v0.3, checklist v0.2, and handoff v0.2. Human approval is recorded in the artifact headers and conversation. The earlier v0.2 baseline is retained in the factual execution log; this report describes the current v0.3 suite.

The tests exercise observable HTTP and frontend behavior using the existing Jest, React Testing Library, Supertest, and `createServerApp` patterns. The API fixture uses an in-memory Firestore-compatible adapter and synthetic sessions and records. It uses no external services or production data.

| Requirement | Coverage |
| --- | --- |
| R1 | Student dashboard `Ask for Help` link and Student-only header link destination; TA header absence; no premature success text. |
| R2 | Direct entry waits for server session validation; Student render; visitor sign-in behavior; TA denial and no form. Refresh and server deep-link checks remain for integration verification. |
| R3 | Required controls, whitespace invalidation, accessible field feedback, first-invalid focus, local no-request validation, whitespace trimming, pending announcement, and duplicate-submit prevention. Language is a fixed selector with the seven approved options, no free-text language control, and the `Other` note. Revised title/detail/error-output control limits are checked. |
| R4 | API visitor/TA/inactive/changed-role denial, CSRF, forged fields rejected or ignored, C1 document path and exact field set, `OPEN` with null claim/resolution values, Firestore Timestamp-shaped creation/update fields, empty optional arrays/nulls, `files` and `repoFilePaths`, fixed language allowlist, normalized five-tag maximum, revised field and repository limits, malformed/oversized input, source-method exclusivity, storage failure, and no persisted Notification. |
| R5 | Client sends CSRF; a valid `201` navigates to dashboard and expects transient success; network, service, and malformed-response failures remain on the form with safe feedback and no success. |
| R6 | Visible labels and programmatic field feedback use accessible queries; invalid fields expose `aria-invalid`; first invalid field receives focus. Keyboard-only operation and visual inspection at 320 CSS pixels remain manual integration checks. |

Acceptance scenarios 1–10 are covered in part or in full. Scenario 11 has API literal-storage coverage; rendering should be verified with the create page and any later ticket display. Scenario 12 checks the repository reference values but does not instrument outbound network activity. Scenario 13's keyboard and viewport behavior remain manual. Scenario 14 is checked in the UI. Scenario 15 is covered server-side for normalization, normalized duplicates, and the five-item cap.

## Assumptions and gaps

- API tests call `/api/tickets` through the public `createServerApp` surface, without requiring a particular router export or internal module arrangement. The in-memory adapter implements the existing Firestore document methods needed by the server.
- The forged-field scenario allows either `400` rejection or `201` with unchanged server-owned values, as specified. The successful creation case independently checks the full C1 record.
- Firestore Timestamp evidence checks the stored value's `Timestamp` class name and `toDate`/`toMillis` methods, avoiding a test-only import that the repository's Jest resolver could not resolve. Emulator integration should confirm the concrete Admin SDK Timestamp type.
- Validation tests cover representative limits and invalid combinations, not every R4 boundary permutation. Reviewer should verify all fixed language cases, UTF-8 byte accounting, all text min/max values, filename control characters, repo URL credentials/fragment cases, aggregate repository paths, and all path safety rules.
- Server-side direct-route/refresh behavior, failure value preservation, browser Firestore boundary, actual no-fetch behavior, and 320-pixel/keyboard operation need the T04 integration and review evidence.
- The shared server currently applies an 8 KiB JSON parser before route mounting, while v0.3 allows 128 KiB. The 24 KiB accepted-file request is included to expose this constraint once the endpoint exists.

Changed test files: [StudentTickets.test.tsx](../../../src/codeclinic/test/StudentTickets.test.tsx) and [student-tickets.api.test.js](../../../src/codeclinic/test/student-tickets.api.test.js). Exact focused command and v0.3 baseline: [test-writer log](../../../logs/tasks/student-tickets/test-writer.md).
