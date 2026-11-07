# Independent review: role-aware login T03

- **Scope:** Group 2 T03 only: Express request validation, canonical email mapping, server-side record/hash verification, and failure behavior.
- **Specification:** `workflow/specs/role-aware-login.md` v0.2 (2026-11-05); checklist/handoff v0.2.
- **Implementation evidence:** `workflow/tasks/role-aware-login/implementation-T03.md`, shared `implementation-report.md`, current `src/libconnect-mp4/server/auth/login.js`, `server/index.js`, and `test/login-T03.test.js`.
- **Checklist status:** T03 remains unchecked. This report does not modify the shared checklist or report.

## Review setup and limits

The required `workflow/skills/orchestrator/SKILL.md` path referenced from `workflow/README.md` is absent in this checkout; I read the reviewer profile and repository workflow instructions instead. The implementation is uncommitted, and the relevant server/test files are untracked. A separate worktree or clean checkout was unavailable because the shared tree has uncommitted changes and `.git` is read-only. I inspected the full current source and tests, the full `git status --short` output, and relevant tracked diff checks. Attribution of untracked files therefore relies on the task handoff and current workspace state. No production code or tests were modified, and no review-only test was needed.

The current route includes T04 account-status/type, session, CSRF, and rate-limit integration. T03 is assessed at its request and credential-verification boundary; T04 concurrency findings already recorded in `review-T04.md` are outside this task's verdict and remain relevant to the overall login feature.

## Findings

No T03-specific implementation defect found.

## Acceptance traceability

| T03 criterion | Evidence | Result |
| --- | --- | --- |
| Accept bounded JSON with string email/password and MEMBER/LIBRARIAN type; reject malformed, missing, whitespace-only, unsupported, and over-limit values before authentication with 400 | `login.js:5-7, 31-44, 198-203, 312-316`; T03 tests cover missing/non-string fields, unsupported type, whitespace fields, email/password limits, malformed JSON, and oversized body; invalid-input tests assert no repository lookup | Pass |
| Preserve the exact password and canonicalize the full email by trimming and lowercasing | `login.js:23-29, 35-44, 73-76, 104`; route test supplies surrounding email whitespace/mixed case and a password with surrounding spaces; Argon2 test fixture hashes that exact password | Pass |
| Resolve SHA-256 email-key mapping and require mapping, user ID, original/canonical email, record, and hash consistency | `login.js:46-64, 73-100, 112-122`; tests cover missing/duplicate/malformed mapping, absent user, mismatched original email/canonical key/user ID, malformed hash, and valid mapped record | Pass |
| Verify versioned Argon2id with approved minimum parameters and use dummy verification for unknown/malformed records | `login.js:16-18, 46-53, 85-99, 102-109`; unknown-email test validates the dummy hash using Argon2; valid and incorrect-password tests exercise verification | Pass |
| Firestore access remains server-side; browser cannot read or receive password hashes | `server/index.js` wires `firebase-admin` into the server repository adapter; `rg -n "passwordHash|firestore|firebase" src/libconnect-mp4/src` returned no matches; endpoint test asserts response does not contain the stored hash | Pass by source inspection and synthetic test |
| Data-service errors fail closed without sensitive error disclosure | Route catches lookup/service errors and returns static 503; T03 outage test checks status/body and confirms synthetic error text is absent | Pass |
| Extra client-supplied ID, role, status, manager, or hash claims cannot authorize the request | `validateLoginBody` extracts only `email`, `password`, and `accountType`; credential lookup and account type come from repository records. T04 has direct forged-field endpoint coverage; T03 has source-level evidence | Pass; direct endpoint assertion is covered in T04 suite |

## Verification

Inspected `src/libconnect-mp4/package.json` before running tests. From `src/libconnect-mp4/`:

```text
npm test -- --watchAll=false --runInBand
```

Result: exit 0; 4 suites passed, 48 tests passed, 0 snapshots. Node emitted the dependency-tree `punycode` deprecation warning.

Additional checks:

- `node --check server/auth/login.js` — passed.
- `node --check server/index.js` — passed.
- `rg -n "passwordHash|firestore|firebase" src/libconnect-mp4/src` — no matches.
- `git diff --check` — reported trailing whitespace in the unrelated tracked `src/libconnect-mp4/src/App.tsx` line 119 and line-ending notices in UI files. T03 server/test files are untracked, so `git diff --check` did not validate them. This was not changed because the reported whitespace is outside the assigned review scope.

No Firebase project, emulator, credentials, external service, or destructive action was accessed. The Firestore adapter was reviewed by source; synthetic fixtures do not validate deployed rules, IAM, or Firestore transaction behavior.

## Verdict

**Pass with follow-up.** T03's bounded request validation, canonical lookup, server-side record verification, exact-password Argon2id handling, dummy-hash path, and generic failure behavior satisfy the assigned criteria. Remaining follow-up is integration-level: review and resolve the separately recorded T04 session/CSRF findings before the overall login feature is accepted. Real Firestore IAM/rules and registration/migration compatibility are not verifiable within this T03 task and remain separately gated risks.

