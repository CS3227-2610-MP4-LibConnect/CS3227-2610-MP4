# Independent Review: AI gateway continuation

## Scope and evidence

- Reviewed approved AI gateway specification v0.1, checklist v0.1 (T08/T09), and handoff v0.1. The recorded approval evidence was present in the supplied frozen snapshot.
- Reviewed the exact continuation diff at `/private/tmp/codeclinic-gateway-review-20261108/gateway-continuation.diff` against base `652e8ee`, the supplied continuation log, implementation report, and prior G1/G2 review and integration evidence. The snapshot has no `.git`; therefore an independent Git diff/status check was unavailable. No production source or tests were changed during this review.
- Reviewed `server/ai/gateway.js`, the startup addition in `server/index.js`, transport redirect/error and response-body handling, and `ai-gateway`, `ai-browser-boundary`, and `ai-transport-hardening` tests. Also reran all AI suites and the repository suite/build.
- Prior independent G1/G2 reviews remain applicable to T01–T07. Their recorded follow-up on typed assignment redaction remains a pre-existing issue for a future feature-specific review; the continuation does not change redaction.

## Acceptance criteria trace

| Requirement | Review result |
| --- | --- |
| R1 single provider boundary / browser boundary | T08 creates one gateway and `server/index.js` only stores it in `app.locals`; no route or feature is registered. The recursive browser-source boundary test passes. |
| R2 configuration | Existing config tests pass in this run. Disabled configuration logs one fixed, non-sensitive reason and allows server startup to proceed to listen, assuming the existing Firestore and build prerequisites are satisfied. |
| R3 feature registration | Registry and gateway tests pass. No real feature is registered. |
| R4 pipeline and no-throw fallback | The gateway composes validation, limit reservation, redaction/cap, prompt construction, transport, parsing, and usage recording in order. `run` catches collaborator exceptions and resolves a safe fallback. The unidentifiable-actor audit gap is recorded below. |
| R5 limits | Existing limit tests pass. No limiter behavior changed in the continuation. |
| R6 redaction/caps | Existing redaction tests pass; no redaction code changed in this continuation. See prior G1/G2 follow-up noted above. |
| R7 prompt construction | Gateway tests pass for stable system prompt and delimiter containment; no prompt module changed. |
| R8 transport | Existing retry/timeout/circuit tests pass. New tests verify redirect refusal and declared/streamed body-size limits. Oversize responses fail without retry; provider bodies are not surfaced. |
| R9 parsing | Existing parser tests pass, and gateway malformed-output cases pass. |
| R10 results | Gateway tests cover success and fallback codes exercised by the pipeline. No unhandled `run` rejection was observed in the AI suites. |
| R11 usage records | Existing usage-store tests and gateway success/failure tests pass. Records use allowlisted metadata and token counts. Invalid or missing actor input is returned unavailable without an audit identity; see [M1]. |

## Findings

### [M1] R4/R11 do not define audit behavior for invalid actors

- **Boundary:** Trusted server caller to gateway and usage audit.
- **Evidence:** `gateway.js` returns `AI_UNAVAILABLE` for missing/malformed actors at lines 43–46, before setting `userId` or `startedAt`; the `finally` block writes usage only when both exist (lines 83–90). The new test explicitly asserts no usage record for invalid actors. This avoids fabricating an audit identity.
- **Requirement:** R4 says a failure at any pipeline layer records usage. R11 says every call that passes feature validation writes an `aiUsage` record containing `userId`. The current spec does not say whether an actor failing validation has passed feature validation, or how an event without a trustworthy `userId` can be recorded.
- **Impact:** An invalid call to a registered feature is not represented in `aiUsage`. Fabricating or trusting a malformed identity would create a separate security risk, so the implementation's fail-closed behavior is defensible but not fully reconcilable with the literal audit requirement.
- **Recommended action:** Before a real feature registers, resolve this in the approved specification: explicitly exclude calls without a validated server actor from R4/R11 usage records, or approve a separate non-identifying audit shape. Do not synthesize a user ID.
- **Verification:** `test/ai-gateway.test.js` checks missing and malformed actors return unavailable without provider, limiter, or usage calls. All AI suites pass.
- **Residual risk:** Invalid-actor invocations are not counted in per-user usage audit. Human decision/spec amendment is required; no policy change was made in this review.

### [L1] Emulator integration leaves synthetic rate-counter documents

