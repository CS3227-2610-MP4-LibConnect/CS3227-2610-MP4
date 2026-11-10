# Batch 1 independent review execution log

Specification: `workflow/specs/student-ticket-activity.md` v0.2  
Checklist: `workflow/tasks/student-ticket-activity/tasks.md` v0.1  
Assignment: `workflow/tasks/student-ticket-activity/assignment-batch-1.json`  
Approval evidence: `workflow/tasks/student-ticket-activity/approval-batch-1.md`

## Scope and diff

Read `AGENTS.md`, `workflow/agents/reviewer.toml`, `workflow/README.md`,
`workflow/tasks/student-ticket-activity/current-state.md`, the approved spec,
checklist, handoff, batch approval, assignment, and both implementation reports
and logs. Inspected the exact diff for:

- `src/codeclinic/server/tickets/store.js`
- `src/codeclinic/server/tickets/route.js`
- `src/codeclinic/firebase.json`
- `src/codeclinic/firestore.indexes.json`
- `src/codeclinic/test/student-ticket-activity.contract.test.js`
- `src/codeclinic/test/student-tickets.storage.test.js`
- `src/codeclinic/test/student-tickets.api.test.js`

The shared-workspace/separation exception is documented in the approved
assignment. No production, test, checklist, manifest, or current-state file
was changed by this review. The only repository files written are this report
and this log, both listed in `reviewOnlyFiles`.

## Checks

1. From `src/codeclinic`, ran:

   `npm test -- --watchAll=false --runInBand --runTestsByPath test/student-ticket-activity.contract.test.js test/student-tickets.storage.test.js test/student-tickets.api.test.js --testNamePattern="active|detail|reads an owned|does not read replies|creates one C1|lists only safe"`

   Result: exit 0; 3 suites passed, 14 tests passed, 44 skipped by the name
   filter. No test failure in the selected T01/T02 cases.

2. From `src/codeclinic`, parsed both Firebase config files with Node:

   `node -e "JSON.parse(require('fs').readFileSync('firebase.json','utf8')); JSON.parse(require('fs').readFileSync('firestore.indexes.json','utf8')); console.log('firebase.json and firestore.indexes.json parse successfully')"`

   Result: exit 0; both files parsed successfully.

3. From repository root, ran `git diff --check --` on the changed route, store,
   config, and test files listed above.

   Result: exit 0; no whitespace errors. Git printed only LF-to-CRLF working
   copy warnings for existing changed files.

4. Local emulator query evidence. The Firestore emulator binary was already
   cached. A temporary config outside the repository pointed to the approved
   `firestore.indexes.json` and used local port 8180 with demo project
   `demo-student-ticket-activity`; telemetry was disabled. No live project or
   service was contacted. The emulator started in Standard edition. A temporary
   script seeded synthetic records for six active tickets belonging to `s1`,
   one active ticket belonging to `s2`, and one resolved ticket belonging to
   `s1`, then ran:

   `where('studentId', '==', 's1').where('status', 'in', ['OPEN', 'CLAIMED']).orderBy('updatedAt', 'desc').orderBy('ticketId', 'asc').limit(5)`

   Result: assertion passed; returned document IDs `a,b,c,d,e` as expected.
   This covers owner/status exclusion, tied timestamp order, and selection of
   five before returning. The emulator was stopped; generated debug logs were
   removed. An initial attempt on the configured 8080 port could not start
   because that port was occupied; the isolated 8180 retry succeeded.

5. One-off local route reproductions (scripts kept in the OS temporary
   directory, not in the repository):

   - Authenticated `GET /api/tickets/%2F` with a store backed by a Firestore
     path stub that rejects slash-containing document IDs returned 503 and the
     generic retry body. This confirms malformed path IDs are mapped to 503.
   - For detail read, the current Student account was returned during the
     authenticator lookup and route ownership recheck, then returned unavailable
     during reply author lookup. The response author was
     `{ "name": "TA", "role": "TA" }` for the Student's own reply. This
     confirms the role fallback defect.

## Earlier implementation evidence: failures outside Batch 1

These are recorded by the implementer, not rerun as part of the selected
review check:

- T01's broad active-name run selected two T04 dashboard UI tests; those two
  failed because the active dashboard UI had not yet been implemented. The
  narrowed T01 run passed (2 suites, 6 tests).
- T02's broader contract run had two T03 POST reply/close assertions return
  404 instead of expected CSRF/conflict responses because those endpoints are
  not implemented until T03. The narrowed T02 read run passed (2 suites, 12
  tests).

These are preimplementation failures for later items and are not attributed to
T01/T02. No live Firebase CLI command, deployment, or external service access
was performed by the reviewer.

## Verdicts

- T01: **pass**.
- T02: **changes required** — malformed ID maps to 503; unavailable owner
  author maps to TA; full reply response has no bound while R5 requires bounded
  response shapes.
- Combined Batch 1: **changes required**.

Full findings and criterion traceability: `workflow/tasks/student-ticket-activity/review-report.md`.
