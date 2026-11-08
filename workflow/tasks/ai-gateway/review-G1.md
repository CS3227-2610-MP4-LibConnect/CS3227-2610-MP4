# Review report: ai-gateway Group 1 (T01, T02, T03, T06, T07)

Reviewer: independent `reviewer` agent (did not write this code). Assessment only; not a human approval.
Date: 2026-11-08
Specification: `workflow/specs/ai-gateway.md` v0.1 (human-approved 2026-11-08)
Checklist and handoff: `workflow/tasks/ai-gateway/tasks.md` v0.1, `handoff.md` v0.1 (human-approved 2026-11-08); Group 1 grouping approval recorded in `tasks.md`.
Reviewed: worktree `wt/ag-g1`, branch `ai-gateway-g1`, base `522afc4`; 25 staged paths, uncommitted (`git diff --cached -M`). `logs/tasks/ai-gateway/integration-G1.md` is untracked.
Security review: `workflow/tasks/ai-gateway/security-review-G1.md`. Execution log: `logs/tasks/ai-gateway/review-G1.md`.

## Verdict recommendation

**Ready (pass with follow-up).** There are no Critical or High findings. One Medium finding (M1, typed assignments in redaction) should be fixed before any real feature registers with the gateway, which means before `ai-error-explainer` ships. It can be done as a Group 1 follow-up or within Group 3; it does not affect the other Group 1 units.

## Findings (ranked)

| ID | Severity | Location | Finding | Recommended action |
| --- | --- | --- | --- | --- |
| M1 | Medium | `src/codeclinic/server/ai/redact.js:45-46` (`ASSIGNMENT`) | Typed assignments leak the value. In `password: str = "…"`, `const token: string = "…"`, and `val apiKey: String = "…"`, the `:` operator matches the type annotation. The type name is replaced and the quoted value reaches the provider unchanged (probe in log). R6 requires redacting "assignments where the name contains password/secret/token/api_key", replacing the value, and TypeScript, Python, and Kotlin code is a common input in a programming help queue. Scenario 6 holds for the tested forms only. | When a `:` match is followed by `[ \t]*=` after an identifier-like type, redact the value after `=`. Alternatively, also match `name[:type]? = value`. Add tests for the three typed forms. |
| L1 | Low | `src/codeclinic/server/ai/prompt.js:35-36` | Neutralisation turns a forged `<<<UNTRUSTED_CONTENT_END>>>` into `‹‹‹UNTRUSTED_CONTENT_END›››`, which still looks like the delimiter. Full-width `＜＜＜…＞＞＞` passes through unchanged. Exact ASCII delimiters cannot be forged, so R7 and scenario 7 are met. However, a look-alike "end" line followed by fake instructions may be more persuasive to the model than plain injected text. The implementer already lists this as a risk. | Follow-up: replace forged runs with neutral text, for example `[delimiter removed]`, or add a per-request random nonce to the delimiter lines in the user message only. A nonce keeps the system message cacheable. R9 schema validation and advisory-only output remain the real controls. |
| L2 | Low | `src/codeclinic/server/ai/redact.js:19-51` | Best-effort misses outside or at the edge of R6. Unquoted values containing spaces are only partly redacted (`password = [REDACTED] horse battery`). So are values containing a quote (`password=[REDACTED]'def`). Other misses: Bearer tokens under 8 characters; `ghp_…` followed by `_`; names longer than 64 characters (`XXXX…_PASSWORD=`); emails with a local part over 64 characters, IDN, or `@localhost`; multi-line YAML values; `#define API_KEY "…"`. Not in R6 at all: `ASIA` keys, PGP key blocks, bare JWTs, `Authorization: token …`, Slack and Stripe keys, `-p<password>`. R6 calls redaction "a privacy safeguard, not a guarantee". | Accept as residual risk. The feature tasks must add the User Guide warning (R6). Consider adding `ASIA` and `Authorization: token` in a later spec revision. |
| L3 | Low | `src/codeclinic/server/shared/firestore-rate-counter.js:60-71` | `release` checks only that the stored window is still active. If the window expired and another call opened a new one between `reserve` and `release`, the release decrements the new window, under-counting by one. This logic existed unchanged in the auth store; the extraction kept it verbatim. It is reachable only on the limiter's refusal or failure path. | Follow-up only; optionally pass the reserved `windowStart` to `release`. |
| L4 | Low | `src/codeclinic/server/ai/config.js:9,19` | A key with a trailing newline or whitespace, which is common when a secret is created with `echo`, is rejected as malformed and the gateway starts disabled. This fails safe and the reason names no value, but it is an operational trap. | Note it in deployment docs, or trim trailing whitespace before validation. |
| L5 | Low | `aiRateCounters`, `aiUsage` | No TTL policy on `expiresAt` for `aiRateCounters`, and no retention for `aiUsage`. Deployment configuration was out of scope, as the T06 report notes. | Track as a deployment follow-up. |
| I1 | Info | `test/ai-rate-limit.test.js`, `test/firestore-rate-counter.test.js` | Counters are tested only with in-memory fakes. Transaction serialisation and contention against real Firestore or the emulator are unverified. My own non-serialising fake granted 10 concurrent reservations, which shows the fakes cannot detect concurrency bugs. The spec's verification matrix lists an emulator integration test. | Cover in T08 or T09 with the opt-in `RUN_FIRESTORE_EMULATOR_TESTS` pattern. |
| I2 | Info | `src/codeclinic/server/ai/features.js:126-127` | `has()` calls `this.get`, so it throws if destructured from the registry. | Use a closure reference. |
| I3 | Info | `src/codeclinic/test/firestore-rate-counter.test.js:131` | `git diff --cached --check` reports a new blank line at EOF. | Cosmetic. |
| I4 | Info | Environment | Node v24.2.0 is below `engines >=24.12.0`. `node_modules` is a symlink to the main checkout's install, not a clean `npm ci` from this lockfile. | Record; rerun on a clean install before release. |

