# T05 factual execution log

Task: `role-aware-login`, T05. Specification version: `workflow/specs/role-aware-login.md` v0.2. Date: 2026-11-06 (Asia/Singapore).

All commands ran from `src/libconnect-mp4/`.

1. `npm test -- --watchAll=false --runInBand test/LoginPage.integration.test.tsx`
   - First run: failed before tests because Jest's jsdom environment lacked `TextEncoder` required while importing Supertest. Updated only the new test to install Node's `TextEncoder`/`TextDecoder` before requiring Supertest.
   - Next run: 5 passed, 2 failed because this installed `user-event` version does not expose `.click` on the CommonJS module. Replaced those calls with Testing Library `fireEvent.click`.
   - Next run: 6 passed, 1 failed because browser `type=email` sanitizes surrounding whitespace. Adjusted the integration expectation to the browser-submitted value; canonicalization whitespace remains covered by direct endpoint tests.
   - Next run: 6 passed, 1 failed because the Supertest agent will not automatically resend a `Secure` cookie on its local non-TLS request. Updated the test to replay the server-issued cookie explicitly while continuing to assert all cookie attributes.
   - Final run: passed, 1 suite and 7 tests.
2. `npm test -- --watchAll=false --runInBand`
   - Passed, 6 suites and 61 tests.
3. `npm run build`
   - Passed, optimized production build compiled successfully.

Observed warnings: Node `punycode` deprecation during Jest; Node `fs.F_OK` deprecation during build. No credentials, live account data, Firebase project, emulator, or external service was used. Test fixtures contain synthetic account values and Argon2id hashes created in process; raw hash values were not printed or written to this log.
