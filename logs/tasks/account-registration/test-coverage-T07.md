# T07 test coverage and baseline

Task: `account-registration` Group 6, T07. Canonical specification: `workflow/specs/account-registration.md` v0.5, R9 and scenario 18. Human approved the specification, checklist/handoff v0.4, and T07 grouping; the orchestrator assigned test writing. This log records tests and results, not implementation or approval.

## Files changed

- `src/libconnect-mp4/test/RegistrationPage.test.tsx`
- `src/libconnect-mp4/test/registration.endpoint.test.js`
- `src/libconnect-mp4/test/registration.api.test.js`

## Coverage

- Both Member and Librarian forms accept minimal `a@b.c`, dotted local part with subdomains, and an address with surrounding whitespace; the submitted address is trimmed and retains its original case.
- Both forms reject missing or extra `@`, empty local/domain parts, a domain without a dot, leading/trailing/adjacent dots in either part, and internal whitespace. Rejection must mark the email field invalid, link it to an email-specific `role="alert"` message, and make zero fetch calls.
- Direct endpoint calls with the same invalid addresses for both account types must return `400` before persistence or rate reservation. The fake Firestore integration also checks zero user and email-key writes.
- Valid mixed-case, surrounding-whitespace input must persist its trimmed original case and lowercase canonical key, including the expected SHA-256 email-key document path.

## Baseline verification before production edits

Command from `src/libconnect-mp4`: `$env:CI='true'; npm test -- --watch=false --runInBand RegistrationPage.test.tsx registration.endpoint.test.js registration.api.test.js`

Result: expected red baseline, exit 1; 3 suites failed, 62 tests failed, 82 passed, 144 total. Existing registration code accepts the invalid addresses. A focused UI rerun (`$env:CI='true'; npm test -- --watch=false --runInBand RegistrationPage.test.tsx --silent`) gave 2 failed and 19 passed, with only the two new invalid-format tests failing. `git diff --check` on the three test files passed.

No production source, configuration, dependency, emulator, or cloud service was changed or accessed. Remaining work: implement the R9 client/server validation, then rerun these targeted suites and the project verification. No syntax ambiguity remains beyond the approved v0.5 interpretation.
