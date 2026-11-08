# Tests and grouping reconciliation

Version: 0.1 (2026-11-08)
Task: `ui-consistency-and-feedback`; spec/checklist/handoff v0.1.
Status: Ready for human grouping/implementation decision, not implementation.

## Concrete result

Reviewed the independent [grouping proposal](grouping-proposal.md) and
[test coverage report](test-coverage-report.md). Four groups preserve all six
tasks and their dependencies: G1 U01/U04; G2 U02; G3 U03/U05; G4 U06. U04 moves
earlier to parallelize header/server work. U02/U05 stay sequential because they
share AccountPages/CSS. U03/U05 have separate source and test ownership.
No grouping edits have been applied to tasks.md.

Added test files: `src/codeclinic/test/AppHeader.test.tsx` and
`NotificationsRoute.test.tsx`. Updated `AccountPages.test.tsx` and
`account-routes.test.js`. Existing authorization, CSRF, role and logout
assertions were preserved. The existing forced-password copy expectation was
adapted to the approved error contract. No production file changed.

The parent reviewed the tests and requested corrected existing route URLs,
URL-based fetch fixtures, use of NotificationBell as the single unread-count
owner, async accessible-label handling, and loaded-form synchronization. A
follow-up test-writing run added normal profile field-error recovery,
temporary-password field associations, no-protected-fetch session cases and
separate mismatch/exhaustion server tests. The parent moved the malicious-body
absence assertion after the awaited Sign in link, so it checks settled feedback
rather than the initial render. No security assertion was removed.

## Verified preimplementation results

- Final parent UI run: 46 passed / 8 failed tests across five suites; two suites
  passed, three failed. The shared-header suite cannot resolve the intentionally
  absent AppHeader module. The eight executed failures expose missing header/
  unread integration and missing field/scoped/safe account feedback. Existing
  DashboardRoutes and Notifications suites pass. New unauthenticated and
  forced-password Notifications no-protected-fetch cases pass.
- Final parent account run: 60 passed / 3 failed across three suites. Guards and
  forced-password R7 pass. Expected route failures concern missing codes for
  required password, incorrect password, and exhausted attempts. The earlier
  sandbox listener failure was resolved for the parent runs; see their log.
- Source digests match the preimplementation baseline; `git diff --check`
  passes. No build or visual/keyboard result is claimed.

Exact commands/results: [parent preparation log](../../../logs/tasks/ui-consistency-and-feedback/orchestration-preparation.md),
[server log](../../../logs/tasks/ui-consistency-and-feedback/orchestrator-server-preparation.md),
and [test-writer log](../../../logs/tasks/ui-consistency-and-feedback/test-writer.log).
Expected failures are preimplementation evidence, not permission to skip checks.

## Assumptions and remaining coverage

The proposed header test seam is accountType/isManager/activePath/restricted/
onLogout, using the existing NotificationBell for unread fetching. This expresses
shared behavior without adding a second count owner. A compatible interface
refinement must retain the behavior tests and stay within the approved contract.

U04 must complete the validation/code/field matrix, byte-limit/unavailable-email/
malformed-body and safe-copy coverage; U05 must add focus, retry isolation and
other failure-code coverage. U03 must verify successful Coordinator lookup,
manager retry, populated/loading/mark-read states and protected logout. U06 must
verify actual responsive layouts and keyboard/focus/hover/active treatment.
These are unchanged approved acceptance requirements, not optional follow-ups.
Remaining tests belong to the owning task's existing permitted test scope.
No incomplete criterion may be marked complete before independent review.

## Next action awaiting human approval

Approve the four-group proposal v0.1 and permission to implement the six scoped
items under the approved spec/checklist/handoff. Then the task grouper applies
the approved grouping without changing any task wording/state, and implementers
start Group 1. Implementation preflight, local branch/workspace selection,
independent review and final human merge/commit-message gates still apply.

## Subagent usage retained for the final implementation report

| Role/run | Configured model | Runtime model | Input tokens | Output tokens | Total tokens | Metric source |
| --- | --- | --- | --- | --- | --- | --- |
| Task grouper, initial proposal | gpt-6-luna | unavailable | unavailable | unavailable | unavailable | unavailable |
| Test writer, initial coverage | gpt-6-luna | unavailable | unavailable | unavailable | unavailable | unavailable |
| Test writer, coverage follow-up | gpt-6-luna | unavailable | unavailable | unavailable | unavailable | unavailable |

Configured models/reasoning come from profile and dispatch; no runtime token
counts were exposed to the parent or agents. Aggregate usage is unavailable.
