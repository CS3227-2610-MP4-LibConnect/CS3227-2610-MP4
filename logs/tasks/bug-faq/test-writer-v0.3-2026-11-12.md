# Bug FAQ v0.3 test writer log

Date: 2026-11-12
Role: test writer
Approved artifacts read: `workflow/specs/bug-faq.md` v0.3; `workflow/tasks/bug-faq/tasks.md` v0.3; `workflow/tasks/bug-faq/handoff.md` v0.3. Each records human approval on 2026-11-12. Batch plan and implementation dispatch are not approved by those artifact approvals.

## Reconciliation

- Re-read `workflow/agents/test_writer.toml` and `workflow/tasks/bug-faq/current-state.md`; verified current approval/version claims against the v0.3 specification, checklist, and handoff.
- Updated the previous search tests from `CLOSED` to exact stored `RESOLVED` eligibility and added an opaque `faqRef` to search projections.
- Extended API and dashboard tests for the dedicated read-only detail view, protected opaque references, safe projection of title/tags/fix note/replies, server-derived Student/TA labels, literal message content, reply pagination, cursor/reference binding, and stored status checks.
- Updated `workflow/tasks/bug-faq/test-coverage.md` to v0.3 and documented internal interface assumptions and remaining integration/accessibility gaps.
- Changed only tests under `src/codeclinic/test/`, the task-local coverage report, and this log. No production file, planning artifact, dependency, or test configuration changed. The pre-existing human edit in `src/codeclinic/src/StudentDashboard.tsx` remains untouched.

## Focused command and result

Command:

```text
npm test -- --runInBand --watchAll=false --runTestsByPath test/bug-faq.store.contract.test.js test/bug-faq.api.contract.test.js test/StudentBugFaq.test.tsx
```

Result: Jest exited with code **1**. **3 test suites failed; 31 tests failed and 3 passed (34 total); no snapshots.** The existing Node `punycode` deprecation warning appeared. Full output and `npm_exit_code=1` are retained at `logs/tasks/bug-faq/test-writer-v0.3-run.txt`.

- `bug-faq.store.contract.test.js`: all three tests fail because the current store does not implement `searchFaq`.
- `bug-faq.api.contract.test.js`: search requests currently reach the unimplemented FAQ route/store (503); detail requests currently have no FAQ detail route (404 or missing no-store header). Exact individual failures are in the full output.
- `StudentBugFaq.test.tsx`: all five UI tests fail because the current dashboard has no Bug FAQ section/detail view.

The failures are expected at the preimplementation stage. No production implementation was dispatched or performed.

## Assumptions and remaining risks

- Internal store contract assumptions are recorded in `workflow/tasks/bug-faq/test-coverage.md`. Public endpoint paths, exact response projections, eligibility, speaker labels, cursor constraints, and read-only behavior follow approved v0.3.
- Direct Firestore detail query-order/limit/membership evidence, multi-owner multi-batch integration, index JSON assertions, keyboard-only/focus behavior, TA dashboard absence, retry interaction, and the human browser check remain open as listed in the coverage report.
