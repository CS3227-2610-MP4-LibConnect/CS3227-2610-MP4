# T01 server-wiring correction review execution log

Date: 2026-11-09 (Asia/Singapore)  
Artifacts: specification v0.3, checklist v0.2, handoff v0.2, assignment Batch 4  
Workspace: shared uncommitted workspace per assignment separation exception.

## Commands and results

1. From `src/codeclinic`, attempted the focused Jest command with an incorrect relative Tee-Object path. PowerShell failed to open the log destination before Jest ran; no tests ran. Repeated the command with the correct task-local path.
2. From `src/codeclinic`:

   ```text
   npm test -- --runInBand --watchAll=false --verbose registration.api.test registration.endpoint.test student-tickets.api.test server.test account-r7-server.test student-tickets.storage.test
   ```

   Exit 0. **6 suites passed; 126 tests passed.** This includes the two registration suites, ticket API/storage, server composition, and R7 server guard. Full verbose output: [`review-T01-wiring-focused-output.log`](review-T01-wiring-focused-output.log).

3. From `src/codeclinic`:

   ```text
   npm test -- --runInBand --watchAll=false --verbose
   ```

   Exit 0. **41 suites passed, 3 skipped; 737 tests passed, 3 skipped.** The run took 66.33 seconds. Full verbose output: [`review-T01-wiring-full-output.log`](review-T01-wiring-full-output.log). The pre-correction registration failures did not recur.

4. Ran a one-off Node/Supertest request against `createServerApp` using synthetic local fixtures: active Student, valid cookie-backed session, `mustChangePassword: true`, and a registration persistence counter. Result: `{"status":403,"code":"PASSWORD_CHANGE_REQUIRED","createCalls":0}`; exit 0. This confirms the guard is still wired for valid registration requests. Output: [`review-T01-wiring-guard-output.log`](review-T01-wiring-guard-output.log).

## Inspection notes

- `index.js` now imports `AUTH_BODY_BYTES` from the existing auth module, so registration keeps the 8 KiB parser limit. `strict: true` is retained. Its route-local error middleware maps malformed JSON and oversized registration requests to safe `400`; the registration API tests cover malformed and over-8 KiB bodies with no writes.
- At the initial review, the route ordered the forced-password guard before the parser. This differed from the previous nested login-app order (parser before guard) for malformed JSON with a forced-password session. See finding T01-W1 in the review report; the re-review below confirms it is resolved.
- `/api/tickets` is mounted first. `tickets/route.js` owns the strict 128 KiB parser and local `413`/malformed JSON handling, and checks current session/account/role, forced-password state, and CSRF before creating data.
- The full output includes the existing Node `punycode` deprecation warning and React `act(...)` diagnostic; neither caused a test failure.

## Re-review of T01-W1

The earlier inspection note and initial changes-required finding are retained above. The implementation now orders registration middleware as strict 8 KiB JSON parser → forced-password guard → registration handler → route-local error handler. The new `server.test.js` assertion covers a valid forced-password request (`403`), malformed JSON from that same session (`400`), and no additional persistence. This matches the pre-correction parser/guard ordering and closes finding T01-W1.

Independent focused rerun from `src/codeclinic`:

```text
npm test -- --runInBand --watchAll=false --verbose registration.api.test registration.endpoint.test student-tickets.api.test student-tickets.storage.test account-r7-server.test server.test
```

Exit 0. **6 suites passed; 126 tests passed.** Full output: [`review-T01-wiring-rerun-output.log`](review-T01-wiring-rerun-output.log).

The full suite was not rerun: the only new change is this parser/guard ordering and the focused command covers both registration suites, ticket API/storage, R7 guard, and server composition. The earlier full-suite output remains linked as `review-T01-wiring-full-output.log`: 41 suites passed, 3 skipped; 737 tests passed, 3 skipped.

Final T01 correction verdict after re-review: **pass**. The earlier changes-required verdict is superseded by this re-review result; its finding and the earlier full-suite evidence remain preserved.
