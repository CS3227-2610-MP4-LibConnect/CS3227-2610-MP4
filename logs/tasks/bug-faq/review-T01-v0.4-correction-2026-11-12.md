# T01 correction re-review log — 2026-11-12

Snapshot: `C:\Users\Junho\AppData\Local\Temp\codeclinic-bug-faq-review-v04` (refreshed isolated clean-HEAD snapshot with Batch 1 overlay).

- Read reviewer profile, `AGENTS.md`, v0.4 spec/checklist/handoff, original finding report, correction report, and updated assignment manifest.
- Confirmed manifest correction dispatch is limited to `faq-store.js` and its store contract tests; T01 is not marked complete.
- Inspected corrected `faq-store.js`, new beginning/end malformed-string tests, and local Firestore SDK `serializer.js` and `reference/query.js` cursor encoding. Confirmed plain objects encode as Firestore maps, while GeoPoint uses a distinct typed value encoding. The current JSON token path changes GeoPoint into a plain object/map.
- `npm test -- --runInBand --watchAll=false bug-faq.store.contract.test.js bug-faq.tokens.contract.test.js ta-tickets.indexes.test.js` — exit 0; 3 suites, 44 tests passed.
- `npm test -- --runInBand --watchAll=false bug-faq.store.contract.test.js bug-faq.tokens.contract.test.js bug-faq.api.contract.test.js ta-tickets.indexes.test.js student-tickets.api.test.js student-tickets.storage.test.js server.test.js` — exit 0; 8 suites, 159 tests passed.
- The correction log listed in the manifest was absent from the snapshot, so tests were rerun. No production, test, planning, or manifest files changed.
- Finding: serialized malformed `GeoPoint` boundaries reopen as maps, which changes Firestore cursor ordering type. Verdict: changes required. Full review: `workflow/tasks/bug-faq/review-T01-v0.4-correction.md`.
