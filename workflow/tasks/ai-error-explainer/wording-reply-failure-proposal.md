# Create-chat wording reply failure: correction proposal

Status: **APPROVED FOR NARROW T02 CORRECTION DISPATCH** (2026-11-12). The human explicitly replied “approved” to this two-file correction and independent review in this conversation after confirming the Create Ticket route.

## Report and verified boundary

The human reported HTTP 503 and the UI text “The help bot could not prepare a safe reply. Please try again” after asking **“improve ticket wording”**, then confirmed this occurred on **Create Ticket**. `StudentHelpChat.tsx` maps that exact text to `AI_INVALID_OUTPUT`. The create-chat route maps `AI_INVALID_OUTPUT` to 503 when the shared gateway rejects provider output. This establishes the error category, not the exact provider response or why it failed validation. No raw provider content is logged by design, and this proposal does not ask the human to share draft, ticket, secret, or provider content.

The approved R4 output contract requires exact JSON shapes, allowed create-only refinement fields, 1–10 suggestions, each at most 64 UTF-16 code units, and rejection of code, URLs, secrets, and complete solutions. `student-ticket-help.js` enforces those checks. Its current system prompt names the response types but does not spell out their keys, field allowlist, counts, or lengths. A provider answer can therefore be useful in intent yet fail safely because it does not match the exact parser contract. The provisional 1,024-token output cap could also cut off a long response; provider compatibility is still unverified. Both are hypotheses until a safe provider smoke check is separately authorized.

## Proposed correction and verification

1. In `src/codeclinic/server/ai/student-ticket-help.js`, add concise, explicit response-schema guidance to the fixed server-side system prompt: one raw JSON object with no Markdown; exact keys for each allowed variant; create-only `REFINEMENT` field names and 1–10 short suggestions, each at most 64 UTF-16 code units; `CLARIFICATION` for a sparse draft. Keep the parser, safety filter, no-repair-call rule, limits, endpoints, and authorization unchanged. Do not accept invalid output or expose rejected content.
2. In `src/codeclinic/test/student-ticket-help.feature.test.js`, add fake-provider cases for the exact user question with a valid create refinement and sparse-draft clarification, plus malformed/fenced/overlong and unsafe responses that must still fail with `AI_INVALID_OUTPUT`. Assert the prompt contains enough schema guidance without logging user content.
3. Run focused feature/gateway and create-route tests, then the build. Store full output under `logs/tasks/ai-error-explainer/`. A different reviewer inspects the exact two-file create-chat correction, verifies the tests and safety boundary, and records a separate verdict before T08 dispatch. Detail-chat behavior must remain unchanged.

Exact source/test allowlist: `src/codeclinic/server/ai/student-ticket-help.js` and `src/codeclinic/test/student-ticket-help.feature.test.js`. Evidence: a correction implementation report, independent review report, and factual logs under `workflow/tasks/ai-error-explainer/` and `logs/tasks/ai-error-explainer/`. No other production source, shared gateway, TA code/test, dependency, CI/deployment, provider call, credential, or external service action is approved by this proposal. The still-pending Batch 6/T08 combined verification must wait for this correction review.

## Remaining uncertainty

Local fake-provider tests can show that compliant wording suggestions succeed and unsafe/malformed replies remain blocked. They cannot establish what the deployed model actually returned for the reported request or that the revised prompt will eliminate every 503. A live provider compatibility smoke check needs separate human authorization under the existing task gate; until then, deployment readiness remains open.

**Approved decision:** dispatch this narrow T02 correction implementation and independent review under the stated two-file scope, without provider access. Batch 6/T08, live provider access, and merge remain separate gates.
