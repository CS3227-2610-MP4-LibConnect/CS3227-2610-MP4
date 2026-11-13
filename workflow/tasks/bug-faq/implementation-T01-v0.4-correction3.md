# Bug FAQ T01 correction report — v0.4, revision 3

Status: **Store correction complete; ready for independent re-review**

Specification: approved `workflow/specs/bug-faq.md` v0.4. Scope: third scoped T01 correction approved by the human; only the store and store contract tests were authorized for code changes. Prior implementation and review evidence remains unchanged.

## Findings addressed

- Document-reference cursor boundaries previously preserved only `.path`, losing source project/database identity.
- Boundary structures could fit the store's permissive shape checks but exceed the encrypted token helper's 512-character cap or 2048-byte payload cap. A failed token seal could otherwise become a successful page with `nextCursor: null` while more records remained.

## Correction

- Document-reference values now include project ID, database ID, and path in the encrypted cursor. Decoding reuses the current Firestore client only for a matching identity; otherwise it reconstructs a Firestore client for the source identity and creates the reference there.
- Unrepresentable boundary values return an internal encoding failure. If a page needs continuation and `sealFaqToken` cannot produce a bounded token, the store throws `CURSOR_UNENCODABLE`. Reply continuation uses the same behavior. The API's existing generic failure path responds with a safe 503 rather than presenting the scan as exhausted.
- Added a full 100-document scan test for a reference from another project/database and verified the next `startAfter` value retains that identity and path.
- Added full-batch failure cases for a 101-entry map, an oversized map key, a nested array that exceeds the token budget, and bytes that exceed the token budget. Each fails explicitly instead of returning a successful terminal search response. Earlier GeoPoint, map-shaped timestamp, malformed string, and focused contract tests remain.

## Acceptance status

- Fully qualified document-reference identity survives cursor roundtrip: **Met in a synthetic store contract test**.
- Values that cannot fit the cursor encoding do not silently terminate pagination: **Met in store failure tests; API maps store failure to generic 503**.
- Resolved-only query, scan/result bounds, ordering, and session/query-bound encryption: **Preserved; focused suites pass**.

## Verification

Exact command and outcomes are in `logs/tasks/bug-faq/implementation-T01-v0.4-correction3-2026-11-12.md`. Final focused result: **3 suites passed, 51 tests passed**. Final `git diff --check` passed.

## Remaining risks and limitations

- `src/codeclinic/server/tickets/faq-routes.js` still validates search/reply cursor payloads with `validTimestampParts` at line 27; `validSearchCursor` calls it at lines 32–34 and `validReplyCursor` calls it at lines 42–45. A correctly encrypted non-Timestamp cursor (for example, a GeoPoint boundary) will therefore be rejected at the API boundary, although the store can advance it. The router was outside this correction's authorized file scope and was not modified; this requires separate scoped reconciliation before API-level support for malformed non-Timestamp ordered values can be claimed.
- Synthetic Firestore doubles verify reconstructed reference identity; no emulator or live Firestore query validated SDK pagination semantics. Production index readiness remains unverified.
- Large cursor values fail explicitly through the route's generic 503 path; they are not truncated. The token-size limit remains unchanged.
- No checklist update, deployment, commit, or Batch 2 work was performed. Independent re-review is required.
