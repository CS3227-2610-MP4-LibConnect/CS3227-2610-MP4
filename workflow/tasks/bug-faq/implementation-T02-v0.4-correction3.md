# Bug FAQ T02 API correction report — v0.4, revision 3

Status: **Correction complete; ready for independent re-review**

Specification: approved `workflow/specs/bug-faq.md` v0.4. Scope: human-approved T02/API correction to accept the store's encrypted, bounded tagged cursor boundary contract. Only `faq-routes.js`, its API contract test, and the assigned report/log were changed.

## Implemented

- Replaced timestamp-only cursor validation with strict recursive validation for the store's version-1 boundary values: timestamp parts, primitive values, tagged special numbers, GeoPoint, bytes, fully qualified document references, arrays, and map entries.
- Retained exact outer search/reply cursor schemas and version checks; ticket and reply IDs must still match their patterns, and reply cursor ticket ID must match the FAQ reference.
- Added limits for nesting depth, item count, string sizes, reference identity/path, and bytes representation. HTTP token shape remains bounded by the existing 512-character token cap.
- Search cursor decryption continues to use the authenticated session, Student, normalized query, field, and `searchCursor` purpose. Reply cursor decryption remains bound to the authenticated session, Student, `replyCursor` purpose, and FAQ reference. Store still performs its own validation.
- Added HTTP continuation contract tests for encrypted GeoPoint and ordinary-map search boundaries and a non-Timestamp reply boundary. Tests assert accepted cursors reach the store. Added malformed authenticated tagged boundary tests that return safe `400` responses before store access.

## Acceptance status

- Valid tagged non-Timestamp search cursor payloads can pass API validation and continue through the store interface: **Met in HTTP contract tests**.
- Valid tagged non-Timestamp reply cursor remains bound to its FAQ reference and reaches the store: **Met in HTTP contract test**.
- Malformed tagged payloads, unknown shapes, wrong ticket/query/reference/session bindings retain safe rejection behavior: **Met in validator and existing API contract tests**.
- Token size cap, no-store responses, active Student recheck, and safe 400/503 behavior: **Preserved; API and combined suites pass**.

## Verification

Exact commands and results are recorded in `logs/tasks/bug-faq/implementation-T02-v0.4-correction3-2026-11-12.md`.

- Focused API suite: **1 suite passed, 31 tests passed**.
- Combined store/token/API/index/student-ticket/server regression command: **8 suites passed, 170 tests passed**.
- `git diff --check`: **Passed**.

## Limitations and risks

- HTTP tests use authenticated encrypted tokens and mocked store methods; they verify route validation/binding and pass-through, not a live Firestore end-to-end query. Store-level typed continuation is covered separately by the T01 tests.
- Firestore emulator/live index readiness, production deployment, and browser verification remain untested or outside this correction.
- No token codec, store behavior, specification, checklist, handoff, deployment config, or approval state was changed. T02 remains subject to independent re-review; no checklist advancement or Batch 2 work was performed.
