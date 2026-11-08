# Security review: account-management AM-G1 (T01)

Reviewer: independent `reviewer` agent (Cursor), as part of the single Wave 1 review. Specification v0.1. Main report: [`review-AM-G1.md`](review-AM-G1.md).

## Result

I found no Critical, High, or Medium security issues.

## Checks

- **Authorization source.** `requireActiveActor` builds `req.actor` only from the session (looked up by the hash of the HttpOnly cookie) and the stored user record. It reloads that record and requires `ACTIVE` status, a type that matches the type the session was issued for, and `isManager === true` only for a TA. Body, query, and header fields such as `accountType`, `isManager`, `role`, and `userId` are never read for authorization, and tests confirm forged fields have no effect. The target is loaded server-side and frozen, and R4 is evaluated over the stored `accountType`.
- **R4 matrix.** A Coordinator can act on Students (resolved decision 1, amended scenario 6) and on other TAs. A Coordinator acting on their own record is denied by `target.userId !== actor.userId`. A non-Coordinator TA cannot act on a TA. A Student actor gets `403` before any target lookup.
- **CSRF.** All methods other than GET, HEAD, and OPTIONS require `X-CSRF-Token`. Its SHA-256 is compared with `crypto.timingSafeEqual` against the session's current `csrfTokenHash`, which is re-read so a rotated token is refused. A missing token returns `403`.
- **Transactions.** The email change creates the new key with `transaction.create`, which acts as a precondition against a racing registration. It deletes the old key only if that key belongs to the same user, so it never deletes another user's key. All reads happen before writes, and there is no orphan key on collision (tested). Deactivation and password-hash changes delete sessions inside the same transaction.
- **Data exposure.** List entries contain only the six R1 fields. `passwordHash`, `canonicalEmailKey`, `isManager`, and `employeeId` are excluded. `req.actor.sessionIdHash` is server-only; the implementer flagged that routes must never return it. Error messages are generic. Nothing is logged.
- **Input bounds.** User IDs must match `^[A-Za-z0-9_-]{1,128}$`, and the session cookie must match `^[A-Za-z0-9_-]{40,64}$`. The account type must be one of an allow-list.

## Residual risks

- R7 forced-password-change enforcement does not exist yet. It belongs to T04 and must also cover `/api/notifications`.
- Profile name and email format validation is deferred to T02.
- Firestore transaction and query semantics have been exercised only with fakes, not the emulator.
