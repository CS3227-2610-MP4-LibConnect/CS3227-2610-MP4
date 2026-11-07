# T01 final independent review — pass with follow-up

Task `member-catalog-search`, batch 1, T01. Reviewed canonical spec v0.1 (SHA-256 `AE609123AD4151616BADFEA10C1EE91B710E1C441E17D43FE77C8703D91A4842`), checklist/handoff v0.2, assignment manifest, original/addendum/final T01 implementation evidence, prior reviews, and local scan demonstration. Factual checks: `logs/tasks/member-catalog-search/review-T01-final-log.md`.

## Verdict

**T01: pass with follow-up at design level.** The final report specifies the exact endpoint, query keys and validation, Book parser, output shape, empty-catalog signal, page/cursor rules, document-ID sort, full-catalog continuation, synopsis access, and 401/403/503 handling required by checklist T01. It addresses the three prior design findings. The human expressly accepted the conditional read budget based on an expected maximum of 1,000 Book documents and allowed local-only design work without an instance-edition check. Those decisions remove the prior T01 approval blockers; this review does not reinterpret them as a requirement for cloud inspection. The orchestrator owns checklist reconciliation and any later dispatch/approval gate.

## Criteria trace and findings

| T01 contract area | Review result |
| --- | --- |
| R2–R3, scenarios 5–8: search and year semantics | Basic title-or-author OR, advanced AND, JavaScript trim/lowercase/includes, 1450–2100 inclusive year input, and collapse/reset behavior are specified. Stored years outside the input range remain reachable without year filters. Behavior is not implemented or tested here. |
| R4, scenarios 1–2, 9–10: cards and states | Four-field card output, safe text, full-synopsis expansion, raw-versus-valid scan flags, distinct empty/no-match/all-invalid outcomes, and retry behavior are specified. Zero raw documents map to the human-approved “No books found.” |
| R5, scenarios 5–13: API, pagination, access | Same-origin read-only member endpoint, per-request session/current-account check, strict allowed query and cursor, 100 raw-document page limit, ordered document-ID traversal, minimal response, and 400/401/403/503 outcomes are specified. |
| R6, scenarios 8, 10–13: fail closed and stale responses | Invalid/unauthorized responses hide cards; old traversal responses are discarded on submit, Clear, collapse, route/reset, and logout. Book/search content is data only. |

**Prior finding 1 resolved by explicit human risk acceptance:** At expected `N <= 1,000`, the design reads at most 100 Book documents per request and 1,000 over a complete traversal; `pageSize=100` needs at most 11 requests. Above the expectation, it continues rather than losing matches. This is a conditional planning budget, not a hard production limit. Monitor actual volume during future authorized operations and revisit architecture if it exceeds the expectation; no cloud count is required for this local T01 review.

**Prior finding 2 resolved:** `scannedAnyDocument` and `scannedValidBooks` are per-chunk flags accumulated by the client. A nonempty all-invalid collection yields a generic catalog-data error, not an empty-catalog claim. The synthetic demo checks this branch.

**Prior finding 3 resolved at contract level:** The final design fixes normalization, ISBN/ID equality, required and optional field parsing, exact response fields, cursor JSON keys/digest/bounds, and invalid-input behavior. Cursor and parser implementation tests belong to T02/T03.

No remaining T01 design blocker was found. A low-severity verification limitation remains: `scan-demo.mjs` models ordered chunks using padded numeric IDs and JavaScript `localeCompare`; it establishes the specified read/request arithmetic and late-match reachability for those fixtures, not Firestore ordering for arbitrary ISBN IDs. The exact Firestore query/cursor behavior requires isolated adapter tests in T02.

## Unverified and security limits

No production endpoint, adapter, or UI was written for T01, so R2–R6 and scenarios 1–13 are contract coverage only, not behavioral passes. T02 must test malformed Book fields, Unicode and all criteria, multiple pages, empty and all-invalid storage, stable ordering, and no duplicate/skipped valid ISBNs with synthetic Firestore fakes. T03 must test query/cursor validation before Book access, per-request active-member enforcement, forged claims, all error codes, and safe outputs. T04–T06 must test cards, accessible full synopsis, stale response suppression, route/logout behavior, and responsive layout. The pre-implementation React test remains unexecuted locally because `react-scripts` is absent. No live collection count, stored schema, Firestore edition, or real query was observed; the human approved this local-only T01 limit.

The untracked T01 evidence cannot be inspected from a separate clean `HEAD` worktree. I read its exact canonical files read-only in the shared workspace, compared tracked production paths against `HEAD`, ran the local script, and wrote separate review artifacts. This is the recorded separation exception and compensating control. No production edit, Firebase CLI/cloud access, dependency/configuration change, or T02 work occurred. A passing design review does not grant the next human approval gate.
