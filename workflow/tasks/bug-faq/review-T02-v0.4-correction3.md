# T02/API correction revision 3 review

Date: 2026-11-12
Reviewer: `bug-faq-independent-reviewer-v04`
Snapshot: `C:\Users\Junho\AppData\Local\Temp\codeclinic-bug-faq-review-v04-r3-t02` (clean HEAD with the authorized Batch 1 overlay and T02 correction revision 3)
Specification: approved Bug FAQ v0.4
Verdict: **Pass with follow-up**

## Dispatch and scope verification

Before review, the snapshot manifest had `followUpDispatch.revision: 1`, item `T02`, with the approved route and API contract test scope. The referenced correction report `workflow/tasks/bug-faq/implementation-T02-v0.4-correction3.md` existed. The snapshot also contained T01 revision 3 and the unchanged Batch 1 implementation files. The validated manifest is the source used for this review; no live production copy was substituted.

Reviewed only the authorized T02 changes in `src/codeclinic/server/tickets/faq-routes.js` and `src/codeclinic/test/bug-faq.api.contract.test.js`, with approved v0.4 spec/checklist/handoff, reviewer profile, T01 refreshed review, correction report/log, and manifest as context. No code, tests, spec, checklist, handoff, or manifest were edited.

## Criteria and evidence

- **Recursive tagged cursor bounds:** Pass. The route validator rejects unsupported shapes and enforces exact keys/types for timestamp components, special-number tags, GeoPoint coordinates, byte payloads, fully qualified document references, arrays, and maps. Nested traversal is bounded by depth, item count, string length, and reference/bytes constraints. Outer search/reply cursor schemas and version values remain exact; ticket and reply IDs retain pattern checks.
- **Malformed payload rejection:** Pass. Contract tests submit malformed authenticated tagged boundary values and verify a safe 400 response before the store is called. Existing query parsing, repeated/unknown parameter, token size, generic error, and no-store behaviors remain covered.
- **Search token/session/query binding:** Pass by route tracing and tests. Search token opening uses the authenticated session identity, trusted Student identity, `searchCursor` purpose, normalized query, and selected search field. The client cannot choose a status or owner boundary.
- **Reply token/session/ticket/reference binding:** Pass by route tracing and tests. Reply cursor opening is bound to authenticated session, trusted Student, `replyCursor` purpose, and the FAQ reference; the decrypted cursor's ticket ID is checked against that reference. Same-student different-session and cross-reference attempts are rejected.
- **Typed continuation compatibility:** Pass at the API contract boundary. Encrypted GeoPoint and ordinary-map search boundaries, plus a non-Timestamp reply boundary, are accepted and passed to the store. T01 store tests separately exercise typed cursor continuation.
- **Existing auth/state/projection/error behavior:** Pass in inspected route path and combined regression suite. Active Student checks and ticket resolved-state rechecks remain in place; responses preserve approved projections and generic safe failures.

No blocking or high/medium severity findings identified. **Follow-up / unverified:** HTTP tests mock the store and do not prove end-to-end continuation against a live Firestore database. Emulator/live index readiness and browser visual behavior were not exercised. This is a verification limitation, not a newly observed defect in the reviewed correction.

## Checks

- Focused API contract suite: **1 suite, 31 tests passed**.
- Combined T01/T02 and existing ticket/server regressions: **8 suites, 170 tests passed**.
- Exact commands and snapshot path are recorded in `logs/tasks/bug-faq/review-T02-v0.4-correction3-2026-11-12.md`.

The checklist remains unchanged and unchecked; this review does not authorize merge or Batch 2.
