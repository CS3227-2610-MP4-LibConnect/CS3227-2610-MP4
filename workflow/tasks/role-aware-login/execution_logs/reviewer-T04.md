# T04 independent review execution log

Date: 2026-11-06 (Asia/Singapore)

- Read `AGENTS.md`, `Overview.md`, `workflow/README.md`, `workflow/agents/reviewer.toml`, canonical role-aware-login spec v0.2, task-local spec, checklist, handoff, technical design proposal, Group 3 storage proposal, implementation-T04 report, and implementation log.
- Inspected current `src/libconnect-mp4/server/auth/login.js`, `server/auth/firestore-store.js`, `server/index.js`, and tests `login-T03.test.js`, `login-T04.test.js`, and `server.test.js`.
- Inspected `git status --short`, tracked `git diff`/stat, and package scripts/dependencies. Server and test paths under review are untracked, so no baseline diff was available.
- Separate checkout/worktree was unavailable because implementation artifacts are uncommitted/untracked and `.git` is read-only. Compensating controls are recorded in `workflow/tasks/role-aware-login/review-T04.md`.
- Ran from `src/libconnect-mp4/`: `npm test -- --watchAll=false --runInBand` — exit 0; 4 suites and 48 tests passed, 0 snapshots. The Node `punycode` deprecation warning appeared.
- Review findings: (1) High: stale request timestamp plus non-atomic idle/absolute expiry invariant allows an in-flight protected request to refresh an expired session; (2) Medium: logout compares a CSRF hash from a stale session read, allowing a rotation/logout race. Full evidence and recommended corrections are in `review-T04.md`.
- No review-only tests added; no production files, checklist, or prior T01 review report modified. No live Firebase/project, secrets, external service, or destructive operation used.
- Verdict: changes required. T04 remains unchecked pending implementer fixes and orchestrator reconciliation.
