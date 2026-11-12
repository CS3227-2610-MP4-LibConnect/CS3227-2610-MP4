# Independent review: T02 nested-call filter follow-up

Date: 2026-11-11  
Reviewed against: approved specification v0.3 R4, checklist v0.2 T02, prior T02 review reports, and `implementation-T02-followup-2.md`.  
Execution log: [`logs/tasks/ai-error-explainer/review-T02-followup-2.md`](../../../logs/tasks/ai-error-explainer/review-T02-followup-2.md)

## Scope and controls

Reviewed the Student output filter and assigned Student feature tests for this follow-up. Verified the acceptance and rejection behavior at the registered gateway using fake transports. No T03 or TA-specific files/tests were inspected or changed. No production edits or review-only tests were made. The shared-workspace separation exception recorded in the active assignment remains applicable because `.git` is read-only.

## T02 verdict: **Changes required**

The follow-up closes the nested call issue from the prior review. Registered fake-gateway tests reject both `console.log(transform(value))` and `map(filter(items))`. The direct runs confirm those strings fail closed through the feature parser. Tests also confirm natural-language hints containing `Use f(x) to describe the mapping.` and `The runtime is O(n).` are still accepted. The focused feature and shared gateway suites pass: 2 suites, 42 tests.

**Medium — Common complete expression/query outputs still pass the R4 output policy.** I sent two code-like candidates through the registered `ERROR_EXPLAINER` fake-provider gateway: `lambda x: x + 1` and `SELECT value FROM records`. Both were returned as successful HINTs. These are recognizable executable expression/query forms, so the filter does not yet reject all representative code-like complete snippets as R4 requires. Recommendation: cover these common syntax families with focused rejection cases and extend the deterministic policy. This is a bounded request for representative syntax coverage, not a requirement to recognize every possible language or prove semantic safety.

The current general nested-call detector also rejects nested function notation in prose such as `f(g(x))`; the implementation report identifies that tradeoff. The requested simple mathematical forms `f(x)` and `O(n)` remain usable. No claim is made that these two checks establish freedom from all math/prose false positives.

### T02 R4 criterion trace

- **Nested call regression:** verified through the registered fake-provider gateway. Both reported nested examples are rejected.
- **Ordinary math notation:** registered fake-gateway tests preserve natural-language `f(x)` and `O(n)` examples.
- **Output code-shape rejection:** loop, control, assignment, simple call and nested call forms are covered and rejected. The verified lambda expression and SQL query still pass, leaving the R4 requirement incomplete.
- **Parser and gateway suites:** both focused suites passed (42 tests). Prior verified behavior for raw fences/wrappers, trusted detail refinement exclusion, and complete-context overflow/no-provider-call remains recorded in `review-T02-T03-correction.md` and was not changed by this follow-up.

The approved spec acknowledges that deterministic filters cannot guarantee against semantic leakage and requires manual adversarial review. That limitation is appropriate and does not by itself block T02. The concrete lambda and SQL acceptance cases are directly code-like output-policy gaps, so T02's R4 output filter is not yet sufficiently met. This report makes no determination on T03 or combined Batch 2 and does not change checklist status.
