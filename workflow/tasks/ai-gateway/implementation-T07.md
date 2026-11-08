# Implementation report: ai-gateway T07 (Usage records)

Status: complete, pending independent review and human approval.
Specification: `workflow/specs/ai-gateway.md` v0.1 (human-approved 2026-11-08), R11; scenario 1 (record part).
Checklist / handoff: `workflow/tasks/ai-gateway/tasks.md` v0.1, `handoff.md` v0.1 (human-approved). Group 1 dispatch under the human's grouping approval.
Branch / worktree: `ai-gateway-t07`, base `da3c249`. No commits.
Execution log: `logs/tasks/ai-gateway/implement-T07.md`.

## Changed files (all new)

- `src/codeclinic/server/ai/usage-store.js`
- `src/codeclinic/test/ai-usage-store.test.js`

## Interface

`createUsageStore({ db, clock = Date.now, randomId = crypto.randomUUID, logger = console })` returns frozen `{ record(entry) }`.
`record({ userId, feature, outcome, attempts, latencyMs, usage })` resolves `true` when written, `false` otherwise; it never throws or rejects.
Also exported: `buildUsageRecord`, `tokenCounts`, `USAGE_COLLECTION` (`'aiUsage'`), `USAGE_OUTCOMES`.

Stored document `aiUsage/{usageId}`: `usageId, userId, feature, outcome, attempts, latencyMs, createdAt (Date from clock), inputTokens, outputTokens, cachedTokens`. Tokens come from `usage.prompt_tokens`, `usage.completion_tokens`, `usage.prompt_tokens_details.cached_tokens`; non-negative safe integers only, otherwise `null`.

## Acceptance (R11)

| Criterion | Status | Test |
| --- | --- | --- |
| One `aiUsage` doc with R11 fields | Met | "writes one aiUsage document..." |
| Token counts from `usage`, else `null` | Met | "stores null token counts..." |
| All seven outcomes accepted | Met | "accepts every R11 outcome" |
| Write failure does not change result; no content logged | Met | "swallows a write failure...", "swallows a synchronous store or clock failure" |
| No prompt/response/key/provider body stored, even if passed | Met | "never writes content, key, or provider fields..." |

Verification: T07 suite 8/8 passed; full suite 20 suites passed / 1 skipped, 276 tests passed / 1 skipped (exit 0); `npm run build` compiled successfully (exit 0).

## Implementer choices and assumptions (for review)

1. Allow-list record construction: only the listed fields are copied; any other property on the entry or in `usage` is ignored.
2. `usageId` from injectable `randomId` (default `crypto.randomUUID`), written with `collection('aiUsage').doc(usageId).set(...)`, and stored in the document per `Overview.md` AIUsageRecord.
3. `createdAt` is a JS `Date` from the injected clock (epoch ms), not a Firestore server timestamp.
4. Malformed metadata (empty/non-string `userId` or `feature`, outcome outside the R11 enum, non-integer or negative `attempts`, non-finite or negative `latencyMs`) is not written; `record` resolves `false` and logs the fixed message. `feature` is not checked against the registry here (T03/T08 own validation).
5. `latencyMs` is rounded to an integer.
6. On any failure, the logger receives only the fixed string `AI usage record could not be written.`; error objects are discarded because they may carry content. Default logger is `console`.
7. `record` returns a boolean so T08 can ignore it; it never affects the caller's result.

## Deviations and risks

- Deviation from the assigned verification: `npm ci` failed with ENOSPC (disk full). The coordinator freed space, removed the partial install, and symlinked `src/codeclinic/node_modules` to the shared main-checkout install; `npm ci` was not re-run. Tests and build therefore ran against the shared install, not a clean install from this worktree's lockfile (same base commit).
- `Overview.md` AIUsageRecord lists five outcomes; R11 adds `INPUT_TOO_LARGE` and `DISABLED`. Implemented per the spec (higher in source-of-truth order); `Overview.md` not edited.
- No Firestore emulator integration test (out of T07 scope; spec matrix lists one for the gateway).
- Choice 4 drops a record for malformed metadata; T08 must pass valid fields so every validated call is recorded.

## Subagent token usage

| Role | Task | Model | Input | Output | Total | Source |
| --- | --- | --- | --- | --- | --- | --- |
| implementer | T07 | claude-opus-5-5 | unavailable | unavailable | unavailable | not exposed by runtime to the subagent |