No Critical or High findings.

## Acceptance-criterion trace

| Criterion | Implementation | Tests | Status |
| --- | --- | --- | --- |
| R2 config, scenario 3 (config part) | `config.js` `loadAiConfig` | `ai-config.test.js` (36) | Met at unit level. "Server still starts", "logs one message", and "no provider request" are T08. |
| R2 key never in reason | `config.js:56-62`, non-enumerable `apiKey` at `:84` | `ai-config.test.js` lines 60-68, 107-108; probe | Met |
| R3 registration, unknown feature rejected | `features.js` `validateFeatureDefinition`, `get` returns `null` | `ai-features.test.js` (23) | Met at registry level. Rejection "before any provider call" in `run` is T08. |
| R5 limits, scenario 5 | `rate-limit.js`, `firestore-rate-counter.js` | `ai-rate-limit.test.js`, `firestore-rate-counter.test.js` | Met with fakes; emulator unverified (I1) |
| R6 redaction and cap, scenario 6 | `redact.js` | `ai-redact.test.js` (46) | Met for all seven listed pattern families, with the M1 gap for typed assignments. Cap never truncates. |
| R7 two messages, fixed system, delimiters; scenarios 2 and 7 | `prompt.js` | `ai-prompt.test.js` (28) | Met (see L1) |
| R11 record shape, null tokens, no content, swallowed failure | `usage-store.js` | `ai-usage-store.test.js` (8) | Met at unit level. "Every call that passes validation" is T08 (see T07 ruling 4). |
| R1 separate, testable units | Five modules plus the shared counter | All suites | Met for Group 1 units |
| Scenario 12 (no browser references) | No reference under `src/codeclinic/src/` (grep) | T09 | Not in scope; spot-checked clean |

## Test-rule check

- Existing tests are unedited. `git diff --cached --stat -- src/codeclinic/test/` lists only seven new files. The only modified tracked file is `server/auth/firestore-store.js`. The unchanged `firestore-store.test.js`, `login.*`, and `registration.*` suites pass.
- Tests use the fake key `test-key-not-real` and `example.test` hosts. Scanning the diff for real-format secrets (AKIA, gh*_, AIza, key bodies) found no literal matches. No test calls the network or the real provider.
- No test was weakened. The T02 log records lowering one of the implementer's own size preconditions, from >900000 to >750000, before first commit. It is a test of new code, and the 2 s bound is unchanged.

