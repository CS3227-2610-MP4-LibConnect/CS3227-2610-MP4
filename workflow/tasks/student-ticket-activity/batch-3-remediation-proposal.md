# Proposed Batch 3 review decision and remaining work

Date: 2026-11-10 (Asia/Singapore)
Task: `student-ticket-activity`
Approved specification v0.3, checklist v0.2, handoff v0.2 remain unchanged.

The independent Batch 3 review passed T04 with T06 verification follow-up.
It requires one T03 correction: ticket write parser errors return 400/413
without `Cache-Control: no-store`. The route handlers set the header, but
Express parses the body before those handlers run. Add the header to the
router's parser-error path (or earlier router middleware), add API assertions
for malformed JSON and oversized bodies, and independently re-review T03 and
combined behavior. Keep the existing Batch 3 manifest and review as history.

Proposed remaining dispatch order, preserving checklist order:

| Batch | Items | Scope |
| --- | --- | --- |
| 4 | T03 | Remediate the no-store parser-error gap and independently re-review the write API plus T04 integration. |
| 5 | T05, T06 | Detail/chat/reply/close UI, followed by integration, build, emulator and guide verification. |

Batch 4 is a singleton because T03 must pass independent security review
before the dependent T05 UI begins. Each batch needs its own explicit human
dispatch approval. This proposal does not authorize code changes, live index
deployment, commit, merge, push, or publication.
