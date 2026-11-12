# Bug FAQ proposed implementation batches

Version: 0.4 approved (2026-11-12)
Basis: `workflow/specs/bug-faq.md`, `tasks.md`, and `handoff.md` v0.4 approved by the human on 2026-11-12; the v0.4 focused preimplementation tests and coverage report have been reconciled.
Approval state: the human approved specification, checklist, and handoff v0.4 on 2026-11-12. The human approved this batch plan and Batch 1 dispatch on 2026-11-12. The v0.3 assignment manifest is obsolete for v0.4. No v0.4 implementation, live index deployment, commit, push, or merge is approved.

| Batch | Consecutive items | Dependency and review boundary |
| --- | --- | --- |
| 1 | T01 Resolved-only bounded search and FAQ detail store; T02 Protected search and detail APIs | Store behavior establishes the resolved-only query and session-bound encrypted token contract before the API uses it. Complete and verify T01 before starting T02. A different reviewer verifies each item and their combined behavior before Batch 2. |
| 2 | T03 Dashboard search and FAQ detail UI; T04 Integration verification, guides, and evidence | The dashboard uses the reviewed APIs. Integration checks and documentation describe cards and opened detail behavior. Complete and verify T03 before starting T04. A different reviewer verifies both items and their combined behavior. |

The v0.1 run is retained as historical evidence. The test writer reconciled the focused preimplementation tests and coverage report to the v0.4 session-bound token contract after approval of the v0.4 specification, checklist, and handoff. The v0.4 run had 4 suites fail, 37 tests fail, and 3 pass because production behavior is not implemented; detailed failures and gaps are in `workflow/tasks/bug-faq/test-coverage.md` and `logs/tasks/bug-faq/test-writer-v0.4-2026-11-12.md` with full output in `logs/tasks/bug-faq/test-writer-v0.4-run.txt`. The orchestrator inspected the coverage and exact suite summary; the human approved this plan and Batch 1 dispatch on 2026-11-12. The v0.4 assignment manifest must validate before dispatch. Batch 2 starts only after Batch 1 independent review and reconciliation. The existing human edit to `src/codeclinic/src/StudentDashboard.tsx` must be preserved.

Open risks: user-authored content may identify a Student; names typed inside messages may remain visible; sparse matches may need several continuation requests; the Firestore index may need separate production deployment; human browser verification at 320 CSS pixels remains required for T04.
