# Independent review: T02 Create Ticket wording reply correction

**Verdict: pass with follow-up.** Reviewed on 2026-11-12 against approved specification v0.5, checklist/handoff v0.5, and the human-approved `wording-reply-failure-proposal.md`. The two-file correction satisfies its local acceptance criteria. T02's completed checklist status remains supported for this correction; T08 remains open.

## Scope and trace

The reviewed production/test files were `src/codeclinic/server/ai/student-ticket-help.js` and `src/codeclinic/test/student-ticket-help.feature.test.js`. They are untracked in the shared worktree along with earlier task work, so Git cannot provide a base diff for just this correction. I inspected the complete current files, the correction handoff, and the dependent gateway/create-route behavior. No production or test files were edited in this review.

| Approved criterion | Review evidence |
| --- | --- |
| Raw JSON, exact keys and lengths for all four variants | Fixed `SYSTEM_PROMPT` lists the precise `HINT`, `REFINEMENT`, `CLARIFICATION`, and `REFUSAL` shapes and their limits. `parse()` requires exact keys, nonempty plain text, and the stated counts/lengths. The prompt's schema does not contradict the parser. |
| Create-only wording and sparse-draft handling | Prompt limits refinement to create chat and lists the ten permitted fields. `parse()` rejects `REFINEMENT` on detail. New fake-provider tests use the exact question “improve ticket wording” with a grounded refinement and a sparse-draft clarification. |
| Reject malformed and unsafe output without relaxing safety | New fake-provider cases reject malformed, fenced, overlong, and direct-answer content with `AI_INVALID_OUTPUT` after one provider call. Parser, `unsafeOutput`, gateway, and route behavior remain unchanged in the reviewed current files; the gateway has no repair retry. Existing detail rejection and gateway tests pass. |
| Narrow source/test scope | The implementation report identifies only the approved two source/test files for this correction. Shared worktree status contains prior uncommitted feature files, so a correction-only Git diff is unavailable. No new dependency, CI, provider, credential, TA, or deployment action was observed in this review. |

The create route still maps `AI_INVALID_OUTPUT` to its safe 503 response. No response or log exposes rejected provider text. The correction changes fixed server prompt guidance, not authentication, authorization, data writes, page context serialization, gateway caps, parser acceptance, or error mapping. Existing route tests cover authorization and malformed requests; this correction does not alter those boundaries.

## Findings and limits

- **Follow-up, external uncertainty:** The actual provider response behind the reported 503 is unavailable. Fake-provider tests prove that compliant wording and clarification replies pass the local boundary and malformed/unsafe replies fail closed; they cannot prove the deployed model follows the revised prompt or supports `max_tokens = 1,024`. Keep the separately authorized provider compatibility check open before deployment readiness. No provider call was made.
- **Follow-up, semantic safety:** Grounding in the draft and absence of complete solutions are model behavior requirements that finite syntax tests cannot prove. The approved T08 manual adversarial review remains open. The new test's grounded sample is meaningful for schema integration, not proof of general semantic grounding.
- **Evidence limit:** Because these task files are untracked on a shared worktree, the exact correction-only patch cannot be independently reconstructed from Git. The current two-file implementation and associated behavior were reviewed in full; no unrelated change was found in those reviewed files.

Independent verification: **3 suites and 104 tests passed; production build compiled successfully.** Commands and full outputs are recorded in [the review execution log](../../../logs/tasks/ai-error-explainer/review-wording-reply-correction.md). No review-only tests were added.
