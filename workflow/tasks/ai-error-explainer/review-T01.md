# Independent review — Batch 1 T01

Task: `ai-error-explainer`, Batch 1, T01 — Provider budget and contract design  
Verdict: **changes required**  
Reviewed inputs: approved specification v0.3, checklist v0.2, handoff v0.2, batch plan v0.2, and the amended Batch 1 assignment.  
Implementation artifacts: `workflow/tasks/ai-error-explainer/design.md`, `workflow/tasks/ai-error-explainer/implementation-T01-amendment.md`, `workflow/tasks/ai-error-explainer/implementation-T01.md`, and both implementation logs.

## Findings

### Major — refinement suggestion bound undermines the required function

`workflow/tasks/ai-error-explainer/design.md:111` limits each refinement `suggestion` to 20 UTF-16 code units. R4 requires field-specific suggestions that propose clearer wording or a concise change recommendation; A2 requires useful field-specific suggestions. Twenty code units cannot express many elementary recommendations, for example “Add the exact input that fails.” This is more restrictive than the approved requirement and risks making the feature fail its intended purpose. Revisit the bound with representative useful suggestions and validate the resulting worst-case response envelope against the 1,024-token provisional limit. Keep provider tokenization compatibility explicitly open until the approved smoke check.

Required correction before T01 approval: revise the suggestion text cap to a bound that permits meaningful concise recommendations, and update any response-size rationale affected by that choice. No particular replacement number is established by this review.

### Unverified — deployed provider compatibility

The design correctly labels the model context limit and acceptance of `max_tokens = 1,024` unverified and makes a separately authorized provider smoke check a pre-release condition (`design.md:73–80, 129`; spec v0.3 R3). Local files cannot establish that compatibility. This does not invalidate the approved provisional design, but deployment readiness must remain unclaimed until the smoke evidence exists.

## Acceptance trace

| Criteria | Review result |
| --- | --- |
| R2 request and draft contract | Pass. Exact create/detail shapes, history sequence, limits, 128 KiB body cap, and distinction between incomplete drafts and submission validation are explicit. |
| R3 caps and complete context | Pass with documented compatibility risk. The cap is 98,304 post-redaction UTF-16 code units, matching `redact.js`'s `.length`; output allowance is 1,024 tokens. Three 24 KiB files yield 73,728 bytes and the stated ASCII-heavy calculation leaves 24,576 units for remaining content/framing. The design does not claim this fits an undocumented model window. It specifies full serialization and redaction before comparison, no truncation/omission, and safe overflow. |
| R4 response schemas and behavior | Changes required. Variant names, keys, counts, allowed fields, create-only refinement, and output policy are specified. The 20-unit suggestion limit is too restrictive to reliably satisfy meaningful refinement. |
| A2 | Changes required for the same refinement-bound issue. The design preserves all current draft fields and describes suggestions as chat-only, with no form mutation. |
| A7 | Pass at design level. HTTP body overflow and complete provider-context overflow are distinct 413 cases; provider/gateway/output failures map to safe envelopes, and complete context is never partially sent. |
| HTTP envelope/error mapping | Pass. Success is `{ reply }` with no-store; errors have `{ error: { code } }`, no provider/context text, and the listed auth/input/rate/output/unavailable mappings are consistent with the approved requirements. |
| Schema names/lengths and size arithmetic | Names and length units are explicit. The recorded JSON wire-character maxima (760/897/398/351) are explicitly not token counts. The refinement maximum must be recalculated if its text bound changes. |

## Scope and security review

The reviewed amendment is task-local design evidence. No production, source, test, specification, checklist, handoff, or prior implementation evidence was changed. The design consistently treats request and model data as untrusted, calls for full-context shared redaction, forbids logging raw content, and disallows partial outputs. It correctly does not claim perfect secret detection or provider compatibility. No credential, environment, provider, network, or TA material was accessed.

No tests or build were run: T01 is a design-only checklist item and no implementation or test code changed. Re-running the assignment validator was unnecessary to assess this reviewed design; the implementer log records its pass, and that claim was not used to infer approval.

## Unverified criteria and risks

- Actual deployed model context capacity and `max_tokens = 1,024` compatibility remain open pending a separately authorized provider smoke check.
- Whether the present parser output sizes fit the provider's token budget cannot be proven from JSON character counts.
- Semantic solution leakage and imperfect secret redaction remain the downstream adversarial review risks recorded by the approved spec.
- The 20-code-unit refinement cap requires correction before T01 can pass.

The T01 checklist item remains open. The orchestrator should return the suggestion-bound finding to the implementer for correction and obtain another independent review of the amended design.
