# Batch 3 dispatch proposal: T04 and T05

Status: **APPROVED FOR BATCH 3 DISPATCH** (2026-11-11). The human explicitly replied “approved” to this proposal in the conversation.

The human authorized implementation to resume. Batch 2 T02/T03 passed separate and combined independent review with follow-up under approved specification v0.4, checklist v0.3, and handoff v0.3. `assignment-batch-2.json` passed its complete validator before T02/T03 were checked. The focused review run had 86 passing tests and six failing detail-route tests assigned to T04; full output and verdicts are in `review-T02-T03-v0.4.md` and its linked log. The preexisting approved batch plan v0.2 places T04 and T05 in Batch 3, but does not approve its implementation dispatch.

## Ordered work

1. **T04 — Detail-chat server route and context scan.** Add the Student-owned-ticket read-only POST route. Re-read the owned ticket on each turn, scan deterministic bounded reply pages, include only owner and currently assigned TA reply text, reject client context and create-only refinement, enforce the complete post-redaction cap, and return safe no-store envelopes. Verify A3–A7. Update the inactive-account detail test to the approved 401 contract; retain all six existing failures as open until they pass. Complete and verify T04 before T05 starts.
2. **T05 — Shared page-local Student chat UI.** Build a reusable accessible plain-text component with bounded in-memory history, clear, pending/retry and safe error states, and responsive styling. It may call only the Student help-chat HTTP route supplied by a page and must never call the provider or persist messages. Verify A1/A8/A9 in focused component tests. The create/detail page integrations remain T06/T07, outside this batch.

## Proposed assignment boundary

- One implementer: `/root/batch3_implementer`; one different independent reviewer: `/root/batch3_reviewer`. A shared workspace review needs the existing read-only `.git` separation exception and an exact diff review.
- T04 source allowlist: `src/codeclinic/server/tickets/student-help-chat.js`, `src/codeclinic/server/tickets/route.js`, `src/codeclinic/server/tickets/store.js` only if needed for eligible reply paging. T04 tests: `src/codeclinic/test/student-help-chat.api.test.js`, `src/codeclinic/test/student-ticket-help.feature.test.js` only for relevant context/response boundary coverage.
- T05 source allowlist: `src/codeclinic/src/tickets/StudentHelpChat.tsx` and `StudentHelpChat.css` (new), plus `src/codeclinic/test/StudentHelpChat.test.tsx` (new focused component test). Existing Student create/detail page source and their integration tests are reserved for T06/T07.
- Implementation reports/logs: `workflow/tasks/ai-error-explainer/implementation-T04.md`, `implementation-T05.md`, and matching paths under `logs/tasks/ai-error-explainer/`. Independent report/log: `workflow/tasks/ai-error-explainer/review-T04-T05.md` and matching log.
- Checks: focused Student detail API and feature tests using fake providers, focused component tests, targeted TypeScript/build check if needed to verify the new component. Capture complete failing output in task-local logs; inspect summaries and first distinct failures. Do not run TA-specific tests or inspect TA files.
- No provider/network/credential access, new dependency, CI/deployment edit, shared authentication change, ticket write, or chat persistence is approved by this proposal. The existing shared gateway rate default and provisional caps remain as approved.

## Known open verification

The Batch 2 reviewer requested Student-specific redaction capture and focused create-route gateway error-mapping tests; these remain follow-ups for T08 or a separately scoped correction if they reveal a defect. T08 also retains manual adversarial review, the human browser visual check on both pages at 320 CSS pixels, and the separately authorized deployed-model compatibility smoke check. No readiness or merge claim follows from a Batch 3 approval.

**Approved decision:** dispatch Batch 3 T04/T05 implementation under this exact Student-only scope and the approved v0.4/v0.3/v0.3 artifacts. Independent review and the subsequent batch/merge decisions remain separate.
