# Independent review: T02 — protected create route and form

**Verdict: pass with follow-up**

Reviewed the human-approved specification v0.3, checklist v0.2, handoff v0.2, and Batch 2 assignment. T02 was reviewed against R2, R3, and R6 and scenarios 3–5, 9, 11, and 13–15.

## Review surface and separation

The implementation is uncommitted in the shared workspace, and no exact clean checkout or implementation commit was available. This is the assignment's documented separation exception. I inspected the live `git diff` for the changed tracked files, directly read the new T02 source and test files, inspected the API route/validation boundary as a dependency, and ran the T02 focused UI tests plus the direct/refresh server route tests. T01's implementation is present in the same workspace; it was considered only as the approved dependency and not re-reviewed as part of T02. No production or shared checklist/manifest files were edited.

Files reviewed for T02: `src/codeclinic/server/index.js`, `src/codeclinic/src/index.tsx`, `src/codeclinic/src/DashboardRouteGuard.tsx`, `src/codeclinic/src/tickets/TicketCreatePage.tsx`, `src/codeclinic/src/tickets/TicketCreatePage.css`, `src/codeclinic/test/server.test.js`, and `src/codeclinic/test/StudentTickets.test.tsx`.

## Criteria and evidence

- **R2 / scenarios 3–4:** direct route is registered in the client and server shell. `DashboardRouteGuard` waits for `/api/auth/session`, sends 401 visitors through the existing sign-in redirect, denies a mismatched TA role before rendering the form, and honors forced password change. Tests cover the pending session state, visitor redirect, TA denial, and direct/refresh shell responses.
- **R3 / scenarios 5, 9, 11, 13–15:** required fields and fixed language selector are labeled; required values are trimmed and checked; title/body/tag/source limits and exclusivity are checked before requesting CSRF; code files and repository references use the approved request names; the serialized body is measured in UTF-8 bytes. Errors are associated with controls or the source fieldset, invalid submission focuses the first invalid control, pending state disables resubmission and is announced, and failures preserve component state and stay on the form. Ticket content is rendered only as input values/text and is not interpreted as HTML.
- **R6:** global `box-sizing: border-box`, narrow viewport padding, full-width controls, and `:focus-visible` outlines support the 320 CSS-pixel target. The form uses native links, buttons, inputs, and textareas with visible labels.
- The implementation uses only the approved scope and no new dependency. The API remains the authority for authentication, role, CSRF, and input validation; client checks are not relied upon for authorization.

## Findings and unverified criteria

No implementation defect found. Real-browser keyboard-only and 320 CSS-pixel rendering were not exercised in this review; static CSS and DOM/test evidence were inspected. Record and complete the manual viewport/keyboard check in T04 integration verification. Authorization/CSRF/non-201 client failures share the same safe catch path; the focused UI tests exercise network, 503, and malformed-201 cases, while server authorization behavior is covered by the T01 API evidence.

## Verification

Exact commands and results are in [`logs/tasks/student-tickets/review-T02.md`](../../../logs/tasks/student-tickets/review-T02.md).
