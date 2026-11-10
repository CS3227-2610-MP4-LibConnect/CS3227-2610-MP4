# Current state: student-ticket-activity

Updated: 2026-11-10 (Asia/Singapore)
This file is a navigation index, not approval evidence.

- Human confirmed task ID `student-ticket-activity` and approved specification
  [`workflow/specs/student-ticket-activity.md`](../../specs/student-ticket-activity.md)
  v0.2 in the conversation, including the indexed dashboard query.
- Checklist [`tasks.md`](tasks.md) v0.1 and handoff [`handoff.md`](handoff.md)
  v0.1 received separate human approval in the conversation. The test writer
  added two preimplementation suites; the focused run failed as expected
  (2 suites/9 tests). See [`test-coverage-report.md`](test-coverage-report.md)
  and the factual log. At that preimplementation checkpoint no production
  source or index configuration had changed.
- [`batch-plan.md`](batch-plan.md) v0.1 groups T01–T06 into three
  consecutive pairs. The human approved the plan, Batch 1 dispatch (T01 then
  T02), and a read-only edition check on 2026-11-09; see
  [`approval-batch-1.md`](approval-batch-1.md). The check found the production
  `(default)` database is Firestore STANDARD edition. Batch 1 assignment is
  [`assignment-batch-1.json`](assignment-batch-1.json).
- The user's existing uncommitted Student dashboard text removal is preserved.
- Batch 1 implementation reports and logs are complete. The independent
  [`review-report.md`](review-report.md) passes T01, including a synthetic
  local Firestore emulator query; T01 is checked off. T02 remains unchecked:
  malformed ticket IDs return 503 instead of 400, missing Student authors can
  be labeled TA, and the complete-thread response conflicts with R5's bounded
  response requirement. The combined batch requires changes.
- On 2026-11-10, the human specified `[deleted account]` for a missing owner
  author and approved 50-reply blocks. The canonical
  [`specification`](../../specs/student-ticket-activity.md) is now v0.3;
  [`approval-spec-v0.3.md`](approval-spec-v0.3.md) records the decisions.
  Checklist v0.2 received separate human approval on 2026-11-10; see
  [`approval-checklist-v0.2.md`](approval-checklist-v0.2.md). Handoff v0.2
  received separate approval; see
  [`approval-handoff-v0.2.md`](approval-handoff-v0.2.md).
- The human approved revised [`batch-plan.md`](batch-plan.md) v0.2 and T02-only
  Batch 2 remediation dispatch on 2026-11-10; see
  [`approval-batch-2.md`](approval-batch-2.md). The completed and validated
  Batch 2 manifest is [`assignment-batch-2.json`](assignment-batch-2.json).
  The independent [`Batch 2 review`](review-report-batch-2.md) passes T02 and
  passes combined T01/T02 behavior with follow-up for T03 routes and T06
  emulator paging. T02 is checked off. Human review/merge decision and later
  batch dispatch are pending. The v0.3 test
  [`coverage addendum`](test-coverage-v0.3.md) and full log are ready; its
  focused run had 3 failing suites (9 failed, 47 passed), reflecting T02 gaps
  and later UI work.
  Later batches, index
  deployment, commit, and merge remain separate gates.
- On 2026-11-10, the human approved the Batch 2 review findings and Batch 3
  dispatch (T03 then T04); see [`approval-batch-3.md`](approval-batch-3.md).
  [`assignment-batch-3.json`](assignment-batch-3.json) records the scoped
  implementation and independent review assignment.
- Batch 3 implementation and independent review are recorded in the T03/T04
  reports and [`review-report-batch-3.md`](review-report-batch-3.md). T04 passed
  with T06 build, visual, and direct server-shell checks outstanding, and is
  checked off. T03 remains unchecked because parser-level 400/413 ticket API
  responses omit `Cache-Control: no-store`; the combined review requires
  changes. The manifest passed completion-structure validation before the
  T04 checklist update. No further batch is dispatched pending a human
  review decision and revised [`batch-plan.md`](batch-plan.md) v0.3 approval;
  the precise fix is in
  [`batch-3-remediation-proposal.md`](batch-3-remediation-proposal.md).
- The human approved Batch 3 review findings, revised batch plan v0.3, and
  T03-only Batch 4 dispatch on 2026-11-10; see
  [`approval-batch-4.md`](approval-batch-4.md). The scoped assignment is
  [`assignment-batch-4.json`](assignment-batch-4.json).
- Batch 4 independently passed T03 and combined T03/T04 behavior; see
  [`review-report-batch-4.md`](review-report-batch-4.md). Parser-level 400/413
  responses now include `Cache-Control: no-store`. The focused API, contract,
  and store run passed 89 tests; the focused T04 run passed 6 tests with 3 T05
  cases excluded. The completed assignment manifest passed structural
  validation before T03 was checked off. T05 and T06 remain. Build, direct
  server-shell HTTP behavior, 320-pixel visual review, and emulator integration
  remain assigned to T06. Batch 5 requires a human review decision and
  separate dispatch approval.
