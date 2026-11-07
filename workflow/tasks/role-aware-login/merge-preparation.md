# Scoped merge review preparation

Date: 2026-11-06  
Task: `role-aware-login`  
Approved specification/checklist: version 0.2; T01–T05 checked after independent review.  
Current branch: `login-and-registration`.  
Status: review scope prepared; nothing staged, committed, merged, pushed, or deployed.

## Proposed scope

Prepare a source commit from these exact application paths under `src/libconnect-mp4/`:

- `README.md`, `package.json`, `package-lock.json`, `tsconfig.json`
- `public/index.html` and deletion of `public/favicon.ico`, `logo192.png`, `logo512.png`, `manifest.json`, and `robots.txt`
- `src/index.tsx`, `src/index.css`, `src/LoginPage.tsx`, `src/LoginPage.css`, and deletion of `src/App.tsx`, `src/App.css`, `src/App.test.tsx`, `src/logo.svg`, and `src/reportWebVitals.ts`
- `server/index.js`, `server/auth/login.js`, `server/auth/firestore-store.js`
- `test/LoginPage.test.tsx`, `test/LoginPage.integration.test.tsx`, `test/login.credentials.test.js`, `test/login.session.test.js`, `test/firestore-store.test.js`, `test/server.test.js`

Prepare a separate task-evidence commit from:

- `workflow/specs/role-aware-login.md`
- all files currently under `workflow/tasks/role-aware-login/`, including this review preparation
- all files currently under `logs/tasks/role-aware-login/`

The evidence commit is separate from production/test changes so reviewers can inspect the executable diff independently. The review-only security and review reports stay clearly identified in the evidence commit, not silently folded into source changes.

## Excluded worktree paths

- `workflow/agents/analyst.toml`, `implementer.toml`, `orchestrator.toml`, `reviewer.toml`, `task_grouper.toml`, and `test_writer.toml`: shared agent-profile edits are outside the login implementation. `test_writer.toml` includes a user-requested test-directory edit mixed with a model-setting edit; handle it in a separate scoped change.
- `src/libconnect-mp4/firebase-debug.log` and `firestore-debug.log`: untracked debug output; do not stage or inspect contents.
- Any ignored build output or local environment files, including `node_modules/` and credentials.

No wildcard staging command should be used from the repository root. Check the staged name/status list and staged diff before committing, with explicit verification that excluded paths and debug logs are absent.

## Proposed commit messages

```text
Login: Add role-aware sign-in and server sessions

Add the member and librarian login page, server-side credential checks,
protected sessions, and synthetic integration tests. Replace unused
starter assets and verify the approved login outcomes.
```

```text
Login: Record specification and review evidence

Retain the approved specification, task handoffs, test results, and
independent security review for the role-aware login implementation.
```

These messages follow the repository SE-EDU Git skill. Neither message nor this preparation grants commit or merge approval.

## Verification and review limits

- The T05 implementer and independent reviewer each ran the focused integration suite (1 suite, 7 tests), full configured suite (6 suites, 61 tests), and production build successfully. See `implementation-T05.md` and `review-T05.md` for exact commands and acceptance traceability.
- `git diff --check` passed during merge preparation, with only line-ending notices for `README.md` and `public/index.html`.
- `npm ls --depth=0 --json` resolved all installed direct packages locally. The lockfile root declares the approved `argon2`, `express`, `firebase-admin`, `supertest`, and `@types/jest` versions consistently with `package.json`. The lockfile has a large generated dependency diff and needs staged-diff inspection before a commit.
- The shared dirty worktree and read-only `.git` prevented separate worktrees and an isolated implementation commit for prior reviews. A scoped staged diff and human merge decision are still required.
- Actual Firestore durability/SDK transaction contention, browser rules and deployed IAM, HTTPS/proxy/API routing, and registration/email-change canonical collision handling remain separately gated. The unused `web-vitals` package remains a low-severity cleanup follow-up because removal changes dependencies.

## Next approval gate

Human review of this exact scope and proposed commit messages is required before staging/committing. After scoped commits exist, present the actual commit diff and residual risks for a separate human merge decision. Do not treat approval of preparation as approval to commit, push, deploy, or merge.

## Approved commit execution (2026-11-06)

The human explicitly approved staging and creating the two proposed scoped commits. The source paths above were staged and inspected; `git diff --cached --check` exposed one blank line at the end of `test/LoginPage.test.tsx`, which was removed without changing behavior. The verified source commit is `f306ac6` (`Login: Add role-aware sign-in and server sessions`), containing 28 application paths. The evidence commit remains to be staged and created. Shared agent-profile edits and Firebase debug logs remain unstaged.

The evidence staging set contains 41 files, all under the approved specification, task, and factual-log paths. The default staged whitespace check reports Markdown hard line breaks (two spaces at line ends) and three blank end lines in historical reports. Those lines were retained as existing evidence. With Git's `blank-at-eol` and `blank-at-eof` checks disabled for this check only, the staged diff check passes. No repository whitespace configuration was changed.
