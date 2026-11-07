# Role-aware login technical design proposal

Version: 0.1 (2026-11-05)  
Status: PROPOSED; no data-model, authorization-policy, dependency, or implementation approval implied  
Related approved scope: `workflow/specs/role-aware-login.md` version 0.1

## Proposed contract for human decision

1. **Identity and lookup.** Treat email as a case-insensitive application login identifier: trim surrounding whitespace and lowercase the entire address for a canonical key, while retaining the original address for display. Registration and email changes must use the same rule and reject canonical collisions. This is a proposed application policy; email local parts can be case-sensitive in delivery systems. A server-only `emailKeys/{sha256(canonicalEmail)}` document maps to `userId`, created atomically with `users/{userId}`. Missing or duplicate/inconsistent mappings fail closed. The mapping is an inference from Firestore document IDs and transaction semantics, not a Firestore unique-field feature. Existing account migration is unknown.
2. **User and password record.** `users/{userId}` has `email`, canonical email key, `passwordHash`, `accountType`, and `accountStatus`; librarian manager status stays server-controlled. Store Argon2id hashes in a versioned encoding with a unique salt, starting with OWASP's minimum 19 MiB memory, two iterations, and parallelism one, subject to benchmarking. Verify the exact submitted password on Express; never expose user records or hashes to the browser. Firestore server SDK access requires least-privilege IAM because it bypasses Firestore Security Rules. Browser rules for account/hash records need separate design and approval.
3. **Login API and denials.** `POST /api/auth/login` takes bounded JSON `{email,password,accountType}`. For nonexistent email, wrong password, wrong selected type, and inactive account, return the same `401` status/body: `Unable to sign in with those details.` A missing account runs a safe dummy hash verification to reduce timing differences. Malformed input returns `400`; service outage returns `503` with a non-sensitive retry message. No denial issues a session.
4. **Session.** On success, generate a fresh opaque server-side session ID and set a `__Host-` cookie with `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, and no `Domain`. Store only minimal identity and timestamps in a durable shared session store; a Firestore-backed store is proposed, pending dependency and data-model approval. Enforce a 30-minute idle limit and eight-hour absolute limit on the server. Invalidate server state on logout and recheck account status and role on protected requests. Protect cookie-authenticated state-changing endpoints against CSRF; SameSite alone is insufficient. Do not use Express's default MemoryStore in production.
5. **Success UI.** Return `200` with the cookie and only the minimal authenticated account type. Show a signed-in confirmation state; do not invent member or librarian landing routes in this task. The selector is never used as authorization after login.
6. **Abuse controls.** Add shared rate limiting by source and canonical email key, with proposed limits of five failed attempts per 15 minutes per key and 30 failed attempts per 15 minutes per source. Derive source identity only from a trusted proxy configuration. Use a generic `429` response. Do not change account status or lock accounts in this task. Record only safe outcome metadata; never log raw emails, passwords, hashes, or session IDs.

## Dependencies and scope gates

- The repository currently contains only a Create React App frontend. Express, a Firestore server SDK, an Argon2id verifier, a durable session mechanism, rate limiting, and backend test tooling require explicit package approval before addition.
- Firestore user/email-key/session collections and browser access rules are proposed data-model and security-policy changes requiring human approval. No Firebase project was accessed.
- Deployment, same-origin `/api` routing, proxy or CORS configuration, and use of external Firebase services require separate approval. The missing `workflow/PLAN.md` prevents checking an approved delivery dependency map.
- If this contract is approved, amend the canonical specification and dependent task artifacts before implementation authorization. Backend tests can then be written against the approved API and repository layout.

## Official sources

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet)
- [OWASP Email Validation and Verification Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Email_Validation_and_Verification_Cheat_Sheet.html)
- [Firebase server client libraries](https://firebase.google.com/docs/firestore/client/libraries) and [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Express session middleware](https://expressjs.com/en/resources/middleware/session/)
