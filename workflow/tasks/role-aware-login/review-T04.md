# Independent review: role-aware login T04

- **Scope:** Group 3 T04, account status/type enforcement, server sessions, CSRF, and abuse controls.
- **Specification:** `workflow/specs/role-aware-login.md` v0.2 (2026-11-05).
- **Checklist and handoff:** v0.2; T04 is currently unchecked. This review does not change the shared checklist.
- **Storage design:** `workflow/tasks/role-aware-login/group3-storage-proposal.md`; the orchestrator's task assignment states the human approved it.
- **Implementation evidence read:** `implementation-T04.md` and `logs/tasks/role-aware-login/implementation-T04.md`; these were treated as claims to verify, not authority.

## Checkout and diff limitations

The implementation is uncommitted, its server and test files are untracked, and `.git` is read-only for this review. A separate worktree or clean checkout was unavailable. Compensating controls: independently read the current source, tests, task artifacts, and full `git status --short` output; inspected the tracked diff summary; reviewed all current T04 source and relevant tests directly; and ran the configured test suite. The tracked diff cannot show an original-to-current patch for the untracked server/test files, so attribution of those files relies on task handoff and current workspace state. No production code, tests, or checklist were modified. No review-only tests were added.

The shared worktree also includes unrelated UI, workflow-profile, package, and planning/evidence changes. They are outside the T04 source files listed in the implementation handoff and need orchestrator ownership reconciliation before whole-worktree merge consideration.

## Findings

### High — A delayed protected request can refresh an idle-expired session

- **Location:** `src/libconnect-mp4/server/auth/login.js:174-190`; `src/libconnect-mp4/server/auth/firestore-store.js:80-88`.
- **Evidence:** `authenticateRequest` captures `current` before it awaits the account lookup, checks the idle limit against that snapshot, then passes the same timestamp to `touchSession`. The Firestore transaction rereads the session but only checks `data.expiresAt <= lastSeenAt`; it does not check the fresh transaction record's `lastSeenAt + 30 minutes`, the absolute age at a fresh time, or ensure `lastSeenAt` moves forward. A request that passes the initial check shortly before the idle boundary and is delayed across that boundary can still touch and authenticate the session using its stale timestamp. Concurrent protected requests can also write an older timestamp after a newer touch.
- **Requirement/risk:** R6 requires the server to enforce both idle and absolute expiry on each protected request. A protected request must not revive a session that expired while the request was in flight, and concurrent requests must not weaken expiry by writing stale state.
- **Recommended action:** Make the transaction enforce expiry against its freshly read `issuedAt` and `lastSeenAt` using a fresh operation time supplied/derived for the transaction, require the request to remain within both limits, and update `lastSeenAt` monotonically. Return denial and invalidate or leave expired state unusable when the transactional check fails. Add a delayed/concurrent synthetic test against the Firestore adapter contract; current endpoint tests use a mock `touchSession` that always succeeds.

### Medium — Logout validates a stale CSRF hash across token rotation

- **Location:** `src/libconnect-mp4/server/auth/login.js:165-192, 290-303`; `src/libconnect-mp4/server/auth/firestore-store.js:92-98`.
- **Evidence:** `authenticateRequest` returns the session object read before `GET /api/auth/csrf` may rotate the stored token hash. Logout compares `X-CSRF-Token` with `auth.session.csrfTokenHash` from that earlier read rather than atomically comparing the submitted token hash with the current stored hash. If logout authentication reads the old session concurrently with CSRF rotation, it can accept the just-replaced token after the rotation commits. Conversely, a valid new token can be rejected if logout captured an older snapshot.
- **Requirement/risk:** The approved storage proposal says logout must compare the supplied token hash to the stored hash. This implementation does not guarantee that comparison is against the current stored value under concurrent requests.
- **Recommended action:** Validate the supplied token against the current session document in the same transaction that deletes the session (or use an equivalent atomic compare-and-delete operation). Add a concurrency test that races token rotation with logout and verifies only the currently stored token succeeds.

