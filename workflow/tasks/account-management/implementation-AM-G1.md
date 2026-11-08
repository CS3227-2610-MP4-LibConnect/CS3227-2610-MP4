# Implementation report: account-management AM-G1 (T01)

Status: complete, awaiting independent review. Not committed.
Branch: `account-management-g1`, worktree rebased by the orchestrator onto `codeclinic-scope` head `4498e56` (originally `522afc4`)
Specification: `workflow/specs/account-management.md` v0.1 (human-approved 2026-11-08), including the human's amendment to scenario 6 (made in the main checkout)
Checklist: `tasks.md` v0.1; handoff: `handoff.md` v0.1 (both human-approved 2026-11-08)
Skills: `openspec-apply-change` (preflight, `workflow/specs/` path adapter), `firebase-firestore` (transactions reference)
Execution log: [`logs/tasks/account-management/implement-AM-G1.md`](../../../logs/tasks/account-management/implement-AM-G1.md)

## Changed files (all under `src/codeclinic/`)

| File | Change |
| --- | --- |
| `server/account/store.js` | New. `createFirestoreAccountStore(db, authStore?)`: `getAccount`, `listAccountsByType` (≤ 50 per page, user-ID cursor, R1 fields only), `updateProfile` (name and/or email; email change moves `emailKeys` in one transaction), `setAccountStatus` (deactivation deletes all sessions in the same transaction), `setPasswordHash` (Argon2id hash + `mustChangePassword`, deletes all or all-but-current sessions in the same transaction), `deleteSessionsForUser`. Errors carry `code` `INVALID`, `NOT_FOUND`, or `ALREADY_EXISTS`. |
| `server/account/guards.js` | New. `createAccountGuards({ authStore, accountStore, now })` → `requireActiveActor`, `requireCsrf`, `requireSupportListAccess`, `requireSupportTarget`; pure `canListAccountType`, `canActOnTarget`; re-exports `SESSION_COOKIE` from `server/auth/login.js`. The session check uses `createSessionAuthenticator`, and CSRF uses `hashSubmittedCsrf` plus a timing-safe compare with the stored hash. |
| `server/auth/firestore-store.js` | Added `deleteSessionsForUser(userId, { exceptIdHash, transaction })` only (handoff-permitted). Verified intact after the auto-merge with the shared rate-counter refactor; no existing method changed. |
| `server/auth/login.js` | Not edited by this group. The orchestrator copied in the notifications task's version, which adds the `SESSION_COOKIE`, `createSessionAuthenticator`, and `hashSubmittedCsrf` exports. |
| `test/account-store.test.js` | New, 21 tests against an in-memory Firestore fake with query and transaction support. |
| `test/account-guards.test.js` | New, 46 tests (supertest against an Express app with fake stores). Uses the cookie name exported by `login.js` and asserts it matches. |

`server/index.js` was not touched; no routes are mounted.

## Acceptance status (T01)

- Store operations listed in T01: met (tests in `account-store.test.js`).
- Guards for authenticated active actor, CSRF on state-changing requests, and R4 target authorization: met (tests in `account-guards.test.js`).
- Authorization uses only the server session and stored records; forged body/query fields are tested to have no effect.
- Endpoint-level R1–R7 behaviour is out of scope for AM-G1 (T02–T04).

## Verification

- `CI=true npm test -- --watch=false`: exit 0; 23 suites passed, 1 skipped; 453 tests passed, 1 skipped (454 total).
- `npm run build`: exit 0, "Compiled successfully."
- `grep -rn libconnect server test src`: no matches.

## Deviations and assumptions

1. **Scenario 6 conflict, resolved:** the human amended scenario 6 so a Coordinator acting on a Student is no longer a `403` case, matching resolved decision 1, R4, and T03. The implementation already allowed it; no code change was needed. The worktree copy of the spec predates the amendment.
2. **Session check reused:** `requireActiveActor` calls `createSessionAuthenticator` from `login.js`, with the account store as its repository. It then reloads the stored record to read `isManager` and `mustChangePassword`, which the shared check does not return, and rechecks active status and type.
3. `requireActiveActor` exposes `req.actor.mustChangePassword` but does not enforce R7; enforcement is T04.
4. `requireCsrf` re-reads the session so a token rotated after authentication is rejected.
5. Ordering of support checks: non-TA actor → `403` before input validation or target lookup (no existence probing by Students); malformed `:userId` → `400`; missing target → `404`.
6. `listAccountsByType` orders by document ID (`__name__`) with an `accountType` equality filter, which avoids a composite index; `registrationDateTime` is returned as an ISO string.
7. `req.actor.sessionIdHash` (the SHA-256 of the session ID, i.e. the stored document ID) is exposed for T02's "keep current session". Routes must never return it.

## Risks

- Each guarded request reads the account record twice: once in the shared session check and once in the reload. If the record changes between the two reads, the reload rechecks active status and type and fails closed. The cost is one extra Firestore read per request.
- The fake does not emulate Firestore contention retries; the email-key race is tested by injecting a competing key before commit (create precondition → `ALREADY_EXISTS`, no orphan key). Emulator coverage is not run here.
- `transaction.get(query)` and `orderBy('__name__')` rely on Admin SDK behaviour not exercised against the emulator in this group.
