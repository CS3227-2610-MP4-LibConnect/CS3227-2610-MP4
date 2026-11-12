# Implementation T06: Create Ticket file picker

Specification: `workflow/specs/student-tickets.md` v0.5. Checklist: `workflow/tasks/student-tickets/tasks.md` v0.4. Handoff: v0.4. Assignment: Batch 6, T06 then T07. Dispatch was approved in `batch-6-dispatch-proposal.md`.

Status: **Complete; ready for independent review.**

Implemented local multiple-file selection in `TicketCreatePage.tsx`. The picker validates basename, byte size, and resulting count before reading. It reads bytes through `FileReader`, strictly decodes UTF-8, and adds a selection atomically; read/decode failures retain previously accepted files. Accepted filenames and byte sizes are shown with per-file removal. Paste filename/content fields are removed. The accepted content remains page-local and the create API still receives only `{ filename, content }`; the size metadata is not serialized. File selection remains independent of the repository fields, with existing source exclusivity and serialized 128 KiB submission checks intact.

A synchronous pending-read ref blocks direct form submission and the `StudentHelpChat` send handler; the UI also disables ticket submission and file changes during reading. Added deterministic pending-read coverage with a held `FileReader` result. Updated the create-page chat draft test to select a synthetic file.

The source-conflict error focuses the live file picker when files are selected, with `aria-invalid` and `aria-describedby` pointing to the source error. It no longer targets a detached filename field from the removed paste UI. A regression assertion verifies focus and the accessible error association for a files-plus-repository submission.

Files changed for T06:
- `src/codeclinic/src/tickets/TicketCreatePage.tsx`
- `src/codeclinic/src/tickets/StudentHelpChat.tsx`
- `src/codeclinic/test/StudentTickets.test.tsx`
- `src/codeclinic/test/StudentTicketHelpChat.test.tsx`
- `logs/tasks/student-tickets/implementation-T06-test.txt`

Verification: `cd src/codeclinic; npm test -- --watchAll=false --runInBand StudentTickets.test.tsx StudentTicketHelpChat.test.tsx` — **pass**, 2 suites, 28 tests. After the independent review finding was fixed, this command was rerun with the source-conflict focus regression and again passed 2 suites/28 tests. `npm run build` also passed after the correction. Full output and the earlier iterations remain in the linked test log and Batch 6 build log. The passing UI run emitted existing React `act(...)` console warnings from dashboard/notification effects; no test failed.

Acceptance coverage: local UTF-8 selection, metadata and removal; no paste controls; rejection of oversized files, invalid basename, undecodable UTF-8, and selections over three while preserving earlier accepted files; repository exclusivity with live focus and accessible error linkage; existing payload shape and 128 KiB check; page-only state; ticket and create-help-chat no-send behavior while reading. Existing server validation and API contract were not changed.

Deviations and unresolved risks: none identified in the T06 scope. Browser/keyboard verification is assigned to the human under T07 and remains outstanding. Earlier failing iterations are preserved in the log; final result is passing.

Next permitted item under the approved batch: T07 documentation update and focused suites/build. Do not treat this report as independent review or merge approval.
