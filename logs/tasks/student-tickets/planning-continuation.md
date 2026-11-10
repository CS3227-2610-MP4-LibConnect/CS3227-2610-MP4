# Student ticket planning continuation

Date: 2026-11-09 (Asia/Singapore)
Task ID: `student-tickets`

## Human input

The human explicitly approved the student ticket specification in the current conversation and requested continuation toward implementation. No separate policy, checklist, handoff, or batch-plan approval was given.

## Sources and commands

- Read `AGENTS.md` instructions supplied in the conversation, `workflow/README.md`, `workflow/PLAN.md`, `workflow/agents/analyst.toml`, `workflow/agents/orchestrator.toml`, canonical and task-copy ticket specifications, `Overview.md`, and nearby handoff/checklist examples.
- Read the `openspec-explore` and `openspec-propose` skill guidance, using the repository's canonical-path adapter.
- Inspected `src/codeclinic/server/index.js`, `server/notifications/route.js`, `src/index.tsx`, `DashboardRouteGuard.tsx`, `StudentDashboard.tsx`, `AppHeader.tsx`, and `package.json` to locate integration points.
- Used `rg --files` and `git status --short --branch` for discovery. The working tree already contained untracked ticket specification artifacts and Firebase debug logs; these were not modified except for the new task planning artifacts listed below.

## Work and result

- Created `workflow/tasks/student-tickets/policy-proposal.md` with concrete recommendations for the four policy decisions left open by approved specification v0.1.
- Created draft `workflow/tasks/student-tickets/tasks.md` with four dependency-ordered items and explicit gates.
- Created draft `workflow/tasks/student-tickets/handoff.md` with scope, allowed files, trusted inputs, selected skills, checks, and approval state.
- No production code, tests, dependencies, or deployment files were changed. No tests were run at this planning gate.

## Unresolved risks and next gate

Specification v0.1 explicitly blocks implementation on request/text/file limits, source-method coexistence, and concept-tag policy. The human must decide the values in `policy-proposal.md` before the canonical specification and its task copy can be amended. The amended specification requires approval; the checklist and handoff then require separate approval, followed by batch-plan and dispatch approval before production changes.

## Policy approval continuation

The human replied "approved" to the policy proposal in the next turn. The canonical specification was amended to proposed v0.2 with the approved request/text/file limits, filename/path and GitHub URL rules, exclusive source methods, and Student-entered concept tags. Its task copy was synchronized; SHA-256 hashes matched. The draft checklist and handoff now reference v0.2. Search confirmed no remaining open-decision language in the amended specification. No production code or tests changed. Human approval of amended specification v0.2 is the next gate; checklist and handoff approval remains separate.

## Specification approval continuation

The human replied "approved" to the separate request for amended specification v0.2 approval. The canonical specification records that approval and the task copy was synchronized. Draft checklist v0.1 and handoff v0.1 now cite approved specification v0.2. The next requested decision is separate human approval of the checklist and handoff; no test writing, implementation dispatch, or production edits occurred.

## Checklist and handoff approval continuation

The human replied "approved" to the explicit request for checklist v0.1 and handoff v0.1 approval. Both artifacts now cite the human approval in the conversation. The orchestrator read `workflow/agents/test_writer.toml` and dispatched a scoped test writer for preimplementation tests and coverage evidence. `workflow/tasks/student-tickets/batch-plan.md` v0.1 was drafted with consecutive batches T01, T02–T03, and T04. The singleton T01 separates the security-sensitive API and storage contract for independent review. The plan remains a proposal; no implementation assignment was dispatched.

## Test-writer reconciliation

The test writer added `src/codeclinic/test/student-tickets.api.test.js` and `src/codeclinic/test/StudentTickets.test.tsx`, with coverage in `workflow/tasks/student-tickets/test-coverage-report.md` and exact command/results in `logs/tasks/student-tickets/test-writer.md`. Focused baseline: two suites failed, 34 tests failed, one passed, exit code 1; the feature is absent. No production files changed. The report found that `createLoginApp` installs an 8 KiB JSON parser before later mounted routes, while approved ticket R4 allows 128 KiB. The batch plan now records a route-specific parser mounted from allowed `server/index.js` before the existing login app, with security checks and regression verification. This is a proposed implementation approach within approved files, not a requirement amendment. Batch plan and dispatch still await human approval.

## Shared contract steering

