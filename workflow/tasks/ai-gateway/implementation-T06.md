# T06 implementation handoff

Status: complete for assigned T06; awaiting orchestrator reconciliation and independent review.
Task: `ai-gateway` Group 1, T06 (shared rate counters and AI limits).
Contract: approved `workflow/specs/ai-gateway.md` v0.1 (R5, scenario 5), approved `tasks.md` v0.1, approved `handoff.md` v0.1, human-approved Group 1 grouping.
Branch/worktree: `ai-gateway-t06`, base `da3c249`. No commits. No task checkbox or shared handoff changed.

## Files changed

- `src/codeclinic/server/shared/firestore-rate-counter.js` (new): `createFirestoreRateCounter(db, { collection, countField = 'count' })` returns `{ reserve(kind, identifier, limit, now, windowMs) -> Promise<boolean>, release(kind, identifier, now, windowMs) -> Promise<void> }`. Transaction logic moved verbatim from the auth store; document ID `sha256(`${kind}:${identifier}`)`; fields `{ kind, windowStart, [countField], expiresAt }`. Store errors propagate. Invalid db/collection/countField throw `TypeError`.
- `src/codeclinic/server/auth/firestore-store.js` (modified, delegation only): removes local `sha256`/`counterRef` and the inline transactions; `reserveRateSlot`/`releaseRateSlot` keep their signatures and delegate to the shared counter with `collection: 'loginFailureCounters'`, `countField: 'failureCount'`. Collection, key format, field names and behaviour unchanged; session code untouched.
- `src/codeclinic/server/ai/rate-limit.js` (new): `createAiRateLimiter({ db, now = Date.now, globalLimitPerMinute = 40 })` returning `{ reserve(userId) }`, which never rejects and resolves `{ ok: true }`, `{ ok: false, code: 'AI_RATE_LIMITED' }` or `{ ok: false, code: 'AI_UNAVAILABLE' }`. Exports constants `AI_RATE_COUNTER_COLLECTION` (`aiRateCounters`), `DEFAULT_GLOBAL_LIMIT_PER_MINUTE` (40), `MAX_GLOBAL_LIMIT_PER_MINUTE` (45), `USER_LIMIT_PER_MINUTE` (5), `USER_LIMIT_PER_DAY` (50). `RangeError` if the global limit is not an integer 1–45.
- `src/codeclinic/test/firestore-rate-counter.test.js` (new): config validation, limit/refusal, window reset, kind/identifier isolation, hashed keys, document shape with a custom count field, release semantics, error propagation, and auth-store parity (`loginFailureCounters` key, `failureCount` shape, release/delete, legacy documents).
- `src/codeclinic/test/ai-rate-limit.test.js` (new): constants, global-limit range, 5/min per user, user isolation, minute reset with a fake clock, 50/day and 24 h reset, global limit across users with release of the refused user's slots, user-blocked calls not consuming global capacity, store failure fail-closed, release on partial failure, fail-closed when release also fails, missing userId / non-finite clock, no raw userId stored.

No existing test file was modified (`git diff --stat` lists only `server/auth/firestore-store.js`).

## Verification (from `src/codeclinic`)

- `CI=true npm test -- --watch=false`: 21 suites passed, 1 skipped (pre-existing); 289 tests passed, 1 skipped (pre-existing), 290 total. Includes unchanged `firestore-store.test.js`, `login.*`, `registration.*`.
- Targeted run of `ai-rate-limit`, `firestore-rate-counter`, `firestore-store`: 3 suites, 24 tests passed.
- `npm run build`: compiled successfully.
- `git diff --stat`: `src/codeclinic/server/auth/firestore-store.js | 43 +++++----------------------` (7 insertions, 36 deletions) only; new files untracked.

## Deviations and assumptions (for review)

1. Per-day window is a fixed 24-hour window starting at the user's first counted call, not a calendar day. The spec says "50 per day" without defining the day boundary.
2. Reservation order is user-minute, user-day, then global; a refused or failed call releases its tentative slots (best effort). This stops a blocked user from consuming global capacity. A failed release only over-counts, which stays fail-safe.
3. The count field name is a parameter: auth keeps `failureCount`; AI counters use `count`.
4. A missing/non-string `userId` or a non-finite clock returns `AI_UNAVAILABLE` (fail closed). `userId` must come from the server-resolved actor (enforced by T08 wiring, not here).

## Incident

Mid-task the volume holding the worktree and temp directory ran out of space (ENOSPC); `npm ci` failed and the first test file was left empty. Nothing was deleted by the agent. After space was freed, `node_modules` was provided as a symlink to the shared install (no `npm ci` re-run), `rate-limit.js` was checked complete, and both test files were written fresh.

## Unresolved risks

- Fakes, not the Firestore emulator, back these tests; transaction contention behaviour is not exercised against real Firestore.
- `aiRateCounters` needs a TTL policy on `expiresAt` (as `loginFailureCounters` does) to bound storage; deployment configuration was out of scope.
