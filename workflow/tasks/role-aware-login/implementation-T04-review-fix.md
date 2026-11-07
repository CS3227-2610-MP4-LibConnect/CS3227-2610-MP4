# T04 review corrections implementation note

Status: complete; ready for orchestrator reconciliation and independent review.  
Task: `role-aware-login`, Group 3 T04 review corrections.  
Specification: `workflow/specs/role-aware-login.md` v0.2 (2026-11-05).

## Preflight and scope

Read the repository instructions, overview, workflow and implementer profile, approved specification and task artifacts, Group 3 storage proposal, T04 review and implementation evidence, and current auth code and tests. Applied the selected `openspec-apply-change` preflight using the recorded prior result: the repository has an OpenSpec root, but `role-aware-login` has no active CLI change and the workflow's path-adapter section is blank. Per the task assignment, proceeded from the approved canonical artifacts without creating an OpenSpec tree. The Firebase Firestore skill was relevant to the adapter, but no live project was accessed.

The implementation changes only the assigned auth source, relevant test files, this note, and the task log. No spec, checklist, shared implementation report, handoff, existing review, or approval state was edited.

## Corrections

- `login.js` delegates session freshness to the store transaction, passing a clock function instead of a timestamp captured before the account read. Expiry and session touch are therefore decided against the transaction's current record and operation time.
- `firestore-store.js` evaluates the clock inside the transaction callback, including on retries. It rejects invalid time values and clock rollback without moving `lastSeenAt` backward. It transactionally deletes a session that has reached its idle, absolute, or stored expiry boundary; otherwise it advances `lastSeenAt` and the bounded expiry.
- Logout now uses `deleteSessionIfCsrfMatches`, which reads the current hash and deletes the session in one transaction. A missing, malformed, or stale token cannot delete a session after CSRF rotation.
- Synthetic auth-store doubles were updated for the new store contract. New adapter tests cover a retried expiry check with a fresh operation time, clock rollback, and concurrent CSRF rotation/logout linearization.

## Verification

Commands run from `src/libconnect-mp4/`:

| Command | Result |
| --- | --- |
| `npm test -- --watchAll=false --runInBand test/login-T04.test.js test/firestore-store-T04.test.js` | Pass: 2 suites, 15 tests |
| `npm test -- --watchAll=false --runInBand` | Pass: 5 suites, 54 tests |
| `npm run build` | Pass: optimized production build compiled |

The test runner printed the existing Node `punycode` deprecation warning; the build printed a Node `fs.F_OK` deprecation warning. Neither affected results. `git diff --check` returned a trailing-whitespace warning at `src/libconnect-mp4/src/App.tsx:119`, which is outside this task and was left unchanged.

The first focused run exposed the old synthetic expiry mock's expected cleanup behavior and an unsupported `structuredClone` in the new test runtime; both test issues were corrected. The first full-suite run also found that existing T03/server test doubles lacked the new compare-and-delete method; those doubles were updated, and the final complete suite passed.

## Remaining limits and handoff

The synthetic Firestore-compatible harness exercises transaction callback retry and serializes concurrent transactions, but no Firestore emulator or live database was used. Persistence behavior under a real Firestore transaction runner remains unverified. No external service, credentials, or secrets were accessed.

Changed files:

- `src/libconnect-mp4/server/auth/login.js`
- `src/libconnect-mp4/server/auth/firestore-store.js`
- `src/libconnect-mp4/test/login-T04.test.js`
- `src/libconnect-mp4/test/firestore-store-T04.test.js`
- `src/libconnect-mp4/test/login-T03.test.js`
- `src/libconnect-mp4/test/server.test.js`
- `workflow/tasks/role-aware-login/implementation-T04-review-fix.md`
- `logs/tasks/role-aware-login/implementation-T04-review-fix.md`

The two T04 review findings are addressed in source and covered synthetically. Independent review and orchestrator reconciliation remain required; the human merge decision is still outstanding.
