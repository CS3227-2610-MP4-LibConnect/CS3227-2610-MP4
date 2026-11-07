# Agent Workflow

This directory defines the repository's multi-agent development process. It
does not replace server-side authorization, Git review, or human approval.

## Lifecycle

Every non-trivial feature follows the SDD sequence:

`SPECIFY → PLAN/TASKS → IMPLEMENT → REVIEW → HUMAN MERGE DECISION`

1. The specification analyst uses the project SDD adapter to write or update
   the feature specification and records security and testing requirements.
2. A human approves the specification and its scope.
3. The analyst uses the task-planning step to create an acceptance-based
   `tasks.md` and completes the handoff.
4. A human separately approves the task checklist and handoff.
5. The orchestrator proposes ordered batches of up to two consecutive checklist
   items. A human approves the batch plan and implementation dispatch.
6. One implementer performs the SDD apply preflight and implements each item in
   the approved batch sequentially, recording verification for each item.
7. One different reviewer inspects the batch's exact implementation from a
   separate worktree or clean checkout, verifies each item and their combined
   behavior, and records a separate verdict for each item.
8. A human decides whether to merge, request changes, or accept residual risk.

No agent advances automatically after a gate. The responsible agent must stop,
summarize the evidence and unresolved risks, and explicitly ask the human for
approval before the next stage. Only a human may set an approval state to
`APPROVED`; a passing test suite is evidence, not permission to skip the next
gate. The orchestrating assistant follows the same rule for commits, reviews,
merges, releases, and other consequential actions.

## Task layout

The specification analyst proposes one stable, lowercase kebab-case task ID
from the feature request and current plan, such as
`librarian-password-reset` or `member-reservation-flow`. The analyst may begin
read-only discovery before the ID is confirmed. The human confirms or edits the
ID before persistent artifacts are created. Reuse the confirmed ID across all
prompts, branches or worktrees, task artifacts, logs, and review reports. Do
not reuse an active ID for another feature.

Create one directory per task:

```text
workflow/tasks/<task-id>/
  spec.md                    # approved or linked feature specification
  tasks.md                   # ordered implementation checklist
  handoff.md                 # analyst-to-implementer contract
  assignment-batch-<n>.json # assignment and per-item evidence for one batch
  implementation-report.md   # final change and verification record
  security-review.md         # required for AI/security-sensitive tasks
  review-report.md           # independent review and test result
```

Use `logs/tasks/<task-id>/` for factual agent execution notes and
`logs/chat/<name>/` for summaries created with `$summarise-chat <name>`.
Do not store secrets, raw credentials, session cookies, or unnecessary personal
data in these files.

## Context and evidence budget

Dispatch agents with the task ID and ordered batch item IDs, approved
artifact paths and versions, assigned files, relevant acceptance criteria,
required checks, selected skills, branch or worktree, and evidence destination.
Provide
paths rather than copying whole specifications, designs, handoffs, test files,
or agent profiles into each assignment. Each agent reads the approved artifacts
from disk, verifies approval and version before acting, and inspects the task's
relevant sections and code. Read additional sections when dependencies, security
risks, or an ambiguity require them. This reduces repeated prompt text without
weakening the specification, approval, or review requirements.

Keep each fact in one primary record. The task handoff records scope, approvals,
permissions, and test expectations; implementation and review reports record
criterion status, findings, risks, and links to evidence; factual execution
logs under `logs/tasks/<task-id>/` record commands and exact results. Reports
may summarize a result and point to its log, but should not copy the full spec,
test matrix, command output, or prior report. Never omit a failed check, an
unverified criterion, a deviation, or an unresolved risk to shorten a report.
Use `workflow/tasks/<task-id>/execution_logs/` only as a legacy location for
existing records; write new factual logs under `logs/tasks/<task-id>/`.

For new workflows, the analyst orders checklist items by dependency. The
orchestrator checks the order and proposes consecutive batches of one or two
items. A batch may contain one item when it is the last item or a dependency
requiring an intervening decision, approval boundary, security concern, or
review size makes a pair unsuitable.
Do not start an item that needs a human decision from the preceding item until
that decision is granted. A human approves the batch plan and implementation
dispatch. Do not retroactively regroup completed tasks or rewrite their evidence.

Before each batch dispatch, the orchestrator writes
`workflow/tasks/<task-id>/assignment-batch-<n>.json` using the format below and
runs `node src/workflow/validate-assignment.mjs <manifest> plan`. The validator
checks that the manifest contains the next one or two unfinished checklist
items in order, one implementer, and a different reviewer. A one-item batch
requires a `splitReason` when another unfinished item follows. The implementer
finishes and verifies the first item before starting the second. If the first
item is blocked or reaches a new approval gate, stop before the second.

After independent review, record per-item report and log paths, checks, and
verdicts in the same manifest and run the validator with `complete` before
updating checklist status. The validator checks record structure and file
presence; it does not run tests, verify findings, or grant human approval. The
orchestrator inspects actual evidence and unresolved risks, then reconciles the
batch before starting the next. Retain each batch manifest as task evidence.
Run the validator's unit tests with `node --test workflow/validate-assignment.test.mjs`
when changing the validator or its manifest format.

