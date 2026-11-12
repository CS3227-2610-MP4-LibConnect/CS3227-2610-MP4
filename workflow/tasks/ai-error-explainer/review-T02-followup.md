# Independent review: T02 output-filter follow-up

Date: 2026-11-11  
Reviewed against: approved Student ticket help specification v0.3, R4; checklist v0.2, T02; prior independent review `review-T02-T03-correction.md`; implementation evidence `implementation-T02-followup.md`.  
Execution log: [`logs/tasks/ai-error-explainer/review-T02-followup.md`](../../../logs/tasks/ai-error-explainer/review-T02-followup.md)

## Scope and controls

Reviewed only the Student output filter and feature tests changed for this follow-up, plus the fake-provider shared gateway boundary needed to verify acceptance and rejection. No production or TA-specific files/tests outside that scope were inspected or changed. No review-only tests were added. The task's shared-workspace separation exception still applies because `.git` is read-only.

## T02 verdict: **Changes required**

The follow-up addresses the prior reported `console.log(value)` gap. The Student output policy now rejects console calls, simple standalone function/method calls, and the existing tested loop, assignment, control statement, declaration, patch, direct-answer, and sensitive forms. The registered fake-provider test cases exercise the exact earlier example `console.log(value)`, its semicolon form, `items.push(value);`, `if (ready) {`, `value = compute()`, and a Python loop form. The focused Student feature and shared gateway test suites pass: 2 suites, 38 tests.

**Medium — Nested call expressions remain accepted under R4's code-like-output rejection requirement.** I sent `console.log(transform(value))` as valid HINT text through the registered `ERROR_EXPLAINER` gateway with a fake transport. The gateway returned `{ ok: true }` and the HINT, so executable code-shaped output is not rejected at the actual output boundary. The direct parser reproduction also confirms the current standalone call expression regex does not handle nested parentheses. Recommendation: add nested call-expression and other representative nested syntax cases to the fake-provider integration matrix and strengthen deterministic detection for this family. Keep the manual adversarial review requirement; no finite pattern set proves semantic safety.

The direct parser spot checks found no false positive for ordinary prose `Use f(x) to describe the mapping.` or the complexity notation `The runtime is O(n).` Both were accepted. A bare `f(x)` was rejected as a standalone call-like statement; that may reject terse mathematical notation, but the outputs are ambiguous and this did not affect the longer natural-language examples tested. No broader false-positive claim is inferred from these examples.

### T02 follow-up criterion trace

- **Prior reported call expression (`console.log(value)`):** now rejected through the registered fake-provider gateway; the focused suite includes the exact case.
- **Nearby simple code forms:** `console.log(value);`, `items.push(value);`, `compute(value)`, a control statement, an assignment, and a loop are rejected by direct parser spot checks or existing fake-provider cases.
- **Nested call form:** `console.log(transform(value))` is accepted by the registered gateway and fails R4's output-policy criterion.
- **False-positive spot checks:** a natural-language sentence containing `f(x)` and a sentence containing `O(n)` remain accepted; bare `f(x)` is rejected.
- **Previously reviewed T02 paths:** raw fences/wrappers, trusted detail-page refinement exclusion, and complete-context overflow/no-provider-call were independently verified in `review-T02-T03-correction.md`; this follow-up did not change those files or boundaries.

The R4 output-filter criterion remains incomplete until the nested call example is rejected. This report does not change checklist status or make any conclusion about T03 or combined Batch 2. Semantic solution leakage and unrecognized code forms remain residual risks even after deterministic filter corrections; the approved manual adversarial review remains necessary.
