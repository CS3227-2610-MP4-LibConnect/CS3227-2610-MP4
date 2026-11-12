# Coding Agent Interaction Summary: notifications

Date: 2026-11-08
Agent: Codex (orchestrator `gpt-6-sol`, implementer and reviewer `gpt-6-luna`)
Session: Codex *Finish team-based tasks* (14:08–14:55 UTC), the notifications part
Task ID: `notifications`
Specification: [`workflow/specs/notifications.md`](../../../workflow/specs/notifications.md)
Scope of this summary: the shared notification writer, the user's own inbox API, the navigation bell, and the inbox page.

## Objective and context

- Ticket events in both roles, such as a TA claiming or resolving a ticket, need to reach users. One shared writer and inbox avoids a separate implementation for each feature.
- Claude Code had written the notification writer and inbox API (`6dcbeb9`). Codex finished the UI.

## Discussion summary

1. Codex dispatched `notification_impl` in parallel with the account work. The two had separate files, with one shared mount point in `server/index.js`.
2. Integration exposed two issues:
   - notification requests interfered with mocked login responses in older UI tests (fixture-only fix, approved by the human; see [03-account-management.md](03-account-management.md));
   - forced-password restrictions also had to cover `/api/notifications`. This was flagged in the account security review (`security-review-AM-G1.md`) and covered by the case-insensitive guard.
3. A test environment error turned out to be missing Node timer globals in the browser-like test setup. It was fixed in the fixtures without changing production behaviour.

## Key decisions and rationale

- **Plain-text rendering:** inbox messages render as text, never HTML, so stored content cannot inject markup. A browser check confirmed it.
- **Own-user only:** the inbox API reads and marks only the signed-in user's notifications, as resolved on the server.
- **Reusable components before pages:** `4f40034` adds the inbox components before `9a33dc5` integrates them, so each commit builds.

## Agents and coordination

| Agent | Model, effort | Job |
| --- | --- | --- |
| `notification_impl` | `gpt-6-luna`, medium | Bell, inbox page and UI tests |
| Reviewer (shared with the guides review) | `gpt-6-luna`, high | Independent review |

## Work completed

- `4f40034` *Add reusable notification inbox components*
- Evidence: [`workflow/tasks/notifications/`](../../../workflow/tasks/notifications/) and the visual check [`logs/tasks/notifications/visual/inbox-320.jpg`](../../tasks/notifications/visual/inbox-320.jpg).

## Verification

- Part of the 645-test passing suite and three emulator integrations.
- Browser check at 320 CSS pixels: no horizontal overflow, markup shown as text, and marking an item as read works.

## Resource use

Shared with the rest of the session; see the table in [03-account-management.md](03-account-management.md). Codex does not report usage per task, so this task's share cannot be separated.

## Open items and next steps

- Ticket features had to call the shared writer. The TA queue does so on claim, reply and resolve (see [06-ta-ticket-queue.md](06-ta-ticket-queue.md)).
