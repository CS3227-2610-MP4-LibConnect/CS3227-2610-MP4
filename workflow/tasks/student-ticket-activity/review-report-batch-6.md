# Independent review — student-ticket-activity Batch 6

Date: 2026-11-10 (Asia/Singapore)
Reviewed: spec v0.3, checklist v0.2, handoff v0.2, Batch 6 approval and assignment, Batch 5 review/remediation proposal, Batch 6 T05/T06 reports and logs, and the relevant detail page, styles, and UI tests.

## Verdicts

- **T05 — changes required.** Batch 5 findings F1 and F2 are substantially addressed: `repoUrl` is rendered as text with no link, and failed/lost close responses say the result is unconfirmed and offer a status refresh. One end-to-end inconsistency remains: after the failed close, the stale `OPEN`/`CLAIMED` state leaves `Close Ticket` enabled even while feedback tells the user to refresh before trying again. Require a successful refresh before another close attempt.
- **T06 — pass with follow-up.** The submitted full-suite, production-build, and synthetic-emulator logs report success; the focused UI suite independently passed 14/14, including keyboard tab traversal. The required actual rendered 320 CSS-pixel inspection remains unverified because the browser access host was unavailable (`apps=[]`, `browsers=[]`).
- **Combined Batch 6 — changes required.** Resolve the T05 action/feedback mismatch. Keep the 320px rendered-layout criterion open; the browser limitation is recorded, not a completed inspection.

## Acceptance trace

| Item / criteria | Review result |
| --- | --- |
| T05, R2/R5: repository reference is untrusted data and must not navigate | **Pass.** `TicketDetailPage.tsx` renders the stored value in a paragraph. The UI test supplies `javascript:alert(1)`, confirms literal text, and confirms no link with that name exists. |
| T05, R4: confirmed close, conflict refresh, terminal/pending controls | **Partial.** Existing tests cover confirmed close and disabled terminal controls, plus a 409 conflict refreshing to `RESOLVED`. The lost-response test verifies unconfirmed feedback and refresh to `CLOSED`. However, the close button becomes enabled after the request rejects while the local ticket remains active, before refresh. |
| T05, F2: lost response must not claim unchanged state; refresh path works | **Pass with follow-up.** The UI does not claim the state is unchanged; refresh reloads the server ticket and shows `CLOSED` in the committed-then-lost-response fixture. The still-enabled close button makes the instruction to refresh before trying again unenforced. |
| T05, R5: keyboard access and feedback | **Pass in JSDOM.** The focused suite's tab traversal reaches reply and close controls. Accessible live status is used for feedback. This does not establish rendered layout or visible focus at 320px. |
| T05, 320 CSS-pixel layout | **Unverified.** Styles include narrow-screen rules, but there is no browser rendering or overflow measurement. |
| T06: focused/full suite and production build | **Evidence reviewed.** Batch 6 logs report focused 14/14, full 43 suites / 796 passed (4 skipped), and optimized build success. I independently reran the focused suite: 1 suite / 14 tests passed. |
| T06: synthetic Firestore emulator coverage | **Evidence reviewed.** Batch 6 emulator log reports 1 suite / 1 test passed, covering query, isolation, paging, writes, dashboard refresh, close, and race behavior. Emulator warned no rules file was configured and defaulted to allow; this is not Firestore Rules validation. |
| T06: keyboard and 320px inspection | **Keyboard passed in JSDOM. 320px visual inspection unverified** because no browser surface was available. The CUA inventory result was `apps=[]`, `browsers=[]`, “The browser access host is unavailable”; I did not claim a visual inspection. |

## Finding

### Medium — close action is available before required status refresh

**Location:** `src/codeclinic/src/tickets/TicketDetailPage.tsx`, close failure handler and close button.

When a close request fails or its response is lost, the handler sets `needsCloseRefresh` and says “Refresh its current status before trying again.” The button's disabled condition checks only `ticket.status === 'CLOSED' || closePending`; since the local ticket can still be `OPEN` or `CLAIMED`, `finally` clears `closePending` and the button is enabled while the refresh action is visible. A user can submit another close without first refreshing, contrary to the feedback and the intended resolution of F2. The backend's conflict/state checks limit state corruption, but the UI still invites a duplicate request during an unresolved outcome.

**Recommended action:** disable the close button while `needsCloseRefresh` is true, and keep it disabled if refresh fails. Clear that flag only after a successful status refresh; if the refreshed ticket remains active, allow the action again. Extend the lost-response UI test to assert the close action is disabled before refresh, remains unavailable after a failed refresh, and is restored only after a successful refresh showing an active state (while remaining disabled for `CLOSED`/`RESOLVED`).

## Unverified criteria and risks

- Actual rendered 320 CSS-pixel layout, horizontal overflow, and visible focus remain unverified. JSDOM tab traversal and source CSS inspection are not a substitute.
- Emulator evidence is local synthetic application-level integration. Its no-rules-file warning means it does not verify Firestore Rules behavior.
- No review-only tests or production changes were made. No checklist or manifest status was changed.

Execution details: [`review-batch-6.md`](../../../logs/tasks/student-ticket-activity/review-batch-6.md).
