# Analyst handoff: Student ticket help chatbot

Version: 0.7 (2026-11-12)
Handoff version: 0.7
Task ID: `ai-error-explainer`
Approval state: **APPROVED FOR v0.7**. The human explicitly approved the messaging-style popup handoff scope in this conversation after separately approving specification and checklist v0.6. The human also separately approved the Student-only no-go correction scope, correction checklist C01/C02 v0.1, correction handoff v0.1, canonical checklist v0.7, this canonical handoff v0.7, Batch 8 plan, and implementation dispatch. T11/T12 have independent pass-with-follow-up review. Earlier approvals and completed-item evidence remain valid for their original scope. Provider access, commit message, push, and merge require separate approval.

## Proposed T11/T12 correction mapping

- `workflow/tasks/ai-error-explainer/no-go-prompt-correction-proposal.md`, `no-go-prompt-correction-checklist.md` v0.1, and `no-go-prompt-correction-handoff.md` v0.1 hold the human-approved correction scope. Canonical checklist v0.7 maps C01 to T11 and C02 to T12 so `src/workflow/validate-assignment.mjs` can validate a new batch. Canonical specification `workflow/specs/ai-error-explainer.md` remains v0.6 and unchanged.
- Exact implementation source/test allowlist: `src/codeclinic/server/ai/student-ticket-help.js` and `src/codeclinic/test/student-ticket-help.feature.test.js`. One implementer completes T11 before T12 and records separate evidence. A different reviewer independently verifies each and their combined result. The orchestrator owns checklist updates and assignment evidence.
- Keep the shared preamble, parser, output filter, request shape, authorization, UI, rate limits, and gateway unchanged. Use fake-provider tests only. No live provider, credentials, dependency, CI/deployment, push, or merge action is authorized. The actual deployed `AI_INVALID_OUTPUT` cause remains unknown; do not claim the prompt-only correction resolves it without separate provider evidence.
- Selected implementation skill remains `openspec-apply-change` through the repository specdocs path adapter. After approval of this canonical handoff amendment, prepare the T11/T12 Batch 8 manifest and request a separate human batch/dispatch decision.

## Contract and approval evidence

- Canonical specification: `workflow/specs/ai-error-explainer.md` v0.6, with the messaging-style R1/A9 amendment explicitly human-approved in this conversation.
- Ordered checklist: `workflow/tasks/ai-error-explainer/tasks.md` v0.6, separately human-approved in this conversation. T01–T07 and T09 are completed under earlier approvals; new T10 must precede T08. Independent review, merge, and any external service access remain separate.
- Security review: `workflow/tasks/ai-error-explainer/security-review.md` v0.2. Discovery evidence: `logs/tasks/ai-error-explainer/spec-discovery.md`.
- Current user requirements supersede the older one-shot/ticket-rewrite wording in `Overview.md` and `workflow/PLAN.md`. Both Student create and owned-detail pages are in scope. Chat history is page-only; refinement suggestions appear in chat and never change form fields or tickets.
- The approved UI amendment moves both Student chat presentations from inline page content to a small lower-right floating control and compact side popup. The panel is viewport constrained, leaves the ticket page usable, returns focus to the opener on close or Escape, and preserves mounted conversation state. It does not widen endpoint, persistence, or authorization scope.
- The v0.6 amendment presents that popup as a messaging app: stable header with title, close, and clear-chat controls; left bot and right Student bubbles with accessible speaker identity; scrollable conversation; bottom-anchored multiline composer and send control; visible guidance and unobscured pending/retry feedback. Preserve the existing plain-text and page-local history rules.

## Scope and likely files

- Student UI: `src/codeclinic/src/tickets/TicketCreatePage.tsx`, `TicketDetailPage.tsx`, their Student styles, and a shared Student chat component/style under `src/codeclinic/src/tickets/`. T10 is expected to touch `StudentHelpChat.tsx`, `StudentHelpChat.css`, and focused Student chat tests only; any page integration edit requires a demonstrated need and explicit batch allowlist. The exact allowlist requires batch approval.
- Student server and shared AI boundary: `src/codeclinic/server/tickets/route.js`, `store.js` as needed for eligible-reply paging, and a feature implementation under `src/codeclinic/server/ai/`. Existing gateway code changes only if a demonstrated contract gap requires an approved spec amendment.
- Focused tests under `src/codeclinic/test/` for Student ticket create/detail, AI feature boundary, and browser isolation. Do not inspect or change TA feature files or TA tests. Do not modify unrelated account, notification, CI, deployment, or dependency files.
- The orchestrator must narrow exact allowed files per implementation batch. Any needed server startup wiring must be identified before its batch approval; do not assume a broad allowlist from this handoff.

