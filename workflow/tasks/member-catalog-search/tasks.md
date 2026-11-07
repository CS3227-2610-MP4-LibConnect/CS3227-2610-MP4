# Member catalog search implementation checklist

Version: 0.2 (2026-11-07)  
Approval evidence: the human explicitly approved checklist v0.2 and handoff v0.2 on 2026-11-07, after approving the workflow-only edits. Prior v0.1 approvals remain recorded. No agent-set approval state.  
Task ID: `member-catalog-search`  
Specification: `workflow/specs/member-catalog-search.md` v0.1 human-approved on 2026-11-07, with the human-directed v0.2 no-expansion-button amendment on 2026-11-08; verify approval evidence on disk before dispatch.

T01–T06 are complete after implementation, automated verification, and independent review. The app-root Jest run passed 254 tests with one opt-in emulator test skipped, and the production build passed. Human screenshots and observation support desktop sticky navigation, the narrow advanced-search layout and scrolled card view, visible synopsis truncation, a visible focus ring, keyboard Tab traversal, and a rendered `Load more books` control. The local catalog has 120 Books and 360 copies; a paginated read returned 100 then 20 Books. The independent final visual review found no blocking layout issue. Static screenshots cannot show every scroll position or interaction; automated tests and human observation cover the relevant behavior. Live production Firestore remains outside the human local-only boundary. See `visual-evidence-addendum.md` and `review-T06-visual-final.md`. Commit and merge require separate human approvals under `workflow/README.md`.

- [x] **T01 — Finalize the read-only catalog contract and query design.** Before production code changes, record the exact endpoint path, allowed query parameters, bounded text and year validation, supported year range, response shape, catalog-empty indicator, page size/cursor rules, stable sort, continuation UI, and full-catalog substring-search strategy. Specify how malformed Book documents are handled, how a long synopsis can be read, and how the member UI handles endpoint 401/403/503. Inspect the current Firestore schema and expected catalog volume using only approved local sources. Demonstrate that the proposed query returns all matches across pages without unbounded production reads. If the plan requires a new or changed Firestore data model, index/rule/configuration, dependency, external service, or product behavior beyond the approved spec, stop for separate human approval before implementation. Deliver the design as task evidence for reviewer/test writer. (Spec R2–R6; scenarios 1–2, 5–13.)

- [x] **T02 — Implement and test catalog filtering and Book data access.** Add a read-only server data adapter against the approved Book storage contract. Normalize and validate Book records without crashing on malformed data; return only approved display fields. Implement case-insensitive substring matching for basic title-or-author search and every active advanced string criterion, AND composition across criteria, inclusive year endpoints, and correct globally empty versus no-match semantics. Apply the approved bounded pagination strategy across the entire result set, with stable ordering and no duplicates/skips in normal browsing. Use synthetic records and adapter tests, including `tom` title matches, case/whitespace, AND, boundary years, invalid documents, empty storage, and multiple pages. (Spec R2–R5; scenarios 1, 5–9.)

- [x] **T03 — Implement and test the protected catalog endpoint.** Add the approved same-origin, read-only Express route and wire it to the adapter. Validate query shape, lengths, whole-year range/order, page size, and cursor before data access; return the approved minimal response contract. Authenticate the cookie-backed session and current account on every request, require active `MEMBER`, reject client role/status/manager claims, and return specified 400/401/403/503 outcomes without Book data on denials. Keep the approved login/session behavior unchanged. Add focused endpoint tests for each response, role spoofing, expired/inactive sessions, malformed inputs, service failure, and safe output/logging. (Spec R5–R6; scenarios 9–13.)

- [x] **T04 — Build the member dashboard navigation and catalog cards.** Add a top-pinned member navbar with the top-left `LibConnect` dashboard control and preserve accessible logout. Place the search region above a responsive catalog card grid. Show title, author, and a visually truncated synopsis that remains readable in full through the approved accessibility interaction. Use existing shared theme tokens; verify keyboard access, visible focus, scroll persistence, no content overlap, and no horizontal overflow down to 320 CSS pixels. Add focused component tests and visual inspection evidence. (Spec R1, R4; scenarios 1–3, 14.)

- [x] **T05 — Build search controls, state handling, and paginated results.** Add labelled basic search with submit/Clear actions; keep advanced fields collapsed initially with an accessible expanded-state toggle. Preserve hidden values while removing collapsed filters, combine active fields per the approved contract, validate year inputs before requests, and display all results through the approved continuation UI. Distinguish initial loading, search/page loading, catalog-empty, no-match, invalid input, and retryable service errors. Suppress obsolete responses after search, reset, navigation, or logout; fail closed on authorization or malformed-response errors. Add React interaction/integration tests for all filter and state transitions. (Spec R2–R6; scenarios 1, 4–10, 14.)

- [x] **T06 — Verify integration, security, and regressions; record evidence.** Run focused React, adapter, endpoint, and route/logout tests, then the relevant full test/build checks. Inspect the dashboard while scrolling at desktop and 320 CSS-pixel widths, including keyboard focus, advanced controls, continuation, and synopsis readability. Verify no Firestore browser access, no unintended writes, member-only API access, safe text rendering, stale-response handling, and existing route guard/logout behavior. Record the exact spec version, changed files, commands and results, criterion coverage, deviations, and unresolved risks in `workflow/tasks/member-catalog-search/implementation-report.md` and `logs/tasks/member-catalog-search/`. Provide evidence for independent review; the orchestrator arranges that review and preserves the human merge gate. (Spec verification matrix; scenarios 1–14.)

## Approval boundary

The human approved specification v0.1 and its five proposed decisions on 2026-11-07. The human separately approved this checklist and its accompanying handoff on 2026-11-07. The human approved this v0.2 workflow amendment on 2026-11-07. Test-writing dispatch was separately approved, and batch 1 plan/implementation dispatch were explicitly approved by the human in conversation; no agent may mark its own work approved. A new data model, authorization policy, product requirement, dependency, CI/deployment change, Firestore rule/index change, or external service still requires its specific approval.

## Approval record

- 2026-11-07: The human explicitly approved checklist v0.1 and handoff v0.1 after specification v0.1 approval. Test-writing, grouping, implementation dispatch, commit, and merge approvals remain separate.
- 2026-11-07: The human explicitly approved checklist v0.2 and handoff v0.2 after reviewing the workflow-only amendment. Ordered-batch plan, implementation dispatch, commit, and merge approvals remain separate.


## Amendments

### 2026-11-07 — approved workflow alignment proposal

The human authorized a workflow-only amendment after the agent profiles changed from parallel task groups to ordered batches of up to two consecutive items. The amendment will retain specification v0.1 and checklist order, record the approved test-writing dispatch and its unexecuted check, clarify one implementer and a different reviewer per batch, and assign independent-review coordination to the orchestrator. The substantive v0.2 checklist and handoff remain pending separate human approval after editing.








