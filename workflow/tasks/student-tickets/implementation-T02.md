# Implementation report: T02 — protected create route and form

Status: **implemented; ready for independent review**

Specification: `workflow/specs/student-tickets.md` v0.3. Checklist: `workflow/tasks/student-tickets/tasks.md` v0.2. Assignment: Batch 2, T02 first, approved in `batch-2-dispatch.md`.

The `/student/tickets/new` deep link is served by the existing frontend shell and registered in the React entry point. It reuses `DashboardRouteGuard` and renders the form only after the server session confirms an active Student; visitor redirect and wrong-role denial reuse established guard behavior. The form provides required and optional inputs, fixed language choices, bounded fields, normalized tag submission, exclusive file/repository source validation, accessible field errors and pending state, and safe failure feedback that preserves entered values. A verified `201` navigates to the dashboard; transient success copy is T03.

Acceptance criteria R2, R3 and R6: implemented. Direct and refreshed deep links, visitor/TA outcomes, whitespace validation, fixed language choices, limits, CSRF request, duplicate-submit prevention, failure handling and response validation are covered by the focused tests. CSS uses shared theme variables, visible `:focus-visible` outlines, and narrow viewport rules down to 320 CSS pixels. A separate manual browser/keyboard session was not available in this verification; responsive and keyboard behavior therefore still merits reviewer inspection.

Changed files: `src/codeclinic/server/index.js`, `src/codeclinic/src/index.tsx`, `src/codeclinic/src/DashboardRouteGuard.tsx`, new `src/codeclinic/src/tickets/TicketCreatePage.tsx` and `.css`, `src/codeclinic/test/server.test.js`, and `src/codeclinic/test/StudentTickets.test.tsx`.

Verification commands and exact results are in [`implementation-T02.md` log](../../../logs/tasks/student-tickets/implementation-T02.md). No product-contract deviation was made. Manual visual and keyboard inspection remains a review limitation.

## T02 follow-up

During orchestrator review, client/server validation drift was identified for Unicode code-point limits, repository URL/path validation, and the aggregate 128 KiB JSON body limit. The form was corrected to count code points, reject the server's unsafe repository cases before requesting CSRF, use UTF-8 byte sizing for files and the serialized request, and preserve filenames and repository paths when building the request. Focused UI cases now cover a 255-code-point emoji title boundary, a 30-code-point tag, query/dot-segment rejection, and the aggregate body cutoff. The initial rerun exposed that `TextEncoder` is unavailable in this Jest jsdom environment; browser `Blob.size` now supplies UTF-8 byte counts in both checks.

Post-correction verification passed: 11 T02 frontend tests, 10 server tests, and a clean production build. Detailed rerun commands and results are appended to the log. T03 was pending when this report was completed and is recorded separately in `implementation-T03.md`.