## Acceptance traceability

| T04 criterion | Evidence inspected | Result |
| --- | --- | --- |
| Active MEMBER/LIBRARIAN only; server-stored type/status authoritative | `login.js` verifies password, reloads user, checks `ACTIVE` and both stored types against selector before creating session; T04 tests success and wrong-type/inactive denial | Pass |
| Forged role, manager, status, user ID, or hash ignored | Login body validation extracts only email/password/accountType; T04 success test supplies forged fields and asserts stored type/minimal response | Pass |
| Uniform credential denial; absent account; no session on denial | T03/T04 tests assert generic 401 and no cookie/session for invalid credentials and account/type/status denials | Pass |
| Durable session created before 200; minimal record and response | Firestore adapter uses `create`; route awaits it before setting cookie/200; T04 tests inspect synthetic record keys and body | Pass by source inspection and synthetic endpoint test; live Firestore behavior not verified |
| Cookie attributes and fresh opaque identifier | 32-byte `randomBytes`, SHA-256 document key, host-prefixed cookie with Secure/HttpOnly/SameSite=Lax/Path=/ and no Domain; cookie assertions exist | Pass |
| Idle and absolute expiry; protected recheck of status/role | Source checks limits and reloads user; basic fixed-clock tests cover boundary; delayed/concurrent expiration flaw is finding High | **Fail pending correction** |
| Logout invalidation and CSRF on state-changing logout | Missing-token and successful logout cases pass; concurrent stale-hash validation is finding Medium | **Partial; race pending correction** |
| Shared five-per-email and 30-per-source windows; generic 429; no lockout | Firestore adapter uses transactions over hashed identifiers; route uses canonical email and socket remote address, ignores forwarding headers; sequential threshold tests pass | Pass for sequential synthetic behavior; Firestore concurrency was not directly exercised |
| Generic 503 and no cookie on persistence failure | T04 synthetic create failure test; route catches storage errors and does not set cookie until create completes | Pass |
| No sensitive account/session information in responses or logs | Route returns minimal account type; errors are static; no auth logging found; tests check response/storage shape | Pass by source inspection and synthetic tests |

## Verification

Inspected `src/libconnect-mp4/package.json` before running the configured script. From `src/libconnect-mp4/`, ran:

```text
npm test -- --watchAll=false --runInBand
```

Result: exit 0; 4 suites passed, 48 tests passed, 0 snapshots. Node emitted the dependency-tree `punycode` deprecation warning. The suite does not directly instantiate a Firestore transaction emulator/fake to cover expiry or CSRF races; the two findings above are therefore not contradicted by the passing tests.

No live Firebase/project access, secrets, external services, or destructive commands were used.

## Verdict

**Changes required.** The session touch can authorize a request using a stale pre-expiry timestamp, and logout's CSRF check is not atomic with token rotation. Both violate the approved session/CSRF contract under concurrent or delayed requests. The T04 checklist item must remain unchecked until the implementer addresses these findings and provides focused synthetic coverage, after which the orchestrator should reconcile the evidence. No checklist status was changed by this reviewer.

Criteria not verified against a live or emulator Firestore instance: persistence, transaction retry/concurrency behavior, and actual shared-store durability. The review was limited to the injected synthetic endpoint tests and source inspection, as required by the no-live-access boundary.

## Independent re-review addendum — T04 corrections

Date: 2026-11-06 (Asia/Singapore). This addendum assesses the corrections recorded in `implementation-T04-review-fix.md` and supersedes the two findings above as the current T04 verdict; the original findings remain in the record.

### Re-review evidence