Before batch-plan approval, the human supplied a shared ticket data contract C1/C2 and requested implementation to match it. Read the contract in the conversation, compared it with approved ticket specification v0.2 and `Overview.md` Ticket fields, and found conflicts in source field names, language and tag rules, Timestamp types, and initial null values. The contract also defines later reply and transition behavior outside this creation-only task. Created `workflow/tasks/student-tickets/shared-contract-reconciliation.md` with exact proposed spec, checklist, handoff, and test edits. Requested the missing fixed language list (Q1). No approved artifact, test, or production file was changed after this steering; the proposed batch plan is not suitable for dispatch until reconciliation and renewed approvals.

## Language and limit clarification

The human supplied the exact language choices `Python`, `Java`, `JavaScript`, `TypeScript`, `C`, `C++`, and `Other`; required selector-only input with an `Other` explanation note; changed title and repository URL limits to 255 characters; changed error output, expected/actual behaviour, attempted work, and repository-path input to 5,000 characters; and changed the tag count to 15. Updated `shared-contract-reconciliation.md` to v0.2 with these requirements and marked `batch-plan.md` superseded for dispatch. No approved specification, checklist, handoff, tests, or production files changed. Proposed interpretation: the repository-path input limit is 5,000 characters total across up to 10 paths. Tag normalization and empty-value representation remain proposed choices pending human decision.

## Tag-limit correction

The human then instructed a return to C1's five-tag limit. Corrected `shared-contract-reconciliation.md` to 0–5 tags and changed the related verification wording. No approved specification, test, or production file changed. The repository-path aggregate interpretation, tag normalization, and optional empty-value representation remain pending decisions.

## Shared-contract proposal approval and amendment draft

The human replied "approved" to the request covering reconciliation v0.3 and its three interpretations. Updated `workflow/specs/student-tickets.md` to proposed v0.3 and synchronized its task copy. Updated `tasks.md` and `handoff.md` to proposed v0.2, preserving the approved v0.1 task wording and order and adding C1/C2 compatibility criteria. Marked the reconciliation proposal as human-approved. No test or production file changed. Separate human approval of specification v0.3 is the next gate; checklist/handoff v0.2, revised tests, batch plan, and implementation dispatch follow separately.

## Specification v0.3 approval continuation

The human replied "approved" to the separate request for specification v0.3 approval. The canonical specification records that approval and its task copy was synchronized. Proposed checklist and handoff v0.2 now cite approved specification v0.3. No test or production code changed. Separate checklist and handoff v0.2 approval is the next gate.

## Checklist and handoff v0.2 approval continuation

The human replied "approved" to the explicit request for amended checklist v0.2 and handoff v0.2. Both artifacts now record the human approval in the conversation. The orchestrator assigned the same test writer to revise the two preimplementation suites against specification v0.3 and update coverage/log evidence. `batch-plan.md` was revised to v0.2, retaining consecutive batches T01, T02–T03, and T04. It remains a proposal; no implementation assignment or production edit occurred.

## Revised preimplementation test reconciliation

The test writer revised `StudentTickets.test.tsx` and `student-tickets.api.test.js` for approved specification v0.3 and updated the coverage report and factual test log. The focused command `npm test -- --runInBand --watchAll=false --silent StudentTickets student-tickets.api` exited 1: two suites failed, 43 tests failed, one passed, 44 total, with the feature absent. The test-only `firebase-admin/firestore` Jest resolver issue was removed before the recorded run. Inspected the coverage report and test files for C1 field names, fixed languages, five-tag normalization, revised limits, initial shape, and Timestamp-shaped checks. The report retains integration gaps for emulator type confirmation, direct deep link, no-fetch behavior, keyboard/320-pixel inspection, and complete R4 boundary review. `batch-plan.md` v0.2 now includes the exact focused result. Batch plan and Batch 1 implementation dispatch still await human approval.

The test writer then added three more contract cases and ran the same focused command again. The final baseline was exit code 1, two suites failed, 46 tests failed, one passed, 47 total; the intermediate 43-failure result remains in the test-writer log. Updated `batch-plan.md` v0.2 to cite the final run. No implementation or production file changed.

## Batch 1 authorization and dispatch

The human replied "approve" to the explicit request for batch plan v0.2 and Batch 1 T01 implementation dispatch. The orchestrator recorded that in `batch-plan.md`, created `assignment-batch-1.json` for T01 alone, and ran `node src/workflow/validate-assignment.mjs workflow/tasks/student-tickets/assignment-batch-1.json plan` from the repository root. Exit code 0; output: `Assignment batch 1 plan checks passed. Human approval and evidence review remain separate.` Read the implementer/reviewer profiles and `openspec-apply-change` skill guidance. Dispatched one implementer for T01 in the shared workspace with exact approved artifact paths, allowed files, checks, and evidence destinations. T02–T04 remain unassigned; independent review and later human decisions remain pending.
