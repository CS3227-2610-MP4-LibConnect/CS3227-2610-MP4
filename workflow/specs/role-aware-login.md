# Role-aware login specification

Version: 0.2 (2026-11-05)  
Approval evidence: human approved version 0.1 scope and `technical-design-proposal.md` version 0.1, then replied "approved" to revised specification version 0.2 on 2026-11-05; no agent-set approval state  
Task ID: `role-aware-login`

## Purpose and scope

Provide one login page for existing LibConnect members and librarians. The page collects an email address, password, and selected account type. An Express server authenticates against password hashes held in Firestore and checks the account's server-stored type and status before accepting the login. This specification covers the login attempt and its immediate UI result. Registration, password reset, account activation, manager privilege, post-login destinations, and authorization rules for other features are outside this task.

## Sources and decisions

- The user requested email and password inputs; a member/librarian toggle; client rejection of missing or whitespace-only fields; server credential verification against Firebase data; an error for mismatched credentials; and a generic error for a credential that belongs to the other account type.
- The human confirmed server-side Express verification of password hashes stored in Firestore and the task ID `role-aware-login`.
- The human approved `workflow/tasks/role-aware-login/technical-design-proposal.md` version 0.1. This revision incorporates its identity, record, API, session, outcome, and abuse-control choices; dependency, Firestore rules, deployment, and implementation approvals remain separate.
- `Overview.md` defines `User.passwordHash`, `accountType` (`MEMBER` or `LIBRARIAN`), and `accountStatus` (`ACTIVE` or `INACTIVE`). Only active accounts can sign in. New librarian accounts remain inactive pending manager activation.
- `workflow/PLAN.md` is referenced by repository instructions but is absent. No approved authentication specification or backend implementation was found at drafting time.

## Actors, data, and trust boundaries

- Actor: an unauthenticated visitor selecting `MEMBER` or `LIBRARIAN`.
- Client input: `email`, `password`, and selected account type. All three are untrusted. The toggle expresses the requested login context and never grants a role.
- Trusted source: the server-read account record from Firestore, subject to server validation. `accountType`, `accountStatus`, and `isManager` must come from that record, never from the client. The email-key mapping must resolve consistently to exactly one valid user record.
- Sensitive data: submitted password, stored password hash, and any issued session credential. These must not be returned in responses, logged, or placed in task evidence.
- Authentication state transition: unauthenticated to authenticated only after password verification, active-status check, and account-type match. A denied or failed request leaves the visitor unauthenticated.

## Requirements

### R1. Login form

The page MUST present a labelled email input, a password-masked input, and an accessible, unambiguous control selecting Member or Librarian. It MUST make the selected type visible and allow changing it before submission. It MUST provide a submit action and an accessible place for validation or server error messages.

### R2. Client validation

On submit, the client MUST reject a missing or whitespace-only email or password and display a field-specific error for each invalid field. It MUST NOT send a login request while either field fails this check. A nonblank password MUST be transmitted exactly as entered; whitespace within or around it may be significant. Client checks are for feedback only and MUST NOT substitute for server validation. The request MUST send the selected type without treating that selection as authorization.

### R3. Server request validation

`POST /api/auth/login` MUST accept only bounded JSON containing string `email`, string `password`, and `accountType` equal to `MEMBER` or `LIBRARIAN`. It MUST reject missing, whitespace-only, wrong-type, or unsupported values before attempting authentication, with HTTP `400` for malformed input. The endpoint MUST impose explicit input-size limits in the approved implementation design. It MUST not accept a client-provided user ID, role, account status, manager flag, or password hash as an authentication claim.

### R4. Credential and account verification

For a structurally valid request, the server MUST trim surrounding email whitespace and lowercase the entire email address for an application-wide canonical login key; it MUST preserve the original email for display. Registration and email-change flows MUST use the same canonicalization and reject canonical collisions before those flows can create accounts usable by this login. The login server MUST resolve `emailKeys/{sha256(canonicalEmail)}` to `userId`, then read `users/{userId}` and verify that the mapping and canonical email agree. The email-key and user record MUST be created atomically by account creation; missing, duplicate, inconsistent, or malformed records MUST fail closed. These collection and canonicalization requirements are approved for this login contract; implementation of registration or migration is outside this task.

`users/{userId}` MUST contain the original `email`, canonical email key, `passwordHash`, `accountType`, and `accountStatus`; librarian manager status remains server-controlled. The password hash MUST use a versioned Argon2id encoding with a unique salt, initially at least 19 MiB memory, two iterations, and parallelism one, subject to safe performance benchmarking before deployment. The server MUST verify the exact supplied password without trimming it, require `accountStatus = ACTIVE`, and require the stored `accountType` to equal the selected type. The server MUST accept the login only when all conditions pass. A missing account, password mismatch, inactive account, wrong selected type, malformed account record, or data-access failure MUST NOT create an authenticated session. Server Firestore access MUST use least-privilege IAM; browser access to account and hash records MUST be denied by separately approved Firestore rules.

### R5. User-facing outcomes

For nonexistent email, wrong password, wrong selected type, and inactive account, the server MUST return the same HTTP `401` status and response body: `Unable to sign in with those details.` The page MUST display the same message for these cases and MUST not disclose account existence, actual type, or status. A missing account MUST take a safe dummy-hash verification path to reduce timing differences. A temporary server or data-service failure MUST return HTTP `503` with a separate non-sensitive retry message. No denial or failure may issue a session. The UI MUST not treat a response as success unless the server explicitly accepts the login.

