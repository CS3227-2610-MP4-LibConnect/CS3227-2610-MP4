# Proposed implementation batches: student-ticket-activity

Version: 0.6 (2026-11-10; approved, undispatched and superseded by human closure)
Spec: `workflow/specs/student-ticket-activity.md` v0.3
Checklist: `workflow/tasks/student-ticket-activity/tasks.md` v0.2
Handoff: `workflow/tasks/student-ticket-activity/handoff.md` v0.2
Approval state: Batch 1 and Batch 2 dispatch approvals are recorded in `approval-batch-1.md` and `approval-batch-2.md`. The human approved Batch 3 dispatch in `approval-batch-3.md`. Batch 3 review passed T04 with follow-up and requires a T03 correction. The human approved this v0.3 remaining-work revision and Batch 4 dispatch in `approval-batch-4.md`.

## Proposed final verification after Batch 7 review

Batch 7 was approved in `approval-batch-7.md`; its implementation and
independent review are recorded in the Batch 7 T05/T06 reports and
`review-report-batch-7.md`. The completed assignment manifest passed structural
validation. No further production correction was identified. T05 and T06
remain unchecked solely because the required rendered 320 CSS-pixel layout,
horizontal-overflow, and visible-focus inspection could not run while the
browser host was unavailable.

| Batch | Items | Scope and order | Required verification |
| --- | --- | --- | --- |
| 8 (approved, awaits browser) | T05, T06 | Inspect rendered detail and dashboard at 320 CSS pixels for layout, overflow, and visible focus; make only directly evidenced responsive fixes if needed, then reverify | Browser evidence; focused test/build for any code correction; independent per-item and combined review |

The human approved the Batch 7 review findings, this v0.6 plan, and Batch 8
dispatch in `approval-batch-8.md`. Batch 8 was not dispatched while the browser
host was unavailable. The human later closed the implementation handoff with
the visual follow-up recorded in `approval-closure.md`, superseding this
undispatched batch.
Commit, merge, push, live index deployment, and publication remain separate
decisions.

## Previous v0.5 plan and approval history

## Proposed remaining work after Batch 6 review

Batch 6 was approved in `approval-batch-6.md`. Its implementation and
independent review are recorded in the T05/T06 Batch 6 reports and
`review-report-batch-6.md`; the completed assignment manifest passed structural
validation. T05 needs the close button locked until a successful status refresh
after an unconfirmed close response. T06 lacks a rendered 320 CSS-pixel
inspection because the browser host was unavailable. Both remain unchecked.
The precise correction is in `batch-6-remediation-proposal.md`.

| Batch | Items | Scope and order | Required verification |
| --- | --- | --- | --- |
| 7 (approved) | T05, T06 | Lock close action through unconfirmed status and failed refresh, then complete 320px rendered verification when a browser surface is available | Focused lost-response/refresh tests, relevant full/build/emulator checks, actual 320px browser and keyboard evidence, independent item and combined review |

The human approved the Batch 6 review findings, this v0.5 revision, and
Batch 7 dispatch in `approval-batch-7.md`. If the browser surface remains unavailable, T06
remains incomplete. Live index deployment, commit, merge, push, and publication
remain separate decisions.

## Previous v0.4 plan and approval history

## Proposed remaining work after Batch 5 review

The human approved Batch 5 dispatch in `approval-batch-5.md`. Its implementation
and independent review are recorded in the T05/T06 reports and
`review-report-batch-5.md`; the completed assignment manifest passed structural
validation. T05 has two review findings and T06 lacks a rendered 320 CSS-pixel
inspection. Both items remain unchecked. The precise correction and evidence
proposal is in `batch-5-remediation-proposal.md`.

| Batch | Items | Scope and order | Required verification |
| --- | --- | --- | --- |
| 6 (approved) | T05, T06 | Remove untrusted repository URL navigation and correct unconfirmed close-failure feedback, then complete rendered 320 CSS-pixel inspection and integration evidence | Hostile-URL and lost-response UI tests; focused/full checks as relevant; actual 320px browser and keyboard evidence; independent item and combined review |

The human approved the Batch 5 review findings, this v0.4 revision, and
Batch 6 dispatch in `approval-batch-6.md`. If a browser surface is still unavailable, T06
remains incomplete. Live index deployment, commit, merge, push, and publication
are separate decisions.

## Previous v0.3 plan and approval history

## Proposed remaining work after Batch 3 review

The completed Batch 1–3 assignments, review reports, and approvals remain
unchanged as historical evidence. T01, T02, and T04 are checked off. T03 remains
unchecked because parser-level 400/413 responses omit `Cache-Control:
no-store`. The independent Batch 3 review and precise fix are in
`review-report-batch-3.md` and `batch-3-remediation-proposal.md`.

| Batch | Items | Scope and order | Required verification |
| --- | --- | --- | --- |
| 4 (proposed) | T03 | Add no-store to ticket parser-error responses and assert it for malformed JSON and oversized bodies | Focused API/store/contract tests and independent T03/combined T04 review |
| 5 (proposed) | T05, T06 | Ticket detail/chat/reply/close UI, then integration and guides | UI multi-block/close tests, full tests/build, synthetic emulator and 320-pixel/keyboard evidence; independent item and combined review |

