# Notifications continuation — factual log

Date: 2026-11-08
Task: T03/T04 continuation, specification v0.1

## Preflight and recovery

- Read repository instructions, implementer profile, workflow adapter instructions, product overview, approved notifications specification, task spec/checklist/handoff, delivery plan, existing N-G1 implementation/review reports and logs, UI/API source patterns.
- Confirmed the amended schedule places N-G2 after AM-G3. The orchestrator's assignment limits this continuation to notifications UI/tests/evidence, with account-agent ownership of `src/index.tsx` and dashboard navigation and no guide source edits.
- Inspected the supplied detached `notifications-chain` worktree (`git status --short`, `git ls-files --others --exclude-standard`); both returned no changes or untracked files. There was no partial implementation to recover.
- Confirmed current worktree already had unrelated modifications in `workflow/PLAN.md`, `workflow/specs/account-management.md`, `workflow/tasks/codeclinic-rename/{spec.md,tasks.md}`, plus untracked `.claude/`. Left them untouched.

## Commands

Working directory: `src/codeclinic`

1. `CI=true npx react-scripts test --roots test --testMatch '**/test/Notifications.test.tsx' --watch=false --runInBand` — initial run: 4 passed, 1 failed because the loading/error test's pending fetch mock sequencing did not return the retry response. This was a test fixture issue; no production assertion was weakened.
2. Same command after correcting the fetch mock — exit 0; 1 suite passed, 5 tests passed.
3. `git diff --check` from repository root — exit 0; no whitespace errors.

The full suite and build were intentionally not run; the orchestrator owns them. No browser automation or 320px visual check was run.

During this continuation, other shared-workspace tasks added changes to documentation and unrelated source files. They were not part of this implementer's edits and were preserved.

## Integration handoff

Sent the account agent the following interface details: import `NotificationBell` from `src/notifications/Notifications`; place `<NotificationBell />` in both role navbars; mount `<NotificationInbox ticketHref={...} />` at `/notifications`, with a callback that returns only a ticket URL the current role can open or `null`. No protected integration file was edited.

## Follow-up: per-item action and interaction coverage

The orchestrator requested a per-item read action even when no role-specific ticket route exists, retry behavior for failed read requests, pagination coverage, and confirmation that the bell refreshes after a read. Implemented a **Mark as read** button for route-less items, an actionable retry for failed inbox actions, stale-update guards for unmounted bell/inbox components, and the Unicode bell symbol. Ticket links remain optional through `ticketHref`; role-specific ticket routing remains pending with the role owner.

4. Initial follow-up run of `CI=true npx react-scripts test --roots test --testMatch '**/test/Notifications.test.tsx' --watch=false --runInBand` — 8 passed, 1 failed because the bell's accessible label for a zero count is `Notifications, 0 unread`; corrected the assertion to match the component's accessible name.
5. Same command after the assertion correction — exit 0; 1 suite passed, 9 tests passed.
6. `git diff --check` from `src/codeclinic` — exit 0; no whitespace errors.

## Integrated browser verification — orchestrator

Used an isolated loopback preview of the production build with synthetic API
responses only, through the computer-use browser API. At an observed CSS viewport
of 320px, document.scrollWidth was 320px for the notification inbox. A notification
containing literal script markup rendered as text; no script element appeared in
main. Clicking Mark as read completed, removed the unread marker and disabled
Mark all as read for the now-read fixture. No real account or backend data used.
Screenshot: visual/inbox-320.jpg. Browser viewport override was reset and preview
tab closed. Ticket links remain with the role owners; no invented route was tested.

## Final integrated checks — 2026-11-08

Complete regression: exit 0; 36 suites / 637 tests passed; 3 opt-in tests skipped.
Fresh demo-codeclinic emulator: exit 0; all 3 opt-in integrations passed
(auth, AI loopback/provider/counter/usage, and account/bootstrap/support/session/email).
Build: exit 0, compiled successfully. Primary raw verification output is retained
under logs/tasks/account-management/verification/{regression,build,emulator}.log.
The first combined emulator run failed 429 because fixture registrations shared
the loopback source budget; account setup was isolated through existing persistence
without changing production rate limits. The rerun passed all three suites.
