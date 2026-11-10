# Test writer coverage report: student-ticket-activity

Specification: `workflow/specs/student-ticket-activity.md` v0.2. Checklist and handoff: v0.1. Scope: preimplementation tests for T01–T05.

## Added tests

- `src/codeclinic/test/student-ticket-activity.contract.test.js`
  - T01: asserts owner/status filters, descending update time, a second ordering criterion for equal-time ticket IDs, the five-item Firestore limit, and that query operations precede the read. The tie fixture uses two records with equal timestamps and checks stable ID order.
  - T01–T03: API contract assertions for authenticated active read, private no-store detail response, owner-hidden detail, reply CSRF/allowlist rejection, and close CSRF/conflict behavior.
- `src/codeclinic/test/StudentTicketActivity.test.tsx`
  - T04: dashboard active section, five-card bound, ticket link and Load all navigation, and distinct retry versus empty state.
  - T05: deep-linked detail with literal text rendering and single-flight reply submission that preserves typed text after failure.

Coverage is focused on core acceptance behavior and does not exhaust all checklist cases. Missing coverage includes two-Student fixtures; valid detail projection/reply ordering; valid and invalid reply boundaries, atomic timestamps and concurrent state transitions; successful close semantics, close UI pending/conflict refresh, inaccessible/TA states on the new routes, and 320 CSS-pixel/keyboard inspection. T04's direct session-guard coverage is not duplicated from existing ticket creation tests. T06 integration, emulator, build, and guide criteria are outside this test-writing assignment.

Assumptions: the API response uses `{ tickets }` for active summaries and `{ ticket, replies }` for details, consistent with the approved specification's distinction between ticket summary and thread. Accessible labels in UI queries use concise names derived from the requirements. The tie assertion uses ascending ticket ID ordering as a deterministic example; the spec requires stability but does not specify ascending versus descending. These shapes and labels are assumptions where the spec does not prescribe exact JSON or wording.

## Verification

Command (from `src/codeclinic`):

```text
npm test -- --watchAll=false --runInBand student-ticket-activity.contract.test.js StudentTicketActivity.test.tsx
```

Result: exit code 1; 2 suites failed, 9 tests failed, 0 passed. The factual log is [`test-writer.md`](../../../logs/tasks/student-ticket-activity/test-writer.md), and the complete command output is retained in [`test-writer-run.txt`](../../../logs/tasks/student-ticket-activity/test-writer-run.txt). First distinct failure: `store.listActive` is not implemented. The dashboard suite first fails because no `active tickets` region is rendered; the API suite first fails because `/api/tickets/active` returns 404 instead of authenticating the visitor (expected 401). No production files were changed.

Runtime-provided token usage: unavailable. Model/metric source: unavailable (no runtime token accounting was exposed to this agent).
