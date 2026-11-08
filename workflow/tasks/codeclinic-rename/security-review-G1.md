# Security review: codeclinic-rename Group 1 (T01, T02)

Reviewer: independent `reviewer` agent
Date: 2026-11-08
Scope: authentication and registration changes in the staged and working-tree G1 diff over `2892dfe`
Specifications: account-registration v0.7, role-aware-login v0.3

This review is an assessment, not approval.

## Conclusion

No security regression found. The change is a value rename, plus one added fail-closed check. Each authorization allowlist changed from `{MEMBER, LIBRARIAN}` to `{STUDENT, TA}` with exact matching, so former values now fall outside every allowlist.

## Checks

| Area | Evidence | Result |
| --- | --- | --- |
| Request validation | `login.js:40` exact allowlist; `register.js:17-23` exact type and key allowlist (unchanged shape, `employeeId` only for TA) | Unchanged strictness; former values → 400 (login tested, registration untested: review F4) |
| Server-assigned authorization fields | `register.js:31,36` and `firestore-registration.js:14-33` re-derive status, `isManager=false`, and `studentId = userId`; client `studentId`/`isManager`/`accountStatus` still rejected by the key allowlist (`registration.api` forged-field cases) | Preserved |
| Legacy records fail closed | `login.js:57-58` rejects any record with an own `memberId`; `:63` rejects `accountType` values other than `STUDENT`/`TA`. The malformed path still runs the dummy Argon2 verify (`:99-101`), so timing stays uniform. | Met; tested (`login.credentials.test.js:210-225`) |
| Uniform 401 | Malformed, wrong-type, inactive, unknown, and wrong-password cases all return `GENERIC_DENIAL` with no cookie and no session | Preserved |
| Session re-check | `login.js:168-175` requires `accountTypeAtIssue` and the stored type in `{STUDENT, TA}`, an active account, and type equality; on mismatch it deletes the session. Former-value sessions are rejected (untested: review F5). | Preserved |
| Client role untrusted | `LoginPage.tsx:71` and `RegistrationPage.tsx:97-100` only check the server response shape; the server still compares the selected type against the stored type (`login.js:216-217`). `DashboardRouteGuard` (T03) still trusts only `/api/auth/session` and fails closed on the new values (review F1). | Preserved |
| Rate limits, Argon2id, cookie, CSRF, session lifetimes | No changes in the diff | Unchanged |
| Catalog authorization (to be removed in T04) | `catalog/route.js:18` exact `STUDENT` check, 403 otherwise; query role parameters remain ignored (`?role=STUDENT` test) | Preserved |
| Secrets and personal data | Tests use synthetic emails, passwords, and hashes only; no credentials or session IDs in the evidence files | OK |
| Prompt-injection / AI | Not applicable (no AI path touched) | — |

## Residual risks

- G1 alone leaves the dashboard unusable (fails closed) until T03 (review F1).
- The cookie name and storage key still use `libconnect` until T05. These are names only, with no security effect.
- Firestore emulator path not exercised in this review (T08).
