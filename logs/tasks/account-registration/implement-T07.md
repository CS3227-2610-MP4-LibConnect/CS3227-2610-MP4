# T07 implementation evidence

Task: `account-registration`, Group 6 T07. Approved contract: canonical specification v0.5 R9/scenario 18, checklist v0.4, handoff v0.4, human-approved grouping and prewritten tests. Role: implementer. Status: source work complete, independent review pending; no checklist checkbox or approval state changed.

## Preflight and scope

- Read `AGENTS.md`, `Overview.md`, `workflow/README.md`, `workflow/agents/implementer.toml`, the approved spec and task artifacts, the T07 baseline report, the assigned source, and relevant tests.
- Selected skill: `.agents/skills/openspec-apply-change/SKILL.md`. `openspec list --json` reported a repository root and no active changes. `openspec status --change account-registration --json` and `openspec instructions apply --change account-registration --json` reported no CLI change. The repository's `workflow/README.md` path-adapter section is blank; the human-approved `workflow/specs/` and task-local artifacts were used as the apply contract. No second spec tree was created.
- Assigned source files: `src/libconnect-mp4/src/RegistrationPage.tsx`, `src/libconnect-mp4/server/auth/register.js`. Report and this log were also assigned. Test writer's three test files were left untouched by this implementer.

## Change and acceptance

- Both client and server use the approved R9 regex after trimming. The client adds an email-specific error in its existing `role="alert"` region, links it with `aria-describedby`, and returns before fetch. Express checks independently before rate reservation, hashing, or persistence and returns generic `400` on invalid syntax.
- Existing trimmed original-case storage, lowercase canonical key, 254-byte bound, status assignment, and login endpoint policy were preserved.
- R9/scenario 18: targeted component, endpoint, and fake-Firestore integration cases passed for both account types, valid minimal/dotted/subdomain/surrounding-whitespace addresses, invalid variants, accessibility/no client fetch, `400`/no account-key writes, and original/canonical case handling.

## Verification

From `src/libconnect-mp4` unless noted:

1. `$env:CI='true'; npm test -- --watch=false --runInBand RegistrationPage.test.tsx registration.endpoint.test.js registration.api.test.js` — exit 0; 3 suites, 144 tests passed.
2. `$env:CI='true'; npm test -- --watch=false --runInBand` — exit 1; 10 suites passed, 1 failed, 1 skipped; 226 tests passed, 3 failed, 1 skipped. The failures were the production cases in `test/firestore-target.test.js`.
3. `npm run build` — exit 0; compiled successfully.
4. `$env:CI='true'; npm test -- --watch=false --runInBand firestore-target.test.js` — exit 1; 18 passed, 3 failed in the same production-mode cases, without other test suites.
5. `git diff --check -- src/libconnect-mp4/src/RegistrationPage.tsx src/libconnect-mp4/server/auth/register.js` — exit 0.
6. `node -e "console.log({emulator:process.env.FIRESTORE_EMULATOR_HOST!==undefined,credentials:process.env.GOOGLE_APPLICATION_CREDENTIALS!==undefined})"` — both false in the invoking shell. `$env:NODE_ENV='test'; node -e "require('react-scripts/config/env'); console.log({emulator:process.env.FIRESTORE_EMULATOR_HOST!==undefined,credentials:process.env.GOOGLE_APPLICATION_CREDENTIALS!==undefined})"` — emulator true, credentials false after React Scripts loads local environment configuration. Only variable presence was printed, not values.

## Deviations and risks

The full suite did not pass because the React Scripts test environment includes `FIRESTORE_EMULATOR_HOST`, which the production-target tests explicitly reject. This reproduces in the isolated target-test run and is outside the two authorized T07 source files. The implementer did not alter the local environment file, Firestore connection code, or the test. This needs separate environment/test isolation handling before treating the full suite as a pass. No production Firebase access, source beyond assigned files, dependencies, config, commit, stage, or merge.
