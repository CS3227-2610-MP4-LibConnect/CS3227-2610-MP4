# Implementation handoff — T04

Status: implemented; ready for independent review and orchestrator reconciliation.  
Task: `role-aware-login`, Group 3 T04.  
Specification: `workflow/specs/role-aware-login.md` v0.2.  
Checklist and handoff: v0.2.  
Storage proposal: `group3-storage-proposal.md`, approved for this implementation by the human as relayed in the task assignment.

## Preflight

Read `AGENTS.md`, `Overview.md`, `workflow/README.md`, `workflow/agents/implementer.toml`, the canonical specification and task-local specification reference, checklist, handoff, technical design proposal, Group 3 storage proposal, and the current server and tests.

The OpenSpec CLI preflight was attempted using the repository's configured OpenSpec root. `openspec list --json` found a valid project root. `openspec status --change role-aware-login --json` and `openspec instructions apply --change role-aware-login --json` both returned `change_error`: no changes exist. The `Skill integration` section of `workflow/README.md` is blank and provides no `workflow/specs/` path adapter. Per orchestrator direction, implementation proceeded from the directly approved canonical specification, checklist, handoff, and Group 3 proposal. No OpenSpec change or configuration was created or modified.

## Changes

- `src/libconnect-mp4/server/auth/login.js`: enforce server-read active status and selected type after password verification; create the durable session before sending HTTP 200; add secure host-only session cookie, protected session check, authenticated CSRF token retrieval, CSRF-checked logout, status/role rechecks, dual shared rate-limit adapter calls, generic 429 and safe 503 handling.
- `src/libconnect-mp4/server/auth/firestore-store.js`: add Firestore-backed `loginSessions` and `loginFailureCounters` adapters. Session document IDs and counter keys are SHA-256 digests. Firestore transactions update the shared counters and session idle timestamps. Stored records omit raw session IDs, raw CSRF tokens, email, password, password hash, and manager flags.
- `src/libconnect-mp4/server/index.js`: connect the Firestore durable auth store to the server app; allow injection of a synthetic store in tests.
- `src/libconnect-mp4/test/login-T04.test.js`: add T04 synthetic endpoint coverage for successful MEMBER/LIBRARIAN login, uniform denials, forged authorization fields, cookie attributes, durable session shape, persistence failure, expiry, status/role rechecks, CSRF, logout, both rate thresholds, direct socket source, and response minimization.
- `src/libconnect-mp4/test/login-T03.test.js`: adapt existing credential-verification tests to the completed T04 auth-store contract; replace interim verified-credentials `503` expectations with successful session behavior or the final generic denial where applicable.
- `src/libconnect-mp4/test/server.test.js`: inject a synthetic durable auth store while checking the server app integration.

## Acceptance matrix

| T04 acceptance | Evidence |
| --- | --- |
| Active MEMBER and LIBRARIAN success; only server-stored type authorizes | `login-T04.test.js`, success cases for both types; response contains only `accountType` |
| Wrong-type directions, inactive accounts, forged client role/manager/status/user/hash fields, absent account | `login-T04.test.js` denial and forged-field cases; `login-T03.test.js` absent/malformed mapping and account cases |
| Uniform credential denial and no session on denial | T03/T04 endpoint assertions check exact generic `401`, no cookie, and empty session store |
| Durable session before HTTP 200 and protected cookie attributes | T04 success checks persisted record and `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, no `Domain`; response is minimal |
| Idle and absolute expiry; logout invalidation | T04 synthetic-clock expiry and CSRF-protected logout cases |
| Status and role recheck on protected requests | T04 changes current synthetic status and role after login; both requests are denied and session records removed |
| CSRF token endpoint and logout protection | T04 rejects missing token, obtains a token through authenticated GET, then confirms logout clears the server record and cookie |
| Five failures per canonical email and 30 per direct source in 15 minutes | T04 sequentially reaches each threshold, confirms uniform `429`, no session, and no account-status change; source case varies `X-Forwarded-For` values |
| `503` on persistence failure, no session cookie | T04 synthetic session persistence failure |
| No sensitive response or log output | Responses are checked for minimal account type and absence of email/hash/session fields; server auth code emits no authentication logs |

## Verification

Command, run from `src/libconnect-mp4/`:

```powershell
npm test -- --watchAll=false --runInBand
```

Result: passed, 4 test suites and 48 tests. One Node `punycode` deprecation warning was printed by the existing dependency tree; it did not affect the result.

## Deviations and unresolved risks

- The OpenSpec CLI change lookup could not be completed because no active CLI change exists and the documented repository path adapter is blank. The orchestrator authorized proceeding directly from the approved canonical task artifacts; this is recorded as a preflight limitation above.
- No live Firebase project, credentials, edition query, provisioning, rules, IAM, TTL policy, proxy, or deployment configuration was accessed or changed. The Firestore adapter was not exercised against a live or emulator database; verification used an injected synthetic store as approved.
- Firestore `expiresAt` fields support logical expiry and can support TTL cleanup, but TTL configuration was not approved or changed. Expired, never-reused session documents and old counter documents may remain until a separately authorized cleanup policy is applied; authentication checks enforce expiry regardless.
- Existing registration, email-change, and account migration flows must produce the approved account/email-key schema before existing users can use this login. That integration is outside T04.
- A production deployment must provide HTTPS for the `Secure` cookie. Reverse-proxy source policy remains separately approved work; the implementation uses only `req.socket.remoteAddress` and ignores forwarding headers.

No checklist, shared implementation report, specification, handoff, review report, or approval state was changed. Independent review and the later human merge decision remain outstanding.
