# Batch 8 dispatch proposal: Student help prompt no-go correction

Status: **APPROVED FOR BATCH 8 T11/T12 DISPATCH** (2026-11-12). The human explicitly replied “approved” to this exact dispatch proposal in this conversation. Provider access, push, and merge remain separate gates.
Task ID: `ai-error-explainer`; items T11 then T12. Canonical specification `workflow/specs/ai-error-explainer.md` v0.6, checklist `tasks.md` v0.7, and handoff `handoff.md` v0.7 are human-approved. The human separately approved `batch-8-no-go-prompt-plan.md`; `assignment-batch-8.json` passed the structural `plan` validator. None of those facts alone authorizes implementation.

## Exact dispatch

- Assign `/root/no_go_prompt_implementer` to complete T11 then T12 in the shared workspace, with distinct evidence for each item. Code/test edits are limited to `src/codeclinic/server/ai/student-ticket-help.js` and `src/codeclinic/test/student-ticket-help.feature.test.js`. The exact report/log allowlist is in `assignment-batch-8.json`.
- T11 adds the approved Student-only no-go criteria to the fixed `ERROR_EXPLAINER` prompt and explicitly permits concept explanations in prose. T12 adds focused fake-provider tests for create/detail concept questions, sparse-draft clarification, and continued malformed/unsafe reply rejection. Run focused Student feature/gateway/create/detail route tests and the production build; retain full output in task-local logs.
- After implementer evidence, assign a different `/root/no_go_prompt_reviewer` to inspect the exact source/test diff, independently rerun relevant checks, assess the no-go wording against benign concept guidance and unsafe reply leakage, and record per-item and combined verdicts. Shared-workspace separation must be documented in the review, as the manifest states.
- The orchestrator checks evidence, runs `assignment-batch-8.json` through `complete` validation, then updates checklist/status records. A passing test or validator never grants merge approval.

## Boundaries and risk

Use `openspec-apply-change` through the repository specdocs path adapter. Do not change the shared preamble, parser, filter, gateway, routes, UI, TA features, dependencies, CI, or deployment. No live provider call, credential access, push, merge, or external message is included. The actual cause of the reported `AI_INVALID_OUTPUT` remains unknown; this correction can reduce mismatched replies but cannot establish deployed behavior without a separately authorized provider check.

**Approved decision:** dispatch the exact Batch 8 implementer and independent reviewer work above. Begin T11 implementation and proceed to T12 only after T11 evidence is recorded.
