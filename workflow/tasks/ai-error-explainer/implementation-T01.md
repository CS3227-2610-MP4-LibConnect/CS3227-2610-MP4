# Implementation handoff: T01

Status: **partial; blocked at the approved stop boundary**

- Item: T01 — Provider budget and contract design.
- Specification: `workflow/specs/ai-error-explainer.md` v0.2.
- Checklist: `workflow/tasks/ai-error-explainer/tasks.md` v0.1. Checklist status remains owned by the orchestrator and was not edited.
- Design evidence: [`design.md`](design.md).
- Factual execution record: [`logs/tasks/ai-error-explainer/implementation-T01.md`](../../../logs/tasks/ai-error-explainer/implementation-T01.md).
- Changed files: `workflow/tasks/ai-error-explainer/design.md`, `workflow/tasks/ai-error-explainer/implementation-T01.md`, `logs/tasks/ai-error-explainer/implementation-T01.md`.

## Acceptance criteria

- **R2–R4 request/response contract:** partial. Exact draft field names/types, locally supported field bounds, question/history bounds, JSON response variants/field names/count limits, detail refinement exclusion, safe fallback, and no-truncation behavior are recorded.
- **A2/A7 provider-safe caps and reproducible cap rationale:** unmet. Local approved evidence does not identify the deployed model or confirm its input/output limits. `maxInputChars` and `maxOutputTokens` were deliberately left unset.

## Checks and limits

- Reviewed approved local specs, task artifacts, existing shared gateway configuration/transport/prompt/parser, and Student create form/submission validation. No provider call, network access, credential access, environment read, dependency change, source/test change, or TA source/test inspection occurred.
- `openspec list --json` found the repository root. `openspec status --change ai-error-explainer --json` returned `Change 'ai-error-explainer' not found. No changes exist.` The repository adapter maps OpenSpec references to `workflow/specs/`; no separate OpenSpec change/spec tree was created. The approved workflow artifacts remain the applicable task source.
- No tests were run because this item only records design evidence and makes no implementation change.

## Remaining decision and risk

An authorized human/provider-side confirmation is needed for the deployed model identity, context/input ceiling, and `max_tokens` support. Once supplied through approved local documentation/configuration, choose and justify numeric caps and parser string lengths against that evidence, then obtain independent review before T02. Do not infer limits from the model name pattern or the existing `max_tokens` request field.
