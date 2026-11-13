# Coding Agent Interaction Summary: user-testing fixes

Date: 2026-11-10 to 2026-11-11
Agent: Claude Code (Claude Opus 5.5), single agent
Sessions:
- Claude Code `16256877` (08:09–15:24 UTC on 10 Nov);
- Claude Code `f234202c` (09:52–10:39 UTC on 11 Nov).

Branch and PR: `user-testing-fixes`, merged as PR #10
Scope of this summary: defects the human found while testing the app by hand, their fixes, and the branch clean-up afterwards.

## Objective and context

- The human tested the app themselves and reported problems with screenshots. Each fix was small, so no subagents were used: one agent fixed, tested and committed each one with the human's approval.

## Discussion summary

Each report was confirmed against the code before it was fixed:

| Human report | Cause found | Fix |
| --- | --- | --- |
| Registration error vague (for example, the email already exists) | Generic message for every failure | `e07d622` specific duplicate-email error (the human chose option 1) |
| Unclear error after many sign-ins | Rate-limit response shown generically | `127f919` specific 429 message |
| Gateway disabled although the README was followed exactly | `SOCLAAS_*` missing from the local run | README and run instructions clarified |
| Vague sign-in error for some accounts | Inactive and wrong-type sign-ins shared one message | `64da3fb` explains inactive and wrong-type sign-ins, after the human approved spec v0.4 |
| "User can register TA and student with the same email" | Not reproducible: the agent tested both orders in the human's local setup, and each returned `409` "An account with this email already exists". The human's TA account simply had not been activated yet ("oh my bad") | No change |
| A Coordinator could try to deactivate themselves | The server already refused it, but the TAs page showed Deactivate and Reset password on the Coordinator's own row, so clicking them only gave a vague error | `0febd6a` hides support actions on your own row |
| The red error box | Support failures not explained | `5ed71f7` explains support action failures |
| Temporary-password panel unclear ("Hide password", and a message out of order) | Layout and wording | `023fa53` redesigned panel |
| The TAs page loads slowly | Concurrent requests contending on the session record | `f26b399` stops the contention, and `33fa27c` reuses the account the route guard already loaded |
| Bootstrapping a test Coordinator always failed with "Bootstrap failed" | The script called `app.firestore()`, which the installed `firebase-admin` no longer provides; its tests covered only the promotion logic | `7e11b3c` uses the modular entry points, as the server does, and tests the command entry point |

Merging `origin/main` into the branch fused two Firestore index entries; `cc86863`/`b527998` split them and fixed the index test.

As requested by human, the agent also:
- moved the human's personal ignore rules (`notes.md`, `.env`) into `.git/info/exclude`, so `.gitignore` no longer needed a local edit;
- discarded a stale local `apphosting.yaml`, since `main` already had the three AI settings;
- deleted 26 local branches, after checking that every one was fully merged into `main`;
- pruned a stale worktree entry.

## Key decisions and rationale

- **Confirm before fixing:** the duplicate-email report turned out to be expected behaviour, so nothing changed.
- **Requirement changes go through the spec:** distinguishing inactive from wrong-type sign-ins changed what the user is told, so spec v0.4 was approved first.
- **Error messages stay generic about accounts:** messages became specific about what the user can fix, without revealing to strangers whether an account exists beyond what the approved spec allows.
- **Least destructive clean-up:** branches were deleted only after a merged check (`git branch -d`). Remote branches were left alone.

## Agents and coordination

- One agent, by design. The tasks were small and each needed the human's eyes on the UI, so extra agents would only have added coordination cost.
- The human supplied a local test account in chat so the agent could reproduce the slow TAs page. That value is deliberately left out of this log.

## Work completed

The commits are listed in the table, plus `cc86863`/`b527998` (indexes). They were merged through PR #10 and PR #11.

## Verification

- Each fix had tests added or updated and the relevant suites run before its commit. The human then checked the UI locally.
- The index fix was checked by the indexes test, and the indexes were deployed (see [09-environments-and-deployment.md](09-environments-and-deployment.md)).

## Resource use

Claude Code usage, counted once per API message:

| Session | Calls | Cache read | Cache write | Uncached input | Output | Cache-hit rate |
| --- | --- | --- | --- | --- | --- | --- |
| `16256877` | 233 | 40,741,665 | 664,663 | 570 | 122,914 | 98.4% |
| `f234202c` | 16 | 912,430 | 57,494 | 42 | 5,898 | 94.1% |

The second session started fresh. It got its bearings with two git checks (branch state and the exclude list) and reported the state in its first reply. The whole close-out took 16 calls.

## Open items and next steps

- None from this task.