- On 2026-11-10, the human approved the Batch 4 findings and Batch 5 dispatch
  (T05 then T06) with independent review; see
  [`approval-batch-5.md`](approval-batch-5.md). The scoped
  [`assignment-batch-5.json`](assignment-batch-5.json) passed `plan` and later
  `complete` structural validation. Separate T05/T06 implementation reports
  and [`Batch 5 independent review`](review-report-batch-5.md) are complete.
  T05 requires two corrections: untrusted stored repository URL navigation and
  unconfirmed close-failure feedback. T06 passed with follow-up, but the real
  320 CSS-pixel browser inspection remains unverified because the browser host
  was unavailable. Both T05 and T06 remain unchecked. The exact proposed
  remediation is in [`batch-5-remediation-proposal.md`](batch-5-remediation-proposal.md).
  A human review decision and new dispatch approval are required before more
  implementation. Commit, merge, push, index deployment, and publication remain
  separate gates.
- On 2026-11-10, the human approved the Batch 5 findings, batch plan v0.4, and
  Batch 6 dispatch (T05 remediation then T06 verification); see
  [`approval-batch-6.md`](approval-batch-6.md). The scoped
  [`assignment-batch-6.json`](assignment-batch-6.json) passed `plan` structural
  validation. Implementation and independent review are in progress. The
  earlier Batch 5 findings and 320-pixel verification gap remain open until
  Batch 6 evidence is reviewed.
- Batch 6 implementation and independent [`review`](review-report-batch-6.md)
  are complete; its manifest passed `complete` structural validation. The
  repository URL is now plain text and failed close feedback correctly says
  status is unconfirmed. T05 still requires one correction: the close control
  remains enabled before the required status refresh. T06 passed with follow-up
  on tests/build/emulator but still lacks rendered 320-pixel inspection because
  the browser host was unavailable. Both items remain unchecked. See
  [`batch-6-remediation-proposal.md`](batch-6-remediation-proposal.md) and
  proposed batch plan v0.5. Human review and Batch 7 dispatch approval are
  pending; no commit, merge, push, or live index deployment is approved.
- On 2026-11-10, the human approved the Batch 6 findings, batch plan v0.5,
  and Batch 7 dispatch (T05 then T06); see [`approval-batch-7.md`](approval-batch-7.md).
  [`assignment-batch-7.json`](assignment-batch-7.json) passed `plan` structural
  validation. Implementation and independent review are in progress. T05's
  close-action lock and T06's rendered 320-pixel check remain open until review.
- Batch 7 implementation and independent [`review`](review-report-batch-7.md)
  are complete; its manifest passed `complete` structural validation. The
  close action is locked after an unconfirmed close or failed refresh, including
  a 409 path, and a successful read reconciles active or terminal status. The
  focused UI suite passed 16/16, the full suite 43 suites/798 tests, the
  production build, and the local synthetic emulator 1/1. The reviewer found
  no further production defect and returned pass with follow-up for T05, T06,
  and combined behavior. Actual rendered 320 CSS-pixel layout, horizontal
  overflow, and visible focus remain unverified because browser inventory was
  empty and the host unavailable. Keep T05 and T06 unchecked until that
  criterion is verified. Human review/merge decision is pending; no commit,
  merge, push, or live index deployment is approved.
- [`batch-plan.md`](batch-plan.md) v0.6 describes a browser-dependent final
  verification batch for T05/T06, with responsive corrections only if an
  actual rendered inspection finds them. The browser host must be available
  before dispatch.
- On 2026-11-10, the human approved the Batch 7 findings, batch plan v0.6,
  and browser-dependent Batch 8 dispatch; see
  [`approval-batch-8.md`](approval-batch-8.md). A fresh CUA inventory still
  returned no apps or browsers and an unavailable browser access host. Batch 8
  remains authorized but undispatched until a browser surface is available.
  This approval need not be repeated for the same scope.
- The human then stated that the implementation is correct and instructed the
  orchestrator to close the task. [`approval-closure.md`](approval-closure.md)
  records acceptance of the documented 320-pixel visual-evidence follow-up,
  and [`implementation-report.md`](implementation-report.md) is the final
  implementation handoff. Batch 8 was never dispatched and is superseded.
  T05/T06 remain unchecked because the supplied wide-viewport screenshots and
  broad attestation do not establish the exact 320px, overflow, and focus
  criterion. No commit, merge, push, or live index deployment occurred.
- The human then explicitly confirmed that both pages passed at a 320
  CSS-pixel viewport with no horizontal scrolling and visible keyboard focus
  on the ticket card, reply controls, and Close Ticket button. The dated
  addendum in [`visual-verification.md`](visual-verification.md) records that
  human-performed check. It resolves the sole Batch 7 follow-up; T05 and T06
  are now checked, and all six checklist items are complete. The final
  [`implementation-report.md`](implementation-report.md) was reconciled.
  No commit, merge, push, or live index deployment occurred.
