# Independent review: Bug FAQ T02 (v0.4)

## Verdict

**Pass.** The protected search and detail routes are mounted before the existing `/:ticketId` handler; inputs and encrypted tokens are checked before FAQ-store reads; each request authenticates the current session and reloads the active Student account; and responses have no-store headers and limited projections. No T02 production defect was found in the snapshot. T01's separate malformed-data continuation finding remains an integration risk because the API depends on that store.

## Scope and evidence

- Reviewed the isolated clean-HEAD Batch 1 snapshot at `C:\Users\Junho\AppData\Local\Temp\codeclinic-bug-faq-review-v04`, including approved v0.4 spec/checklist/handoff, batch plan, validated assignment manifest, `faq-routes.js`, `route.js`, store/token integration, API tests, and existing ticket/server regressions.
- Assignment validation: `node src/workflow/validate-assignment.mjs workflow/tasks/bug-faq/assignment-batch-1.json plan` — passed.
- Implementation reports/logs and `current-state.md` were absent from the snapshot, preventing reconciliation with implementer evidence. Approval status is recorded in the manifest and batch plan and v0.4 versions were verified from the approved artifact headers. No checklist status was changed.
- No production, test, specification, checklist, handoff, or manifest files were changed.

## Criteria trace

| Criterion | Evidence and result |
| --- | --- |
| Search/detail routes exist before generic ticket ID route | `route.js:57-58` mounts FAQ router before `router.get('/:ticketId')`. Pass. |
| Validate required query, selector, repeated/unsupported/malformed/empty/overlong values and cursor length | `faq-routes.js:10-11,48-56`; API contract tests. Pass. Invalid search input returns 400 before ticket store reads. |
| Authenticate session; check trusted role and active current account/password-change state every request | `faq-routes.js:64-86`; `authenticateStudent` calls the session authenticator and reloads account. API tests cover visitor, TA, inactive, and password-change-required cases. Pass. |
| Decrypt tokens with trusted current session, Student, purpose, and query/reference bindings; reject cross-search/reference/session reuse | `faq-routes.js:103-111,131-152`; token suite checks session/Student/purpose/binding/tampering; API suite checks cross-search and cross-reference and same-Student second session/logout. Pass. |
| Stored resolved status enforced on search and detail | Search delegates to resolved-constrained store; detail store rechecks stored status, and API also rejects a non-RESOLVED store projection (`faq-routes.js:159-163`). CLOSED case tested. Pass. |
| No-store, safe error handling, and exact API projections | FAQ middleware sets `Cache-Control: no-store` before route handlers; generic 503 handlers; search cards contain title/tags/ref; detail returns title/tags/fix note/replies/cursor only. Tests cover storage failures and projected fields. Pass. |
| Server-derived Student/TA speaker labels; no author metadata; literal body text | `resolveReplySpeakers` (`faq-routes.js:91-102`) derives from ticket owner/claimed TA IDs; response drops IDs/names while preserving message text. API contract test covers both speakers and markup-like literal strings. Pass. |
| Existing route regressions and combined integration | Existing student ticket/server suites and all focused FAQ/index suites passed together. Pass. |

## Findings

No T02-specific findings.

## Checks

- `npm test -- --runInBand --watchAll=false bug-faq.store.contract.test.js bug-faq.tokens.contract.test.js bug-faq.api.contract.test.js ta-tickets.indexes.test.js student-tickets.api.test.js student-tickets.storage.test.js server.test.js` — **8 suites passed, 157 tests passed**.
- Separate T01-focused check: `npm test -- --runInBand --watchAll=false bug-faq.store.contract.test.js bug-faq.tokens.contract.test.js ta-tickets.indexes.test.js` — **3 suites passed, 42 tests passed**.

## Unverified criteria and risks

- The underlying T01 store has the malformed `createdAt` continuation defect documented in `review-T01-v0.4.md`; combined API behavior cannot make records reachable if the store emits no next cursor.
- Test coverage confirms session-bound cryptographic behavior and API detail logout denial, but does not exercise every token failure mode through HTTP. The lower-level codec and route validation are directly covered.
- No live Firestore/index deployment or browser check was performed; both are outside Batch 1.