- The idle-expiry correction is present in `src/libconnect-mp4/server/auth/login.js:158-176` and `src/libconnect-mp4/server/auth/firestore-store.js:83-107`. Protected requests now pass the clock function to `touchSession`; the Firestore adapter reads the current document inside a transaction and evaluates the clock inside that callback. It rejects malformed timestamps and clock rollback, deletes a record at the idle, absolute, or stored-expiry boundary, and advances `lastSeenAt` only when the transaction remains within both limits. This removes the reviewed stale pre-account-read timestamp path.
- `src/libconnect-mp4/test/firestore-store-T04.test.js:70-101` exercises callback retry with a fresh time, expiry deletion on retry, and clock rollback without a backward write. The fake store stages writes and reruns the callback after changing the stored state. This is meaningful synthetic retry coverage for the adapter contract.
- Logout at `src/libconnect-mp4/server/auth/login.js:277-287` hashes the submitted header value and calls `deleteSessionIfCsrfMatches`. The adapter at `src/libconnect-mp4/server/auth/firestore-store.js:122-136` reads the current document and compares the current hash and submitted hash in the same transaction that deletes the record. Missing/malformed hashes and stale tokens fail closed. CSRF rotation also reads and updates the same document transactionally.
- The CSRF test at `src/libconnect-mp4/test/firestore-store-T04.test.js:103-125` starts rotation then compare-and-delete concurrently, but its fake database globally queues transactions and always runs that invocation first. It covers the rotation-first stale-token case, not Firestore's own conflict/retry behavior or the reverse linearization order. The compare-and-delete transaction is structurally atomic by source inspection; actual Firestore retry behavior remains unverified.
- The other T04 acceptance paths remain covered by `login-T04.test.js`: both active account types; wrong type and inactive denial; forged role/manager/status/user/hash ignored; protected status/role recheck; idle/absolute expiry; logout and CSRF; both sequential rate thresholds; no account lockout; persistence failure without a cookie; cookie and response minimization. The T03 tests also cover absent/malformed account and uniform credential denial. No new authorization bypass or sensitive response/log path was identified in the reviewed correction.

### Acceptance status

| Corrected criterion | Result |
| --- | --- |
| Protected request cannot revive an idle- or absolute-expired session using a stale timestamp | Pass by adapter source inspection and synthetic retry/boundary coverage |
| A backward operation clock cannot move `lastSeenAt` backward | Pass; rollback is denied and the adapter does not write in that path |
| Logout checks the current CSRF hash atomically with session deletion | Pass by transaction source inspection and synthetic rotation-first stale-token coverage |
| Full T04 endpoint behavior and prior acceptance criteria | Pass in focused and full synthetic suites; no new regression found |
| Firestore SDK persistence, actual transaction contention/retry, and cross-instance behavior | Not verified; no emulator/live Firestore was used |

### Checkout, scope, and verification limits

The implementation remains in a shared dirty worktree. `git status --short` reports the T04 server/test paths as untracked and the `.git` directory is read-only, so a separate worktree and reliable tracked before/after diff were unavailable. I inspected the current source, tests, requested task artifacts, and status directly. The shared tree also contains unrelated UI, package, workflow-profile, and evidence changes; orchestrator ownership reconciliation is still needed before whole-worktree merge consideration. I made no source, test, checklist, or approval-state changes.

Inspected `src/libconnect-mp4/package.json` before running the scripts. From `src/libconnect-mp4/`, ran `npm test -- --watchAll=false --runInBand test/login-T04.test.js test/firestore-store-T04.test.js` (pass: 2 suites, 15 tests) and `npm test -- --watchAll=false --runInBand` (pass: 5 suites, 54 tests). The test process emitted the existing `punycode` deprecation warning. No live Firebase, emulator, external service, secrets, or debug-log contents were accessed.

### Current verdict

**Pass with follow-up.** Both previously reported correctness defects are corrected in source and have targeted synthetic coverage. Follow up by validating the adapter against Firestore's actual transaction runner in a separately authorized isolated environment, especially conflict retries and concurrent rotation/logout ordering. No checklist was changed and this assessment is not merge approval. Persistence/durability in Firestore and actual SDK concurrency semantics remain unverified.
