# Independent review: Batch 2 T02/T03 under approved v0.4

Date: 2026-11-11  
Reviewed artifacts: specification v0.4, checklist v0.3, handoff v0.3, active Batch 2 assignment, approved correction proposal, design, implementation evidence, and prior review/follow-up reports. The active versions identify T02/T03; prior v0.3/v0.2 findings remain historical except where explicitly reconciled below.  
Full test output: [`logs/tasks/ai-error-explainer/review-T02-T03-v0.4-full-test-output.txt`](../../../logs/tasks/ai-error-explainer/review-T02-T03-v0.4-full-test-output.txt)  
Factual review log: [`logs/tasks/ai-error-explainer/review-T02-T03-v0.4.md`](../../../logs/tasks/ai-error-explainer/review-T02-T03-v0.4.md)

## Scope and controls

Reviewed the in-scope Student/server AI implementation: `src/codeclinic/server/ai/student-ticket-help.js`, `parse.js`, `gateway.js`, `server/tickets/student-help-chat.js`, `server/tickets/route.js`, and `server/index.js`. Reviewed assigned tests `student-ticket-help.feature.test.js`, `student-help-chat.api.test.js`, and shared `ai-gateway.test.js`. Inspected the shared session authenticator behavior needed to verify inactive-session handling. Did not inspect TA-specific files/tests or the separate UI-only test-writer file. `.git` is read-only in the supplied workspace, so review was performed in the shared workspace under the assignment's separation exception.

The active assignment points to spec v0.4/checklist and handoff v0.3. Its allowed source scope contains the Student feature, shared parser/gateway boundary, ticket route wiring, server registration, and assigned tests. The v0.4 inactive-session amendment is approved and the active implementation scope is otherwise unchanged. The implementation evidence `implementation-T03-correction.md` still describes the historical v0.3/403 discrepancy; the v0.4 source/tests now align with R2's approved 401 rule. Orchestrator should keep that evidence distinction clear when reconciling the manifest.

Inspected `src/codeclinic/package.json`: the test script is `react-scripts test --roots test --testMatch "**/test/**/*.test.*"`. Tests inject fake provider transports, limiters, usage stores, local auth stores, and repository fixtures; no live provider or external service is used.

## T02 verdict: **Pass with follow-up**

The `ERROR_EXPLAINER` feature is registered at server startup with fixed system policy, the approved input/output caps, full create/detail serialization, exact JSON variants, create-only refinements, plain-text checks, and deterministic output rejection. The shared gateway now supplies raw provider content and server-created request context to the feature validator. The Student validator rejects a raw Markdown fence or prose wrapper and uses trusted `input.page` to reject detail-page refinements. Shared parser behavior for existing one-argument parsers is preserved; the shared gateway suite passes.

The feature suite covers representative JavaScript, Python, and SQL code-shaped statements, exception/control forms, calls, loops, assignments, lambda expressions and query/mutation forms. It also checks ordinary mathematical notation and explanatory prose, prior call-expression regressions, detail refinement rejection, and complete serialized-context overflow returning `AI_INPUT_TOO_LARGE` without a transport call. Tests for the shared gateway show redaction, safe content-free usage, safe provider/collaborator failure handling, and generic output validation.

No concrete R4 output-policy defect was found in this review's representative matrix. The residual risk is the one specified in R4: deterministic patterns cannot guarantee against every language form or semantically phrased solution; manual adversarial review remains required under T08. The Student-specific fake-gateway tests do not separately capture a secret embedded in a complete Student draft and assert the exact redacted provider payload; redaction is verified through the shared gateway test and the Student serializer is verified separately. This is indirect coverage and should be included in the T08 adversarial/capture review.

### T02 acceptance trace

- **Feature registration, fixed policy, serializer and exact schemas:** verified in the feature module and server startup. Feature tests cover exact shapes, limits, serialization, and refinement fields.
- **Raw wrapping and page-specific behavior:** registered gateway tests reject fenced/wrapped output and detail-page `REFINEMENT`; trusted page context is provided by the server gateway call.
- **Code/output safety:** 27 representative code-shaped output cases reject, and 13 natural-language/math cases are accepted. Direct-answer, secret-shaped output, prompt-disclosure and malformed schema examples are covered. Manual semantic-leakage review remains open by spec.
- **Complete-context overflow:** fake gateway test confirms the whole serialized input is capped and the provider transport is not called on overflow.
- **Secret redaction:** shared gateway test passes redaction and safe-log assertions; Student-specific serialization-to-fake-transport redaction assertion is not present. Follow up during T08.

