# Bug FAQ status amendment proposal

Proposed: 2026-11-12, after the human corrected the search eligibility rule.
State: the human replied "approved" to this proposal on 2026-11-12. Revised specification v0.2, checklist v0.2, handoff v0.2, and batch plan v0.2 remain separate approval gates.

## Requested correction

Only tickets whose stored status is exactly `RESOLVED` may appear in Bug FAQ search. Student-closed `CLOSED` tickets must never appear. `OPEN` and `CLAIMED` tickets remain excluded. The existing dashboard order, Title/Tags selector, and title/tag-only result projection stay as previously chosen; the FAQ will not expose the TA fix note or full ticket detail. The existing ticket state machine remains unchanged.

## Exact edits after approval

1. Bump `workflow/specs/bug-faq.md` to v0.2 with a dated amendment. Replace every `CLOSED` eligibility, query, continuation, and acceptance case with exact `RESOLVED` eligibility. Make `CLOSED`, `OPEN`, and `CLAIMED` negative cases. Retain the privacy boundary and search interface.
2. Align `Overview.md`, `workflow/PLAN.md`, and the Bug FAQ out-of-scope note in `workflow/specs/ta-ticket-queue.md` with `RESOLVED` only, while preserving their dated v0.1 change history. The User Guide's existing resolved-ticket summary can remain until T04 verifies delivered behavior.
3. Bump `workflow/tasks/bug-faq/tasks.md` and `handoff.md` to v0.2. In T01 change the Firestore status filter and bounded test data to `RESOLVED`; in T04 change the integration exclusion assertion to exclude every non-`RESOLVED` status. Keep T02/T03 behavior and allowed files otherwise scoped as before. Revise the proposed `batch-plan.md` to reference v0.2 artifacts and a resolved-only T01. Update `current-state.md` and factual logs.
4. Reconcile the preimplementation tests in `src/codeclinic/test/bug-faq.store.contract.test.js`, `bug-faq.api.contract.test.js`, and `StudentBugFaq.test.tsx` plus `test-coverage.md` so only `RESOLVED` tickets qualify. Preserve the prior test-run log as historical evidence; run and record the revised focused tests.

The previous v0.1 tests were written and run before this correction: 3 suites failed, 19 tests failed, and 2 passed because the feature code is absent. Their `CLOSED` expectations are now stale and must not guide implementation. No production implementation has started. The existing human modification in `src/codeclinic/src/StudentDashboard.tsx` remains untouched.

## Gates

Under `workflow/agents/orchestrator.toml`, this requirement change needs approval of the amendment before substantive spec edits, then fresh approvals for the revised specification, checklist, handoff, batch plan, and implementation dispatch. Live index deployment, commit, push, and merge remain separate decisions.
