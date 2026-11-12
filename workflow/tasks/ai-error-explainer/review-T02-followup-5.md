# Independent review: T02 exception/control statement filter follow-up

Date: 2026-11-11  
Reviewed against: approved specification v0.3 R4, checklist v0.2 T02, prior T02 review reports, and `implementation-T02-followup-5.md`.  
Execution log: [`logs/tasks/ai-error-explainer/review-T02-followup-5.md`](../../../logs/tasks/ai-error-explainer/review-T02-followup-5.md)

## Scope and controls

Reviewed the Student-only output filter and feature tests for this follow-up. Verified the prior throw/raise reproductions, the added exception/control rejection matrix, and the natural-language acceptance matrix through the registered fake-provider gateway tests. No T03 or TA-specific files/tests were inspected or changed. No production edits or review-only tests were made. The shared-workspace separation exception remains as recorded in the active assignment because `.git` is read-only.

## T02 verdict: **Pass with follow-up**

The implementation now rejects the prior `throw new Error("bad")` and `raise ValueError("bad")` examples. The new registered-gateway cases also reject `break`, `continue`, `pass`, `assert`, `catch`, and `except` forms. Existing matrix cases continue to cover representative JavaScript/Python statements, calls, loops, imports, assignments, lambdas, nested calls, and SQL query/mutation forms. The prose tests accept explanations about throwing/raising, breaking, returning, awaiting, and importing, along with `f(x)`, `O(n)`, and ordinary selection instructions.

The focused Student feature and shared gateway suites passed: 2 suites, 72 tests. I did not identify another material code-shaped complete snippet accepted in the representative JS/Python/SQL statement families sampled for this follow-up. This is a risk-based conclusion, not a claim of language-complete filtering.

R4 explicitly says deterministic controls cannot guarantee against semantic solution leakage and keeps manual adversarial review required. That residual risk remains open for the later review gate. Leading-statement patterns may reject ambiguous statement-like prose, and semantically phrased or unrecognized code can still pass; the filter is not a language parser. These are recorded limitations rather than new concrete failures in this follow-up's tested families.

### T02 R4 criterion trace

- **Prior exception reproductions:** `throw new Error("bad")` and `raise ValueError("bad")` reject through registered fake-provider coverage.
- **Nearby control/exception forms:** `break`, `continue`, `pass`, `assert`, `catch`, and `except` reject, with accompanying explanatory prose accepted.
- **Existing representative matrix:** JavaScript, Python, SQL, code-call, loop, assignment, lambda and nested-call cases reject; natural prose/math cases remain usable.
- **Focused verification:** feature and shared gateway suites pass 72 tests. Prior verification of raw wrappers, trusted detail refinement exclusion, and complete-context overflow/no-provider-call remains in `review-T02-T03-correction.md`; this follow-up did not change those boundaries.

This report is limited to T02. It makes no T03 or combined Batch 2 determination and does not change checklist status.
