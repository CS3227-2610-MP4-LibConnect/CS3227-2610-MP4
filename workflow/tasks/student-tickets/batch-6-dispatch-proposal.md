# Batch 6 dispatch proposal: Create Ticket file picker

Date: 2026-11-12. Task: `student-tickets`. **Human dispatch approved in conversation.**

Approved inputs: specification v0.5, checklist v0.4, handoff v0.4, and batch
plan v0.3, each separately human-approved. The earlier T01–T05 completion
evidence remains historical. Preimplementation picker tests are in
`src/codeclinic/test/StudentTickets.test.tsx`; the retained focused baseline
has 21 passes and six expected picker-dependent failures. See
`attachment-test-coverage.md` and `logs/tasks/student-tickets/attachment-test-writer-run.txt`.

Dispatch one implementer for **T06, then T07**, verifying T06 before starting
T07. Use one different reviewer after both items to review each and the
combined change. Assignment: `assignment-batch-6.json`. The implementation
skill is `openspec-apply-change` through the repository's canonical
`workflow/specs/` adapter.

- T06: replace Create Ticket's manual filename/content fields with local
  UTF-8 text file selection, accepted-file metadata and removal, accessible
  rejection, and pending-read guards for ticket and create-page chat. Keep
  three files, 24 KiB per file, 128 KiB serialized JSON, existing `files`
  payload, source exclusivity, and server enforcement. Add deterministic
  pending-read tests using the chosen reader path; make the six baseline
  picker cases pass.
- T07: update both guides, run the focused Create Ticket, Student help-chat,
  and ticket API suites plus the production build, then record separate T06
  and T07 implementation evidence. The reviewer verifies the exact diff,
  unchanged API/authorization boundary, and both item results. The human
  performs the required browser/keyboard check at `/student/tickets/new` at
  320 × 640 CSS pixels; record the observation without claiming it in advance.

Allowed implementation paths are the four ticket UI component/style files
named in handoff v0.4, focused Student ticket/chat UI tests, the two guides,
and Batch 6 task reports/logs. Existing server code and API tests are
read/run-only. Use synthetic files and local checks; no production data,
provider call, new dependency, CI/deployment change, commit, push, merge,
or external action is approved by this proposal.

Approval record: after separately approving batch plan v0.3, the human
explicitly replied "approved" to the request to dispatch Batch 6 T06–T07
implementation and subsequent independent review under this exact scope.
Commit, merge, provider access, and deployment remain separate decisions.
