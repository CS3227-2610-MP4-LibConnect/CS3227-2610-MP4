# Independent review: T02 statement-syntax filter follow-up

Date: 2026-11-11  
Reviewed against: approved specification v0.3 R4, checklist v0.2 T02, prior T02 review reports, and `implementation-T02-followup-4.md`.  
Execution log: [`logs/tasks/ai-error-explainer/review-T02-followup-4.md`](../../../logs/tasks/ai-error-explainer/review-T02-followup-4.md)

## Scope and controls

Reviewed the Student-only output filter and table-driven feature tests for this follow-up. Verified the prior regressions, the language-family rejection/acceptance matrix, and sampled nearby exception syntax at the registered fake-provider gateway. No T03 or TA-specific files/tests were inspected or changed. No production edits or review-only tests were made. The shared-workspace separation exception remains as recorded in the active assignment because `.git` is read-only.

## T02 verdict: **Changes required**

The follow-up rejects both earlier reproductions through the registered gateway: `return value` and `await fetch(url)`. The rejection matrix now covers representative JavaScript statements (return, await, declaration, import, control flow, calls), Python statements (return, yield, import, definition, loop, lambda and nested call), assignment, and SQL select/insert/delete. Its natural-language matrix accepts function/complexity notation, explanations of lambda/return/await/import, and a sentence using “Select ... from the array.” The focused feature and shared gateway suites passed 2 suites / 58 tests.

**Medium — Common exception statements still pass as model HINTs.** I verified `throw new Error("bad")` and `raise ValueError("bad")` through the registered fake-provider gateway. Both were returned as successful HINTs. These are recognizable JavaScript and Python code statements, not an unbounded language-coverage edge case. Recommendation: add representative throw/raise rejection cases and detect these statement forms while retaining the tested explanatory prose cases.

R4 requires rejection of code-like complete snippets; the requested filter is not expected to parse every language or guarantee against semantic solution leakage. The broad table makes meaningful progress and the spec's manual adversarial review addresses residual semantic risk. The two common exception statements remain a concrete gap in the representative statement filter, so I do not consider the R4 code-shape criterion complete yet.

### T02 R4 criterion trace

- **Prior findings:** lambda/SQL forms, `return value`, and `await fetch(url)` reject through registered fake-provider tests or the focused follow-up cases.
- **Representative language matrix:** 18 code-shaped JavaScript, Python, and SQL cases are tested for rejection; seven natural-language/math cases are tested for acceptance.
- **Remaining concrete forms:** `throw new Error("bad")` and `raise ValueError("bad")` pass through the registered fake-provider gateway.
- **Focused verification:** feature and shared gateway suites passed 58 tests. Previously reviewed raw wrappers, trusted detail refinement exclusion, and complete-context overflow/no-provider-call remain as recorded in `review-T02-T03-correction.md`; this follow-up did not alter those boundaries.

This report gives a T02-only verdict. It makes no T03 or combined Batch 2 determination and does not change checklist status.
