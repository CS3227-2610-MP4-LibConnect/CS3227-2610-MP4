# Bug FAQ T02 API correction log — revision 3 — 2026-11-12

Approved scope: scoped T02/API cursor validation correction following `review-T01-v0.4-correction3-rerun.md`.

## Changed files

- `src/codeclinic/server/tickets/faq-routes.js`
- `src/codeclinic/test/bug-faq.api.contract.test.js`
- `workflow/tasks/bug-faq/implementation-T02-v0.4-correction3.md`
- `logs/tasks/bug-faq/implementation-T02-v0.4-correction3-2026-11-12.md`

No store, token codec, spec, checklist, handoff, manifest, T01 review evidence, deployment file, or unrelated test was changed.

## Verification

From `src/codeclinic` in PowerShell, ran the focused API suite:

```powershell
$env:CI='true'; npm test -- --runInBand --watchAll=false bug-faq.api.contract.test.js
```

**PASS — 1 suite, 31 tests.** This includes GeoPoint and map search continuation, non-Timestamp reply cursor acceptance, malformed authenticated boundary rejection, and existing session/query/reference binding checks.

Ran the combined regression suite:

```powershell
$env:CI='true'; npm test -- --runInBand --watchAll=false bug-faq.store.contract.test.js bug-faq.tokens.contract.test.js bug-faq.api.contract.test.js ta-tickets.indexes.test.js student-tickets.api.test.js student-tickets.storage.test.js server.test.js
```

**PASS — 8 suites, 170 tests.** Jest also matched `account-r7-server.test.js` by test naming.

Ran the final whitespace check:

```powershell
git diff --check
```

**PASS** with no whitespace errors; Git emitted line-ending conversion warnings for already modified workspace files.

## Outcome and limitations

The route validates the existing tagged cursor schemas recursively under explicit depth/item/string/reference bounds while retaining exact outer version and binding checks. The API tests use valid session-bound AES-GCM tokens, verify that cursor requests pass to the store, and verify malformed tagged payloads return no-store 400s without invoking store reads.

No emulator/live Firestore request or production deployment was run. The HTTP tests mock store behavior; cross-layer serialization/query behavior remains covered by separate store tests. No checklist status or approval was changed. Implementation is ready for the assigned separate reviewer.
