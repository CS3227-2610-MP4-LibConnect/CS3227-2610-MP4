# Implementation T07: guide and verification

Specification: `workflow/specs/student-tickets.md` v0.5. Checklist: `workflow/tasks/student-tickets/tasks.md` v0.4. Handoff: v0.4. Batch: 6, implemented sequentially after T06.

Status: **Complete; ready for independent review.**

Updated `docs/UserGuide.md` and `docs/DeveloperGuide.md` to explain local UTF-8 text selection, the 24 KiB per-file and three-file limits, file metadata/removal, selection rejection and retention behavior, pending-read guards, the unchanged JSON `files` request shape, the 128 KiB client/server body limits, and the server's independent validation. The Developer Guide states that the browser sends no file-size metadata and that the API/data contract remains unchanged.

T07 files changed:
- `docs/UserGuide.md`
- `docs/DeveloperGuide.md`
- `workflow/tasks/student-tickets/implementation-T07.md`
- `logs/tasks/student-tickets/implementation-T07.md`
- `logs/tasks/student-tickets/implementation-T07-test.txt`
- `logs/tasks/student-tickets/implementation-T07-build.txt`

Verification from `src/codeclinic`:
- `npm test -- --watchAll=false --runInBand StudentTickets.test.tsx StudentTicketHelpChat.test.tsx StudentHelpChat.test.tsx student-tickets.api.test.js` — **pass**, 4 suites and 96 tests.
- `npm run build` — **pass**, optimized production build compiled successfully.

The test output includes non-failing React `act(...)` warnings from existing dashboard and notification effects. The final focused test run and final build output are preserved in their logs. Earlier successful runs are retained there as well.

Human browser/keyboard check: the orchestrator reported the human's result for `/student/tickets/new` at 320 × 640 CSS pixels: picker listing and removal, oversized-file error, focus, overflow, help popup, and Submit usability all passed. This is recorded as human-reported; I did not observe the browser session directly.

Acceptance status: guide updates and the required focused UI, help-chat, API checks, and production build are complete. API tests confirm the unchanged server authorization and size contract; no server, route, gateway, schema, dependency, or package files were changed. T06's file handling and pending-read criteria are recorded separately in `implementation-T06.md`.

Deviations and unresolved risks: none identified in the assigned implementation. Independent review remains pending. No commit, merge, push, provider, or deployment action was performed.
