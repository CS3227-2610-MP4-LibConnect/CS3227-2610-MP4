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
5. The implementer performs the SDD apply preflight, then implements one task
   at a time and records verification.
6. An independent reviewer/tester inspects the exact implementation from a
   separate worktree or clean checkout, runs verification, and records findings.
7. A human decides whether to merge, request changes, or accept residual risk.

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
  implementation-report.md   # implementer's change and verification record
  security-review.md         # required for AI/security-sensitive tasks
  review-report.md           # independent review and test result
```

Use `logs/tasks/<task-id>/` for factual agent execution notes and
`logs/chat/<name>/` for summaries created with `$summarise-chat <name>`.
Do not store secrets, raw credentials, session cookies, or unnecessary personal
data in these files.

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
- Handoff and report templates: 
- Per-task evidence: `workflow/tasks/`
- Factual execution logs: 
- Chat summaries: `logs/chat/<developer>/` or `logs/chat/<task-id>/`
- Delivery plan: `workflow/PLAN.md`
- User-workflow drafts: 
- Developer responsibilities: 
- Member-track SDD designs and task lists: 
- Product and developer documentation: `docs/`

## Skill integration


## Permission matrix

| Role | Read | Write | External or destructive actions |
|---|---|---|---|
| Analyst | Requirements, plans, specs, relevant source as evidence | Specs, task artifacts, factual logs | None |
| Orchestrator | Approved specs, task artifacts, agent profiles, tests, implementation diffs and reports | Agent handoffs, task evidence and logs, checklist status after independent review | May dispatch scoped subagents; no push, deploy, message, merge, or other consequential action without human approval |
| Test writer | Approved spec, proposal, design, task context, existing tests and test configuration | Test files and test coverage report within the assigned task | No production mutation, external service access, push, deploy, message, or merge |
| Task grouper | Approved spec, proposal, design, task checklist and dependency context | Grouping proposal; `tasks.md` grouping structure only after explicit human approval | No implementation, external service access, push, deploy, message, or merge |
| Implementer | Approved task artifacts and scoped repository files | Source, tests, generated output, reports | No push, deploy, message, or merge without approval |
| Reviewer | Approved artifacts and exact implementation diff | Review report, security report, logs, optional separate review tests | No production mutation, push, deploy, or merge |
| Human | All task evidence | Approval, merge, release decisions | Explicitly approves consequential actions |

These are workflow controls, not substitutes for operating-system, Git, or
server authorization. Dispatchers should provide the task ID, role, artifact
paths, branch/worktree, selected skills, and allowed actions explicitly.
