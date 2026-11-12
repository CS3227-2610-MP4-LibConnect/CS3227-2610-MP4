# Independent review: Batch 7 T08

Date: 2026-11-12  
Task: `ai-error-explainer`, Batch 7, singleton T08  
Specification: `workflow/specs/ai-error-explainer.md` v0.6  
Checklist/handoff: v0.6; batch plan: v0.4  
Dispatch: `workflow/tasks/ai-error-explainer/batch-7-dispatch-proposal.md` (approved)

## Verdict

**Pass with follow-up.** The scoped Student tests, combined UI/server/AI boundary evidence, and build pass. No production source changes were made in T08. The human browser and screen-reader reports cover the requested post-T10 A9 checks. Keep deployment readiness open pending separately authorized provider compatibility evidence; semantic solution leakage and unknown secret formats also remain inherent risks that these checks cannot prove absent.

## Scope and evidence inspected

Reviewed the current-state index against the canonical v0.6 specification, T08 checklist line, handoff, v0.4 batch plan, approved dispatch proposal, assignment manifest, T08 implementation report and logs, human visual-verification report, and T10 review. Reviewed the assigned test files `student-help-chat.api.test.js` and `student-ticket-help.feature.test.js`; inspected the assigned run-only UI/shared gateway suites `StudentTicketHelpChat.test.tsx`, `StudentHelpChat.test.tsx`, and `ai-gateway.test.js`. Traced them through the Student help route, feature policy, shared AI gateway/redaction boundary, and T10 component behavior. The package scripts were inspected before execution.

The shared workspace has no clean tracked T08 baseline: Git reports the task's broader production/test artifacts as untracked or modified, including files from earlier batches, and `.git` is read-only under the dispatch's separation exception. The T08 assignment names only two test files as implementation changes and no production edits. I inspected those current tests and the relevant implementation, but cannot independently establish a byte-for-byte pre-T08 diff from this workspace. No out-of-scope edit was made by this reviewer.

## Acceptance traceability

| Criterion | Review result |
| --- | --- |
| A1–A3 | Pass on combined evidence. The API tests assert a fresh full create draft reaches the `ERROR_EXPLAINER` gateway and detail requests do not accept draft data. UI tests cover the create/detail request shape, text rendering, and no chat-triggered form/ticket write. Detail server tests exercise owned-ticket lookup. |
| A4 | Pass on combined evidence. Visitor, TA, inactive and password-change-required cases deny protected work; forged body identity/role fields are rejected; cross-student detail IDs return a non-identifying 404. The T08 CSRF case verifies no ticket read or provider call. |
| A5 | Pass on combined evidence. Paged reply tests include more than 50 replies, filter authors to owner/current TA, omit author/account IDs from gateway input, and verify reassignment affects the next request. The route fails closed if assignment changes during a paged scan. |
| A6 | Pass with follow-up. Synthetic fake-provider coverage checks known secret forms across the create question, history, draft/file content, and detail replies. Existing injection tests cover delimiter/instruction handling and fake-output checks reject complete-solution wording and multiple code/SQL/patch-like forms; the T10 UI renders provider text as text. This finite set does not prove resistance to every injection or semantic solution. |
| A7 | Pass. T08 adds detail malformed JSON and >128 KiB cases before account/ticket reads, plus create gateway status/error mapping. Existing tests cover storage/provider/rate-limit/invalid-output/context-cap paths and safe no-store responses. |
| A8 | Pass on combined evidence. UI tests cover bounded prior turns, clear/unmount behavior, no browser storage, close/reopen history, and detail ticket-ID reset. |
| A9 | Pass based on human-reported verification. `human-visual-verification.md` records the post-T10 two-route 320 × 640 browser checklist and explicit confirmation that speaker labels and pending/error screen-reader announcements passed on both pages. Automated UI tests cover the associated component states. This is a human observation, not an independently measured browser session. |

## Findings and unresolved criteria

- **Follow-up — semantic output policy (A6, medium residual risk).** The parser rejects known code-shaped patterns and explicit solution language, but a model can still express a complete algorithm as natural-language steps without matching a deterministic pattern. The specification and handoff explicitly recognize this limitation. Keep human adversarial review/model behavior risk visible; do not represent the synthetic cases as a guarantee.
- **Follow-up — secret redaction (A6, low residual risk).** The new fake-provider test confirms five synthetic common secret patterns are absent at transport for draft/question/history and detail replies. Pattern-based redaction cannot guarantee removal of arbitrary or novel secrets. Do not claim universal redaction.
- **Follow-up — deployed provider caps (T08 deployment-readiness condition, unverified).** No live provider or credentials were used, as required by the dispatch. Compatibility of the provisional 98,304-character input cap and `max_tokens = 1,024` remains unknown until a separately authorized provider smoke check. Deployment readiness remains open.
- **Review limitation — clean combined diff unavailable.** The shared workspace baseline limitation described above prevents exact tracked-diff verification; the assignment allowlist and the current scoped test changes were reviewed against the implementation evidence and prior T10 review.

No required production correction was found. The implementer's initial test run had two test-only assertion failures (repository lookup count and prompt delimiter expectation); both were corrected, the original failure output was retained, and the corrected rerun passed. The initial failures are historical and resolved.

## Verification

Independent focused test command: `npm test -- --watchAll=false --runInBand --runTestsByPath test/student-help-chat.api.test.js test/student-ticket-help.feature.test.js test/StudentTicketHelpChat.test.tsx test/StudentHelpChat.test.tsx test/ai-gateway.test.js` from `src/codeclinic` — **5 suites passed, 127 tests passed**.

Independent build command: `npm run build` from `src/codeclinic` — **passed**, optimized production build compiled.

Complete output is retained in [review test output](../../../logs/tasks/ai-error-explainer/review-T08-test.txt) and [review build output](../../../logs/tasks/ai-error-explainer/review-T08-build.txt). Exact execution notes are in [review execution log](../../../logs/tasks/ai-error-explainer/review-T08.md).
