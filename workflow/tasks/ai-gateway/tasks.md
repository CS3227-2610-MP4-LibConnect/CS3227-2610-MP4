# Implementation checklist: AI gateway

Version: 0.1 (2026-11-08)
Task ID: `ai-gateway`
Specification: `workflow/specs/ai-gateway.md`, version 0.1 (human-approved 2026-11-08)
Checklist approval evidence: the human replied "approve the checklist and handoff" to version 0.1 on 2026-11-08; recorded at the human's request; no agent-set approval state.

Approved grouping: Group 1 (T01, T02, T03, T06, T07); Group 2 (T04, T05); Group 3 (T08); Group 4 (T09). Human grouping approval was given in this chat on 2026-11-08 by replying “approved” to the four-group proposal; this records evidence and does not set an agent approval state. Checkboxes are implementation tracking only. The orchestrator marks a task `[x]` only after independent review. If implementation would change behavior, authorization policy, dependencies, deployment configuration, or scope, stop and obtain the required approval first.

All new gateway code goes under `src/codeclinic/server/ai/` as CommonJS JavaScript. Every unit takes its collaborators (clock, fetch, Firestore, random source) as parameters so tests can use fakes. Tests go under `src/codeclinic/test/` and never call the real provider.

## Group 1 — Parallel foundations (T01, T02, T03, T06, T07)

- [x] **T01 — Configuration and disabled state.** Add `server/ai/config.js`, which parses `SOCLAAS_API_KEY`, `SOCLAAS_BASE_URL`, `SOCLAAS_MODEL`, and `AI_GLOBAL_LIMIT_PER_MINUTE` (integer 1–45, default 40) into a frozen config or a disabled result. Missing or malformed values produce the disabled state with one non-sensitive reason that never includes the key. Test valid, missing, malformed, and out-of-range values. (Spec R2; scenario 3.)

- [x] **T02 — Redaction and input caps.** Add `server/ai/redact.js` implementing every R6 pattern, replacing only the matched secret or value with `[REDACTED]`. Add the cap check, which returns `AI_INPUT_TOO_LARGE` after redaction and never truncates. Test each pattern, near misses that must not be redacted, multi-line private keys, and the cap boundary. (Spec R6; scenario 6.)

- [x] **T03 — Feature registry and prompt construction.** Add `server/ai/features.js` (registration, validation of the R3 fields, rejection of unknown features) and `server/ai/prompt.js` (the shared preamble and the two-message order with delimited user content). Test that the system message is byte-identical across inputs, contains no per-request values, and that injected instructions stay inside the delimiters. (Spec R3, R7; scenarios 2, 4, 7.)

- [x] **T06 — Shared rate counters and AI limits.** Extract the transactional fixed-window counter from `server/auth/firestore-store.js` (`reserveRateSlot`/`releaseRateSlot`) into `server/shared/firestore-rate-counter.js`, parameterized by collection name. The auth store must delegate to it, keeping its `loginFailureCounters` collection, key format, and behavior unchanged, and all existing auth tests must pass unmodified. Add `server/ai/rate-limit.js`, which reserves the global per-minute slot and the per-user 5/min and 50/day slots in an `aiRateCounters` collection, and fails closed on store errors. Test the limits and user isolation, and run the existing auth tests unchanged. (Spec R5; scenario 5.)

- [x] **T07 — Usage records.** Add `server/ai/usage-store.js`, which writes one `aiUsage` document per call with the R11 fields and token counts from the provider `usage` object, or `null` when absent. A write failure is swallowed without logging content and without changing the result. Test the record shape, `null` tokens, the swallowed failure, and that no content fields exist. (Spec R11; scenario 1.)

## Group 2 — Provider transport and output parsing (T04, T05)

- [x] **T04 — Provider transport.** Add `server/ai/transport.js`. It builds the `POST /chat/completions` request (configured model, `max_tokens`, `reasoning_effort: "none"`, Bearer header) and applies the 20-second timeout, one jittered retry only for `429`/`5xx`/network/timeout, the `Retry-After` rule, and the circuit breaker (5 consecutive failures, 60 seconds). It maps failures to internal categories without keeping provider bodies. Test with a fake `fetch` and a fake clock, including that `400`/`401`/`403` are not retried. (Spec R8; scenarios 1, 4, 8, 9.)

- [x] **T05 — Output parsing.** Add `server/ai/parse.js`. It reads the first choice's `message.content`, strips at most one surrounding code fence, parses the JSON, and passes the result to the feature's `parse`. Test valid, fenced, fenced-with-extra-text, missing, non-string, non-JSON, and schema-invalid replies. (Spec R9; scenario 10.)

## Group 3 — Gateway composition and startup wiring (T08)

- [x] **T08 — Gateway pipeline and server wiring.** Add `server/ai/gateway.js` exposing `createAiGateway(deps)` and `gateway.run({ feature, actor, input })`. It composes T01–T07 in the R4 order, returns only the R10 results, never throws to the caller, and records usage for every call that passes registered-feature and server-resolved actor validation. In `server/index.js`, create one gateway at startup from `process.env`, so a disabled gateway does not stop the server. Add no route and register no real feature. Test the full pipeline with a fake feature and a fake provider, the disabled state, and that log and record output contains no key, header, prompt, or output text. (Spec R1, R4, R10; scenarios 1, 3, 11.)

## Group 4 — Browser boundary verification and evidence (T09)

- [x] **T09 — Browser boundary check and evidence.** Add a test that fails if any file under `src/codeclinic/src/` references `soclaas`, `SOCLAAS_`, or `server/ai`. Run the full test suite and build, then record changed files, commands, results, deviations, and unresolved risks in `implementation-report.md` and `logs/tasks/ai-gateway/`, including the *Subagent token usage* table. The manual smoke check against the real provider is run only by the human, with a key supplied outside the repository. (Spec R1, verification matrix; scenario 12.)

## Approval boundary

Checklist v0.1 and handoff v0.1 are human-approved (2026-11-08). Grouping approval, implementation dispatch, review, commit, and merge are separate human decisions. No test result or agent message advances a gate.

## Amendments

- 2026-11-08: Drafted at the human's direction after the human approved specification v0.1.
- 2026-11-08: The human approved checklist v0.1 and handoff v0.1.
- 2026-11-08: The human approved renaming the application directory from `src/libconnect-mp4` to `src/codeclinic`. Path references in this file were updated; requirements are unchanged.

- 2026-11-08: The human selected **Approve the clarification** in the continuation chat for R4/R11, this checklist and the handoff: per-user usage records require both a registered feature and a valid server-resolved actor. Invalid actors return AI_UNAVAILABLE without provider calls or fabricated audit identities. This records the human-approved wording clarification; gateway behavior is unchanged.
