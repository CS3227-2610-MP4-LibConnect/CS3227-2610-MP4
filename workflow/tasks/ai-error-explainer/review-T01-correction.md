# Independent correction review — Batch 1 T01

Task: `ai-error-explainer`, Batch 1, T01 — Provider budget and contract design  
Verdict: **pass with follow-up**  
Reviewed inputs: approved specification v0.3, checklist v0.2, handoff v0.2, batch plan v0.2, and the current Batch 1 assignment.  
Correction review: current active contract in `workflow/tasks/ai-error-explainer/design.md`, appended correction in `workflow/tasks/ai-error-explainer/implementation-T01-amendment.md`, and appended execution evidence in `logs/tasks/ai-error-explainer/implementation-T01-amendment.md`. The original changes-required review and log are retained unchanged as history.

## Review result

The active refinement suggestion maximum is now 64 UTF-16 code units. The design supplies representative field-specific recommendations of 47, 34, and 37 units. These are short, useful directions, and the bound no longer prevents ordinary concise recommendations of the kind required by R4 and A2. The correction therefore resolves the prior finding.

The reported worst-case refinement JSON wire length of 1,777 characters is correct for ten suggestions, the longest permitted field name (`expectedBehaviour`), and 64 quote characters in each suggestion (each quote expands under JSON serialization). This is a wire-character maximum, not a provider-token estimate.

The design and correction report continue to state that the deployed model/context capacity and `max_tokens = 1,024` compatibility are unverified. They do not claim that a 1,777-character response fits the provider token budget. The separately human-authorized smoke check remains required before deployment readiness, as specified in v0.3 R3. This follow-up does not prevent T01 design acceptance because documenting that unresolved risk is part of T01's approved acceptance.

## Acceptance trace

| Criteria | Review result |
| --- | --- |
| R2 request and draft contract | Pass on the current design; the correction does not change it. |
| R3 provisional caps and complete context | Pass with the explicit provider-compatibility follow-up. Units, cap calculation, separate HTTP-body limit, complete redaction, overflow behavior, and no-truncation rules remain explicit. |
| R4 schemas and refinement behavior | Pass. The 64-unit suggestion cap permits useful concise field-specific guidance. Refinement remains create-only, bounded to 1–10 entries and allowed fields, and constrained against code or unsupported facts. |
| A2 | Pass at design level. Suggestions can convey meaningful directions, are specified as chat-only, and do not apply to or mutate draft fields. |
| A7 | Pass at design level. Complete-context overflow and provider/output failures retain their safe, distinct fallback behavior. |
| Refinement wire-size arithmetic | Pass. Independently reproduced 1,777 characters with `JSON.stringify`; this does not resolve tokenization. |

## Scope, checks, and unresolved follow-up

No source, production, test, specification, checklist, handoff, original review, or original log was changed. No provider, network, credential, environment, or TA material was accessed.

No tests or build were run because this is a design-only correction with no implementation changes. The 1,777 wire-character calculation and example string lengths were independently checked with a local Node one-liner, recorded in the execution log.

Follow-up before deployment readiness: obtain the separately authorized compatibility smoke evidence for deployed model identity, representative bounded inputs, and `max_tokens = 1,024`; if rejected, reopen the cap decision. Provider tokenization cannot be verified by this local review. Semantic solution leakage and imperfect secret redaction remain downstream risks from the approved specification.
