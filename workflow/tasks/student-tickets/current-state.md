# Current state: student-tickets

Updated: 2026-11-12 (Asia/Singapore)
Purpose: navigation index only; verify against linked primary evidence. This file grants no approval.

## Batch 6 reviewed checkpoint

- The human separately approved specification v0.5, checklist v0.4, handoff v0.4, batch plan v0.3, and implementation dispatch. T06 and T07 were completed by one implementer and independently reviewed by a different reviewer. See [`assignment-batch-6.json`](assignment-batch-6.json), [`implementation-T06.md`](implementation-T06.md), [`implementation-T07.md`](implementation-T07.md), and [`review-report.md`](review-report.md).
- The Create Ticket form now selects local UTF-8 text files, shows names and byte sizes, supports removal, and retains the server's three-file, 24 KiB per-file, and 128 KiB request limits. Ticket and create-page help-chat sends are blocked during reads. No server API, storage schema, dependency, provider, or deployment file changed.
- T06 focused tests passed (2 suites, 28 tests). T07 integration tests passed (4 suites, 96 tests), and the production build passed. The reviewer independently reran the integration suite and a focused 20-test suite after the source-error focus correction. The human reported the `/student/tickets/new` 320 × 640 picker, error, focus, overflow, popup, and submit check passed before that focus-only correction; the reviewer assessed a repeat was unnecessary. The Batch 6 completion manifest validated, and T06–T07 are checked.
- Open findings: none in the attachment scope. The shared-workspace review provenance limitation remains recorded in the review report. Next action: obtain separate human commit and merge decisions. No commit, merge, push, or deployment is authorized by this checkpoint.
## Historical file-picker planning checkpoint

- The human requested that Create Ticket accept selected file attachments instead of manual filename/content paste fields while retaining the file size limit, then explicitly approved [`workflow/specs/student-tickets.md`](../../specs/student-tickets.md) v0.5. The v0.4 implementation remains the current production baseline.
- The proposed scope keeps the existing UTF-8 text `files` JSON contract, three files at most, 24 KiB per file, 128 KiB serialized request, repository-source exclusivity, and independent server validation. It adds a browser file picker, file list/removal, accessible rejection, and read-in-progress protection for ticket and create-page help-chat requests. No production code, tests, API, data model, dependencies, or deployment files were changed in this phase.
- Spec/security analysis was based on `TicketCreatePage.tsx`, `server/tickets/validation.js`, the v0.4 specification, and the existing Student help-chat contract. The human separately approved [`tasks.md`](tasks.md) v0.4, [`handoff.md`](handoff.md) v0.4, [`batch-plan.md`](batch-plan.md) v0.3, and [`batch-6-dispatch-proposal.md`](batch-6-dispatch-proposal.md). A separate test writer added preimplementation cases in `StudentTickets.test.tsx`; the final focused run had 21 passes and six expected picker-dependent failures. [`attachment-test-coverage.md`](attachment-test-coverage.md) records the pending-read test gap. [`assignment-batch-6.json`](assignment-batch-6.json) assigns T06 then T07 under different implementer/reviewer identities; the structural plan validator passed. Implementation may begin, followed by independent review. No production code has changed for v0.5 at this checkpoint.

The earlier completed v0.4 checkpoint below remains historical.

## Approved artifacts and checklist

- Specification: [`workflow/specs/student-tickets.md`](../../specs/student-tickets.md) v0.4; checklist: [`tasks.md`](tasks.md) v0.3; analyst handoff: [`handoff.md`](handoff.md) v0.3; original batch plan: [`batch-plan.md`](batch-plan.md) v0.2 with T05 revision note. The earlier v0.3/v0.2 artifact approval history and T05 human direction are recorded in the handoff and conversation.
- T01–T05 are checked after independent review. The original assignments and evidence are linked from [`assignment-batch-1.json`](assignment-batch-1.json), [`assignment-batch-2.json`](assignment-batch-2.json), and [`assignment-batch-3.json`](assignment-batch-3.json). The T01 corrective assignment is [`assignment-batch-4.json`](assignment-batch-4.json); T05 follow-up is [`assignment-batch-5.json`](assignment-batch-5.json).

## Historical v0.4 findings and next action

- T04's final focused run passed 3 suites/59 tests; the final full run passed 41 suites/738 tests with 3 suites/3 tests skipped; production build and isolated demo Firestore C1 assertion passed. Local headless Chrome at 320 CSS pixels passed keyboard, focus/error, and overflow checks with synthetic session/CSRF/create stubs; this does not exercise browser-to-real-API authentication. The CUA browser host remained unavailable. The independent T04 and combined review passed after local harness finding T04-W1 was resolved. See [`implementation-T04.md`](implementation-T04.md), [`security-T04.md`](security-T04.md), and [`review-T04.md`](review-T04.md).
- T05 adds the shared header to the verified Student create page and disables the initial language placeholder. Its focused UI suite passed 14/14 tests, build passed, and independent review passed with a provenance limitation from untracked files in the shared workspace. See [`implementation-T05.md`](implementation-T05.md) and [`review-T05.md`](review-T05.md). `AppHeader.tsx` was not edited for T05; the human's button order remains.
- Next permitted action: present the completed implementation and review evidence for the separate human commit and merge decisions.
- Approval boundary: No commit, merge, push, deployment, or publication has been approved by the Batch 3 dispatch. The checked checklist records reviewed implementation, not a release decision.

The approved artifacts, assignments, reports, and factual logs remain the primary records. Update this index only after a material result, approval, blocker, or change in the next permitted action.
