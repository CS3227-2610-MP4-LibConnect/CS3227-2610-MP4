# Bug FAQ T01 correction log — 2026-11-12

Approved scope: `correctionDispatch` in `workflow/tasks/bug-faq/assignment-batch-1.json`.

## Files changed

- `src/codeclinic/server/tickets/faq-store.js`
- `src/codeclinic/test/bug-faq.store.contract.test.js`
- `workflow/tasks/bug-faq/implementation-T01-v0.4-correction.md`
- `logs/tasks/bug-faq/implementation-T01-v0.4-correction-2026-11-12.md`

No T02 files, shared spec/checklist/handoff/manifest, reviewer evidence, or prior implementation reports/logs were changed. The pre-existing dashboard edit was not touched.

## Verification

From `src/codeclinic` in PowerShell, ran:

```powershell
$env:CI='true'; npm test -- --runInBand --watchAll=false bug-faq.store.contract.test.js bug-faq.tokens.contract.test.js ta-tickets.indexes.test.js
```

The first run after the correction failed: the generic boundary validator also treated `faqRef` payloads as search/reply cursors. The implementation was corrected so an ordering value is required for cursor boundaries but not FAQ references.

Reran the same command. **PASS — 3 suites passed, 44 tests passed** (store, token, and index contract suites).

Then ran:

```powershell
git diff --check
```

**PASS** with no whitespace errors. Git emitted line-ending conversion warnings for other already modified workspace files.

## Outcome and limitations

Added full 100-document scan tests with a malformed string `createdAt` at index 0 and index 99, each followed by a valid matching record in the next batch. Both continue successfully; the malformed end case proves the encrypted cursor preserves the string boundary and ticket ID. Valid timestamps continue using the existing seconds/nanoseconds cursor encoding.

The store uses synthetic query doubles; no Firestore emulator or live project was used. Other malformed Firestore value types were not exercised. No deployment or checklist change was made. Correction is ready for independent re-review.