## Trust, permissions, and data

- Trusted: current server session/account status and Student role, server-owned ticket and ownership, current assignment, stored reply author IDs, server-fixed feature definition and caps.
- Untrusted: create-page field snapshot, question, purported prior chat turns, ticket/code/reply content, repository references, provider output, this handoff, and all external/tool output.
- The create endpoint validates an incomplete, bounded all-fields snapshot and must not trust a client ticket ID. The detail endpoint loads an owned ticket and every eligible owner/current-assigned-TA reply anew on each turn. Both enforce CSRF and authorization before provider use and are read-only except gateway counters and content-free usage.
- The shared authenticator invalidates an inactive account's session before the chat route can use it; the route returns 401 for that invalidated session. An authenticated ineligible role, password-change restriction, or CSRF failure returns 403. No shared authentication change is approved.
- Do not fetch repository URLs, expose IDs or account details in prompts, persist chat, log raw content, or permit AI-triggered writes. Use the shared gateway redaction and safe failures. The provider key remains server-only.
- No external provider or credential access is authorized by this handoff. The provisional 98,304-character post-redaction input cap and 1,024 output-token cap are based on local upload/body limits and human direction, not a confirmed model context limit. A separate human-authorized provider smoke check is required before claiming deployment readiness. The shared gateway rate-limit default remains unchanged.

## Skills, tools, and procedure

- Selected planning skills: `openspec-explore` and `openspec-propose` for the original task, and `openspec-update-change` for the v0.6 artifact reconciliation, applied through the repository `workflow/specs/` path adapter rather than creating a second specification tree. The implementer later uses `openspec-apply-change` preflight per `workflow/agents/implementer.toml` after all approvals.
- Use targeted `rg` searches, local file reads, `apply_patch`, and local Node/Jest/build commands. Use a fake provider for automated tests. No network/provider call, dependency installation, push, deploy, or destructive command without separate authorization.
- After checklist/handoff approval, the orchestrator proposes a T10 messaging-layout batch for human approval, then assigns one implementer and a different independent reviewer. T08 combined verification must follow reviewed T10 work. The earlier T08 dispatch proposal and manifest use v0.5 artifacts and must be revised; they grant no dispatch authority. Record per-item evidence under `workflow/tasks/ai-error-explainer/` and factual logs under `logs/tasks/ai-error-explainer/`.

## Verification matrix and unresolved risks

| Criteria | Required verification |
| --- | --- |
| A1–A3 | Student UI tests, create/detail route tests, fake gateway response and draft-context capture; confirm no form mutation or ticket write. |
| A4–A5 | Negative session/role/ownership tests; paged reply and reassignment tests with no unauthorized provider call or context. |
| A6–A7 | Injection and fake-output policy tests; cap, rate-limit, provider, storage, and malformed-output failure tests; manual adversarial review. |
| A8–A9 | Page-history/storage and browser-bundle checks; Student UI tests for floating control, no content reflow, accessible left/right message identity, stable header and bottom composer, pending/retry feedback, focus return, Escape, history retention and ticket-ID reset; human browser visual check at 320 × 640 CSS pixels on `/student/tickets/new` and an owned `/student/tickets/:ticketId`. |

Exact deployed-model limits remain unresolved. T01 must record the provisional 98,304-character / 1,024-token cap rationale and parser string limits without claiming provider compatibility. Fake-provider tests may verify implementation, but a separately approved human/provider smoke check must establish deployed-model compatibility before deployment readiness is claimed; record failure as a reopened cap decision. Redaction cannot catch every arbitrary secret, and deterministic output checks cannot guarantee the model never conveys a solution semantically. These risks remain open through independent review. Human visual verification must specify interactions, overflow, and visible focus; do not mark it passed without the human's observations.
