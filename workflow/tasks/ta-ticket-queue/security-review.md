# Security review: ta-ticket-queue

Reviewer: independent reviewer agent
Date: 2026-11-09
Reviewed head: `bd51540`; spec `workflow/specs/ta-ticket-queue.md` v0.1
Companion report: `review-report.md`. Log: `logs/tasks/ta-ticket-queue/13-reviewer.md`.

Result: no Critical, High, or Medium security issues. The residual risks are
listed at the end.

## Authentication and authorization

- Every `/api/ta/tickets` route runs `requireActiveActor` first, then
  `requireTa` (`ta-routes.js`, `router.use`).
  - The actor comes from the session cookie and a fresh `users` read.
  - A user who is not `ACTIVE`, whose role changed, or whose record does not
    match gets `401`. A non-TA gets `403`.
  - Client headers or query fields such as `accountType` or `isManager` are
    ignored (tested).
- Claim holding is decided only by `transitions.js` against the stored
  `claimedByTaId` and the session user ID. A TA Coordinator gets no extra
  power (tested).
- The store forces `actorFor()` to `accountType: 'TA'`. This is safe only
  because the router has already enforced the TA role. Any future caller of
  the store must enforce the role itself.
- UI route guard (D1): `DashboardRouteGuard` checks `/api/auth/session` from
  the server, so a student sees "Access denied" and a signed-out user is
  redirected. The UI guard is not a security boundary; the API is.

## CSRF and request integrity

- `requireCsrf` runs on all four `POST` routes. The token hash is compared in
  constant time with the session's hash, so another TA's token fails
  (tested).
- JSON bodies are matched against an exact key set; any other key returns
  `400` and nothing is written.
  - A prototype-pollution-style body (`__proto__`) is rejected.
  - Path IDs must match `^[A-Za-z0-9_-]{1,128}$`. The Firestore store also
    rejects `/`.
- **L1:** a `claim` or `unclaim` request with a non-JSON body is accepted and
  the body ignored. The server never uses those values, so integrity holds,
  but this differs from the spec's "rejected, not ignored" rule.

## Input trust and injection

- All ticket and reply content is untrusted data. Only
  `evaluateTransition` changes state, and it reads only `status`,
  `claimedByTaId`, `studentId`, and the session actor. Injection-style text
  has no effect (scenario 12, tested).
- XSS:
  - React renders everything as text, and the new pages contain no
    `dangerouslySetInnerHTML`.
  - Code files render in `<pre>`.
  - A `repoUrl` is a link only if it matches `^https://github\.com/[^\s]+$`.
    URL parsing then fixes the host to `github.com`: userinfo before the host
    can't occur, and backslashes become path characters.
  - Look-alike hosts, case variants, and the `javascript:` and `data:`
    schemes render as plain text (approved and review tests). The link has
    `rel="noopener noreferrer"`.
- Notification templates insert the title as a plain string. `notify` trims
  it and caps it at 300 characters, and the inbox renders it as text.
- The server never fetches `repoUrl` (no outbound request in the diff).
- Query values must be single strings: arrays are rejected, `status` and
  `language` must be allow-listed values, `concept` is at most 30
  characters, and the cursor is a bounded base64url JSON object.

## Data exposure

- The list, detail, action, and reply responses are built field by field
  (`toListItem`, `toDetailView`, and the reply view). `studentId`,
  `claimedByTaId`, `authorUserId`, emails, and password or session fields are
  never copied.
- The detail view returns display names (`studentName`, `claimedByName`,
  `authorName`), which R2 allows.
- Errors use fixed generic messages: `503` adds no detail, and nothing is
  logged with user data.
- `Cache-Control: no-store` is set on every response.
- Tests check for leaks with distinctive IDs and emails (scenario 10), plus a
  review test for the resolver of a `RESOLVED` ticket.

## Concurrency and state machine

- Firestore `transition()` runs `transaction.get`, decides, then calls
  `transaction.update` or `create` in the same transaction.
  - `updatedAt`, `createdAt`, and `resolvedAt` are server timestamps.
  - The emulator race test passes: one `200`, one `409`, one
    `claimedByTaId`, and one notification.
  - A review test with a fake Firestore confirms that the decision uses the
    in-transaction read.
- The in-memory store makes its changes synchronously between awaits, so it
  is atomic in Node.
- `RESOLVED` and `CLOSED` are terminal for claim, unclaim, resolve, reply,
  and close (transition table tests).
- **L2:** the re-read after commit happens outside the transaction. If it
  fails, the client gets `503` for a write that succeeded, and that action's
  notification is lost. The response may also show a slightly newer state.
  This is not a security issue.

## Availability and configuration

- **L3:** a crafted cursor (with an out-of-range `createdAtMs` or a `/` in
  the ID) gives `503` from the Firestore store instead of `400`. The error is
  bounded and generic.
- **D4:** `firebase-admin/firestore` is loaded on the first ticket request,
  not at startup. If the module were missing or broken, only the ticket
  endpoints would return `503`; the server would still start. The dependency
  is locked, and the emulator test exercises this path. Acceptable.
- There are no Firestore rules changes. Client SDKs still have no access to
  `tickets` (spec C1), and this was not modified.

## Residual risks

1. The Student owner has not yet signed off section C (the shared contract).
2. Production composite indexes (Q4) are missing, so filtered queries in
   production will fail until the indexes are approved and deployed. The
   endpoint returns `503`.
3. Stale claims (Q3): a deactivated TA's claim stays `CLAIMED`, and no
   release action exists yet.
4. L1–L3 above.
5. The store trusts its caller to have enforced the TA role (see
   "Authentication and authorization").