- **Boundary:** Test isolation / Firestore emulator.
- **Evidence:** `test/ai-gateway-emulator.integration.test.js` creates a random synthetic `userId` and confirms counters exist, but its `finally` block deletes only matching `aiUsage` documents. The three hashed AI counter docs remain in the emulator.
- **Impact:** Repeated integration runs accumulate stale counter documents in a reused emulator and can make the fixture less isolated. This does not affect production data when the documented disposable local emulator is used.
- **Recommended action:** Delete the synthetic user's minute/day counter documents during cleanup, or explicitly require a fresh/disposable emulator for each run.
- **Verification:** Read-only source inspection; orchestrator reports the two opt-in emulator tests passed.
- **Residual risk:** Cleanup is only complete for usage records today.

No other new Critical, High, or Medium implementation defect was found in the assigned continuation scope. The malformed-actor behavior is a spec clarification follow-up, not a recommendation to invent an identity or broaden gateway authority.

## Verification

- `CI=true npm test -- --watch=false --runInBand --runTestsByPath test/ai-config.test.js test/ai-features.test.js test/ai-gateway.test.js test/ai-parse.test.js test/ai-prompt.test.js test/ai-rate-limit.test.js test/ai-redact.test.js test/ai-transport.test.js test/ai-transport-hardening.test.js test/ai-usage-store.test.js test/ai-browser-boundary.test.js` — passed, 11 suites / 259 tests.
- `CI=true npm test -- --watch=false --runInBand` — not clean in this sandbox: 8 suites failed, 1 skipped, 22 passed; 192 tests failed, 1 skipped, 418 passed. The failures were dominated by `listen EPERM: operation not permitted 127.0.0.1` in existing tests that bind local HTTP servers. See the factual log for details. This prevents claiming a clean full-regression pass; it does not indicate an AI-suite failure.
- `npm run build` — passed; optimized production build compiled successfully.
- The orchestrator subsequently ran the opt-in fake-provider HTTP + Firestore-emulator integration in the main repository: 2 suites / 2 tests passed in 6.9 seconds. I inspected the added test read-only; details and exact command are in [`continuation.md`](../../../logs/tasks/ai-gateway/continuation.md). This integration was not part of my frozen-snapshot run. The human-only live SoCLaaS `/models` and minimal-completion smoke remains unverified; no provider call or key was used.
- The new opt-in emulator test leaves its three hashed `aiRateCounters` documents behind; it deletes only usage records. This is a low-severity test-isolation follow-up, not a production data exposure, and should be cleaned up or explicitly scoped to a disposable emulator.

## Verdict

**Pass with follow-up.** The T08/T09 continuation and recovered transport hardening meet their implementation acceptance criteria in the isolated AI tests; the build and orchestrator-run fake-provider/Firestore-emulator integration pass. The full test suite could not pass under the review sandbox's loopback restriction, and the orchestrator's later full-regression run also recorded unrelated fixture regressions (see the continuation log). Before registering a real AI feature, the human should resolve the R4/R11 invalid-actor audit semantics in the spec. Emulator test cleanup and human provider smoke remain follow-ups. This assessment does not approve merge.

Execution details: [`review-continuation.md`](../../../logs/tasks/ai-gateway/review-continuation.md). Security analysis: [`security-review.md`](security-review.md).

## Review addendum — approved clarification and test cleanup

Date: 2026-11-08. Read-only review of the human-approved R4/R11 clarification and emulator-test cleanup.

- **M1 resolved:** The human-approved wording in spec R4/R11, checklist T08, and handoff now states that per-user usage recording requires both a registered feature and a valid server-resolved actor. It explicitly excludes invalid actors from provider calls and fabricated audit identities. This matches the inspected gateway behavior and removes the prior ambiguity. The original finding above is retained as review history.
- **L1 addressed in source; rerun pending:** The test now deletes the synthetic user's `ai-user-minute` and `ai-user-day` hashed counter docs. The hash construction matches `createFirestoreRateCounter` (`sha256(kind + ':' + identifier)`). It intentionally leaves the shared global counter to the disposable `firebase emulators:exec` instance documented in the integration command. The updated integration was not rerun after this cleanup; the orchestrator plans that opt-in rerun. The original finding above is retained as review history.
- **Remaining unverified:** the amended opt-in emulator integration rerun; a clean full regression (previous runs include loopback `EPERM` and cross-feature fixture failures); and the human-only SoCLaaS model/completion smoke, including `SOCLAAS_MODEL` and `max_tokens` support. The snapshot build passed; the later main-repository build result and warning are recorded in the orchestrator continuation log.

This addendum supersedes the prior M1/L1 open status: M1 is resolved by the approved specification clarification, and L1 is addressed in source pending the orchestrator's rerun. The continuation remains **pass with follow-up**; this addendum does not approve merge or change checklist status.
