# Factual review log: Batch 4

Task: `student-ticket-activity`, Batch 4, T03.
Reviewer: `ticket_batch_4_reviewer` (separate agent from implementer).
Spec/checklist/handoff: v0.3 / v0.2 / v0.2.
Workspace: shared workspace under the approved assignment exception; no clean
worktree was available. No live service or emulator was used.

## Files inspected

- `AGENTS.md`, `workflow/README.md`
- `workflow/tasks/student-ticket-activity/current-state.md`
- `workflow/specs/student-ticket-activity.md`
- `workflow/tasks/student-ticket-activity/tasks.md`
- `workflow/tasks/student-ticket-activity/handoff.md`
- `workflow/tasks/student-ticket-activity/approval-batch-4.md`
- `workflow/tasks/student-ticket-activity/assignment-batch-4.json`
- `workflow/tasks/student-ticket-activity/review-report-batch-3.md`
- `workflow/tasks/student-ticket-activity/implementation-T03-batch-4.md`
- `logs/tasks/student-ticket-activity/implementation-T03-batch-4.md`
- Assigned route and test files, including parser handler and parser-error test.

## Review observations

- `src/codeclinic/server/tickets/route.js`: parser error handler sets
  `Cache-Control: no-store` for `entity.too.large` (413) and malformed JSON
  `SyntaxError` (400), before sending each response.
- `src/codeclinic/test/student-tickets.api.test.js`: the parser-error test
  covers both `replies` and `close`, checks malformed and oversized cases,
  asserts statuses and cache headers, and checks no reply write and unchanged
  active ticket status.
- The Batch 3 review identified these exact missing headers. The reviewed
  Batch 4 delta adds the two header writes and associated assertions; other
  route/test changes belong to earlier batches in this shared workspace.

## Verification

From `src/codeclinic`, ran:

```text
npm test -- --watchAll=false --runInBand --runTestsByPath test/student-ticket-activity.contract.test.js test/student-tickets.api.test.js test/student-tickets.storage.test.js
```

Result: **pass**, 3 suites and 89 tests passed; 0 failed. Jest emitted the
existing Node `punycode` deprecation warning.

To check combined T04 dashboard/placeholder behavior, ran:

```text
npm test -- --watchAll=false --runInBand --runTestsByPath test/StudentTicketActivity.test.tsx --testNamePattern='dashboard shows the latest five active summaries|dashboard shows a loading state|My Tickets direct visits|does not show My Tickets|dashboard distinguishes failed active-ticket loads'
```

Result: **pass**, 1 suite passed; 6 tests passed, 3 unrelated tests skipped by
the name filter. Jest emitted the same Node `punycode` deprecation warning.

## Verdicts

- T03: **pass**.
- Combined T03/T04: **pass with follow-up**. T04's production build, direct
  shell-route HTTP check, 320-pixel visual review, and broader integration /
  emulator verification remain assigned to T06.

No files outside the two assigned review evidence paths were changed by this
review. No checklist or manifest status was updated.
