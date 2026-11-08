# AI gateway continuation — 2026-11-08

Specification/checklist/handoff: ai-gateway v0.1. Base: codeclinic-scope 652e8ee.
The user requested completion of shared/team tasks only. Feature-specific AI routes,
prompts, schemas and pages remain outside scope. Existing approved grouping and
standing continuation schedule are recorded in workflow/PLAN.md and prior integration logs.

Recovered Claude's unfinished transport hardening from worktree `ag-chain`:
redirect refusal and a 1 MiB streamed-response cap. The source worktree was preserved.
Added gateway composition and startup creation, with no registered real feature or route.
Added pipeline tests and the recursive browser boundary test. No external provider calls,
credentials, dependencies, CI edits, commits, pushes or merges in this continuation.

Commands in src/codeclinic:
- `CI=true npm test -- --watch=false --runInBand --runTestsByPath test/ai-gateway.test.js test/ai-browser-boundary.test.js test/ai-transport.test.js`
  Exit 0: 3 suites, 46 tests passed.
- `CI=true npm test -- --watch=false --runInBand --runTestsByPath test/ai-transport-hardening.test.js`
  Exit 0: 1 suite, 3 tests passed.

Full regression/build, independent review and local integration results follow below when run.
The real provider model and max_tokens support remain human smoke checks.

Initial emulator invocation exited 2 before startup: firebase-tools used a stale
`JAVA_HOME` pointing at an old browser Java plugin despite PATH containing Java 21.
Verified the installed Temurin 21 binary and retried with JAVA_HOME set to that JDK
for this command only. No dependency or machine configuration was changed.

## Local integration result

A second attempt with JAVA_HOME alone also exited 2 because the CLI selects java
from PATH. The app-directory shell PATH selected Java 8, while the repository-root
shell selected Java 21. Prefixing PATH with the already-installed Temurin 21 bin
fixed version selection. The sandbox then rejected loopback listening (EPERM).
The same bounded local-only command succeeded after automatic sandbox escalation:

```sh
PATH=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home/bin:$PATH JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home FIREBASE_CLI_DISABLE_UPDATE_CHECK=1 firebase emulators:exec --only firestore --project demo-codeclinic 'CODECLINIC_FIRESTORE_MODE=local-emulator CODECLINIC_FIRESTORE_PROJECT_ID=demo-codeclinic FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 RUN_FIRESTORE_EMULATOR_TESTS=1 CI=true npm test -- --watch=false --runInBand --runTestsByPath test/firestore-mode.integration.test.js test/ai-gateway-emulator.integration.test.js'
```

Exit 0: 2 suites passed, 2 tests passed (6.9 seconds). Java: OpenJDK Temurin
21.0.12.1+1-LTS. The gateway test called a loopback fake HTTP provider, reserved
real emulator counters, and verified one content-free SUCCESS usage document.
The existing registration/login emulator integration also passed.
The emulator warned that there is no rules file; rules belong to the deferred
deployment task. No cloud project or real provider was accessed.

## Initial full regression

`CI=true npm test -- --watch=false --runInBand` under the sandbox exited 1:
9 failed suites, 22 passed, 2 skipped; 199 failed tests, 420 passed, 2 skipped.
Most HTTP tests failed because the sandbox denies loopback listeners. Separate
fixture regressions occurred in DashboardRoutes.integration.test.tsx (new bell
requests consume sequential auth mocks) and server.test.js/notifications.api.test.js
(minimal fake db/auth store missing new account store initialization methods).
No security assertion was weakened. Human permission to update these three
fixtures was requested; fixture changes wait for that answer.

`npm run build` exited 0, with one AccountPages useEffect dependency warning.
The account implementer was asked to fix the warning before final verification.

## Review clarification

The human selected **Approve the clarification** for the exact R4/R11,
checklist, and handoff proposal in this chat. Appended the amendment records
before the substantive documentation edits. Per-user usage records begin only
after both a registered feature and a valid server-resolved actor validate;
invalid actors fail closed without provider traffic or fabricated identities.
No gateway behavior or role-owned feature was changed.

## Final integrated checks — 2026-11-08

Complete regression: exit 0; 36 suites / 637 tests passed; 3 opt-in tests skipped.
Fresh demo-codeclinic emulator: exit 0; all 3 opt-in integrations passed
(auth, AI loopback/provider/counter/usage, and account/bootstrap/support/session/email).
Build: exit 0, compiled successfully. Primary raw verification output is retained
under logs/tasks/account-management/verification/{regression,build,emulator}.log.
The first combined emulator run failed 429 because fixture registrations shared
the loopback source budget; account setup was isolated through existing persistence
without changing production rate limits. The rerun passed all three suites.