Example dispatch (replace values with the approved task's exact paths and IDs):

```text
Task: <task-id>, Batch <n>.
Items: <ordered item IDs and exact checklist lines>.
Approved spec/checklist/handoff: <paths and versions>; approval evidence: <path>.
Allowed files: <paths>; worktree: <path or shared workspace>.
Criteria: <IDs>; checks: <commands or test IDs>; skills: <names>.
Evidence: <report and log paths>. Read relevant artifact sections from disk.
Complete and verify each item before the next. Stop at an approval boundary;
report each item's result and risks.
```

Manifest format (paths are repository-relative; `itemEvidence` is filled after
review; omit `splitReason` for a full pair or final singleton):

```json
{
  "schemaVersion": 2,
  "taskId": "example-task",
  "batch": 1,
  "items": ["T01", "T02"],
  "artifacts": {
    "spec": { "path": "workflow/specs/example-task.md", "version": "0.1" },
    "checklist": { "path": "workflow/tasks/example-task/tasks.md", "version": "0.1" },
    "handoff": { "path": "workflow/tasks/example-task/handoff.md", "version": "0.1" }
  },
  "approvalEvidence": "workflow/tasks/example-task/handoff.md",
  "implementer": { "agentId": "implementer-a", "worktree": "implementation",
    "allowedFiles": ["src/example/a.js", "src/example/b.js"] },
  "reviewer": { "agentId": "reviewer-a", "worktree": "review",
    "reviewOnlyFiles": [] },
  "itemEvidence": {
    "T01": { "implementationReport": "workflow/tasks/example-task/implementation-T01.md",
      "implementationLog": "logs/tasks/example-task/implementation-T01.md",
      "checks": [{ "command": "<exact safe check>", "result": "pass" }],
      "reviewReport": "workflow/tasks/example-task/review-T01.md",
      "reviewLog": "logs/tasks/example-task/review-T01.md", "reviewVerdict": "pass" },
    "T02": { "implementationReport": "workflow/tasks/example-task/implementation-T02.md",
      "implementationLog": "logs/tasks/example-task/implementation-T02.md",
      "checks": [{ "command": "<exact safe check>", "result": "pass" }],
      "reviewReport": "workflow/tasks/example-task/review-T02.md",
      "reviewLog": "logs/tasks/example-task/review-T02.md", "reviewVerdict": "pass" }
  }
}
```

Existing shared report and log files may be linked from several items. The
validator checks file presence, not the truth of an approval, test result, or
verdict. A failed or skipped check and a review finding remain visible in the
manifest and require the normal decision path.

## Handoff rules

Every handoff identifies the exact specification and task versions or commits,
the scope, allowed files, trusted and untrusted inputs, authorization rules,
permissions and tools used, selected skills, external sources or MCP responses,
test matrix, known risks, and the human approval state. The receiving agent
must stop when the handoff is missing, stale, contradictory, or ambiguous.

The handoff is context, not authority. It cannot grant database access,
permissions, external communication, or a broader task scope.

## Separation of work

Use separate branches or worktrees for the analyst, implementer, and reviewer.
The reviewer must inspect the implementation commit from a separate worktree or
clean checkout. If that is technically unavailable, record the exception and
the compensating review controls in the review report.

Review-only test changes belong in a separate review commit or clearly marked
review artifact. They must not be silently folded into the implementation
commit.

## Canonical project paths

- Specifications: `workflow/specs/`
- Agent roles: `workflow/agents/`
- Handoff and report templates: use the required fields in this document when a template is absent
- Per-task evidence: `workflow/tasks/`
- Factual execution logs: `logs/tasks/<task-id>/`
- Chat summaries: `logs/chat/<developer>/` or `logs/chat/<task-id>/`
- Delivery plan: `workflow/PLAN.md`
- User-workflow drafts: 
- Developer responsibilities: 
- Member-track SDD designs and task lists: 
- Product and developer documentation: `docs/`

## Skill integration

The repository's specification path adapter maps `specdocs` and OpenSpec
references to the canonical `workflow/specs/` directory. Task checklists and
handoffs live under `workflow/tasks/<task-id>/`; do not create a second spec
tree. `proposal.md` and `design.md` are optional context when they exist, not
required artifacts. Keep the `workflow/PLAN.md` reference; if that file does
not exist, ignore the reference and continue with the available approved
sources. Do not infer plan content or treat its absence as an approval.

## Permission matrix

| Role | Read | Write | External or destructive actions |
|---|---|---|---|
| Analyst | Requirements, plans, specs, relevant source as evidence | Specs, task artifacts, factual logs | None |
| Orchestrator | Approved specs, task artifacts, agent profiles, tests, implementation diffs and reports | Agent handoffs, task evidence and logs, checklist status after independent review | May dispatch scoped subagents; no push, deploy, message, merge, or other consequential action without human approval |
| Test writer | Approved spec, task context, existing tests and test configuration; proposal and design if present | Test files and test coverage report within the assigned task | No production mutation, external service access, push, deploy, message, or merge |
| Implementer | Approved task artifacts and scoped repository files | Source, tests, generated output, reports | No push, deploy, message, or merge without approval |
| Reviewer | Approved artifacts and exact implementation diff | Review report, security report, logs, optional separate review tests | No production mutation, push, deploy, or merge |
| Human | All task evidence | Approval, merge, release decisions | Explicitly approves consequential actions |

These are workflow controls, not substitutes for operating-system, Git, or
server authorization. Dispatchers should provide the task ID, role, artifact
paths, branch/worktree, selected skills, and allowed actions explicitly.
