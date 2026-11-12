# Student ticket help chatbot: implementation handoff

Date: 2026-11-12. Task: `ai-error-explainer`. Canonical specification: v0.6; checklist and handoff: v0.7 after the approved no-go correction. Human merge decision: **pending**.

## Scope and status

All checklist items T01–T12 are checked after independent review. The active Student can use a page-local Ticket help bot on Create Ticket and an owned ticket detail page. The chat opens from a small lower-right control into a compact messaging-style popup with a stable header, left bot/right Student bubbles, a scrollable conversation, and a bottom composer. The Create Ticket chat can suggest wording in chat without changing form fields. Both APIs enforce Student authorization and use the shared fail-closed AI boundary. No TA-facing chat or AI-triggered ticket write was added.

| Batch | Items | Implementation and independent review | Reconciled result |
| --- | --- | --- | --- |
| 1 | T01 | `implementation-T01-amendment.md`; `review-T01-correction.md`; `assignment-batch-1.json` | Pass with follow-up; provisional provider caps documented. |
| 2 | T02–T03 | `implementation-T02.md`, `implementation-T03.md`, later correction reports; `review-T02-T03-v0.4.md`; `assignment-batch-2.json` | Pass with follow-up after security/output and 401-contract corrections. |
| 3 | T04–T05 | `implementation-T04.md`, `implementation-T05.md`; `review-T04-T05.md`; `assignment-batch-3.json` | Pass with follow-up. |
| 4 | T06–T07 | `implementation-T06.md`, `implementation-T07.md`; `review-T06-T07.md`; `assignment-batch-4.json` | Pass with follow-up. |
| 5 | T09 | `implementation-T09.md`; `review-T09.md`; `assignment-batch-5.json` | Pass with follow-up; side popup. |
| 6 | T10 | `implementation-T10.md`; `review-T10.md`; `assignment-batch-6.json` | Pass with follow-up; messaging layout. |
| 7 | T08 | `implementation-T08.md`; `review-T08.md`, `security-review-T08.md`; `assignment-batch-7.json` | Pass with follow-up; A1–A9 combined evidence. |
| 8 | T11–T12 | `implementation-T11.md`, `implementation-T12.md`; `review-T11-T12.md`; `assignment-batch-8.json` | Pass with follow-up; Student-only no-go prompt clarification and fake-provider concept-question regressions. |

Batch 8 changed only `src/codeclinic/server/ai/student-ticket-help.js` and `src/codeclinic/test/student-ticket-help.feature.test.js`. Its implementer and independent reviewer each passed the focused Student feature/gateway/route suites and production build. The assignment manifest passed `complete` validation before T11/T12 were checked. The prompt now names existing prohibited-output categories and explicitly allows grounded concept explanations in prose. Neither the output parser/filter nor shared prompt changed. The deployed model's actual response and the cause of the reported concept-question 503 remain unknown; the separate provider check and manual adversarial review remain open.

The separately human-approved Create Ticket “improve ticket wording” prompt correction changed `src/codeclinic/server/ai/student-ticket-help.js` and its feature tests. `implementation-wording-reply-correction.md` and `review-wording-reply-correction.md` record its independent pass with follow-up; the actual deployed provider response behind the reported 503 remains unknown.

Feature-owned production paths are `src/codeclinic/server/ai/student-ticket-help.js`, shared gateway/parser files touched by earlier approved batches, Student help route and registration files under `src/codeclinic/server/`, and `src/codeclinic/src/tickets/StudentHelpChat.tsx`, `StudentHelpChat.css`, `TicketCreatePage.tsx`, and `TicketDetailPage.tsx` with their Student styles. Exact per-batch changed paths and checks are in each linked implementation report and manifest. Focused tests are under `src/codeclinic/test/`; T08 itself changed only `student-help-chat.api.test.js` and `student-ticket-help.feature.test.js`. The shared workspace contains prior uncommitted/untracked work and `.git` is read-only, so an exact clean tracked combined diff is unavailable; reviewers documented this limitation and inspected the scoped current files. No commit, push, merge, deployment, dependency, CI change, or provider call was performed.

## Final verification and human observations

- T10 implementation and independent review each passed 2 Student UI suites / 14 tests and compiled the production build. Reports: `implementation-T10.md`, `review-T10.md`; complete outputs are under `logs/tasks/ai-error-explainer/`.
- T08 implementation corrected two test-only assertions after an initial 125/127 run, retaining that failure output. The corrected run and independent reviewer each passed 5 focused suites / 127 tests; both production builds compiled. Reports and full outputs are linked from `implementation-T08.md` and `review-T08.md`.
- `human-visual-verification.md` records the human's post-T10 browser check on Create Ticket and an owned detail page at 320 × 640 CSS pixels and explicit screen-reader confirmation for message labels and pending/error announcements on both pages. These are human observations, not agent-measured browser results.
- `security-review-T08.md` records the synthetic adversarial and trust-boundary assessment. A1–A9 have combined evidence; no blocking defect was found in the reviewed scope.

## Unresolved risks and approval gates

- The deployed provider/model's acceptance of `max_tokens = 1,024` and representative inputs near the provisional 98,304-code-unit cap is unverified. The 503 wording correction passed fake-provider tests, but no live retry outcome was supplied. A separately authorized provider smoke check is required before claiming deployment readiness; a rejection reopens the cap or model contract decision.
- Deterministic output filtering cannot guarantee that a model will not express a complete solution in ordinary prose. Pattern redaction cannot detect every arbitrary secret. The UI warns against sharing secrets, and the independent security review retains these residual risks.
- `Overview.md` and `workflow/PLAN.md` still contain older one-shot scope language. Reconciliation was outside approved Student implementation batches.
- Human merge approval remains pending. This report and passing local checks do not authorize merge or deployment.
