# Independent review: Batch 2 correction (T02 and T03)

Date: 2026-11-11  
Reviewed artifacts: approved specification v0.3, checklist and handoff v0.2, active correction assignment, approved `batch-2-correction-proposal.md`, `design.md`, and prior `review-T02-T03.md`. The initial assignment is retained as historical.  
Implementation evidence: T02/T03 initial and correction reports, with corresponding factual logs.  
Execution log: [`logs/tasks/ai-error-explainer/review-T02-T03-correction.md`](../../../logs/tasks/ai-error-explainer/review-T02-T03-correction.md)

## Scope and review controls

Reviewed the complete in-scope implementation and test files named by the active assignment: `src/codeclinic/server/ai/student-ticket-help.js`, `parse.js`, `gateway.js`, `server/tickets/student-help-chat.js`, `server/tickets/route.js`, `server/index.js`, and the two assigned Student test files. Also checked the shared session authenticator lines governing inactive accounts. Did not inspect TA-specific files or tests. The separate reviewer checkout was unavailable because `.git` is read-only; this is the exception recorded in the assignment. No production changes or review-only tests were added.

The test script was inspected in `src/codeclinic/package.json`. It runs `react-scripts test` with the repository's test roots. No test command here contacts a provider: gateway tests inject fake transports, limiters, and usage stores. The test environment uses synthetic credentials and `provider.invalid`.

## T02 verdict: **Changes required**

The approved correction resolves the two prior integration findings. `parseModelOutput` now supplies raw provider text and request context to the registered validator. The Student feature reparses the raw text as JSON, so surrounding Markdown fences and prose wrappers fail closed. The gateway passes the server-created input object, and the feature reads only its `page` value to disallow `REFINEMENT` for detail requests. It rejects unsupported/missing page context. Other registered parsers receive the additional second argument but existing parsers that accept one argument continue to work; the shared `ai-gateway.test.js` suite passed.

The registered fake-provider tests demonstrate rejection of a full Markdown fence and prose wrapper, rejection of a detail-page refinement, and overflow refusal before the transport call. The overflow test sends a serialized draft whose complete string exceeds the feature cap and confirms `AI_INPUT_TOO_LARGE` with zero transport calls. The feature serializes all supplied draft fields, including empty values and attached code, into one string before the existing shared redaction-and-cap path.

**Medium — The output filter still accepts ordinary code-shaped statements, leaving the R4 code-like-output rejection criterion incomplete.** The new examples cover a Python `for` line, and the filter catches several declarations, control keywords, assignments, braces, and patch markers. However, `plainText` permits parentheses and periods, while `unsafeOutput` does not reject common call expressions. For example, a valid HINT with `hints: ["console.log(value)"]` passes the current pattern set. This is executable code-shaped output even though it is not a complete solution. The approved R4 policy explicitly requires rejection of code-like complete snippets. Recommendation: add a focused adversarial fake-provider assertion for call-expression output and strengthen the deterministic policy while retaining the manual semantic-leakage review required by the spec. Do not claim the heuristic proves semantic safety.

### T02 criterion trace

- **Fixed feature registration, bounded policy, server serialization:** present in `student-ticket-help.js`, registered by server startup; the feature tests verify policy constants and serialization. No client or model-supplied policy is used.
- **Exact JSON schema, field and count validation, detail refinement exclusion:** schema checks are exact; trusted server `input.page` reaches the registered parser; fake-provider detail refinement is rejected.
- **Raw fenced/wrapped output rejection:** verified through `createAiGateway` using fake transport; both fence and prose wrapper return `AI_INVALID_OUTPUT`.
- **Complete-context overflow without partial provider call:** verified; the gateway returns `AI_INPUT_TOO_LARGE` and transport is not called.
- **Code/solution and secret filtering:** representative direct-answer, credential, loop, and legacy declaration cases are covered; broad code-shaped rejection remains incomplete as above. No filter can establish semantic solution safety; manual adversarial review remains open.
- **Other shared gateway behavior:** the shared gateway suite passed with the new parser arguments; no other feature source or TA-specific tests were touched.

## T03 verdict: **Changes required**

The create-chat route enforces session-backed Student identity, reloads the account using the trusted session user ID, checks active Student state and password-change status, then checks CSRF before validating the exact body or calling the gateway. Client identity/role fields are rejected as unexpected properties. The route accepts incomplete draft values, preserves the full snapshot, enforces per-field/file/path bounds, maps the 128 KiB body-parser overflow distinctly, uses `no-store`, makes no ticket/reply/notification/transcript writes, and returns fixed safe error envelopes. The added tests cover TA, password-change-required and inactive-account scenarios, forged identity/role properties, and exact Unicode/file/path/aggregate request boundaries. The create portion of the API suite passed all 14 assertions.

**Medium — Inactive Student requests return 401 although approved R2 requires 403.** The shared `createSessionAuthenticator` treats an account whose current status is not `ACTIVE` as an invalid session, deletes the session, and returns `null` (`src/codeclinic/server/auth/login.js:147-151`). The create route maps a null authenticator result to `UNAUTHENTICATED`/401 (`student-help-chat.js`). The correction test confirms this current result, while specification R2 and the T03 negative-test expectation require 403 for inactive status. This is a formal spec mismatch even though access is denied before provider work. The correction scope retained T03 production behavior; the discrepancy must remain visible for orchestration. Recommendation: resolve through the approved change path by making the endpoint distinguish a valid cookie session tied to an inactive account and return 403 without exposing protected data, or obtain an explicit spec amendment if the shared auth contract is intended to govern. Do not silently change the spec or reinterpret the passing access-denial test as satisfying R2.

The API suite also retains six detail-route failures assigned to T04. They are not counted as T03 create-route failures: detail visitor returned 404 rather than expected 401; three ineligible-account detail cases returned 404 rather than 403; a create-only draft sent to the not-yet-implemented detail route returned 404 rather than 400; and the non-owned detail response lacked `Cache-Control: no-store`. These failures remain open T04 evidence.

### T03 criterion trace

- **Student-only session/CSRF, exact request validation, body cap, complete draft snapshot, no writes, safe errors:** implementation inspected; create-route tests passed, including the newly added bounds and forged-field cases.
- **Unauthorized/malformed requests do not call provider:** tests exercise create no-CSRF, ineligible account, malformed/out-of-bound snapshots, and forged identity/role paths before gateway work.
- **Status mapping:** visitor/no-session and active ineligible states are tested. Inactive status is denied without provider call but returns 401, conflicting with required 403; criterion incomplete.
- **Boundary coverage:** exact field/file/path and an aggregate valid request above 100 KiB below the cap are exercised. Provider compatibility remains unverified and is not authorized in this correction.

## Combined verdict: **Changes required**

The correction closes the original raw-wrapper and actual-gateway detail-refinement gaps, and T03's create-route functionality and boundary tests pass. T02 still has a concrete code-shaped-output acceptance gap under R4, and T03 still mismatches the explicitly approved inactive-status HTTP code in R2. The six documented detail-route failures remain open for T04 and are preserved as separate evidence.

No checklist status was changed. Before reconciling T02/T03 as complete, address the two medium findings or obtain the appropriate approved requirement resolution. Deployment readiness also remains unverified pending the separately authorized provider compatibility smoke check and the required human visual check; neither was attempted here.
