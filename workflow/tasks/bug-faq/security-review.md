# Bug FAQ v0.4 security review

Date: 2026-11-13. Source: approved v0.4 specification and checklist, Batch 1/2 implementation and independent review reports, and final synthetic test results. This record summarizes the review evidence; it does not represent a live-system penetration test.

- Eligibility is enforced in trusted store/API code against stored `RESOLVED` status on search and detail reads. Student identity/account are rechecked server-side; callers cannot supply a role, owner, or status to widen access.
- Search references and continuation cursors are encrypted, bounded, purpose-scoped, and bound to the active authenticated session and Student. API tests cover tampering, wrong purpose, cross-session/search/ticket reuse, malformed input, and safe errors. No raw ticket IDs are used as public FAQ references.
- Search cards expose title and tags only. Detail exposes title, tags, fix note, and paginated conversation for resolved tickets. Speaker labels derive on the server as `Student`/`TA`; names typed into message bodies remain literal under the approved privacy boundary. Responses are no-store and errors do not expose private records.
- The UI renders content literally and keeps FAQ detail read-only; independent review and tests cover absence of owner-only controls and identifiers.

The final independent T01/T02 reviews found no remaining blocking authorization or projection issue. The earlier typed-cursor API mismatch was corrected and retested. Remaining verification limits: Firestore emulator suites were skipped; live database/index behavior has not been exercised or deployed. Approval for deployment and merge remains separate.
