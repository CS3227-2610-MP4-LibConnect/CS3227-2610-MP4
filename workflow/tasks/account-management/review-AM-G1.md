# Review report: account-management AM-G1 (T01)

Reviewer: independent `reviewer` agent (Cursor). This group was reviewed in a single Wave 1 review that also covered N-G1 and ai-gateway G2, as the human approved.
Date: 2026-11-08
Specification: `workflow/specs/account-management.md` v0.1, human-approved. The amended scenario 6 was read in the main checkout; under it, a Coordinator acting on a Student is no longer a `403` case.
Checklist and handoff: `tasks.md` v0.1 and `handoff.md` v0.1, both human-approved.
Diff: worktree `am-g1`, base `4498e56`, uncommitted. Modified files: `server/auth/firestore-store.js` and `server/auth/login.js`. New files: `server/account/{store,guards}.js` and `test/account-{store,guards}.test.js`.
Security review: [`security-review-AM-G1.md`](security-review-AM-G1.md). Execution log: [`logs/tasks/account-management/review-AM-G1.md`](../../../logs/tasks/account-management/review-AM-G1.md)

## Conclusion

**Pass with follow-up.** I found no Critical, High, or Medium issues. The Low and Info items below can be addressed in later groups (T02–T04).

## Findings

| ID | Severity | Location | Finding | Recommended action |
| --- | --- | --- | --- | --- |
| L1 | Low | `server/auth/firestore-store.js:128` | When `deleteSessionsForUser` runs without a caller transaction, it deletes every session in a single transaction. Firestore caps a transaction at 500 writes, so a user with more than about 500 live sessions would make the call fail. This does fail closed, because the store throws. | Accept for now. Batch the deletes if the session count is ever unbounded. |
| L2 | Low | `server/account/store.js:84-90` | `listAccountsByType` drops malformed records after fetching them, so a page can hold fewer than `pageSize` entries while `nextCursor` is still set. The bound of at most 50 entries per page still holds. | Accept. The UI must not assume full pages. |
| I1 | Info | `server/account/store.js:98-102` | The store validates name and email only as non-empty strings. The registration name rules and the R9 email rules (R2) are left to T02. | T02 must validate input before calling `updateProfile`. |
| I2 | Info | `server/account/guards.js:61-76` | `mustChangePassword` is exposed on `req.actor` but not enforced. R7 enforcement belongs to T04. The notifications router (N-G1) authenticates through its own path, so T04 must also cover `/api/notifications`. | Track in T04 as a cross-task item. |
| I3 | Info | `server/account/guards.js:122-124` | A missing target returns `404` before R4 is applied. A non-Coordinator TA can therefore tell whether a TA user ID exists (`403`) or not (`404`). This ordering follows R1, and user IDs are random UUIDs. | Accept. |

## Acceptance-criteria traceability (T01, R1, R4)

| Criterion | Implementation | Tests | Result |
| --- | --- | --- | --- |
| Read and list by type, paginated to at most 50, R1 fields only | `store.js:63-92`, `toListEntry` | `account-store.test.js` (getAccount, listAccountsByType) | Met |
| Email change moves `emailKeys` in one transaction; a collision returns `ALREADY_EXISTS` with no orphan key | `store.js:98-137` reads the new key and the old key, then calls `create(new)`, `delete(old only if owned)`, and `update(user)` | 7 `updateProfile` tests, including a racing-registration test and an old key owned by someone else | Met |
| Status and password-hash updates; deactivation deletes sessions in the same transaction | `store.js:140-174` | `setAccountStatus` and `setPasswordHash` tests | Met |
| Delete all of a user's sessions through the auth session collection | `firestore-store.js:113-129` | `deleteSessionsForUser` tests | Met. Reads happen before writes in every transaction. |
| Authenticated active actor taken from the session and stored record only | `guards.js:61-82` | `requireActiveActor` tests, including forged fields | Met |
| CSRF on state-changing methods, with a timing-safe compare against the current stored hash | `guards.js:84-100` | `requireCsrf` tests, including a token rotated after authentication | Met |
| R4 matrix: TA→Student allowed; TA→TA `403`; Coordinator→TA (other) allowed; Coordinator→self `403`; Coordinator→Student allowed; Student→anyone `403` | `canActOnTarget` and `canListAccountType` (`guards.js:22-33`), using stored `accountType` and `isManager` | Pure-helper and middleware tests | Met, consistent with the amended scenario 6 and resolved decision 1 |
| Existing auth tests are unedited | — | `git diff HEAD --stat -- src/codeclinic/test` shows no changes | Met |

Endpoint-level R1–R7 behaviour, including status codes per route and the R7 limiter, is in scope for T02–T04 and was not reviewed here.

## Shared `server/auth/login.js` edit

The same edit appears in `am-g1` and `n-g1`, and `diff` reports the two files as byte-identical. It moves `readCookie` and the `authenticateRequest` body out of `createLoginApp` unchanged into `createSessionAuthenticator`, and logout's CSRF hashing into `hashSubmittedCsrf`. `createLoginApp` calls both. The change does not alter behaviour. The existing login tests are unedited and pass.

## Verification

- `CI=true npm test -- --watch=false`: exit 0. 23 suites passed and 1 was skipped. 453 tests passed and 1 was skipped, out of 454.
- `npm run build`: exit 0.
- `grep -rn libconnect server test src`: no matches (exit 1).
- `expect(` counts: no tracked test file changed.

No review-only tests were added. Nothing was verified against the Firestore emulator; `transaction.get(query)` and `orderBy('__name__')` are covered only by fakes, as the implementer also noted.