### R6. Authentication boundary

The browser MUST NOT read Firestore user records or password hashes for login. The Express server MUST be the authority for credential, status, and role decisions. On successful login, the server MUST generate a fresh opaque server-side session ID and set a `__Host-` cookie with `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, and no `Domain`. A durable shared session store MUST hold only minimal user identity and issued/last-seen timestamps; Express's default in-memory store MUST NOT be used in production. The server MUST enforce a 30-minute idle limit and eight-hour absolute limit, invalidate server-side session state on logout, and recheck account status and role on protected requests. Cookie-authenticated state-changing endpoints MUST use CSRF protection in addition to `SameSite`. A Firestore-backed session store remains a proposed implementation choice pending its separate dependency and data-model approval. No session or success response may expose the password hash or unnecessary user data.

### R7. Success state and abuse controls

On success, `POST /api/auth/login` MUST return HTTP `200`, the session cookie, and only the minimal authenticated account type. The page MUST show a signed-in confirmation state using the server-returned type; no member or librarian landing route is required in this task. The server MUST apply shared rate limiting by trusted source and canonical email key: at most five failed attempts per 15 minutes per key and 30 failed attempts per 15 minutes per source. The source identity MUST be derived only through an approved trusted-proxy configuration. When a limit is exceeded, the endpoint MUST return a generic HTTP `429` without creating a session. This task MUST NOT change account status or lock accounts. Authentication logs MUST contain only safe outcome metadata, never raw email, password, hash, or session ID.

## Acceptance scenarios

1. Given both fields are blank, when the visitor submits, both field errors appear and no request is sent.
2. Given either field contains only whitespace, when the visitor submits, that field's error appears and no request is sent.
3. Given both fields are nonblank and a type is selected, when the visitor submits, the client sends one login request containing the entered credentials and selected type. The password is not trimmed.
4. Given an active member account with a matching password, when Member is selected, the server accepts the login.
5. Given an active librarian account with a matching password, when Librarian is selected, the server accepts the login.
6. Given a nonexistent email or wrong password, when a login request is made, the server denies it, the page displays an error, and no authenticated state is established.
7. Given correct credentials for a Member account, when Librarian is selected, the server denies it with a generic message that does not reveal the true type; the reverse case behaves the same way.
8. Given correct credentials for an inactive account, when either type is selected, the server denies it and creates no authenticated state.
9. Given a forged client-supplied role, manager flag, account status, user ID, or password hash, the server ignores it for authorization and cannot be induced to accept a mismatched login.
10. Given a malformed request or an unavailable Firestore service, the server does not authenticate; responses and logs contain no password, hash, or session material.
11. Given the same email entered with different surrounding whitespace or letter case, lookup uses the same canonical key; account creation or email change rejects a canonical collision, and inconsistent key-to-user mappings fail closed.
12. Given an unknown email, the endpoint performs safe dummy-hash verification and returns the same `401` status/body as a wrong password, wrong type, or inactive account.
13. Given an accepted login, the response is `200` with only the authenticated type and a new protected session cookie; the page shows a signed-in confirmation state based on the server response.
14. Given a session past its idle or absolute limit, logout, or an account whose status or role no longer permits access, protected requests deny access. State-changing requests require CSRF protection.
15. Given repeated failed requests above either approved 15-minute threshold, the endpoint returns a generic `429` and does not create a session or lock the account.

## Verification matrix

| Layer | Coverage |
| --- | --- |
| React component | Labels and type control; empty and whitespace-only checks; no request on validation failure; errors on denial; no false success. |
| Express endpoint | Bounded request shape and HTTP `400`; canonical lookup and mapping consistency; valid member/librarian acceptance; exact Argon2id password verification; uniform `401`; `503` on service failure; forged authorization fields ineffective. |
| Session and abuse controls | Fresh cookie properties, shared durable store, idle/absolute expiry, logout invalidation, status/role recheck, CSRF, both rate limits and generic `429`. |
| Security/integration | Safe synthetic fixtures; no browser Firestore access to account/hash records; least-privilege server boundary and browser rule review; response/log redaction; authenticated state only after all checks; backend failure denies access. |

Tests MUST use synthetic accounts and credentials. They MUST NOT contact a production Firebase project or record real secrets in artifacts.

## Remaining approvals and integration risks

The human replied "approved" to this revised version 0.2 specification on 2026-11-05. The technical design and specification approvals do not approve new dependencies, Firestore rules, deployment, external project access, or implementation dispatch.

- The exact Express, Firestore server SDK, Argon2id, session-store, rate-limiter, and backend-test packages require separate dependency approval. A Firestore-backed shared session store is proposed, but its data model and package choice are not yet authorized.
- Browser Firestore rules must prevent reading account and password-hash records. Rule authoring and deployment require a separate approved security/configuration task. Server library access bypasses these rules and therefore needs least-privilege IAM.
- Account registration, email change, and any existing-account migration must maintain canonical-email uniqueness and the approved user/key record shape. Those features are outside this login task and require integration work before live accounts can be used safely.
- Deployment routing for `/api`, trusted proxy/source identification, cookie behavior over HTTPS, and any CORS configuration remain separately gated. The missing `workflow/PLAN.md` prevents checking delivery dependencies.
- Exact request byte limits, rate-limit store implementation, session-store implementation, and CSRF mechanism are technical implementation details to be documented and reviewed against this contract. If any choice changes product behavior or authorization policy, amend and reapprove this specification first.
