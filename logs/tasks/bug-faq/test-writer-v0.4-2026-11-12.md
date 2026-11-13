# Bug FAQ v0.4 test writer log

Date: 2026-11-12
Role: test writer
Approved artifacts read: `workflow/specs/bug-faq.md` v0.4; `workflow/tasks/bug-faq/tasks.md` v0.4; `workflow/tasks/bug-faq/handoff.md` v0.4. All three record human approval on 2026-11-12. The v0.3 batch plan and dispatch are obsolete; no v0.4 implementation dispatch is approved.

## Reconciliation

- Read the v0.4 current-state index, approved artifacts, and `workflow/agents/test_writer.toml`; verified the versions and approval state against primary artifacts.
- Added `src/codeclinic/test/bug-faq.tokens.contract.test.js` for HKDF-SHA-256 key derivation from trusted `idHash`, AES-256-GCM use, fresh nonce evidence, ciphertext opacity, independent module-instance decode, session/Student/purpose/query/field/reference binding, and tamper rejection.
- Updated the API/store contract tests to pass and assert the trusted session `idHash`; added same-session cross-router use, same-Student cross-session denial, session deletion/logout denial, and forged-header resistance. Existing RESOLVED-only, detail projection, reply pagination/membership, authorization, and UI tests remain in place.
- Updated `workflow/tasks/bug-faq/test-coverage.md` to v0.4 and recorded the internal token helper assumptions and remaining integration gaps.
- Changed only tests under `src/codeclinic/test/`, the task-local coverage report, and this log/full test output. No production, configuration, planning, spec, checklist, or handoff files changed. The pre-existing human edit in `src/codeclinic/src/StudentDashboard.tsx` remains untouched.

## Focused command and result

Command:

```text
npm test -- --runInBand --watchAll=false --runTestsByPath test/bug-faq.tokens.contract.test.js test/bug-faq.store.contract.test.js test/bug-faq.api.contract.test.js test/StudentBugFaq.test.tsx
```

Jest exited with code **1**: **4 suites failed; 37 tests failed and 3 passed (40 total); no snapshots.** The existing Node `punycode` deprecation warning appeared. Full output and the exit code are in `logs/tasks/bug-faq/test-writer-v0.4-run.txt`.

- Token suite: five tests fail to load the assumed `server/tickets/faq-token` module, which does not exist before implementation.
- Store suite: three tests fail because `createFirestoreTicketStore(...).searchFaq` is not implemented.
- API suite: search requests hit the missing FAQ route (503); detail requests hit the missing FAQ detail route (404 or no no-store header). Exact cases are listed in the full output.
- UI suite: all five tests fail because the dashboard does not yet include the FAQ search/detail UI.

These are preimplementation failures. No implementation was dispatched or performed.

## Assumptions and remaining risks

- Token helper seam: `server/tickets/faq-token.js` exports `deriveFaqTokenKey(idHash)`, `sealFaqToken(payload, context)`, and `openFaqToken(token, context)`; token context is `{ idHash, studentId, purpose, binding }`; authentication failures return `null`. This is an internal test seam, not an added product requirement.
- API/store interface assumptions are listed in the coverage report, including trusted `idHash` passage.
- Separate OS-process/emulator verification, real Firestore reply query shape and membership enforcement, integration across >100 tickets, index JSON assertion, real logout/rotation integration, and browser/accessibility evidence remain open as described in the coverage report.
