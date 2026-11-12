# Bug FAQ T01 correction log — revision 2 — 2026-11-12

Approved scope: revision-2 `correctionDispatch` in `workflow/tasks/bug-faq/assignment-batch-1.json`.

## Changed files

- `src/codeclinic/server/tickets/faq-store.js`
- `src/codeclinic/test/bug-faq.store.contract.test.js`
- `workflow/tasks/bug-faq/implementation-T01-v0.4-correction2.md`
- `logs/tasks/bug-faq/implementation-T01-v0.4-correction2-2026-11-12.md`

No T02 files, other tests, shared spec/checklist/handoff/manifest, reviewer evidence, prior implementation reports, or revision-1 correction evidence were modified.

## Verification

From `src/codeclinic` in PowerShell, ran:

```powershell
$env:CI='true'; npm test -- --runInBand --watchAll=false bug-faq.store.contract.test.js bug-faq.tokens.contract.test.js ta-tickets.indexes.test.js
```

The first revision-2 run failed one store contract: the timestamp detector still interpreted a plain `{ seconds, nanoseconds }` map as a Timestamp. The implementation was corrected to recognize actual Firestore Timestamp/valid Date instances and encode ordinary maps with an explicit type marker.

Reran the exact command. **PASS — 3 suites passed, 46 tests passed** (FAQ store, token, and index suites).

Then ran:

```powershell
git diff --check
```

**PASS** with no whitespace errors. Git emitted line-ending conversion warnings for other modified workspace files.

## Outcome and limitations

The store now serializes the ordered value type into the encrypted cursor and reconstructs SDK values for `Timestamp`, `GeoPoint`, `Bytes`, document references, arrays, maps, and non-finite numbers. Tests prove that a GeoPoint at the end of a full 100-document batch is passed back to `startAfter` as a GeoPoint and that the next valid match is reachable. The map-shaped seconds/nanoseconds case remains a map. Revision-1 malformed-string cases also pass.

No Firestore emulator or live project was used. Cross-database document-reference boundaries and production index readiness remain unverified. No deployment, checklist change, or Batch 2 implementation was performed. Correction is ready for independent re-review.
