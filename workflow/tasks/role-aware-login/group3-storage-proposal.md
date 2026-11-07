# Group 3 storage proposal — role-aware login

Status: proposal for human approval; no Group 3 implementation is authorized by this file.  
Specification: `workflow/specs/role-aware-login.md` v0.2; checklist T04.  
Date: 2026-11-05.

## Session records

Use Firestore `loginSessions/{sha256(sessionId)}` as the durable shared store. Generate a fresh 256-bit opaque session ID with Node `crypto.randomBytes`, send it only as a `__Host-libconnect_session` cookie, and store only `userId`, `accountTypeAtIssue`, `issuedAt`, `lastSeenAt`, `expiresAt`, and `csrfTokenHash` in the document. Do not store the raw ID, raw CSRF token, email, password, hash, or manager flag. Set `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, with no `Domain`. Require both the 30-minute idle and eight-hour absolute limits on each protected request; update last-seen time atomically and delete the record on logout. Re-read the current user record to enforce active status and verify its current type still matches `accountTypeAtIssue` on protected requests.

## Failure counters

Use Firestore `loginFailureCounters/{sha256(kind + ':' + identifier)}` documents with `kind`, `windowStart`, `failureCount`, and `expiresAt`. Kinds are `email` (canonical email) and `source` (trusted source address). Use transactions for the 15-minute windows and enforce five failures per email key and 30 per source. Never store raw email or source address in these documents. Return one generic `429` body for either limit. Do not change account status or lock an account. For the local server, derive source identity from the direct socket address; any reverse-proxy deployment must establish and separately approve a trusted-proxy source policy before relying on forwarded headers.

## Route and protection boundary

After password verification, check server-read `accountStatus` and `accountType` before session creation. Missing account, bad password, inactive status, and wrong type share the exact `401` body from the approved spec. A data-store failure yields generic `503` and no cookie. A successful login returns only `{ "accountType": "MEMBER" | "LIBRARIAN" }` with HTTP `200` and the session cookie. Implement a protected session-check route, an authenticated `GET /api/auth/csrf` route that returns the raw token to the same-origin client, and a logout route for lifecycle tests. Require that token in a request header for cookie-authenticated logout or any other state-changing protected route; compare its hash to the stored hash. Keep the token out of logs and task evidence.

## Approval boundary

This proposal adds two Firestore collections and their document fields. It can use the already approved Express, Firebase Admin, and Node crypto packages; no further package is proposed. Tests remain synthetic and use an injected store. Firestore edition inspection, live project access, rules, IAM, deployment, reverse-proxy routing, and account migration require separate authorization and are outside this proposal.
