# Implementation report: ai-gateway review-G1 M1 fix (typed assignments)

Status: complete, pending independent review and human approval.
Specification: `workflow/specs/ai-gateway.md` v0.1, R6; scenario 6. Finding: `review-G1.md` M1 (Medium).
Worktree: `ag-g2`, base `0f07599` (Group 1 merged). No commits.
Execution log: `logs/tasks/ai-gateway/implement-G2.md` (section "M1 fix").

## Change

- `src/codeclinic/server/ai/redact.js` (+8/−1): `ASSIGNMENT` gains an optional type annotation, `:[ \t]*[A-Za-z_][A-Za-z0-9_.<>[\]|? \t]{0,64}`, that is accepted only when followed by `=` (not `==` or `=>`). The annotation stays in the kept prefix and the value after `=` becomes `[REDACTED]`, with surrounding quotes kept. Without such a `=`, the `:` remains the operator as before.
- `src/codeclinic/test/ai-redact.test.js` (+54/−0): a new `describe` block. Existing tests are unmodified.

## Tests added (22)

- Typed forms (12): Python (`str`, `Optional[str]`, `str | None`, `Final` unquoted), TypeScript (`const`, `let` union with backtick value, generic, array type), Kotlin (`val`, `private var` nullable), Scala qualified type, no-space form.
- One marker when an earlier pattern already redacted the value (`const token: string = ghp_…`).
- Untyped colon forms unchanged, including `password: hunter2, retries = 3` and `:=`.
- Near misses not redacted (6): non-secret names with types, `==`, `===`.
- Typed comparison and arrow (`password: str == …`, `token: T => …`) do not redact the right-hand side.
- Adversarial annotation-like input over 750,000 characters completes in under 2 s.

ReDoS: the new group has one bounded quantifier (`{0,64}`) followed by a fixed lookahead; there are no nested quantifiers.

## Results

`ai-redact` 68/68 (46 existing + 22 new). Full suite: 23 passed / 1 skipped suites; 467 passed / 1 skipped tests (exit 0). `npm run build`: compiled successfully (exit 0).

## Residual risks

- Annotations containing a comma (`api_keys: Dict[str, str] = …`, `Map<String, String>`) are not recognised. The type fragment before the comma is redacted, and the value after `=` is sent unchanged. Commas are excluded on purpose so that `password: hunter2, retries = 3` keeps redacting `hunter2`. Such values are usually containers, not literals.
- Annotation-only forms (`def f(password: str)`) still redact the type name (over-redaction, no leak), and so does a typed comparison (`password: [REDACTED] == "guess"`). Both behave as before this fix.
- The other review-G1 L2 misses remain accepted residual risk.

## Subagent token usage

| Role | Task | Model | Input | Output | Total | Source |
| --- | --- | --- | --- | --- | --- | --- |
| implementer | M1 fix | unavailable | unavailable | unavailable | unavailable | not exposed by runtime to the subagent |
