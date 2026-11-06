# T04 correction re-review execution log

Date: 2026-11-06 (Asia/Singapore)

## Scope and controls

- Reviewed role-aware-login specification v0.2, T04 task/checklist and handoff, Group 3 storage proposal, original T04 review, T04 implementation report, and T04 review-fix implementation note.
- Read `AGENTS.md`, `Overview.md`, `workflow/README.md`, `workflow/agents/reviewer.toml`, current auth source, and relevant T03/T04/server tests.
- `src/libconnect-mp4/package.json` was inspected before running tests. No test command contacted Firebase or an emulator; the inspected tests use injected synthetic repositories/stores and temporary local fixtures.
- The shared worktree is dirty; `.git` is read-only, so I could not create a separate worktree or obtain a reliable tracked diff for the untracked T04 source and test files. Compensating controls: inspected current files directly, checked `git status --short`, and reviewed exact transaction code and tests. The existing unrelated worktree changes were not modified.
- Did not read Firebase/Firestore debug log contents, access credentials or secrets, use an external service, edit production code/tests/checklist, or set an approval state.

## Review observations

- `touchSession` now reads session state and evaluates the supplied clock in the Firestore transaction callback, including retries; it checks idle, absolute, and stored expiry boundaries and rejects clock rollback without writing. `authenticateRequest` delegates expiry to that operation rather than relying on a pre-lookup timestamp.
- The synthetic expiry retry test mutates stored state between transaction callback attempts and checks fresh-time expiry and deletion. A separate test verifies backward clock time does not move `lastSeenAt` backward.
- Logout hashes the presented CSRF value and calls the adapter's transactional compare-and-delete. The transaction reads the current document, validates both hash formats, compares in constant time, and deletes only on a match. Rotation also reads and updates the same document transactionally.
- The CSRF test's fake database globally serializes transaction invocations; the test starts rotation first, then logout with the old token. It proves the stale token is rejected in that order but does not simulate Firestore SDK conflict retries or exercise logout-first ordering. No correctness defect was found in the transactional source.
- Reviewed T04 acceptance evidence for server-authoritative account type/status, uniform denial, forged fields, durable session shape and cookie attributes, expiry, logout/CSRF, protected status/role checks, both sequential rate limits, generic persistence failure, and response minimization. No regression was found.

## Commands and results

Working directory: `src/libconnect-mp4/`.

1. `npm test -- --watchAll=false --runInBand test/login-T04.test.js test/firestore-store-T04.test.js` — exit 0; 2 suites and 15 tests passed.
2. `npm test -- --watchAll=false --runInBand` — exit 0; 5 suites and 54 tests passed.

Both test runs printed Node's dependency-tree `punycode` deprecation warning. No test failures occurred.

## Outcome and limits

Current verdict: **pass with follow-up**. Both prior review findings are corrected in source and covered by synthetic tests. Actual Firestore persistence, SDK transaction retries under contention, cross-instance behavior, and durable shared-store behavior remain unverified because no emulator or live project was used. Re-review addendum is appended to `workflow/tasks/role-aware-login/review-T04.md`. This is not human merge approval.