## T03 verdict: **Pass with follow-up**

The create route authenticates from the cookie-backed server session, uses the trusted session user ID to reload the account, requires Student role and active status, rejects password-change-required accounts, and checks CSRF before validating the request or calling the gateway. Client-provided identity/role properties are rejected as unexpected keys. The gateway actor is built from the trusted session, not request fields. A session invalidated by the shared authenticator because the Student is inactive returns `401 UNAUTHENTICATED`, as approved in spec v0.4 R2 and checklist/handoff v0.3; the earlier v0.3-versus-v0.2 `401/403` finding is resolved by the approved specification amendment without changing shared auth behavior.

The request validator enforces exact top-level/draft/history/file shapes, trims and bounds the question, checks Unicode code-point field bounds and file UTF-8 bytes, limits file/path counts, preserves incomplete drafts and all fields, rejects unexpected properties, and uses the 128 KiB parser limit. The route is mounted before the login app's smaller JSON parser. It sets `no-store`, returns fixed safe envelopes/statuses, catches account/gateway failures without exposing exception text, and performs no ticket, reply, notification, or transcript write. Tests cover success/context capture, malformed and oversized bodies, CSRF, TA/password-change/inactive denial before gateway work, forged fields, and a large valid snapshot above 100 KiB and below 128 KiB.

No T03 production defect was found. The API test covers rate-limit mapping but does not separately exercise route mappings for `AI_INPUT_TOO_LARGE`, `AI_INVALID_OUTPUT`, and generic gateway/storage failure; implementation branches map those to the approved safe status/code envelopes. The valid request boundary is tested below, rather than exactly at, 128 KiB. These are focused follow-up coverage opportunities, not observed behavior failures.

### T03 acceptance trace

- **Trusted Student/session/status/CSRF enforcement:** source and API tests confirm the server-derived identity path, role/password/inactive checks, CSRF rejection, and no gateway call for denied requests. Inactive status matches amended R2 401.
- **Exact request/body validation and snapshot:** create-route tests cover extra fields, blanks, malformed JSON, field/file/code-point boundaries, paths, and a valid aggregate request over 100 KiB. Server configuration confirms the exact 128 KiB parser limit and its mount order.
- **No writes and private error handling:** route source invokes only the gateway and returns fixed envelopes; catch paths omit exception/provider content. Fixture tests verify safe no-store responses and denied requests stop before provider work.
- **Unverified/indirect:** exact 128 KiB request success boundary is not separately asserted; API route mapping tests cover rate limit but not each gateway failure code/storage branch; production app parser ordering is verified by source inspection rather than an app-level large-body integration test.

## Combined verdict: **Pass with follow-up**

T02 feature policy and T03 create-chat route compose correctly: the server creates the authorized `STUDENT` actor and fixed `page: 'create'` input, the gateway serializes/redacts/caps it, and the registered parser validates output before the route returns a no-store response. The amended inactive-session status is consistent across spec, checklist, handoff, source behavior, and create API test. No out-of-scope production changes, dependency additions, or external effects were found in the assigned Student/server AI diff.

The focused command ran three suites: 2 passed and the API suite failed on six detail-chat tests assigned to T04. There were 86 passing and 6 failing tests total. The six failures are retained as open T04 evidence: detail visitor expected 401 but got 404; three ineligible detail accounts expected 403 but got 404; create-only draft to the not-yet-implemented detail route expected 400 but got 404; and non-owned detail response lacked `Cache-Control: no-store`. They are outside T02/T03 and are not reported as T03 regressions.

### Remaining acceptance criteria/follow-ups

- T04 must implement and verify the detail route, ownership/privacy checks, status envelopes, fresh ticket/reply context, pagination/reassignment, and complete-context cap; preserve the six current API failures until then.
- T05–T07 UI and page-local history behavior are not in this batch. A1–A3 end-to-end page behavior and A8 remain unverified here.
- T08 must complete the manual adversarial review for semantic solution leakage and capture Student-context redaction behavior; this review does not claim semantic safety is proven.
- The required human visual check at 320 CSS pixels remains outstanding for both pages. The separately authorized provider compatibility smoke check for deployed model limits also remains open; no provider was accessed here.
- Suggested test follow-up: explicitly exercise create-route `AI_INPUT_TOO_LARGE`, `AI_INVALID_OUTPUT`, and generic unavailable/storage mapping; optionally add an app-level valid large-body test for the mount ordering. No review-only tests were added.

No checklist status was changed. Independent review is evidence only; the orchestrator must reconcile the reports/logs and active manifest before any approval gate advances.
