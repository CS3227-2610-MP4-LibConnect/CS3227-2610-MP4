# AI Security Review: gateway continuation

## Scope and assumptions

This review covers the shared server-side gateway continuation (T08/T09) and recovered transport hardening in AI gateway specification v0.1. Trusted callers are feature services running on the server; they must resolve actor identity and authorize feature input before calling the gateway. User-provided input and provider replies are untrusted. `SOCLAAS_API_KEY` is server-only. The gateway has no tools and exposes no application-data mutation beyond rate counters and usage records.

The implementation intentionally registers no real feature and adds no route. The review used only synthetic fixtures and did not contact SoCLaaS, Firestore, or another external service.

## Trust boundaries and data flow

| Boundary | Attacker-controlled input | Impact | Control and evidence |
| --- | --- | --- | --- |
| Server caller to gateway | Feature input, malformed request, invalid actor | Unauthorized or unbounded provider use; audit attribution failure | Registry allowlist, actor shape check, shared limiter, redaction/cap, safe fallback. AI pipeline tests pass. Invalid actor audit semantics remain a spec follow-up. |
| Gateway prompt to model | User-derived content and delimiter-like strings | Prompt injection or instruction confusion | Fixed system preamble and feature prompt; content remains in delimited user message and delimiter escaping is covered by tests. Prompt text is advisory, not authorization. |
| Gateway to provider | URL, credentials, request and response transport | Credential leakage through redirect/error, excessive response memory use | `redirect: 'error'`, no provider-error-body reads/logging, timeout/retry policy, 1 MiB success-body cap. Redirect and body-cap tests pass. |
| Model output to application | Arbitrary provider JSON/text | Invalid data used by application | JSON parse and feature schema parser; invalid output maps to a safe result. No tool calling or consequential action exists. |
| Gateway to audit store/logs | Actor metadata and provider usage metadata | Prompt/output/secret leakage or false attribution | Usage record allowlist and fixed failure log in existing store. Gateway tests assert no key/header/prompt/output canary in logs or records. Invalid actor calls are deliberately unaudited rather than assigned a fabricated identity. |
| Browser bundle | Source imports/config references | Key/config or server module exposure | Recursive test scans `src/codeclinic/src/` for provider/config/server-AI references; passes. Production build succeeds. |

## Threats considered

- Direct instruction override and prompt-reveal text, delimiter injection, and model output that is malformed or schema-invalid.
- Forged client `model` input, unknown feature names, missing/malformed actors, and caller/collaborator exceptions.
- Provider redirect responses, retryable and non-retryable failures, oversized declared and streamed bodies, and body-read errors.
- Exposure of key, authorization header, prompts, model output, or provider error text through return values, logs, and usage records.
- Browser bundling of provider strings and server-only modules.

No external content retrieval, model tools, cross-user data access, or consequential AI action is present in the reviewed continuation. Feature-specific authorization, schemas, and prompt-injection behavior remain outside this task and must be reviewed when a feature is added.

## Findings

### [M1] Invalid actor audit semantics need an approved specification decision

- **Boundary:** Server caller to gateway / audit.
- **Attack path:** A registered feature is called with no valid server-resolved actor; gateway returns unavailable and writes no usage record.
- **Impact:** The invocation is absent from `aiUsage`, while the spec's general usage language can be read to require an audit record for every pipeline failure. Logging or storing a fabricated identity would be unsafe.
- **Control:** Current implementation rejects the call before rate limiting/provider access and does not invent identity. The test verifies that no provider, limiter, or audit call occurs.
- **Verification:** AI tests pass; source inspection confirms audit is conditional on validated `userId` and initialized timing.
- **Residual risk:** Audit completeness for invalid actor calls depends on a human-approved clarification to R4/R11 before real feature registration.

### [L1] Emulator test leaves synthetic counter records

- **Boundary:** Test isolation / Firestore emulator.
- **Attack path:** Re-running the opt-in integration against a reused emulator creates three additional counter records for each random test actor; cleanup deletes only usage documents.
- **Impact:** Stale synthetic records accumulate in a shared emulator. The user ID is not stored in the counter document ID in plaintext, and this does not cross into production if the test uses its required local demo emulator.
- **Control:** The test is explicitly gated and validates the emulator project/host; the orchestrator reported a passing run.
- **Verification:** Read-only inspection of `ai-gateway-emulator.integration.test.js` and the recorded 2/2 integration result.
- **Residual risk:** The test needs counter cleanup or a disposable emulator requirement.

No additional new security finding was identified in the assigned continuation. Previously recorded G1/G2 redaction follow-ups were not changed by this continuation and should remain visible to later feature reviews.

## Test plan and results

- All 11 AI suites: 259 passed.
- Full test suite: blocked by sandbox loopback `EPERM` in existing HTTP server tests; 8 suites failed, 1 skipped, 22 passed.
- Production build: passed.
- The orchestrator subsequently ran the opt-in local fake-provider HTTP + Firestore-emulator integration: 2 suites / 2 tests passed. I inspected its main-repository test read-only; its exact command and result are recorded in `logs/tasks/ai-gateway/continuation.md`. It checks a loopback fake provider and real emulator counters/usage. The test deletes synthetic usage documents but leaves the hashed rate-counter documents in the disposable emulator.
- No real provider smoke was performed.

## Release gates

- Resolve invalid-actor audit semantics in the canonical spec through the human approval workflow before registering a real feature.
- Keep the emulator integration isolated to a disposable local emulator and clean up the synthetic rate-counter records (or explicitly document emulator disposal).
- Human runs the approved provider smoke with the key supplied outside the repository; provider model and `max_tokens` support remain unverified.
- Re-run full regression in an environment where existing local HTTP tests can bind sockets.

## Open decisions

- Should calls without a validated actor be explicitly excluded from `aiUsage`, or should a separate non-identifying audit event be approved?
- Provider model and `max_tokens` compatibility remain for the human-only smoke described in spec v0.1.

## Review addendum — approved clarification and cleanup

Date: 2026-11-08. This read-only follow-up reviewed the human-approved R4/R11, checklist, and handoff clarification and the amended emulator-test cleanup.

- **M1 resolved:** The approved spec now ties usage recording to a registered feature plus a valid server-resolved actor and states that an invalid actor must not contact the provider or receive a fabricated audit identity. This is consistent with the inspected gateway fail-closed path. The original finding is retained above.
- **L1 addressed in source; verification pending:** The emulator test now deletes the synthetic actor's hashed per-user minute and day counter docs using the same hash input as the shared counter implementation. It leaves the environment-wide counter to a disposable `firebase emulators:exec` instance, as recorded in the integration command. The amended integration has not yet been rerun; the orchestrator plans that check. The original finding is retained above.
- **Remaining release evidence:** rerun the amended opt-in emulator integration; obtain a clean full regression after loopback and fixture issues are resolved; and have the human perform the provider smoke for the model and `max_tokens` support. No provider credentials or external provider calls were used in this review.

This addendum supersedes the earlier M1/L1 release-gate wording: M1 is resolved by the approved spec clarification, and L1 is addressed in source pending integration rerun. The original findings remain above as historical review evidence.
