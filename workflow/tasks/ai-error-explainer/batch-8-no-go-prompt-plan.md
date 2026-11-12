# Batch 8 plan: Student help prompt no-go correction

Status: **APPROVED FOR BATCH 8 PLAN** (2026-11-12). The human explicitly approved this T11/T12 batch plan in this conversation after approving canonical checklist and handoff v0.7. Implementation dispatch, provider access, push, and merge remain separate gates.
Task: `ai-error-explainer`. Canonical specification v0.6, checklist v0.7, and handoff v0.7 are human-approved. The approved correction scope and its C01/C02 checklist and handoff are linked in the canonical artifacts. This plan does not authorize implementation, provider access, push, or merge.

## Ordered work

1. **T11 (C01):** One implementer adds the approved no-go guidance to the fixed Student `ERROR_EXPLAINER` system prompt only. Preserve the exact response contracts and every validation rule. Distinguish forbidden executable syntax from allowed concept explanations in prose. Record the source change and a focused verification result before T12.
2. **T12 (C02):** The same implementer adds focused fake-provider tests in `student-ticket-help.feature.test.js` for concept questions on create and detail, sparse-context clarification, and continued rejection of malformed or unsafe output. Run focused Student feature/gateway/create/detail route suites and the production build. Record exact commands, outcomes, and unresolved provider uncertainty separately from T11.
3. A different reviewer independently inspects T11, T12, and their combined behavior. Review the prompt against the existing output filter, check that ordinary concept guidance remains permitted, rerun relevant checks, and preserve any failures and remaining risks in task-local evidence. The orchestrator reconciles the verdict and checklist only after review.

## Assignment boundary

- Proposed implementer: `/root/no_go_prompt_implementer`; proposed reviewer: `/root/no_go_prompt_reviewer`. Shared workspace is proposed because this repository's `.git` is read-only in the supplied environment; the reviewer must inspect the exact diff and produce separate evidence. Assignment manifest: `assignment-batch-8.json`.
- Production/test allowlist: `src/codeclinic/server/ai/student-ticket-help.js` and `src/codeclinic/test/student-ticket-help.feature.test.js`. Reports/logs are limited to the Batch 8 paths listed in the manifest. The orchestrator alone updates shared checklist, handoff, and current-state records.
- Selected implementation skill: `openspec-apply-change` via the `workflow/README.md` canonical specdocs path adapter. No second specification tree. No shared AI preamble, parser, output filter, gateway, routes, UI, TA feature, dependencies, CI, or deployment changes. No live provider or credential access.

## Evidence and next gate

The manifest must pass `node src/workflow/validate-assignment.mjs workflow/tasks/ai-error-explainer/assignment-batch-8.json plan` before dispatch. Batch-plan approval and implementation dispatch are distinct human decisions. After independent review, the manifest must pass `complete` validation; that structural result does not grant merge approval. The live `AI_INVALID_OUTPUT` cause remains unknown, and local fake-provider tests cannot establish that the deployed model will stop returning a 503.
