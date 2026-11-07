# Reopened T06 test-isolation reviewer log — 2026-11-07

- Read reviewer role, approved registration specification v0.5 R8, checklist/handoff v0.4, earlier T07 review finding, T06 correction implementation report/log, and current `test/firestore-target.test.js`. Test file remains uncommitted/untracked; separate clean checkout cannot contain it. Did not read or modify `.env`.
- Inspected test change: capture original `FIRESTORE_EMULATOR_HOST`, delete before each case, restore after each case; new explicit ambient-host case asserts early production rejection with no ADC/metadata/credential/SDK call. Existing production rejection cases and assertions remain intact. No production code changed for this correction.
- Inspected `package.json` scripts before execution. From `src/libconnect-mp4`, `$env:CI='true'; npm test -- --watch=false --runInBand --runTestsByPath test/firestore-target.test.js`: exit 0; 22 tests passed.
- From `src/libconnect-mp4`, `$env:CI='true'; npm test -- --watch=false --runInBand`: exit 0; 11 suites, 230 tests passed, one opt-in emulator integration test skipped. Both are ordinary commands with the project environment left in place. Node printed a `punycode` deprecation warning.
- No build rerun: correction is test-only; the previous T07 build passed. No emulator, cloud, metadata, credential, stage, commit, production edit, or checklist edit.
