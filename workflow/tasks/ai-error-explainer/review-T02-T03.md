# Independent review: Batch 2 (T02 and T03)

Date: 2026-11-11  
Reviewed artifacts: specification v0.3, checklist v0.2, handoff v0.2, Batch 2 assignment manifest, and the active design/amendment.  
Implementation evidence: `implementation-T02.md`, `implementation-T03.md`, and their factual logs.  
Execution log: [`logs/tasks/ai-error-explainer/review-T02-T03.md`](../../../logs/tasks/ai-error-explainer/review-T02-T03.md)

## Scope and controls

Reviewed the complete batch changes in the manifest's allowed source/test files: `server/ai/student-ticket-help.js`, `server/tickets/student-help-chat.js`, `server/tickets/route.js`, `server/index.js`, `test/student-ticket-help.feature.test.js`, and `test/student-help-chat.api.test.js`. Also traced the existing shared gateway parser, redactor, prompt builder, app route ordering, and the API test fixture where needed to assess the approved requirements. No TA-specific code or tests were inspected. No production or test files were changed; no review-only tests were added.

The separately authored `StudentTicketHelpChat.test.tsx` is recorded by the approved batch plan as pre-implementation test-writer coverage. It is not one of the implementer's assigned files and is not part of this batch's implementation diff. The repository does not provide an isolated review checkout because `.git` is read-only; review was performed against the shared workspace, as disclosed in the manifest.

## T02 verdict: **Changes required**

The feature is registered as `ERROR_EXPLAINER` with a fixed prompt, 98,304 UTF-16-code-unit input cap, 1,024 output-token cap, and complete JSON serialization. The parser checks exact variant keys, the approved counts and string lengths, create-only refinement fields, and basic code, URL, prompt-disclosure, and credential patterns. The helper accepts a `page` argument and its unit test confirms that a direct `parse(..., { page: 'detail' })` call rejects `REFINEMENT`.

Two issues prevent satisfying the approved output boundary:

1. **Medium — Full Markdown-fenced model output is accepted despite the explicit rejection rule.** `server/ai/parse.js` calls `stripCodeFence()` before invoking the registered feature parser. `ERROR_EXPLAINER.parse` therefore receives only decoded JSON and cannot tell whether the raw model response was fenced. A valid response wrapped in a full Markdown fence is accepted, even though R4 and the approved design require fences and non-JSON wrapping to be rejected. The implementer identified this limitation; it is a shared-gateway behavior outside this batch's allowlist. Recommendation: resolve this at the gateway/parser boundary under an approved scope adjustment (or an explicitly approved requirement amendment), and add an end-to-end gateway test proving fenced output maps to `AI_INVALID_OUTPUT`.

2. **Medium — The registered parser does not enforce detail-page refinement exclusion.** `ERROR_EXPLAINER.parse` hard-codes `page: 'create'`. The tested detail mode is only an exported helper path; it is not connected to `createAiGateway`, whose `parseModelOutput` invokes the single registered parser without page context. Consequently, a later detail request through this feature will have a `REFINEMENT` accepted by the gateway unless the detail route adds a separate rejection after gateway parsing. This leaves checklist T02's “detail chat cannot accept a refinement response” criterion unproven at the actual gateway boundary. Recommendation: provide trusted request context to output validation or enforce a route-level safe `AI_INVALID_OUTPUT` rejection before a detail response is returned; add a gateway/route integration test. Do not rely solely on the helper-only test.

The separate output heuristic also has narrow coverage: tests include one direct-answer phrase, one declaration-shaped snippet, and one credential-shaped string. The current code patterns do not catch all code-like outputs; for example, a multiline conditional/return snippet can satisfy `plainText` and avoid `unsafeOutput`'s declaration/diff patterns. This is an unresolved part of the same output-boundary gap: R4 requires rejection of code-like complete snippets, while the approved spec already recognizes that semantic leakage cannot be fully guaranteed. Recommendation: add adversarial boundary cases and strengthen deterministic checks where feasible; retain the manual adversarial review requirement. No claim is made that deterministic filtering can prove semantic safety.

T02 test command passed 1 suite / 8 tests. This is evidence for the covered parser shapes and helper behavior, not for raw-output fence rejection or detail-page behavior through the registered gateway parser. See the execution log.

### T02 criteria not yet verified

- Raw fenced output and other non-JSON wrapping are rejected through the actual shared gateway path.
- A detail-page call through the registered gateway cannot return `REFINEMENT`.
- Adversarial coverage for code-like complete snippets and broader unsafe-output cases is incomplete.
- Complete-context overflow/no-partial-context behavior is implemented by the shared gateway's redaction/cap path, but this batch's feature test does not exercise it with the feature registered and a fake provider.

## T03 verdict: **Pass with follow-up**

The create route is Student-only in trusted server code: it authenticates the cookie-backed session, checks the session role, reloads the account by the session user ID, requires an active Student, blocks password-change-required accounts, and checks CSRF before validating or sending the request to the gateway. Client-supplied identity or role fields are not accepted because the request object is exact and the gateway actor is built from the trusted session. The route performs no ticket, reply, notification, or transcript write.

Request validation requires `question` and the complete exact draft field set, permits blank/incomplete values, validates history ordering and bounds, validates language, field/code-point lengths, file count/name/content UTF-8 bytes, path count/total length, and rejects unknown properties. It passes the validated snapshot whole to the feature serializer/gateway; no route-side clipping or field dropping is present. The 128 KiB body parser is effective in production because `/api/tickets` is mounted before the login app's shared 8 KiB parser. Responses set `Cache-Control: no-store`; the route maps gateway errors to fixed codes/statuses and catches exceptions without exposing their contents.

The focused create-route assertions passed. Follow-up coverage should directly exercise create requests from TA, inactive, password-change-required, and forged identity/role cases; test exact field-boundary values and a valid body near the 128 KiB cap; and assert no provider call for each unauthorized case. The current six API failures are all on unimplemented detail-chat paths assigned to T04, matching the implementation log; they are retained and do not count as create-route failures.

### T03 criteria not yet verified

- Create endpoint negative tests for TA, inactive Student, password-change-required Student, and client-forged identity/role fields are absent (the implementation checks the trusted account/session path).
- Exact-at-limit success coverage for the 128 KiB request body, field bounds, Unicode code points, and all draft fields is incomplete.
- No real provider compatibility or model call was attempted or authorized; the approved pre-release smoke check remains open.

## Combined conclusion: **Changes required**

T03's create route meets its inspected server-side contract and its eight create assertions pass, with the noted test follow-up. T02 has unresolved approved output-boundary requirements at the shared gateway integration: raw full fences are normalized before feature parsing, and the registered parser always enables create-only refinements. These must be resolved before treating T02 as complete or integrating detail chat against it. Preserve the six T04 failures as open evidence; do not mark them as regressions in T02/T03.

No approval for changing shared gateway files, expanding the batch allowlist, or amending the approved requirement is inferred from this review. The orchestrator should reconcile the findings and obtain the required scope decision before the relevant correction proceeds.
