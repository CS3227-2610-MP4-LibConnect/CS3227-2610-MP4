# T01 implementation amendment

Status: **complete for independent review; provider compatibility remains unverified**

- Item: T01 — Provider budget and contract design.
- Current approved sources: `workflow/specs/ai-error-explainer.md` v0.3, `workflow/tasks/ai-error-explainer/tasks.md` v0.2, `workflow/tasks/ai-error-explainer/handoff.md` v0.2, `workflow/tasks/ai-error-explainer/batch-plan.md` v0.2.
- Preserved history: initial partial result and its original log remain in `implementation-T01.md` and `logs/tasks/ai-error-explainer/implementation-T01.md`.
- Amended design: `workflow/tasks/ai-error-explainer/design.md`, section “Approved amendment — provisional caps and completed contracts”.
- Factual execution record: [`logs/tasks/ai-error-explainer/implementation-T01-amendment.md`](../../../logs/tasks/ai-error-explainer/implementation-T01-amendment.md).
- Files changed in this resumption: only `design.md`, this amendment report, and its amendment log.

## Acceptance criteria

- **R2–R4 and A2/A7 provisional bounds and cap rationale:** complete in design evidence. It records `maxInputChars = 98,304` post-redaction UTF-16 code units and `maxOutputTokens = 1,024`, derived from 3 × 24 KiB file content plus approximately 24 Ki code units of context headroom, with the separate 128 KiB HTTP body cap.
- Exact request/draft/history bounds, response JSON variants and fields, parser string lengths, success/error HTTP envelopes, safe fallback mappings, and complete-context no-truncation behavior are specified.
- A bounded serialization check records maximum escaped ASCII JSON character counts for each response variant; it does not claim tokenizer behavior or model compatibility.
- The shared gateway rate-limit default remains unchanged.
- Deployed model context capacity and compatibility with `max_tokens = 1,024` remain **unverified**. The design does not claim provider-safe limits or deployment readiness. A separately human-authorized pre-release smoke check is required; this assignment did not authorize or perform provider access.

## Checks

- `node src/workflow/validate-assignment.mjs workflow/tasks/ai-error-explainer/assignment-batch-1.json plan` — pass: “Assignment batch 1 plan checks passed. Human approval and evidence review remain separate.”
- `openspec list --json` — exit 0, repository root found, no native OpenSpec changes listed.
- `openspec status --change ai-error-explainer --json` — exit 1, `change_error`: no OpenSpec change exists. The repository's `workflow/specs/` adapter remains controlling; no second spec tree was created.
- Reviewed only approved local gateway config/redaction/transport contracts and Student request validation/UI context needed for T01. No network/provider/credential/environment access, no TA source/test inspection, and no source/test modification.
- No automated tests or build were run because this amendment changes design evidence only.
- Original calculation (superseded by the correction below): max-length ASCII quote-filled response fields produced HINT 760, REFINEMENT 897, CLARIFICATION 398, REFUSAL 351 wire characters with a 20-code-unit refinement bound. This is retained as historical evidence, not the current design value.

## Handoff and risks

Ready for independent review of T01. The reviewer should check cap units/arithmetic, draft bound consistency, schema names/counts/lengths, HTTP mapping, full-context overflow behavior, and whether the fixed 1,024-token limit is sufficient for worst-case validated JSON. Provider model/context compatibility is an explicit unresolved pre-release criterion, and semantic solution leakage and imperfect secret redaction remain downstream security-review risks. The checklist remains open until independent review and orchestrator reconciliation.

## Review correction — 2026-11-11

The independent reviewer found that the original 20-code-unit refinement suggestion maximum was too short to reliably support useful R4/A2 wording. The active design cap is corrected to **64 UTF-16 code units per suggestion**. Representative useful texts are 47 code units (“State the expected result for the empty lookup.”), 34 (“Say what changes after the lookup.”), and 37 (“Name the key that triggers the error.”).

The current worst-case `REFINEMENT` JSON wire length is **1,777 characters**, recalculated with ten suggestions, the longest allowed field name (`expectedBehaviour`), and a 64-character ASCII quote-filled suggestion in each entry (quotes double-escaped by JSON). The other maxima remain HINT 760, CLARIFICATION 398, and REFUSAL 351. These are wire-character counts, not provider tokens. Whether a maximum-size response fits `maxOutputTokens = 1,024` remains unresolved until the separately human-authorized provider smoke check; malformed or truncated output must fail safely. The original 897-character result above is preserved as historical evidence for the superseded 20-unit limit.
