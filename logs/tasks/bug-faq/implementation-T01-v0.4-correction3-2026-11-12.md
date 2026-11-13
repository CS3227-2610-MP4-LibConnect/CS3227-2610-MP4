# Bug FAQ T01 correction log — revision 3 — 2026-11-12

Approved scope: third human-approved scoped T01 correction. Code scope is limited to `faq-store.js` and its store contract test.

## Changed files

- `src/codeclinic/server/tickets/faq-store.js`
- `src/codeclinic/test/bug-faq.store.contract.test.js`
- `workflow/tasks/bug-faq/implementation-T01-v0.4-correction3.md`
- `logs/tasks/bug-faq/implementation-T01-v0.4-correction3-2026-11-12.md`

No router, T02 file, unrelated test, shared spec/checklist/handoff/manifest, reviewer evidence, prior report, or earlier correction evidence was edited.

## Verification

From `src/codeclinic` in PowerShell, ran:

```powershell
$env:CI='true'; npm test -- --runInBand --watchAll=false bug-faq.store.contract.test.js bug-faq.tokens.contract.test.js ta-tickets.indexes.test.js
```

The first run failed one new case: the 101-entry map was converted to `null`, and `null` is itself a valid Firestore ordering value. The store returned a cursor instead of identifying the oversized map as unencodable. The packer now uses `undefined` as its internal unsupported sentinel, keeping Firestore null distinct.

Reran the command. **PASS — 3 suites passed, 51 tests passed** (FAQ store, token, and index suites).

Then ran:

```powershell
git diff --check
```

**PASS** with no whitespace errors. Git emitted only line-ending conversion warnings for other workspace changes.

## Findings and test coverage

- Cross-project/database `DocumentReference`: synthetic reference from project `faq-source-project`, database `faq-source-database`, path `sourceCollection/sourceDocument`, at the end of a 100-document batch. The next call receives a `DocumentReference` with identical identity/path and reaches the next valid match.
- Oversized continuation boundaries: full-batch tests for 101-entry maps, 400-character map keys, nested arrays with 400-character content, and 400-byte values. Each rejects with `CURSOR_UNENCODABLE`, so no success response falsely reports exhaustion.
- Earlier regressions remain and pass: GeoPoint boundary, map-shaped seconds/nanoseconds, malformed string at start/end of a full batch, token/session binding, and exact index/query checks.

## Unresolved integration risk

The API router is not in this correction's allowed scope. In `src/codeclinic/server/tickets/faq-routes.js`, `validTimestampParts` at line 27 accepts only `{ seconds, nanoseconds }`; `validSearchCursor` calls it at lines 32–34 and `validReplyCursor` calls it at lines 42–45. Thus non-Timestamp typed boundaries such as GeoPoint are rejected before the store can resume them. No router change was made; a separate authorized T02 correction is needed to align API cursor validation with the encrypted store cursor contract.

No Firestore emulator/live project, production index check, deployment, checklist update, commit, or Batch 2 implementation was performed. Store reference tests are synthetic; actual SDK/Firestore cross-database cursor behavior remains unverified.
