# T06 implementation handoff

Status: complete for the approved Group 5 scope, including the separately approved one-field React development proxy. This is implementation evidence, not approval or a checklist update.

Specification: `workflow/specs/account-registration.md` v0.4 (human approved 2026-11-07). Checklist and handoff: v0.3 (human approved 2026-11-07). Assigned Group 5 scope: `server/index.js`, new `server/firestore-target.js`, `README.md`, and focused Firestore mode tests. The human separately approved adding only `"proxy": "http://127.0.0.1:3000"` to `package.json` for the three-process flow. No dependency, script, package-lock, Firebase configuration, CI, rules, deployment, credential, or cloud project change was made.

## Changes

- `src/libconnect-mp4/server/firestore-target.js`: validates an explicit `local-emulator` or `production` mode and project. Local mode requires `127.0.0.1:8080` and `libconnect-mp4`, probes the emulator before SDK construction, and uses an ephemeral synthetic service account credential to avoid developer ADC. Production requires an explicit project matching `GOOGLE_CLOUD_PROJECT`, a nonempty Cloud Run `K_SERVICE`, no emulator host or credential-file override, and runtime `applicationDefault()`.
- After independent review found that `applicationDefault()` can prefer a well-known gcloud ADC file, the production connector was hardened to reject that file by existence check (without reading it) and to probe Cloud Run metadata for an exact project-ID match before constructing an Admin client or invoking the credential factory. A missing or mismatched metadata response fails startup. These probes are injected in isolated tests; no live metadata or production Firestore request was made during development.
- `src/libconnect-mp4/server/index.js`: resolves the target and awaits its connection before constructing or listening with the Express app. Startup errors are non-sensitive.
- `src/libconnect-mp4/package.json`: adds the one approved React development proxy field, with no dependency or script change.
- `src/libconnect-mp4/README.md`: documents the three-process local flow: emulator on port 8080, Express on port 3000, and React development server on port 3001 with `/api/auth/*` proxied to Express. It also covers production settings and safe failure behavior.
- `src/libconnect-mp4/test/firestore-target.test.js`: independent pre-implementation tests were refined to inject/assert the synthetic emulator credential factory.
- The independent test writer added three regression cases for a synthetic well-known ADC file and missing/mismatched metadata. They failed before the production guard and passed after it.
- `src/libconnect-mp4/test/firestore-mode.integration.test.js`: independent pre-implementation integration test was adapted to spawn a real Node process because CRA Jest cannot resolve Firebase Admin subpath exports correctly. It uses the real Admin SDK and local emulator with synthetic accounts.

## Verification

- After the proxy field and README update, `CI=true npm test -- --watch=false --runInBand`: 11 suites and 154 tests passed; emulator test skipped by default.
- After the proxy field, `CI=true npm run build`: passed.
- `git diff --check`: passed; Git reported only CRLF normalization warnings on existing working-tree paths.
- Opt-in emulator integration passed after the final local credential change: Member and Librarian registration created user/key records; active Member login returned 200 with a session; inactive Librarian login returned 401; session/counter records were in the same emulator. The child Node process used a nonexistent synthetic `GOOGLE_APPLICATION_CREDENTIALS` path, so this did not rely on developer ADC.
- After adding the synthetic local credential, a read against the emulator succeeded with `GOOGLE_APPLICATION_CREDENTIALS` set to a nonexistent synthetic path. This is evidence that local reads do not need developer ADC.
- A direct `startServer()` smoke check with the same invalid synthetic ADC path, the exact emulator target, and an alternate local port completed successfully; it opened no registration request and was closed immediately.
- A repeat integration attempt encountered the emulator's persisted five-attempt source counter (`429`). The test passed after the counter window expired; no emulator data was deleted or reset.
- Started Express on port 3000 with the emulator target and invalid synthetic ADC path, and CRA on port 3001. A request to `http://127.0.0.1:3001/api/auth/session` returned Express JSON `401`, and a malformed `POST /api/auth/register` returned JSON `400`, confirming the proxy path. Both processes were stopped after the check.
- Isolated `test/firestore-target.test.js` passed earlier with 18 tests before the ambient integration target variables were set. A combined test run while `FIRESTORE_EMULATOR_HOST` was set in the shell caused the isolated production connector test to reject the ambient emulator variable, which is the intended fail-closed behavior. The normal full suite ran without that ambient variable and passed.
- After the production guard: focused Firestore target suite passed 21/21; full Jest passed 157 tests with the opt-in emulator test skipped; production build passed. A repeat emulator integration attempt reached the persisted registration source limit at the librarian request (`429`), after a Member registration in that run. The same local integration flow passed before the production-only guard. No counter or account data was reset.

## Remaining work and risks

- The running emulator retains synthetic test accounts and rate counters. Immediate repeated integration runs can hit the five-attempt source limit; use a fresh counter window or a separately approved isolated emulator instance for repeatability.
- Production mode was tested with injected SDK dependencies only. No live production connection, IAM check, rules check, or deployment occurred. The Cloud Run runtime signal is configuration evidence; live credential validity remains a deployment gate.
- The production guard verifies the runtime metadata project and rejects developer ADC precedence before Admin initialization. Actual production credential token acquisition, IAM, and deployment remain unverified and require a controlled deployment gate.
- The local synthetic credential triggers a deprecation warning from the underlying Firestore client about its `credentials` option, but a local read succeeded without ADC. Review should assess this implementation and the production configuration guard.

## Later T06 test-harness correction under specification v0.5

The human approved this narrow correction after independent T07 review found that the ordinary React Scripts test command loads a local emulator host into the test process. The applicable specification is `workflow/specs/account-registration.md` v0.5, with approved checklist/handoff v0.4. This correction changes only `src/libconnect-mp4/test/firestore-target.test.js`; it does not change T06 production behavior, configuration, `.env`, or other tests.

Before the correction, the ordinary focused command `CI=true npm test -- --watch=false --runInBand --runTestsByPath test/firestore-target.test.js` failed 3 of 21 tests: a happy production connector case and two metadata cases were rejected at the ambient emulator guard before reaching their intended assertions. The suite now clears `FIRESTORE_EMULATOR_HOST` before each case and restores its original value afterward. A new case sets that host explicitly and verifies production still rejects it before the ADC check, metadata probe, credential factory, or SDK construction. No safety assertion was weakened.

After the correction, the same ordinary focused command passed 22/22. The ordinary full command `CI=true npm test -- --watch=false --runInBand` passed 230 tests across 11 suites; the opt-in emulator integration suite was skipped. A build was not rerun because no production or build input changed. No cloud or emulator access, credential read, commit, stage, or checklist/review edit occurred. The corrected test is ready for independent re-review.
