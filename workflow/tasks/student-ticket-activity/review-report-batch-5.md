# Independent review — student-ticket-activity Batch 5

Date: 2026-11-10 (Asia/Singapore)
Reviewed artifacts: specification v0.3, checklist v0.2, handoff v0.2, Batch 5 approval, assignment manifest, repository instructions, and reviewer profile.
Implementation reports: `implementation-T05-batch-5.md` and `implementation-T06-batch-5.md`. Factual command evidence is linked below.

## Verdicts

- **T05 — changes required.** The protected route and detail experience are present, and focused UI tests pass. Two issues remain in detail rendering/error feedback (F1 and F2). The required 320 CSS-pixel visual inspection also remains unverified.
- **T06 — pass with follow-up.** Full suite, production build, synthetic emulator integration, direct SPA-shell HTTP checks, guide updates, and keyboard tab traversal are supported by the implementation evidence; the emulator test was independently rerun and passed. The actual 320 CSS-pixel visual check could not be performed because no browser or app was available.
- **Combined Batch 5 — changes required.** Resolve F1 and F2, then complete a real 320 CSS-pixel inspection before treating the T05/T06 checklist items as reviewed. No checklist state was changed.

## Acceptance trace

| Item / criteria | Review result |
| --- | --- |
| T05, R2: protected direct detail route and owned detail projection | Route dispatches through `DashboardRouteGuard`; detail test waits for Student session verification. Detail fields, source context, claim/resolution information, and localized timestamps are rendered. API ownership is exercised in the emulator integration. Pass, with visual gap below. |
| T05, R2/R5: ordered bounded reply blocks, retained content and retry | UI retains prior replies and offers retry after a next-block failure; UI suite covers this behavior. Emulator test independently passes a 50+1 page boundary with equal timestamps. UI's 50-row presentation boundary is covered indirectly rather than with a 50-row UI fixture. |
| T05, R3: reply, validation, pending state, and failure retention | UI suite covers a single-flight pending request and retaining typed text after a failed response. Emulator test covers authenticated reply write and dashboard refresh. Pass. |
| T05, R4: close, terminal controls, conflict refresh | UI suite covers confirmed close/disabled controls and conflict refresh. Emulator test covers close fields and concurrent close conflict. Generic failed-close feedback has finding F2. |
| T05, R5: literal content, safe failures, accessibility | React text nodes render ticket/reply text literally; UI suite verifies literal markup text. Keyboard traversal test reaches reply and close controls. Direct repository URL target has finding F1. Malformed response handling exists but does not have a dedicated malformed-detail UI test in the reviewed suite. |
| T05, R5: 320 CSS-pixel layout | **Unverified.** Source has narrow-screen rules, but neither implementation nor reviewer had an available browser surface for a visual overflow check. |
| T06: focused/full tests and build | Implementation logs record 43 suites/795 passing tests (4 opt-in suites skipped) and a successful optimized build. Focused UI/routes rerun passed 2 suites/42 tests. |
| T06: emulator integration/index/query/ownership/paging/writes/race | Synthetic emulator test independently passed 1 suite/1 test using `demo-codeclinic`. |
| T06: direct route shell, guides, keyboard | Implementation log records HTTP 200 SPA shell for detail/dashboard routes and updated user/developer guides. Keyboard traversal passed in focused UI test. |
| T06: keyboard and 320px inspection | Keyboard evidence passed; actual 320px visual check remains unverified. |

## Findings

### F1 — Medium: stored repository URL is used directly as a navigation target

Location: `src/codeclinic/src/tickets/TicketDetailPage.tsx:164`.

The detail page places `ticket.repoUrl` directly in an anchor's `href`. Ticket content and repository references are untrusted per the approved spec. The create flow validates new URLs, but that does not make every stored or historical value safe for a browser navigation sink. A stored `javascript:` URL could execute when clicked. The spec says repository references are displayed as data and the server must not fetch them.

**Recommended action:** render the reference as plain text, or validate the URL against the approved HTTPS GitHub form before creating a link and render invalid values as text. Add a UI case with a hostile URL and verify it cannot become an executable link.

### F2 — Medium: failed close response asserts an unconfirmed state

Location: `src/codeclinic/src/tickets/TicketDetailPage.tsx:134`.

On any exception or non-success response, the page says “Its current state is unchanged.” A request may have reached the server and committed while the response was lost or malformed, so the UI cannot assert that the state is unchanged. This can mislead the student into retrying a close that already succeeded.

**Recommended action:** say that the close could not be confirmed and offer a state refresh/reload; only describe the state after a successful server response or a successful refresh. Add a failure-path test that simulates a committed close followed by a lost response.

## Unverified criteria and risks

- A real 320 CSS-pixel browser inspection remains outstanding for both T05 and T06. The reviewer attempted to inspect the computer-use browser inventory; it returned no apps or browsers and reported the browser access host unavailable. CSS source review is not equivalent to rendered overflow verification.
- Dedicated malformed detail-response UI coverage and a 50-reply-sized UI fixture are absent; current malformed-response handling is source-inspected, while server page-boundary behavior is emulator-tested.
- Emulator startup warned that no Firestore rules file was configured, so the emulator defaulted to allow. The synthetic test exercised the application Express/session/ownership/CSRF/state checks; it is not evidence about deployed Firestore rules or live data.

## Files and change scope reviewed

Reviewed the Batch 5 detail component/style, Student route guard and route mapping, Express SPA shell route, UI and dashboard route test changes, synthetic emulator test, user/developer guide changes, and T05/T06 reports/logs. The assignment records the shared-workspace separation exception; I independently inspected the exact available files and ran focused checks. Earlier batches remain uncommitted in this workspace, so the assignment file list and prior reports were used to distinguish Batch 5 scope. No production code, checklist, or manifest was changed by this review. No external service, deployment, commit, or merge was performed. No review-only tests were added.

Execution details and exact results: [`review-batch-5.md`](../../../logs/tasks/student-ticket-activity/review-batch-5.md).
