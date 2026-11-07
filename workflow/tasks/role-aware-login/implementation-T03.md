# Implementation handoff: role-aware-login T03

Status: **Implemented for independent review; T03 only**  
Specification: `workflow/specs/role-aware-login.md`, version 0.2  
Checklist item: T03 in `workflow/tasks/role-aware-login/tasks.md`, version 0.2

## Changed files

- `src/libconnect-mp4/server/auth/login.js`
- `src/libconnect-mp4/test/login-T03.test.js`
- `logs/tasks/role-aware-login/implementer-T03.md`

## Behavior delivered

- Added `POST /api/auth/login` with runtime checks for JSON object shape, string email/password, supported account type, nonblank values, and explicit UTF-8 limits (8 KiB JSON, 254-byte email, 1,024-byte password). The submitted password is passed unchanged to Argon2 verification.
- Canonicalizes email by trimming and lowercasing, computes the SHA-256 document key, resolves the injected email-key mapping, and checks that the mapped user ID, stored email, and `canonicalEmailKey` agree.
- Rejects absent, duplicate, malformed, inconsistent, and unmapped synthetic records. Stored hashes must be versioned Argon2id with v=19, at least 19 MiB memory, at least two iterations, and parallelism one.
- Added an Admin Firestore adapter factory, but no Firebase project or database was accessed. Tests use only synthetic records through an injected repository.
- Password verification returns `passwordMatched` evidence only. The route returns `503` after a successful password match until T04 implements approved status/type authorization and session handling. It never sends a session cookie or a success body.
- Unknown accounts and malformed records perform a dummy Argon2id verification and return a generic `401`; dummy verification errors propagate to the generic `503` instead of silently skipping the timing work. Injected data-service failures return a generic `503`. No credentials or hashes are logged or returned.
- Static search of `src/libconnect-mp4/src` found no Firestore or `passwordHash` references; the endpoint response test also confirms no hash is returned. Firestore browser rules were not in T03 scope.

## Verification

Command from `src/libconnect-mp4/`:

```text
npm test -- --watchAll=false --runInBand
```

Result: **PASS** — 2 suites, 35 tests. The unknown-email test confirms the route invokes Argon2 verification and that the captured hardcoded dummy hash verifies the known synthetic dummy value. A Node `punycode` deprecation warning was emitted by the test dependency chain; it did not fail the run.

Command from `src/libconnect-mp4/`: `node --check server/auth/login.js` — **PASS** (no output).

OpenSpec preflight: `openspec list --json` reported a configured repository root and no OpenSpec changes; `openspec status --change role-aware-login --json` reported that this change does not exist. As required by the repository adapter, the approved canonical spec and task artifacts under `workflow/specs/` and `workflow/tasks/` were read and used. No OpenSpec change was created.

## Deferred work and risks

- T03 deliberately does not implement T04 status/type authorization, uniform denial across those cases, sessions, rate limits, CSRF, or protected routes. Correct password verification alone does not authorize a user. The interim route returns `503` on every correct-password request and issues no cookie.
- Firestore edition detection and live access were deferred as specifically directed. The Firestore skill’s edition-dependent guide selection cannot be completed without that inspection; no Firebase CLI, project, rules, or database was touched.
- Registration/email-change canonicalization, account migration, browser Firestore rules, deployment, and production adapter wiring remain outside T03.
- The byte limits are local T03 implementation bounds because the approved specification required explicit bounds but did not state numerical values. They should be reviewed before production integration.

The orchestrator owns shared checklist updates and the shared implementation report. This handoff does not mark T03 approved or complete for merge.
