# Bug FAQ preimplementation test coverage

Coverage target: approved `workflow/specs/bug-faq.md` v0.4, `workflow/tasks/bug-faq/tasks.md` v0.4, and `workflow/tasks/bug-faq/handoff.md` v0.4. Human approval of all three artifacts is recorded on 2026-11-12. The v0.3 batch plan and dispatch are obsolete; no v0.4 implementation dispatch is approved.

## Test files

- `src/codeclinic/test/bug-faq.tokens.contract.test.js` — HKDF-SHA-256 derivation from `idHash`, 32-byte key, fixed CodeClinic Bug FAQ domain context, AES-256-GCM encrypt/decrypt, fresh-nonce evidence, ciphertext opacity for ticket/reply IDs, cross-module-instance decoding, session and same-Student cross-session rejection, Student/purpose/query/field/FAQ-reference binding, and tamper rejection.
- `src/codeclinic/test/bug-faq.store.contract.test.js` — RESOLVED-only Firestore query, rejection of OPEN/CLAIMED/CLOSED and malformed records, stable descending timestamp/ascending ID order, bounded 100-document scan, case-insensitive title/tag matching, exact title/tag plus opaque reference projection, 20-result cap, and search boundary cursor.
- `src/codeclinic/test/bug-faq.api.contract.test.js` — search validation, Student authorization, no-store and generic errors, trusted `idHash` passage (ignoring a forged header), detail reference and cursor validation, exact detail projection, role-derived speaker labels, literal message content, foreign reply exclusion, reply pagination, cross-session and cross-reference rejection, same-session use through separate router instances, and session deletion/logout rejection.
- `src/codeclinic/test/StudentBugFaq.test.tsx` — dashboard placement, Title default, Title/Tags request selection, empty input, title/tag-only search cards, hidden `faqRef`, literal result/detail/fix-note/reply content, read-only open/back navigation, reply continuation, and stale response protection.

## Test seam assumptions

The specification fixes external behavior but does not name internal module APIs. The token contract tests assume `src/codeclinic/server/tickets/faq-token.js` exports `deriveFaqTokenKey(idHash)`, `sealFaqToken(payload, context)`, and `openFaqToken(token, context)`, where context contains `{ idHash, studentId, purpose, binding }`; rejected token decoding returns `null`. The API/store contract tests assume `searchFaq({ idHash, studentId, query, field, cursor })` and `getFaqDetail(studentId, faqRef, { cursor, idHash })`, following existing store conventions. Implementers may reconcile those internal names/shapes while preserving the v0.4 contract.

## Remaining gaps

- The module-isolation test exercises independent in-process module instances; a production multi-process/emulator integration check remains appropriate to prove deployment instances share no token state.
- No direct Firestore detail-store test currently asserts reply query ordering, the `limit(50)` operation, cursor `startAfter`, or membership rejection at the storage boundary. The API contract supplies a foreign-ticket reply and asserts that it is not returned; T04 integration should exercise the real store.
- No full synthetic multi-owner scan across multiple search batches, sparse empty batches, or production index JSON assertion. T04 still requires this evidence.
- API logout invalidation is simulated by deleting the fixture session; a real auth logout/rotation integration remains for T04. Token tests separately prove a new `idHash` cannot decrypt the old token.
- UI tests do not establish keyboard-only operation, visible focus, TA dashboard absence, failure/retry interaction, or the human 320 CSS-pixel browser check. Human visual evidence remains required by T04.

## Execution evidence

Exact command, status, and failure summary: [v0.4 test-writer log](../../../logs/tasks/bug-faq/test-writer-v0.4-2026-11-12.md). Full output: [v0.4 focused run](../../../logs/tasks/bug-faq/test-writer-v0.4-run.txt). The v0.1 and v0.3 run logs are retained as historical evidence.
