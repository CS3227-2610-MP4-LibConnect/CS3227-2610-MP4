# Account registration pre-implementation test coverage

Task: `account-registration`  
Source of truth: approved `workflow/specs/account-registration.md` v0.2; approved `tasks.md` and `handoff.md` v0.1  
Role: test writer; 2026-11-06

## Changed files

- `src/libconnect-mp4/test/RegistrationPage.test.tsx`
- `src/libconnect-mp4/test/registration.api.test.js`
- This report

No production source, dependency, CI, deployment, or checklist file was changed. Tests use synthetic data and a local Firestore-compatible fake; they do not contact Firebase.

## Coverage

| Requirement | Test evidence |
| --- | --- |
| R1 | Login Register link; direct `/register` server navigation and refresh; registration return-to-login link. |
| R2 | Explicit Member/Librarian selection, common labels, librarian employee ID and activation notice, no manager option, stale employee ID omission. |
| R3 | Blank and mismatched confirmation errors without request, one pending submission, values retained after recoverable failure, exact payload without confirmation. |
| R4 | Malformed and over-8 KiB JSON, missing/wrong/blank/over-limit fields, unsupported/type-inapplicable fields, forged and unexpected fields, five attempts per direct source in fifteen minutes. |
| R5 | User and email-key records, canonical key, original-case display email, Argon2id parameters and exact password verification, member ID, cross-type collision, concurrent collision, no orphan on failed commit. |
| R6 | Member ACTIVE, Librarian INACTIVE and non-manager, server-issued IDs, forged field rejection, no registration session cookie. |
| R7 | Minimal 201 response, generic 409/429/503, no redirect on malformed 201 or network failure, preserved values after 503. |

## Assumptions and gaps

- UI tests assume a default-exported `src/RegistrationPage.tsx`; this is an interface convention for a new component, not a product requirement. The server tests use the existing `createServerApp(db, buildDirectory, authStore)` seam.
- The fake serializes Firestore transactions and models commit failure. It does not prove real Firestore contention, IAM, security rules, or deployment routing.
- Success announcement, five-second automatic redirect, retained login notice, register-then-login acceptance/denial, fresh Argon2id salt, and no sensitive logs need additional integration verification during implementation and independent review. These are required by the approved specification; absence of pre-implementation coverage does not relax them.
- Tests assume the handoff's approved `memberId = userId`, body and field byte limits, and five-attempt limit. Employee IDs are self-entered without a uniqueness/roster check, as approved in the handoff.

## Verification attempted

- `node --check src/libconnect-mp4/test/registration.api.test.js`: passed.
- `git diff --check -- src/libconnect-mp4/test/registration.api.test.js src/libconnect-mp4/test/RegistrationPage.test.tsx`: no whitespace errors reported. These files are untracked, so this check does not validate their contents.
- `CI=true npm test -- --watch=false --runInBand test/registration.api.test.js test/RegistrationPage.test.tsx`: produced the react-scripts banner and a Node `punycode` deprecation warning, then no test result after about 90 seconds; stopped with Ctrl+C (exit 1).
- `CI=true npx react-scripts test --roots test --testMatch '**/test/**/*.test.*' --watchAll=false --runInBand --runTestsByPath test/registration.api.test.js`: produced the same deprecation warning, then no result after 30 seconds; stopped with Ctrl+C (exit 1).

The test suite cannot be reported as passing. The missing registration component and endpoint are expected before implementation, but the Jest harness did not reach a reported failure in these attempts. The implementer should resolve or isolate that harness issue before using test outcomes as acceptance evidence.
