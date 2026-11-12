# Student help prompt no-go correction: implementation checklist

Version: 0.1 (2026-11-12)
Task ID: `ai-error-explainer`
Scope source: `no-go-prompt-correction-proposal.md` (human-approved); canonical specification `workflow/specs/ai-error-explainer.md` v0.6, R3–R5 and A1/A3/A6/A7.
Approval state: **APPROVED**. The human explicitly approved correction checklist v0.1 in this conversation after approving the scope proposal. This is a correction to completed T02, not a retroactive change to the checked v0.6 checklist. Handoff, batch dispatch, provider access, and merge remain separate gates.

- [x] **C01 — Student-only fixed prompt clarification.** In `src/codeclinic/server/ai/student-ticket-help.js`, add the approved no-go categories to the feature `SYSTEM_PROMPT`. Explicitly allow grounded concept explanations in plain prose and direct concept questions to `HINT` or sparse-context `CLARIFICATION`. Retain the exact response schemas, limits, refusal behavior, parser, filter, gateway caps, and create-only refinement rule. Do not change the shared preamble. **Acceptance:** source inspection confirms every approved category is conveyed without affecting other AI features.
- [x] **C02 — Focused regression and verification.** In `src/codeclinic/test/student-ticket-help.feature.test.js`, verify prompt guidance and registered fake-provider behavior for a concept question on create and detail, sparse-context clarification, and continued fail-closed handling of malformed/overlong/unsafe replies. Run focused feature/gateway/create/detail route tests and a production build. Record per-item evidence, exact commands, results, and remaining provider uncertainty under the existing task. **Acceptance:** focused checks pass, no unsafe reply is accepted, and an independent reviewer verifies C01/C02 and the combined correction. Depends on C01.

No live provider call, provider credential access, external service, dependency, shared gateway, TA source/test, deployment, push, or merge is part of this checklist. The deployed-model cause and effect remain unverified until separately authorized provider testing.
