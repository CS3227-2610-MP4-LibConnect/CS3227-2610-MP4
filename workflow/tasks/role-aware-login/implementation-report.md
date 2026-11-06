# Implementation report: role-aware login

## T01 — Accessible role-aware login form

- **Specification:** `workflow/specs/role-aware-login.md`, v0.2 (2026-11-05)
- **Checklist item:** T01, R1
- **Status:** Implemented within the assigned UI scope; awaiting independent review. The shared checklist was not changed.

### Changes

- Replaced the starter screen with a responsive login form containing explicitly labelled email and password inputs, a masked password field, and a submit control.
- Added a labelled native radio group for Member and Librarian with a visible selected state and verified keyboard reachability. The selector is only UI context; this task adds no authorization behavior.
- Added empty field-level and form-level live error regions for T02 to populate.
- Disabled browser-native form validation so T02 can present the specified field-specific accessible messages consistently.
- Added a component test for the labelled controls, radio group accessibility names, selected state, and visible state change.

### Files changed

- `src/libconnect-mp4/src/App.tsx`
- `src/libconnect-mp4/src/App.css`
- `src/libconnect-mp4/src/index.css`
- `src/libconnect-mp4/test/App.test.tsx` (added the T01 selector assertion to the assigned suite)
- `src/libconnect-mp4/src/App.test.tsx` (removed the obsolete CRA starter assertion for the deleted learn-react screen)

### Verification

Commands ran from `src/libconnect-mp4/`:

- `npm test -- --watchAll=false --roots test --testMatch "**/test/**/*.test.tsx" --testNamePattern "shows labelled credentials|accessible radio group"` — passed on final source: 1 suite, 2 T01 tests passed, 8 unrelated T02 tests skipped.
- `npm test -- --watchAll=false --roots test --testMatch "**/test/**/*.test.tsx"` — expected partial failure on final source: 1 suite, 2 tests passed and 8 T02 validation/request/outcome tests failed because T02 behavior is not part of this assignment. No failure was hidden or weakened.
- `npm run build` — passed; optimized production build compiled successfully.

The focused T01 checks cover labels, password masking, both account choices, submit action, accessible radio names, checked state, and visible selected state. The selector is implemented using native radio inputs within a fieldset and legend for standard keyboard and assistive-technology behavior.

### Default runner follow-up

The orchestrator's default CI command initially failed because the obsolete starter test under `src/` still asserted the removed learn-react link. That starter test was removed; the login tests remain under `test/`.

- `CI=true npm test -- --watch=false --runInBand --silent` — exits 1 with `No tests found`; CRA's default `src/` test patterns do not discover the login suite under `test/`. This command does not verify login behavior.
- `npm test -- --watchAll=false --roots test --testMatch "**/test/**/*.test.tsx" --testNamePattern "shows labelled credentials|accessible radio group"` — passed after cleanup: 1 suite, 2 T01 tests passed, 8 T02 tests skipped.

### Deviations and remaining work

- None within T01. T02 remains responsible for validation, request handling, and populated error messages. T03–T05 remain outstanding in their approved groups.
- No backend, authentication, validation, dependency, configuration, or external service changes were made.
- No credentials, hashes, or session data were used or recorded.

## Group 2 — T02 client handling and T03 credential lookup

- **Specification:** `workflow/specs/role-aware-login.md` v0.2; checklist v0.2.
- **Authorization:** The human replied "implement" to the explicit Group 2, four-package, and test-discovery request. This does not authorize Group 3, live Firebase access, rules, or deployment.
- **Status:** Both scoped implementations are handed back for orchestration. T02 and T03 remain unchecked pending independent review; Group 3 has not started.

### Changes

- `src/libconnect-mp4/package.json` and `package-lock.json`: added approved `express`, `firebase-admin`, `argon2`, and development `supertest`; updated the test script to discover `test/**/*.test.*`.
- `src/libconnect-mp4/src/App.tsx`: field-specific blank validation, request submission, denial/retry handling, and confirmation based on server-returned account type.
- `src/libconnect-mp4/server/auth/login.js`: bounded Express route, canonical email key lookup through an injected Firestore adapter, account-record consistency checks, Argon2id password verification, and a dummy verification path for unknown records. Even after a password match, the interim route returns `503` with no session while T04 authorization and session controls are absent.
- `src/libconnect-mp4/test/login-T03.test.js`: synthetic endpoint and credential-verification tests, including a valid dummy hash check. Existing `test/App.test.tsx` covers T02.
- Scoped implementation handoffs: `implementation-T02.md` and `implementation-T03.md`; factual logs in `logs/tasks/role-aware-login/`.

