# Proposed amendment: provisional Student chat input budget

Date: 2026-11-11
Status: **APPROVED BY HUMAN FOR PREPARING AMENDED ARTIFACTS**. The human replied “approved for 1” to the provisional 98,304-character / 1,024-token proposal and directed that the shared gateway retain its current default. This does not grant the fresh approvals required for the amended specification, checklist, handoff, batch plan, or implementation dispatch.
Task: `ai-error-explainer`
Current approved versions: specification v0.2, checklist v0.1, handoff v0.1, batch plan v0.1. T01 is partial and unchecked; no production code has changed.

## Human direction and local evidence

The human stated that 50 requests/minute is a chosen cap below the provider's actual throughput limit, that no model context limit is specified, and requested a reasonable input limit based on the maximum file upload size. The existing shared gateway defaults to 40 global calls/minute and permits at most 45. The human then directed that this task retain the current default. No shared rate-limit change is proposed; 50 is contextual upper-limit information, not this task's effective rate setting. No TA feature file or TA test is in scope.

The Student create page allows up to three files of 24 KiB UTF-8 each: **72 KiB total file bytes**. The ticket POST body limit is 128 KiB. A 96 Ki-character post-redaction AI input cap (`maxInputChars = 98,304`) allows the three maximum-size ASCII files plus approximately 24 Ki characters for field labels, other draft fields, question, and recent history. Redaction and serialization can increase length, and other fields can exceed that headroom; the complete input then returns `AI_INPUT_TOO_LARGE` without a provider call. No field or eligible reply is dropped. This is a usability-derived cap, **not evidence that an unspecified model context window can accept it**.

Propose `maxOutputTokens = 1,024` for short hint/refinement JSON. This is provisional: local code sends `max_tokens`, but no approved evidence confirms provider support or an output ceiling. Use fake-provider tests during implementation; keep a human/provider smoke check for the deployed model, `max_tokens`, and representative maximum-size inputs before release. If the model rejects the request, return the gateway's safe unavailable state and reopen the cap decision. Do not access credentials or call the provider under this amendment approval alone.

## Exact approved-artifact edits proposed

1. **`workflow/specs/ai-error-explainer.md` v0.2 → v0.3:** In R3, replace the requirement to choose caps *within confirmed provider limits* with `maxInputChars = 98,304` post-redaction characters and `maxOutputTokens = 1,024` as provisional feature caps. Keep the complete-context, no-truncation, and `AI_INPUT_TOO_LARGE` requirements. Add the explicit operational caveat and pre-release human/provider smoke check. In Remaining planning decisions, replace the confirmed-model-cap prerequisite with the provisional-cap decision and verification gate. Do not alter role, ownership, privacy, response behavior, or page-only history.
2. **`workflow/tasks/ai-error-explainer/tasks.md` v0.1 → v0.2:** Amend T01 acceptance from confirmed-model support and reproducible provider-safe rationale to the specified provisional caps, 72 KiB-file/128 KiB-request size rationale, exact draft/response bounds, and documented provider compatibility risk. T01 remains unchecked until independent review. Amend T08 to require recording the human/provider smoke outcome before claiming deployment readiness; no live call is authorized by the checklist itself. Preserve all other item order and wording.
3. **`workflow/tasks/ai-error-explainer/handoff.md` v0.1 → v0.2:** Record provisional cap values, the lack of model-context evidence, fake-provider implementation scope, and the separate pre-release smoke approval/evidence requirement. Preserve the no-secret/no-external-access boundary.
4. **`workflow/tasks/ai-error-explainer/batch-plan.md` v0.1 → v0.2:** Keep the same ordered batches. Record that Batch 1 resumes T01 under amended artifacts, with fresh batch-plan and dispatch approval required. Do not treat earlier approval as approval of the amended versions.
5. **`workflow/tasks/ai-error-explainer/design.md`:** After approval, replace the unresolved provider-cap section with the provisional numerical rationale and matching parser string limits. Record the older partial finding rather than erasing it.

## Decision requested

The human approved the **provisional input/output-cap requirement change** and chose the existing gateway default for rate limiting. The orchestrator will record the dated amendment, update the named artifacts, reconcile tests, and present the amended versions for their required fresh specification, checklist, handoff, batch-plan, and implementation approvals. Approval of this proposal is not provider-access approval.
