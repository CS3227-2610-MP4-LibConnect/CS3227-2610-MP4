# T01 revision-2 re-review log — 2026-11-12

Snapshot: `C:\Users\Junho\AppData\Local\Temp\codeclinic-bug-faq-review-v04` (refreshed isolated snapshot).

- Read reviewer profile, approved v0.4 spec/checklist/handoff, original finding, revision-1 finding, revision-2 correction report, current-state, and updated manifest.
- `node src/workflow/validate-assignment.mjs workflow/tasks/bug-faq/assignment-batch-1.json plan` — passed: “Assignment batch 1 plan checks passed. Human approval and evidence review remain separate.”
- Inspected corrected FAQ store, token helper, 100-document malformed-string/GeoPoint/map tests, and Firestore SDK serializer/cursor sources. Timestamp, GeoPoint, map-shaped Timestamp, and string boundaries have direct regressions. Arrays, bytes, references, and special numbers lack direct tests. Found that references are serialized by path only and restored via current `db.doc(path)`, and that accepted cursor payload sizes can exceed token codec caps.
- Focused: `npm test -- --runInBand --watchAll=false bug-faq.store.contract.test.js bug-faq.tokens.contract.test.js ta-tickets.indexes.test.js` — exit 0; 3 suites, 46 tests passed.
- Combined: `npm test -- --runInBand --watchAll=false bug-faq.store.contract.test.js bug-faq.tokens.contract.test.js bug-faq.api.contract.test.js ta-tickets.indexes.test.js student-tickets.api.test.js student-tickets.storage.test.js server.test.js` — exit 0; 8 suites, 161 tests passed.
- Correction implementation log named in report was absent from snapshot; review tests were rerun. No production, tests, planning, or manifest files modified.
- Verdict: changes required for cross-database reference identity and cursor-boundary/token-size mismatch. Full report: `workflow/tasks/bug-faq/review-T01-v0.4-correction2.md`.
