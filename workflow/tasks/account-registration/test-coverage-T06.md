# T06 pre-implementation test coverage

Specification: `workflow/specs/account-registration.md` v0.4; approved checklist and handoff v0.3. Group 5 was approved by the human on 2026-11-07. This is test-writer evidence, not T06 acceptance or approval.

## Added tests

- `src/libconnect-mp4/test/firestore-target.test.js`: explicit local and production mode resolution; fixed local project/loopback port; invalid or absent mode, host, project, runtime, and emulator settings; local emulator unavailability; no Admin SDK construction or credential fallback on invalid configuration; production uses explicit project and runtime credential factory with mocked SDK calls only.
- `src/libconnect-mp4/test/firestore-mode.integration.test.js`: opt-in real Firestore emulator test using synthetic member/librarian identities, register-to-login behavior, user and email-key documents, active/inactive statuses, and shared session/counter database. It runs only with `RUN_FIRESTORE_EMULATOR_TESTS=1` and exact local target environment.

The interface assumption communicated to the orchestrator is `resolveFirestoreTarget(env)` and asynchronous `connectFirestoreTarget(target, deps?)`, where injectable dependencies are `initializeApp`, `getFirestore`, `applicationDefault`, and `probeEmulator(host, port)`. The production runtime signal is `K_SERVICE`, consistent with the repository's Cloud Run deployment configuration. Other deployment platforms would require a separately reviewed runtime adapter.

## Pre-implementation result

Command from `src/libconnect-mp4/`:

```text
$env:CI='true'; npm test -- --watch=false --runInBand --runTestsByPath test/firestore-target.test.js test/firestore-mode.integration.test.js
```

Result: exit 1; both suites fail to load because `server/firestore-target.js` does not yet exist. Zero tests executed. This is the expected red state before implementation. No production code, Firebase configuration, credentials, package files, or live cloud resources were modified or accessed. The emulator integration test has not run yet; it needs the implementer module and a running local emulator.

## Reviewer blocker regression tests

After the first implementation, independent review found that `applicationDefault()` may select a well-known developer gcloud ADC file before Cloud Run metadata credentials. The test writer added three focused tests in `firestore-target.test.js`: a synthetic `CLOUDSDK_CONFIG` directory containing an empty placeholder file, and mismatched/unavailable metadata project responses. The contract is to reject each case before invoking `applicationDefault()` or constructing an Admin client. The placeholder contains no credential material; no actual ADC file was read.

Focused pre-fix command:

```text
$env:CI='true'; npm test -- --watch=false --runInBand --runTestsByPath test/firestore-target.test.js
```

Result: exit 1, 18 passed and 3 new tests failed. The current production connector resolves a database for all three unsafe cases, confirming the reviewer blocker. The proposed injectable checks are `hasWellKnownAdc()` (default path presence check) and asynchronous `getMetadataProjectId()`; production success tests inject safe values and make no live production calls. This is a test-writer handoff, not a claim that T06 is complete.
