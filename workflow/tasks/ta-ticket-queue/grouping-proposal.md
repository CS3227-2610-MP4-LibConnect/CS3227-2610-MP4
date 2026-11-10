# Grouping proposal: ta-ticket-queue

Status: PROPOSAL ONLY. Not approved. `tasks.md` has not been edited.
Proposal version: 0.1 (2026-11-09)
Specification: `workflow/specs/ta-ticket-queue.md` v0.1 (human-approved 2026-11-09)
Checklist: `workflow/tasks/ta-ticket-queue/tasks.md` v0.1 (human-approved 2026-11-09)
Handoff: `workflow/tasks/ta-ticket-queue/handoff.md` v0.1 (human-approved 2026-11-09)

Grouping approval: pending. Only the human can approve the grouping. Once
approved, the grouper may add group headings to `tasks.md` and reorder whole,
unchanged items only when dependencies stay satisfied.

## Proposed groups

Groups run in order. Tasks inside one group run concurrently in separate
worktrees.

### Group 1: foundation

- T01 Ticket store and state machine

Rationale: T02 through T07 all depend on the store interface, so this runs alone.

### Group 2: queue API

- T02 Queue list and detail API

Rationale: T02 needs T01's store. It creates `server/tickets/ta-routes.js`,
which T03 and T04 extend, and it mounts the router in `server/index.js`. T06
and T07 need its response shapes. Runs alone.

### Group 3: write API and queue page

- T03 Claim, unclaim, and resolve API
- T06 Queue page

Rationale: T03 needs T01 and T02. T06 needs T01 and T02 response shapes.
No shared file: T03 touches `server/tickets/` and new API tests; T06 touches
`src/index.tsx`, `server/index.js` (SPA path), `src/AppHeader.tsx`,
`src/TADashboard.tsx`, and new component tests.

### Group 4: reply API and ticket detail page

- T04 Reply API
- T07 Ticket detail page

Rationale: T04 extends `ta-routes.js` after T03 (both edit that file, so they
cannot share a group). T07 edits `src/index.tsx`, `server/index.js`, and
`src/AppHeader.tsx`, which T06 edited in Group 3, so it must come after
Group 3. T07 also depends on T02 (detail shape) and the R3-R6 endpoint
contracts. Its component tests mock the endpoints (see condition C3).

### Group 5: emulator integration tests

- T05 Emulator integration tests

Rationale: T05 needs the claim, reply, and resolve notifications, which T03 and
T04 add through `notify`. It also depends on T01. It runs alone because the
checklist's listed dependencies for T05 do not include T06 or T07 and it has
no file overlap with them, so it could be grouped with T07 if preferred (see
C4).

### Group 6: guides and evidence

- T08 Guides and evidence

Rationale: T08 runs the full suite, the emulator suite, and the build, and
updates the guides. It depends on every other task. Runs alone.

## Dependency check

| Task | Depends on | Group | Dependencies are in earlier groups? |
| --- | --- | --- | --- |
| T01 | none | 1 | yes |
| T02 | T01 | 2 | yes (G1) |
| T03 | T01, T02 | 3 | yes (G1, G2) |
| T06 | T01, T02 | 3 | yes (G1, G2) |
| T04 | T01, T02, T03 (ta-routes.js) | 4 | yes (G1, G2, G3) |
| T07 | T02, T06 (shared src files), endpoints R3-R6 | 4 | yes (G2, G3); R3-R6 via mocks (see C3) |
| T05 | T01, T03, T04 (notification docs) | 5 | yes (G1, G3, G4) |
| T08 | all | 6 | yes (G1-G5) |

Order: T01 < T02 < {T03, T06} < {T04, T07} < T05 < T08. This order satisfies
every stated dependency.

## Collision handling

| File | Tasks that edit it | Handling |
| --- | --- | --- |
| `server/tickets/ta-routes.js` | T02 (create), T03, T04 | T02 alone in G2. T03 in G3, T04 in G4, so they never run concurrently. |
| `server/index.js` | T02 (mount), T06 (SPA path), T07 (SPA path) | T02 (G2), T06 (G3), T07 (G4): one per group. |
| `src/index.tsx` | T06, T07 | Separate groups (G3, G4). |
| `src/AppHeader.tsx` | T06, T07 | Separate groups (G3, G4). |
| `src/TADashboard.tsx` | T06 only | No collision. |
| `src/NotificationsRoute.tsx` | T07 only | No collision. |
| `test/` new files | T02-T07 | Each task writes its own new test files. No shared test helper is listed in the checklist. |

No file is edited by two tasks in the same group.

## Conditions for the human

- C1. Grouping is a human decision. The grouper must not write these groups to
  `tasks.md` until approved.
- C2. Each implementer must create only new test files, or leave shared
  fixtures unchanged. If a shared test helper is needed, the orchestrator must
  decide who owns it before dispatch.
- C3. T07 is in Group 4, concurrent with T04. The checklist does not list T03
  or T04 as dependencies of T07, so T07's component tests mock the R3-R6
  endpoints. If the human wants T07 tested against the live endpoints, move
  T07 to Group 5 (it shares no file with T05, so this is safe).
- C4. T05 is in Group 5 alone. Grouping it with T07 in Group 5 is also safe
  if the human prefers that layout.
- C5. Handoff note: the handoff's collision note says T03 and T04 may run in
  separate handler modules. This proposal runs them sequentially instead,
  which needs no change to the checklist.

## Wall-clock summary

Six groups, against eight tasks run one at a time. Maximum concurrency is 2
(Groups 3 and 4).

## Task coverage check

Each of T01-T08 appears exactly once in the groups above:

- Group 1: T01
- Group 2: T02
- Group 3: T03, T06
- Group 4: T04, T07
- Group 5: T05
- Group 6: T08

Total: 8 tasks. Each appears once. No task is added, removed, or reworded.

## Not done in this proposal

- `tasks.md` was not edited. Its checkboxes are unchanged (all unchecked).
- No branch, commit, or push.
