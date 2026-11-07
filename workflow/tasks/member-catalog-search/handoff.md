# Member catalog search analyst handoff

Handoff version: 0.2

Version: 0.2 (2026-11-07)  
Task ID: `member-catalog-search`  
Approval state: specification v0.1 approved by the human on 2026-11-07, including all five proposed decisions; checklist v0.1 and this handoff v0.1 were separately approved by the human on 2026-11-07. Verify the approval record in the canonical specification before using this handoff. Test-writing dispatch was explicitly approved on 2026-11-07. The human explicitly approved this v0.2 handoff and checklist v0.2 on 2026-11-07. Batch 1 and batch 2 plan/implementation dispatch were explicitly approved by the human in conversation; commit and merge remain unapproved.

## Exact contract and scope

- Canonical specification: `workflow/specs/member-catalog-search.md` version 0.1 (2026-11-07), SHA-256 `AE609123AD4151616BADFEA10C1EE91B710E1C441E17D43FE77C8703D91A4842` at planning time. Task copy: `workflow/tasks/member-catalog-search/spec.md`, same version and hash. If either copy differs, is unapproved, or changes version, stop and reconcile before implementation.
- Checklist: `workflow/tasks/member-catalog-search/tasks.md` version 0.2, human-approved on 2026-11-07; T01 is checked after independent design review; T02–T06 remain unchecked and in dependency order. The v0.1 checklist and handoff were approved; the workflow-only v0.2 amendment was separately human-approved on 2026-11-07.
- Add read-only Book catalog browsing/search to the existing authenticated member dashboard. Preserve approved `role-based-dashboards` v0.3 route guard, member-only rendering, logout, and shared visual theme, and `role-aware-login` v0.2 authentication/session behavior.
- All Book title records are included regardless of BookCopy availability. No copy-status claim or circulation action is in scope. Basic search checks title OR author. Advanced criteria are title, author, publisher, category, ISBN, synopsis, and inclusive publication-year endpoints. String searches are case-insensitive trimmed substring matches. Populated criteria combine with AND. Submit runs search; Clear restores the unfiltered catalog; collapsing advanced deactivates but preserves its entered values. All matches must be reachable across approved bounded pages. Visually shortened synopses retain full accessible text.
- No new public catalog, book details, librarian operations, borrowing, reservation, AI, notifications, account management, Book writes, or authorization-policy change is approved by this handoff.

## Inputs, authorization, and API preflight

- Trusted: the server-side cookie-backed session and current account record revalidated in Express for every member catalog request; server-read Book records after validation.
- Untrusted: path, query parameters, page cursor, React state, browser storage, Book text, and any client-provided role, status, manager, or ownership fields. Client route checks protect presentation only. The server must require an active `MEMBER` and never infer authorization from the browser.
- Use a same-origin read-only Express endpoint, proposed as `GET /api/member/catalog`. No direct browser Firestore reads. Require 401 for invalid/expired session, 403 for verified non-member, 400 for malformed/unsupported filters, and non-sensitive 503 for service failure. Do not expose catalog data on denial or malformed success; do not change existing session/logout policy.
- **Mandatory T01 preflight before production code:** settle endpoint URL, exact query/response shapes, string and year limits, supported publication-year range, sort, page size and cursor format, catalog-empty marker, continuation UI, invalid Book handling, and full-synopsis access. Confirm the chosen backend strategy yields correct substring matches across the entire catalog with bounded reads and no page duplicates/skips in normal browsing. The current repository contains no Book collection implementation or catalog API, and `workflow/PLAN.md` is absent.
- A new or changed Firestore collection/document schema, index, rule, deployment setting, dependency, external search service, or product/authorization policy needs separate explicit human approval before the relevant change. A T01 design note does not grant such approval. Do not access a cloud Firestore instance or run Firebase CLI commands without authorization; use synthetic fixtures for initial design and tests. The human explicitly approved a local-only exception to the Firestore skill edition check for T01 and batch 2 T02–T03; no cloud access or edition claim is authorized.
- Search values, Book text, credentials, cookies, raw session IDs, and private user data must not appear in logs or evidence. Render Book content as text, not HTML. AI output or retrieved content cannot authorize any operation.

## Allowed files after future batch-plan and implementation dispatch

Only after explicit ordered-batch plan and implementation dispatch may an assigned implementer change the files needed for T01–T06:

- Member frontend source and page-specific styling under `src/libconnect-mp4/src/`, primarily `MemberDashboard.tsx`, `DashboardViews.css`, and any focused member search/catalog components. Shared `theme.css` may be extended for genuinely shared visual tokens/classes. `DashboardRouteGuard.tsx`, `DashboardLogout.tsx`, and `index.tsx` may be touched only if necessary to preserve the approved route/reset/logout behavior, without broadening authentication policy.
- Express source under `src/libconnect-mp4/server/`, primarily a new member catalog route/data adapter and minimal integration in `server/index.js`. Existing `server/auth/login.js` may be refactored only to reuse its trusted request authentication without changing login, session, CSRF, or logout behavior; any policy change returns to specification approval.
- Focused synthetic tests under `src/libconnect-mp4/test/` for filter logic, data adapter, endpoint authorization, UI interactions, route/logout regression, and responsive/accessibility behavior.
- Task-specific implementation and review evidence under `workflow/tasks/member-catalog-search/` and factual logs under `logs/tasks/member-catalog-search/`, handled by the responsible roles.