## Auth store refactor (T06)

The change is behaviour-identical by inspection of `git diff --cached -M -- server/auth/firestore-store.js`. The transaction bodies moved verbatim with `failureCount` parameterised as `countField`. The collection `loginFailureCounters`, the key `sha256(kind:identifier)`, the fields, the window logic, and the release-and-delete behaviour are unchanged. The constructor already required `runTransaction`, so the new constructor validation adds no failure mode. `crypto` and `millis` are still used by the session code. A new parity test (`firestore-rate-counter.test.js:106-129`) checks the legacy key and document shape.

## Assumption rulings

| Task | Assumption | Ruling |
| --- | --- | --- |
| T01-1 | A malformed or out-of-range `AI_GLOBAL_LIMIT_PER_MINUTE` disables the gateway | Accept. It fails safe and is consistent with R2's "malformed configuration". |
| T01-2 | `SOCLAAS_MODEL` is checked by format only | Accept until open decision 2 is resolved. |
| T01-3 | The key must be printable ASCII without whitespace | Accept as a header-injection guard (see L4). |
| T01-4 | The base URL must be https, end exactly in `/v1`, and have no credentials, query, or fragment | Accept |
| T01-5 | Startup logging of the disabled reason is deferred to T08 | Accept. T08 must log `reason` exactly once and never the config object. |
| T02 | An unterminated key block is redacted to end of content | Accept (fail-safe) |
| T02 | Bearer tokens need at least 8 characters; GitHub token bodies at least 20 | Accept (see L2) |
| T02 | Assignment values are single-line; names match as substrings | Accept. Typed assignments are a separate defect (M1). |
| T02 | The cap counts UTF-16 code units | Accept |
| T03 | `has()` and `names()` added | Accept (see I2) |
| T03 | Extra definition fields are rejected | Accept. This is consistent with R3: R3 enumerates the registration fields and gives no other, and rejection stops a silently ignored `model` or `tools` field. A future field needs a spec change, which is the right gate. |
| T03 | Only runs of three or more `<`/`>` are neutralised | Accept (see L1) |
| T06-1 | "50/day" is a 24 h window from the user's first counted call | Accept. It is a fixed window anchored at the first call, not a sliding window, so up to 100 calls can straddle a boundary. The spec does not define the day boundary. |
| T06-2 | Order is user-minute, user-day, global, with best-effort release | Accept. Verified that refused or failed calls release earlier slots and that user-blocked calls do not consume global capacity. A failed release only over-counts. |
| T06-3 | `countField` parameter (`failureCount` for auth, `count` for AI) | Accept |
| T06-4 | A bad `userId` or clock returns `AI_UNAVAILABLE` | Accept. Verified for empty, non-string, throwing, and NaN clock. |
| T07-1, 2, 3, 5, 6, 7 | Allow-list, stored `usageId`, JS `Date` `createdAt`, rounding, fixed log message, boolean return | Accept |
| T07-4 | Malformed metadata drops the record | Accept with an obligation on T08. R11 requires a record for every call that passes feature validation, so T08 must always pass valid metadata and should have a test for it. |
| T07 | Outcome set follows the spec, not `Overview.md` | Accept (source-of-truth order) |

## Verification (exact results in the log)

- `CI=true npm test -- --watch=false`: Test Suites 1 skipped, 21 passed (21 of 22); Tests 1 skipped, 383 passed (384). This matches `integration-G1.md`.
- `npm run build`: compiled; build folder ready.
- Review-only probe (`scratchpad/review-probe-g1.js`, outside the worktree, not committed): adversarial ReDoS inputs, redaction misses, prompt neutralisation, config serialisation, limiter limits, isolation and fail-closed behaviour, and usage-store failure handling. All 17 ReDoS inputs of about 1M characters completed in 1-30 ms.
- No review-only tests were added to the worktree.

## Unverified criteria

- R5 behaviour against real Firestore transactions (I1).
- Everything that depends on T08 composition: disabled server start, the startup log, `run` rejecting unknown features before the provider, every-call usage records, and scenario 11 over the full pipeline.
- Real provider behaviour under injection (manual smoke check, human only).
