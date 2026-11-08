# Execution log: codeclinic-rename T07 and T08

Date: 2026-11-08. Worktree `wt/rn-g5`, branch `codeclinic-rename-g5`, base `4498e56`. Before edits, `git status --short` showed only the two orchestrator edits (`workflow/tasks/codeclinic-rename/spec.md`, `tasks.md`), which were left unchanged. Node v24.2.0, npm 11.3.0, Firebase CLI 15.34.0, OpenJDK 21.0.12.1.

## T07 — Guides

1. Read `src/codeclinic/src/{LoginPage,RegistrationPage,StudentDashboard,TADashboard,DashboardLogout,DashboardRouteGuard}.tsx`, `server/index.js`, `server/auth/{login,register}.js`, `server/ai/*.js`, `README.md`, `.firebaserc`, `apphosting.yaml` to confirm labels, routes, and what is built.
2. Rewrote `docs/UserGuide.md` and edited `docs/DeveloperGuide.md` (see the implementation report for the section list).
3. `rg -n "catalog|Book|Member|Librarian|LIBCONNECT|libconnect|seed" docs/UserGuide.md docs/DeveloperGuide.md`: User Guide no hits. Developer Guide hits only the history note (lines 9–10, the former name and path) and the production project ID `libconnect-mp4` in *Environments and deployment* (lines 210, 212).
4. Label check (Python): every `**bold**` text in the User Guide before *Planned features* searched in `src/codeclinic/src/*.tsx`. All 19 UI labels found (`Access denied`, `CodeClinic`, `Confirm password`, `Create account`, `Email address`, `Employee ID`, `Go to login now`, `Log out`, `Name`, `Password`, `Register`, `Register as`, `Sign in`, `Sign in as`, `Student`, `Student Dashboard`, `TA`, `TA Dashboard`, `Welcome back`). Not found: `Deployed app:` and `Local copy:`, which are the guide's own list headings, not UI labels. The multi-line bold `Unable to sign in with those details.` is in `LoginPage.tsx:50`.

## T08 — Verification

1. `rm src/codeclinic/node_modules` (removed the symlink only). Afterwards `ls -la` of the main checkout's `src/codeclinic/node_modules` still listed its contents.
2. `npm ci --cache /tmp/rn-g5-npm-cache` in `src/codeclinic`: exit 0; "added 1603 packages, and audited 1604 packages in 35s"; npm audit reported "44 vulnerabilities (16 low, 11 moderate, 17 high)"; deprecation warnings for `glob@7.2.3` and `glob@10.5.0`. `package.json` and `package-lock.json` unchanged (`git diff --stat HEAD` empty for both).
3. `CI=true npm test -- --watch=false`: exit 0; "Test Suites: 1 skipped, 21 passed, 21 of 22 total"; "Tests: 1 skipped, 386 passed, 387 total". The skipped suite is the opt-in emulator test.
4. `npm run build`: exit 0; "Compiled successfully." Node DEP0176 `fs.F_OK` deprecation warning from tooling only.
5. Opt-in emulator test (emulator jar `cloud-firestore-emulator-v1.22.0.jar` already cached in `~/.cache/firebase/emulators/`; nothing listening on port 8080 beforehand):

   ```sh
   FIREBASE_CLI_DISABLE_UPDATE_CHECK=1 /usr/local/bin/firebase emulators:exec --only firestore --project demo-codeclinic \
     "CODECLINIC_FIRESTORE_MODE=local-emulator CODECLINIC_FIRESTORE_PROJECT_ID=demo-codeclinic FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 RUN_FIRESTORE_EMULATOR_TESTS=1 CI=true npm test -- --watch=false --runInBand --runTestsByPath test/firestore-mode.integration.test.js"
   ```

   Exit 0. "Detected demo project ID "demo-codeclinic""; "PASS test/firestore-mode.integration.test.js"; "✓ registration and login share the local Firestore emulator (2529 ms)"; "Tests: 1 passed, 1 total"; "Script exited successfully (code 0)". Emulator warnings: no rules file in `firebase.json` (allows all reads and writes in the emulator), multiple databases not supported.
6. The emulator wrote an untracked, non-ignored `src/codeclinic/firestore-debug.log`; deleted it after the run.
7. Search check: `grep -rin libconnect src/codeclinic/ --exclude-dir=node_modules --exclude-dir=build`:
   - `.firebaserc:4: "prod": "libconnect-mp4"`
   - `README.md:66: project ID `libconnect-mp4` appears in `.firebaserc` and `apphosting.yaml`;`
   - `apphosting.yaml:39: value: libconnect-mp4`
   - `apphosting.yaml:45: value: libconnect-mp4`

   The `README.md:66` hit is outside the amended T05 allowance. `git log -1 -- src/codeclinic/README.md` is `106cdf7` (the merged T05 commit). Not edited; see the report.
8. `git status --short --untracked-files=all` before writing evidence: `docs/DeveloperGuide.md`, `docs/UserGuide.md` modified, plus the two orchestrator edits. `git diff --stat` for the guides: `DeveloperGuide.md` 80 lines changed, `UserGuide.md` 53 lines changed. `build/` and `node_modules/` are gitignored.

No network access other than `npm ci` from the registry, no credentials, no commit, no deployment.

## Orchestrator follow-up

The extra search hit at `src/codeclinic/README.md:66` was a sentence the orchestrator added while fixing review G4 finding F2. The orchestrator reworded it without the project ID. The search now finds only the allowed hits in `.firebaserc` and `apphosting.yaml`.