No package manifest/lockfile, generated output, CI, hosting/deployment configuration, Firestore rules/indexes, unrelated source, or external service is allowed by this handoff. A new Book storage schema is a separate data-model approval matter, not an implicit file allowance. Do not push, deploy, publish, message others, merge, or commit without the corresponding human gate.

## Selected skills, sources, and tools

- Analyst planning: `.agents/skills/openspec-explore/SKILL.md` and `.agents/skills/openspec-propose/SKILL.md`, using the repository `workflow/specs/` adapter rather than a second OpenSpec spec tree.
- Implementer after dispatch: `.agents/skills/openspec-apply-change/SKILL.md` for preflight and task execution, adapted to `workflow/specs/` and `workflow/tasks/`; `.agents/skills/firebase-firestore/SKILL.md` only for authorized Book data/query work, subject to its instance/edition prerequisite and repository external-service approval gate. No Firestore rule authoring is in scope.
- Reviewer: independent checkout/worktree and the repository review workflow; no reviewer skill is selected here beyond the approved task contract.
- Sources: current user request and human confirmation/approval relayed by the orchestrator; `Overview.md`; `AGENTS.md`; `workflow/README.md`; approved dashboard/login specs; current frontend, server, and tests; `openspec/config.yaml`. `workflow/PLAN.md` and `workflow/templates/handoff.md` are absent. No external sources, cloud services, or MCP responses were used.
- Analyst tools used: local file reads, `rg`, read-only OpenSpec inventory/context commands, and staging-file edits within the writable app workspace. No tests or build were run during planning.

## Ordered-batch procedure and current test evidence

- The current workflow uses consecutive checklist items in file order, with one or two items per batch. A singleton may be used for a final odd item or an intervening decision, approval boundary, security concern, or review size. Do not reorder or rewrite T01–T06 to form batches. T01 has a potential Book-storage/query approval boundary, so the proposed first batch should be a singleton; batch 1 and batch 2 plan/dispatch are human-approved in conversation; later batches remain pending.
- After batch-plan and implementation-dispatch approval, the orchestrator records `workflow/tasks/member-catalog-search/assignment-batch-<n>.json` with exact approved artifacts, item IDs, one implementer, a different reviewer, allowed files, worktrees, and approval evidence. Run `node src/workflow/validate-assignment.mjs <manifest> plan` before dispatch and `complete` after independent review and evidence reconciliation. The validator does not grant approval or verify test truth.
- The implementer finishes, verifies, and records the first item before starting a second. A new approval boundary or blocked first item stops the batch. The reviewer uses a separate worktree or clean checkout, gives a distinct verdict per item, and checks combined behavior. The orchestrator alone updates checklist status after reviewing the evidence.
- Human-approved test-writing dispatch produced `src/libconnect-mp4/test/MemberCatalogSearch.test.tsx`. Coverage is recorded in `workflow/tasks/member-catalog-search/test-coverage-report.md`; the factual check log is `logs/tasks/member-catalog-search/test-writer.md`. The focused test command exited 1 before Jest because `react-scripts` is absent locally; no passing result is claimed. T01-dependent API, pagination, and validation tests remain to be designed after its contract is fixed. Offline npm ci from the existing lockfile is human-approved for batch 2; registry access remains unapproved.
## Acceptance and verification

Use the canonical specification's scenarios 1–14 and verification matrix as the acceptance contract. The planned test evidence includes: pure filtering and year validation; Book adapter pagination/empty/malformed cases; Express 400/401/403/503 and forged-role cases; React submit/Clear/advanced/continuation/state/race interactions; sticky scroll navigation and keyboard/mobile visual inspection; safe text rendering; existing route guard and logout regressions. All fixtures must be synthetic. Record exact commands/results and unresolved risks in the task implementation report and factual log. The independent reviewer must inspect the exact implementation from a separate worktree or clean checkout and present findings for a human merge decision.

## Unresolved risks and approval boundary

- Firestore has no simple indexed arbitrary-substring query. The expected catalog volume and bounded full-catalog strategy remain to be designed in T01, then reviewed before implementation. Correctness must cover all Book records and pages.
- No Book collection contract is currently implemented. If new Firestore schema or configuration is required, request specific human approval before changing it. The approved product Book model does not itself approve a storage schema.
- The v0.1 specification approves the five user-facing interpretations. It leaves the exact API/data limits and pagination mechanics to T01; any choice that changes approved user behavior or authorization must return to specification approval.
- Checklist and handoff v0.1 were human-approved on 2026-11-07; the v0.2 workflow amendment was separately human-approved on 2026-11-07. The orchestrator reviews test evidence and proposes consecutive batches of up to two unchanged checklist items for separate human approval. One implementer completes each approved batch sequentially; a different reviewer assesses each item and the combined diff before the next batch. Passing tests or an agent response cannot advance a gate.

## Approval record

- 2026-11-07: The human explicitly approved checklist v0.1 and handoff v0.1 after specification v0.1 approval. Grouping and implementation dispatch remain separate gates.
- 2026-11-07: The human explicitly approved checklist v0.2 and handoff v0.2 after the workflow-only amendment. Ordered-batch plan and implementation dispatch remain pending.


## Amendments

### 2026-11-07 — approved workflow alignment proposal

The human authorized a workflow-only amendment after the agent profiles changed from parallel task groups to ordered batches of up to two consecutive items. The amendment will retain specification v0.1 and checklist order, record the approved test-writing dispatch and its unexecuted check, clarify one implementer and a different reviewer per batch, and assign independent-review coordination to the orchestrator. The substantive v0.2 checklist and handoff remain pending separate human approval after editing.