### Verification

From `src/libconnect-mp4/`, the orchestrator ran `npm test -- --watchAll=false --runInBand` after the final dummy-hash correction: **2 suites, 35 tests passed**. `npm test -- --watchAll=false --runInBand --listTests` found the login suite after the script update. The orchestrator also ran `npm run build`: compiled successfully, with a Node `fs.F_OK` deprecation warning. The T03 implementer ran `node --check server/auth/login.js`: passed. `git diff --check` passed at reconciliation. An unverified dummy-hash path was tightened and covered by a new test; the initial T03 Jest TextEncoder failure and its test-local correction remain in the T03 log.

### Remaining scope and risks

- Password matching alone is not an authenticated login. T04 must add server-stored status/type checks, uniform denial, a protected durable session, and abuse controls before any `200` response can be enabled. T05 must verify end-to-end behavior.
- The backend uses an injected repository and synthetic data; no live Firebase project or Firestore edition was inspected. Account registration/migration, browser rules, durable session store, deployment routing, and trusted proxy settings remain separately gated.
- The numerical input limits (8 KiB JSON, 254-byte email, 1,024-byte password) are an implementation choice for review against the approved bounded-input contract.

## Login page blue palette — 2026-11-06

The human requested a blue color scheme. Updated only `src/libconnect-mp4/src/App.css` and `src/libconnect-mp4/src/index.css`: page gradients/background, card border and shadow, brand, typography, input and selector states, focus rings, button, and footer now use blue tones. Error text remains red to distinguish errors. No login behavior or authorization logic changed.

Verification from `src/libconnect-mp4/`: `npm test -- --watchAll=false --runInBand` passed (2 suites, 35 tests); `npm run build` compiled successfully. `git diff --check -- src/libconnect-mp4/src/App.css src/libconnect-mp4/src/index.css` reported no whitespace errors; Git printed a line-ending notice for `App.css`. No external service or credential was used. The palette change awaits the normal independent review and merge decision with the rest of the login feature.

## Runnable Express server — 2026-11-06

The human asked for the backend server that carries login requests between the frontend and Firestore. Specification v0.2 already requires this server, so the change completes T03 wiring without changing the approved authentication contract.

- Added `src/libconnect-mp4/server/index.js`: initializes Firebase Admin with application default credentials at startup, injects its Firestore instance into the existing login repository and Express route, and serves the built React page from the same origin. Startup requires a built `index.html` and a valid `PORT` (default 3000). It does not contact Firestore on import.
- Added `src/libconnect-mp4/test/server.test.js`: uses a synthetic Firestore adapter to verify the page and API share an origin and an unknown account is denied without a cookie.
- Documented local startup in `src/libconnect-mp4/README.md`.

Verification from `src/libconnect-mp4/`: `npm test -- --watchAll=false --runInBand` passed (3 suites, 36 tests), `npm run build` compiled successfully, `node --check server/index.js` passed, the Firebase Admin and server module import check passed, and `git diff --check -- server/index.js test/server.test.js README.md` found no whitespace errors. The first test run failed because CRA's Jest environment lacked `TextEncoder`; the new test uses the same test-local polyfill as `login-T03.test.js`, and the final run passed. No live Firebase project or credential was accessed.

T03 remains unchecked pending independent review. The route still returns `503` after a password match because T04's status/type checks, durable sessions, and abuse controls are pending approval and implementation. The server has not been deployed, and production Firebase IAM, browser rules, and routing remain unresolved.

## Group 3 — T04 reconciliation (2026-11-06)

The human approved Group 3 and the `group3-storage-proposal.md` session/counter collections. The T04 implementer added server-side account type/status checks, Firestore-backed sessions and shared failure counters, protected session and CSRF endpoints, and synthetic tests. See `implementation-T04.md` and its factual log for exact files and commands. The orchestrator independently ran `npm test -- --watchAll=false --runInBand` from `src/libconnect-mp4/`: 4 suites and 48 tests passed. `npm run build` compiled successfully. No live Firebase project was accessed.

Independent review in `review-T04.md` returned **changes required**. A delayed protected request can use a stale timestamp to refresh a session after its idle expiry; logout can compare a CSRF token against a session snapshot that predates token rotation. Both need transaction-level checks and focused concurrency tests. T04 remains unchecked, and Group 4 has not started. The reviewer also recorded that Firestore persistence and transaction behavior were not exercised against an emulator or live project under the current no-external-access boundary.

