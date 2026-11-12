# Independent review: T02 lambda and SQL filter follow-up

Date: 2026-11-11  
Reviewed against: approved specification v0.3 R4, checklist v0.2 T02, prior T02 review reports, and `implementation-T02-followup-3.md`.  
Execution log: [`logs/tasks/ai-error-explainer/review-T02-followup-3.md`](../../../logs/tasks/ai-error-explainer/review-T02-followup-3.md)

## Scope and controls

Reviewed the Student-only output filter and feature tests for this follow-up. Verified the prior lambda/SQL examples, ordinary prose cases, and nearby code forms at the registered fake-provider gateway. No T03 or TA-specific files/tests were inspected or changed. No production edits or review-only tests were made. The shared-workspace separation exception remains as recorded in the active assignment because `.git` is read-only.

## T02 verdict: **Changes required**

The follow-up closes both previously recorded examples: `lambda x: x + 1` and `SELECT value FROM records` now reject through the registered fake-provider gateway. The extended tests also reject a two-argument lambda, lowercase SELECT with WHERE, DELETE and INSERT forms, along with the earlier console/nested-call, loop, assignment, and control cases. Registered gateway tests accept ordinary notation and prose: `f(x)`, `O(n)`, an explanatory sentence about lambda expressions, and “Select the value from the array, then compare it.” The focused feature and shared gateway suites passed 2 suites / 50 tests.

**Medium — Common code statements still pass the R4 output filter.** A registered fake-provider check accepted both `return value` and `await fetch(url)` as successful HINTs. These are recognizable complete statement forms, not an open-ended language-coverage concern. Recommendation: add representative return-statement and awaited-call rejection cases and cover their common syntax patterns while preserving natural-language hints. This is a bounded gap in the explicit code-like-snippet filter requirement.

The implementation's new patterns reasonably cover the follow-up's representative Python lambda and common SQL forms. The approved specification explicitly says that deterministic checks cannot guarantee against semantic solution leakage and requires manual adversarial review. I do not require exhaustive language support or perfect semantic detection. The remaining two examples are common, concrete statement shapes that pass despite the stated R4 requirement; they keep the T02 output-filter criterion incomplete.

### T02 R4 criterion trace

- **Prior lambda and SQL findings:** both reject through the registered fake-provider gateway; regression cases are present.
- **Nearby code and statement forms:** existing/new gateway tests reject simple and nested calls, loops, assignments, control statements, lambda forms, and the covered SQL query/mutation forms. The independently reproduced `return value` and `await fetch(url)` still pass.
- **Ordinary prose and mathematics:** tested gateway examples `f(x)`, `O(n)`, explanatory lambda prose, and the sentence using “Select ... from the array” all pass.
- **Verification:** focused feature and shared gateway suites passed 50 tests. Previously verified raw fence/wrapper rejection, trusted detail refinement exclusion, and overflow/no-provider-call remain in `review-T02-T03-correction.md`; this follow-up did not change those boundaries.

This is a T02-only review. It makes no T03 or combined Batch 2 determination and does not change checklist status.
