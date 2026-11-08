# Independent account-management review — factual log

Date: 2026-11-08. Review snapshot: `/private/tmp/codeclinic-shared-review-20261108` (base identifier `652e8ee`, no `.git`; source boundary `shared-continuation.diff`). Main-workspace production comparison was byte-identical for the reviewed files. The post-snapshot account emulator test fixture edit was inspected and is test-only.

## Inputs read

- `AGENTS.md`, `workflow/README.md`, `workflow/agents/reviewer.toml`, `Overview.md`.
- `workflow/specs/account-management.md` v0.1; task `spec.md`, `tasks.md`, and `handoff.md` v0.1.
- AM-G1 implementation/review reports; continuation implementation and security self-review; continuation log.
- Account route/store/guard, auth login and Firestore store, server wiring, bootstrap, UI/dashboard integration, and the account/bootstrap/login/server/registration tests in the frozen snapshot.
- Post-snapshot `test/account-emulator.integration.test.js` in the main workspace.

## Commands and exact results

- Initial sandboxed run `CI=true npm test -- --watchAll=false --runInBand --runTestsByPath test/account-routes.test.js test/account-r7-server.test.js test/account-server-wiring.test.js test/bootstrap-coordinator.test.js test/login.api.test.js test/server.test.js test/registration.api.test.js test/registration.endpoint.test.js` → exit 1; loopback Supertest listeners failed with `listen EPERM`; `test/login.api.test.js` was also not a repository path. No test files changed.
- Escalated retry with the corrected test path `test/login.session.test.js` and added AM-G1 store/guard tests: `CI=true npm test -- --watchAll=false --runInBand --runTestsByPath test/account-store.test.js test/account-guards.test.js test/account-routes.test.js test/account-r7-server.test.js test/account-server-wiring.test.js test/bootstrap-coordinator.test.js test/login.session.test.js test/login.credentials.test.js test/server.test.js test/registration.api.test.js test/registration.endpoint.test.js` → exit 0; 11 suites, 194 tests passed.
- `CI=true npm test -- --watchAll=false --runInBand --runTestsByPath test/AccountPages.test.tsx test/Notifications.test.tsx` → exit 0; 2 suites, 15 tests passed.
- Synthetic R7 probe using in-memory fake stores and the actual `createForcedPasswordChangeGuard` plus `createAccountRouter` → `/api/account` 403; `/API/account` 200; `/Api/account` 200; `/api/%61ccount` 403; `/%61pi/account` 404; `PATCH /API/account/profile` with synthetic CSRF returned 200 and changed stored name from `Before` to `After`. This confirms R7-1. No production files were changed.
- Human approved the R7 security fix. Main-workspace production change lowercases `req.path` before the API-prefix check and normalizes the allow-list match; eight mixed-case R7 regression cases were added.
- `CI=true npm test -- --watchAll=false --runInBand --runTestsByPath test/account-r7-server.test.js` from main `src/codeclinic/` → exit 0; 1 suite, 9 tests passed, including mixed-case account/support/notification reads and writes plus allowed mixed-case password endpoint.
- Repeated synthetic mounted-router probe after the fix → `/api/account`, `/API/account`, `/Api/account`, and `/api/%61ccount` returned `403 PASSWORD_CHANGE_REQUIRED`; `/%61pi/account` returned `404`; `/API/account/password` reached the handler and returned `400` for intentionally empty input; attempted mixed-case profile write left stored name `Before`. This verifies the bypass is closed for tested path variants.
- Orchestrator evidence, read but not independently rerun by this reviewer: updated full regression exit 0, 36 suites / 645 tests passed, 3 opt-in tests skipped; fresh demo emulator exit 0, all 3 integrations passed; build exit 0 and compiled successfully. Raw logs are under `logs/tasks/account-management/verification/`.

## Review result

R7-1 was High severity and is resolved by the approved T04 fix with independent narrow verification. See `workflow/tasks/account-management/review-report.md` and `security-review.md`. The reviewer did not modify production code, tests, checklist, or specification.