## Group 2 — independent review reconciliation (2026-11-06)

The human requested review of T02 and T03 while T04 findings remain open. Separate reviewers inspected each task against approved specification/checklist v0.2 and ran the configured test suite; each reported 4 suites and 48 tests passing. The T02 reviewer also ran `npm run build` successfully. Shared uncommitted files and read-only `.git` prevented separate worktrees; both reports record compensating direct source/test/diff inspection.

- T03: `review-T03.md` found no T03-specific implementation defect and traced every assigned acceptance criterion. The orchestrator marked T03 `[x]`. T04's security findings remain separate and open.
- T02: `review-T02.md` found no client behavior defect but recorded F1, a low-severity test coverage finding for malformed HTTP 200 responses and alert-role assertions. Under the repository rule to leave a task with a finding unchecked, T02 remains `[ ]` until that finding is addressed and re-reviewed. The reviewer also noted trailing whitespace in `App.tsx:119`; no source was changed during review.

No review result is a human merge approval. Group 4 remains unstarted.

## T02 review finding F1 closure (2026-11-06)

The human approved the recommended T02 test fix. The implementer added malformed HTTP 200 response cases (invalid JSON, missing and unsupported account type) and alert-region assertions for HTTP 401 and 503 to `src/libconnect-mp4/test/App.test.tsx`; no production source changed. The focused component suite passed (13 tests) and the full configured suite passed (4 suites, 51 tests). `implementation-T02-review-fix.md` and its factual log record the exact change and commands.

The independent reviewer appended a re-review addendum to `review-T02.md`, verified the focused suite (13 tests), closed F1, and changed the final T02 verdict to **pass**. The orchestrator therefore marked T02 `[x]`. T03 remains `[x]`; T04 remains `[ ]` with the separately documented session expiry and CSRF race findings. Group 4 has not started. This is not human merge approval.

## T04 review findings closure (2026-11-06)

The human requested the two T04 corrections under approved specification v0.2. The scoped implementer changed `src/libconnect-mp4/server/auth/login.js` and `server/auth/firestore-store.js`, updated the T03/T04/server synthetic store doubles, and added `test/firestore-store-T04.test.js`. Protected requests now check a fresh operation time against the current session document on each transaction attempt, including retries; logout compares the submitted CSRF hash with the current stored hash and deletes the session in the same transaction. Exact changed files, commands, and intermediate test corrections are recorded in `implementation-T04-review-fix.md` and its factual log.

The implementer ran the focused T04 suites (2 suites, 15 tests), full suite (5 suites, 54 tests), and production build; all passed. An independent reviewer repeated the focused and full tests, inspected the transaction code and coverage, and appended a **pass with follow-up** re-review to `review-T04.md`. Both original findings are closed. The orchestrator therefore marked T04 `[x]`. No live Firebase or emulator was accessed, so actual Firestore persistence and contention/retry behavior remain unverified and require separately authorized validation. Group 4 T05 remains `[ ]`; no merge approval has been inferred.

## Group 4 — T05 reconciliation (2026-11-06)

The human directed completion of T05 under approved specification v0.2 and checklist v0.2. The scoped implementer added `src/libconnect-mp4/test/LoginPage.integration.test.tsx` and task-specific handoff/log evidence. The test connects the rendered React login page to the actual Express app with synthetic accounts and an isolated store. It covers server-returned success, protected session and CSRF/logout lifecycle, generic denials, both rate thresholds, and service failure. No production code, package, configuration, or external service was changed or accessed.

The implementer ran the focused test (1 suite, 7 tests), the full suite (6 suites, 61 tests), and `npm run build`; all passed. The independent reviewer repeated these checks, traced all 15 specification scenarios across the new and existing component/endpoint/adapter suites, and recorded **pass with follow-up** in `review-T05.md` plus `security-review.md`. No T05-specific correction was requested. The orchestrator marked T05 `[x]` after this review; T01–T05 are now checked. `implementation-T05.md`, `review-T05.md`, and their factual logs contain exact commands, file attribution, and evidence levels.

Unresolved, separately gated work remains: actual Firestore persistence and SDK transaction contention/retry, browser Firestore rules and deployed IAM, HTTPS/proxy/routing deployment behavior, registration/email-change canonical collision enforcement and migration, and reconciliation of broad shared-worktree ownership. These limits are not established by the synthetic tests. No merge, deployment, or external Firebase access was performed or approved by the agent.
