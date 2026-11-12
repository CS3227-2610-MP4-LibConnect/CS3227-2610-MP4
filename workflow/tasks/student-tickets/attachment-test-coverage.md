# T06/T07 file-picker test coverage

Status: preimplementation tests written against approved student-tickets specification v0.5, checklist v0.4, and handoff v0.4.

| Approved behavior | Test coverage |
| --- | --- |
| Scenario 16: select one or more UTF-8 files, list names, remove an accepted file, submit existing JSON shape | `StudentTickets.test.tsx`: valid selection, no paste fields, removal, `files: [{ filename, content }]` payload, no browser storage |
| Scenario 17: reject >24 KiB, invalid basename, invalid UTF-8, or selection over three; preserve earlier files and show accessible feedback | `StudentTickets.test.tsx`: each invalid-file class uses a parameterized case; fourth-file case checks the three-file cap and earlier file retention |
| Scenario 18: files conflict with repository source; serialized request exceeds 128 KiB | `StudentTickets.test.tsx`: source-conflict submission is blocked; three maximum-sized accepted files plus large ticket text trigger the existing serialized-body limit |
| Scenario 19: removal affects next ticket request; no browser storage | `StudentTickets.test.tsx`: removal is reflected in next ticket payload and local/session storage stay empty |

Pending-read suppression for both ticket submission and create-page help chat remains an implementation verification gap. The test writer did not impose a file decoding API or introduce a production test seam solely to control read timing; the implementer should add deterministic coverage using the selected reader path.

Net changed test file: `src/codeclinic/test/StudentTickets.test.tsx`. `StudentTicketHelpChat.test.tsx` has no net change. No production/API/server test was changed. Server-side independent enforcement remains covered by existing API tests and is outside this test-writing change.

An initial exploratory run included pending-read checks coupled to `File.text()` and produced 2 suites, 29 tests, 8 failed and 21 passed. Those test-only checks were removed because the spec allows other reader implementations; the initial full output was overwritten and is not retained. Final focused Jest result: 2 suites, 27 tests, 6 failed and 21 passed. All six failures are new picker-dependent cases against the current v0.4 baseline, which has no file picker; the help-chat suite passed. The retained complete output and exact failing test names are in [`attachment-test-writer-run.txt`](../../../logs/tasks/student-tickets/attachment-test-writer-run.txt); execution details and assumptions are in [`attachment-test-writer.md`](attachment-test-writer.md).