Batch 4 is a singleton because T03 must pass independent security review
before T05 starts. The human must approve this revised plan and Batch 4
dispatch. Batch 5, live index deployment, commit, merge, push, and publication
remain separate decisions.

## Previous v0.2 plan and approval history

## Revised plan after Batch 1 review

The original Batch 1 assignment and review remain intact as evidence. T01 is
complete. T02 is the next unfinished checklist item. Batch 2 is a singleton
remediation batch because T02 needs an independent re-review before T03 can
start; its split reason is that review and security boundary. The Batch 2
review must confirm T02's fixes and T01/T02 combined behavior. Later batches
retain checklist order and require their own dispatch approvals.

| Batch | Items | Scope and order | Required verification |
| --- | --- | --- | --- |
| 1 (historical) | T01, T02 | Indexed active read passed; initial owned detail/thread read needs changes | Original item and combined findings remain in `review-report.md`; no retroactive regrouping |
| 2 (proposed) | T02 | Correct malformed ID handling, missing-owner author label, and 50-reply cursor blocks | Focused route/store tests for 400/404/503, ownership per page, stable cursor/ties, bounded reads/lookups, safe projection; independent T02 and T01/T02 combined review |
| 3 (proposed) | T03, T04 | Reply/close transactional API, then dashboard and protected placeholder | CSRF/authorization/state-race tests; UI routes/cards/states; independent item and combined review |
| 4 (proposed) | T05, T06 | Ticket detail/chat/reply/close UI, then integration and guides | UI multi-block/close tests, full tests/build, synthetic emulator and 320-pixel/keyboard evidence; independent item and combined review |

The Batch 2 implementer changes only T02's approved API/store behavior and its
focused tests. A different reviewer independently checks that implementation.
For an exact `nextCursor`, the implementation may use a separate bounded
existence probe after a full 50-reply block; it must not read or return an
unbounded thread. The reviewer checks the actual query/read count and cursor
boundary. The revised preimplementation tests and coverage gaps are in
[`test-coverage-v0.3.md`](test-coverage-v0.3.md). The focused run had 3 failing
suites, 9 failing and 47 passing tests: current T02 lacks paging and input
validation, while T04/T05 UI paths are still unimplemented. The complete
output is retained in `logs/tasks/student-ticket-activity/test-writer-v0.3.log`.
Bounded author lookup concurrency remains a required T02 verification gap.
The original Batch 1 manifest and reports are not overwritten. The new
assignment manifest is created and validated only after human plan and
dispatch approval. No live index deployment, commit, merge, push, or public
action is included.

## Prior v0.1 plan and approval history

The specification, checklist, and handoff received separate human approvals in
the conversation on 2026-11-09. This plan proposes consecutive pairs in the
approved checklist order. A separate test writer prepared two focused suites
and a [`coverage report`](test-coverage-report.md). The targeted run failed
preimplementation as expected: 2 suites/9 tests failed, with the first distinct
failure being missing `store.listActive`; see the factual
[`test log`](../../../logs/tasks/student-ticket-activity/test-writer.md). Coverage
gaps are listed in the report for implementer/reviewer follow-up. Each batch
has one implementer
working sequentially and a different independent reviewer. The next batch
starts only after the current pair's per-item and combined reviews pass and the
orchestrator reconciles evidence.

| Batch | Items | Scope and order | Required verification |
| --- | --- | --- | --- |
| 1 | T01, T02 | Indexed active read, then owned detail/thread read | Query/index, ownership and failure tests; emulator for index query; independent item and combined review |
| 2 | T03, T04 | Reply/close transactional API, then dashboard and protected placeholder | CSRF/authorization/state-race tests; UI routes/cards/states; independent item and combined review |
| 3 | T05, T06 | Ticket detail/chat/reply/close UI, then integration and guides | UI tests, full tests/build, synthetic emulator and 320-pixel/keyboard evidence; independent item and combined review |

## Batch 1 preconditions and boundaries

- The implementer must establish the target Firestore edition before authoring
  edition-specific index configuration. The current repository does not record
  the edition. A read-only query of the project's Firestore database metadata
  is external-service access and needs explicit human approval. The proposed
  approval request will name this action separately from dispatch.
- Index definition/configuration work is within the human-approved v0.2 scope.
  Deploying the index to a live Firebase project is not in any batch and needs
  a later human approval. Local emulator checks are permitted.
- Preserve the user's uncommitted dashboard sentence removal. Do not overwrite
  it when Batch 2 edits `StudentDashboard.tsx`.
- If T01 is blocked by edition verification, query behavior, or a new policy
  decision, stop before T02. If an item exposes a requirement change, update
  the specification through the human approval cycle before code changes.

## Dispatch and evidence

After plan/dispatch approval, create a Batch 1 assignment manifest with exact
allowed files and separate implementer/reviewer identities; validate it in
`plan` mode. Record per-item implementation reports and logs, independent
review reports and logs, relevant commands/results, changed files, spec
version, and unresolved risks. Validate the completion manifest before checking
off items. No commit, merge, push, deployment, or publication is approved by
this plan.
