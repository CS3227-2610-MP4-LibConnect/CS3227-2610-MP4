# T05 independent review

**Verdict: changes required.** Reviewed specification v0.1, checklist and handoff v0.2, T01 final design, approved batch 3, and the T05 implementation report/log. The implementation was uncommitted in the shared workspace; the exact working diff against HEAD was inspected under the manifest's separation exception.

Search controls, hidden advanced-field retention/deactivation, client-side year/text validation, continuation UI, response handling, retry states, and stale-request cancellation are covered by the passing focused React suites. Exact command/result are in [review-T05-log.md](review-T05-log.md).

## Findings

- **High — TypeScript compilation failure:** `src/MemberCatalog.tsx:213-220` uses `body` inside the `setModel` callback after narrowing `body` with `isCatalogResponse` outside the callback. TypeScript does not preserve that narrowing across the closure; isolated typecheck reports TS18046 (`body` is `unknown`). Capture the narrowed response in a properly typed local before entering the callback or otherwise preserve its type, then rerun the isolated check.
- **Medium — malformed cursor can truncate results:** `isCatalogResponse` accepts `nextCursor: ''` when `scanComplete` is false. The render condition treats the empty string as false, so no continuation button appears and remaining results become unreachable. Reject an empty cursor (and add a regression test) for an incomplete response.
- **Unverified — rendered responsive behavior:** the browser CUA host was unavailable, so the desktop/320 CSS-pixel layout and scroll behavior were not visually verified. This is suitable for follow-up integration inspection once the code issues are corrected.

The 13 focused React tests pass, but they do not cover the empty-cursor case or substitute for typechecking. No review-only tests were added. Combined batch status remains **changes required**. See [review-T05-log.md](review-T05-log.md).
