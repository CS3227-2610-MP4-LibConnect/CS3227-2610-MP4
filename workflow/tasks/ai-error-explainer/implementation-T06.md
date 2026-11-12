# T06 implementation report

Status: **complete; ready for independent review**

Contract: approved specification v0.4, checklist v0.3, and handoff v0.3 under the human-approved Batch 4 dispatch. OpenSpec CLI has no native change named `ai-error-explainer`; per the canonical path adapter and prior preflight resolution in `current-state.md`, the approved workflow artifacts and Batch 4 assignment validator were used. `node src/workflow/validate-assignment.mjs workflow/tasks/ai-error-explainer/assignment-batch-4.json plan` passed before edits.

## Result

Added a labeled open/close Ticket help bot control to the Student create page. Opening it reveals the local “What help do you need?” message without making a request; keeping the component mounted under a hidden wrapper preserves chat state when closed and reopened. Added a typed shared-component request-body builder that is called when sending. The create page builds a fresh request containing the question, bounded history, and every raw current draft field, including blanks, all file names and contents, raw comma-separated tags, and raw multiline repository paths. Refinement remains plain chat text; the component does not write fields or submit a ticket.

Updated create-page fixtures to the `{ reply }` success envelope and added later-turn snapshot, blank-value, file-content, history, unchanged form, and no ticket POST assertions.

## Files changed for T06

- `src/codeclinic/src/tickets/TicketCreatePage.tsx`
- `src/codeclinic/src/tickets/TicketCreatePage.css`
- `src/codeclinic/src/tickets/StudentHelpChat.tsx`
- `src/codeclinic/test/StudentTicketHelpChat.test.tsx`
- `workflow/tasks/ai-error-explainer/implementation-T06.md`
- `logs/tasks/ai-error-explainer/implementation-T06.md`
- `logs/tasks/ai-error-explainer/implementation-T06-run.txt`

## Verification

- `npm test -- --watchAll=false --runInBand --runTestsByPath test/StudentTicketHelpChat.test.tsx --testNamePattern="create chat|chat stays|captures the draft"` — **PASS**, 1 suite, 5 tests; the detail test was intentionally filtered because T07 had not started.
- `npm test -- --watchAll=false --runInBand --runTestsByPath test/StudentHelpChat.test.tsx` — **PASS**, 1 suite, 4 tests.

The initial combined exploratory run had 2 failures and 7 passes: detail chat was not integrated yet (T07), and one create-page assertion expected the unopened hidden chat introduction to be absent. The assertion was corrected to check the hidden wrapper, then the T06-focused run above passed. The initial result is retained in the task log.

## Criteria and remaining risks

A1/A2 are covered for local prompt display, full fresh snapshots including blanks and file data, refinement shown in chat, and no form mutation or ticket write. A6/A8 are supported by the shared chat's text rendering and page-local state behavior; create UI tests cover close/reopen retention, unmount reset, visible focus, and announced status. A9's browser layout/focus and screen-reader behavior still require the human check in T08. No TA files/tests, server code, provider, credentials, network, dependencies, or persistent chat were accessed or changed. T07 was implemented after this T06 checkpoint and is documented separately in implementation-T07.md.

## Checkpoint correction

A focused checkpoint review found that the request-body builder ran after the asynchronous CSRF fetch. The builder now captures the question, a copied history, and complete current draft synchronously before the first `await`, so edits during the CSRF wait affect only subsequent turns. Added a deferred-CSRF test; the final reruns passed 5 create tests (with the T07 detail test filtered) and 4 shared-component tests. The initial combined exploratory failure and correction remain in the run log.



