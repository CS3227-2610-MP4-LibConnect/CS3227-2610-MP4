# Independent review: Bug FAQ T01 (v0.4)

## Verdict

**Changes required.** The resolved-only query, encrypted session-bound tokens, detail recheck, bounded reads, projection boundary, and configured index generally match the approved contract. A malformed `createdAt` can break continuation and make later valid matching tickets unreachable. This violates T01's malformed-data and pagination requirements.

## Scope and evidence

- Reviewed the isolated clean-HEAD Batch 1 snapshot at `C:\Users\Junho\AppData\Local\Temp\codeclinic-bug-faq-review-v04`, including approved v0.4 spec/checklist/handoff, batch plan, validated assignment manifest, `faq-store.js`, `faq-token.js`, `store.js`, index config, and T01 tests.
- Assignment validation: `node src/workflow/validate-assignment.mjs workflow/tasks/bug-faq/assignment-batch-1.json plan` — passed.
- Required implementation reports/logs and `current-state.md` were absent from the snapshot, so implementation-reported evidence could not be independently reconciled. The manifest records the approvals and exact checks; spec/checklist/handoff and batch plan identify v0.4 as approved. No checklist status was changed.
- The report/log paths are in the main workspace; no production, test, specification, checklist, handoff, or manifest files were changed.

## Criteria trace

| Criterion | Evidence and result |
| --- | --- |
| Query exactly `status == RESOLVED`, `createdAt DESC`, document ID `ASC`, limit 100 | `faq-store.js:67-75`; test asserts the query and limit. Pass. |
| Case-insensitive title/tag substring and up to 20 results | `faq-store.js:83-92`; store contract tests. Pass. |
| Stable search continuation, including sparse batches and match boundary | `faq-store.js:76-101`; tests cover a full sparse batch and 20-match cap. Pass for valid timestamp records; malformed timestamp gap is the finding below. |
| Opaque session-bound AES-256-GCM tokens with HKDF-SHA-256, fresh nonce, Student/purpose/query/reference binding | `faq-token.js`; token contract suite. Pass. Tokens derive from trusted `idHash`; no persisted mapping or new secret. |
| Resolved-only detail read and bounded reply page, ordered with cursor, reply membership check | `faq-store.js:105-167`; store contract tests. Pass for valid records. |
| Safe projections and malformed-data handling | Summary/detail validators and reply membership checks are present. However malformed ordered documents can stop continuation; see finding. Direct malformed-order test coverage is also absent. |
| Exact index shape, without deployment | `firestore.indexes.json` contains status ASC, createdAt DESC, `__name__` ASC; index test checks exact shape/query. Pass. |

## Finding

### Medium — malformed ordered documents can block subsequent search pages

**Location:** `src/codeclinic/server/tickets/faq-store.js:76-81,94-100`.

The scan skips a document when `createdAt` cannot be converted to timestamp parts, without recording a continuation boundary for it. `nextCursor` is emitted only when `lastExamined` exists. Firestore's ordered query can include a present but malformed value of another type; if the first scanned batch contains 100 such documents before valid timestamp documents, `lastExamined` remains null and the method returns no cursor despite more resolved documents. If malformed documents occur after the last valid record, continuing from that valid record can also rescan them rather than advance past them. The ticket tests do not cover this case.

This conflicts with T01's requirements to safely skip malformed data and keep all matching resolved tickets reachable through continuation. Preserve a serializable ordering boundary for every scanned document (including supported non-timestamp Firestore values), or otherwise make the query/page strategy advance safely past malformed records. Add tests with malformed `createdAt` values at the beginning and end of a full batch, followed by valid matching records.

## Checks

- `npm test -- --runInBand --watchAll=false bug-faq.store.contract.test.js bug-faq.tokens.contract.test.js ta-tickets.indexes.test.js` — **3 suites passed, 42 tests passed**.
- Combined T01/T02 regression command — **8 suites passed, 157 tests passed** (details in T02 log).

## Unverified criteria and risks

- Malformed Firestore ordering/pagination behavior is not covered by the current synthetic tests; this is the required correction above.
- Production index deployment is intentionally outside this batch and was not checked.
- Human browser verification is a later T04 criterion.
