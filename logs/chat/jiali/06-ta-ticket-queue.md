# Coding Agent Interaction Summary: TA ticket queue

Date: 2026-11-09
Agent: Claude Code (orchestrator Claude Opus 5.5, with Sonnet, Haiku and Opus subagents)
Session: Claude Code `8ed011cc` (06:56–09:45 UTC)
Task ID: `ta-ticket-queue`
Specification: [`workflow/specs/ta-ticket-queue.md`](../../../workflow/specs/ta-ticket-queue.md)
Scope of this summary: the first TA-role feature, covering the queue list, ticket detail, claim and unclaim, replies, resolve with a fix note, and Firestore indexes.

## Objective and context

- The human took ownership of the TA role: "from now on, you should only work on this role". They also asked the agent to keep `notes.md` updated with their work as manager, and with ideas for making the agent and its subagents more efficient.
- **Blocker found during discovery:** the queue depends on the Ticket/Reply data model, and the Student owner had not written that spec yet. With the human's approval, the TA spec defined the shared ticket contract itself (section C), and the human told their teammate about it.

## Discussion summary

1. The analyst drafted the spec with four open questions (Q1–Q4). The human asked for classification, then approved the proposed answers.
2. The human asked for `.agents/skills` to be linked as `.claude/skills` so skills load automatically. They also said never to commit `.claude/` or `notes.md`, and approved the checklist and handoff.
3. The planning files were committed first (`3203bb1`), so the teammate could read the ticket contract right away.
4. The test writer and task grouper ran in parallel. The grouper proposed six serial groups. The orchestrator suggested a less serial five-group plan, which went into `tasks.md`. The grouper had also spotted that T02 would run before T04's reply module existed. The fix: T03 and T04 each add one mount line to `ta-routes.js`, and the orchestrator resolves the expected conflict when it merges them.
5. The implementers ran in separate git worktrees, one branch per task, sharing a symlinked `node_modules` so they didn't need to install anything or use the network. Group 3 ran three implementers in parallel.
6. **Mistake caught:** the orchestrator told T01 to read `.claude/skills/...`, but `.claude/` is untracked, so it doesn't exist in a worktree. The orchestrator checked T01's work itself and corrected later briefs.
7. An independent Opus reviewer, working in a fresh worktree, returned **pass with follow-up**: no Critical, High or Medium findings, and Low findings L1–L4 plus spec clarification F1 ([review report](../../../workflow/tasks/ta-ticket-queue/review-report.md)).
   - L1–L3 and F1 were fixed (`90effbe`), with the spec amended for F1 first (`1201090`).
   - The re-review found N1: a "Claimed by you" badge appeared on resolved tickets. It was fixed in `8727ef6`.
   - L4, duplicated helpers in replies, was later tidied in `d1b9165`.
   - Final verdict: **pass**.
8. A committed emulator debug log was found and removed (`ef05784`), and an ignore rule was added (`2f0ad51`).
9. T09 added Firestore composite indexes for the queue queries (`4922f7a`), with its own review.
10. A teammate reported that auto-deployment was set up. The human then had the index file referenced in `firebase.json` and deployed the indexes themselves (`53bd2f5`).

## Key decisions and rationale

- **Spec defines the shared contract:** this unblocked the TA work without waiting on the other role, and the contract was committed early so the teammate could check it.
- **Different models for different jobs:** Haiku for grouping, Sonnet for writing tests and implementing, and Opus for independent review. Cheap models did the routine work; the strongest model did the job where a missed defect costs most.
- **A spec change comes before the code change:** F1 was settled by amending R1 and R2 before code changed.
- **Briefs list paths, not file contents:** each subagent got file paths, versions, the sections to read, and a strict list of files it could write.

## Agents and coordination

| Agent | Model | Job |
| --- | --- | --- |
| Orchestrator (main thread) | Opus | Spec, approvals, dispatch, merges, evidence |
| Test writer | Sonnet | 6 test files and a fixtures helper (about 2,000 lines) covering T01–T07; every acceptance scenario has at least one test |
| Task grouper | Haiku | Grouping proposal (about 50,700 tokens, 5 tool calls) |
| Implementers T01–T09 | Sonnet | One task each, in its own worktree |
| Reviewer | Opus | Independent review and re-reviews |

## Work completed

Commits `3203bb1`..`a4db687` (32 `TA queue:` commits), including:
- the store and state machine (`e8349e1`);
- the list and detail API (`d9a7f27`);
- claim, unclaim and resolve (`8c74d73`);
- replies (`d179fce`);
- the queue page (`f6a7a28`) and ticket page (`ded795b`);
- guides (`5628e32`);
- indexes (`4922f7a`).

Evidence: [`workflow/tasks/ta-ticket-queue/`](../../../workflow/tasks/ta-ticket-queue/) and 14 factual logs in [`logs/tasks/ta-ticket-queue/`](../../tasks/ta-ticket-queue/).

## Verification

- The tests were run before implementation and failed only because the code did not exist yet.
- The orchestrator re-ran each task's target tests itself. For example, T01 had 103 target tests passing, and only its five allowed files changed.
- The full suite was run after each merge. Emulator integration covers concurrent claims; only one TA can win a claim.
- The reviewer's probes are recorded in the review log: for example, a `text/plain` body on claim was accepted (L1), and a crafted cursor gave a `503` (L3).

## Resource use

Claude Code usage, counted once per API message:

| Thread | Calls | Cache read | Cache write | Uncached input | Output | Cache-hit rate |
| --- | --- | --- | --- | --- | --- | --- |
| Orchestrator | 182 | 39,524,610 | 326,852 | 436 | 186,679 | 99.2% |
| 13 subagents | 217 | 14,946,714 | 1,785,317 | 448 | 236,996 | 89.3% |

The orchestrator's long-lived context cost about 2.6 times all subagents together. A first count that summed every transcript line came out about twice too high, because Claude Code repeats a message's usage on each of its content blocks.

## Open items and next steps

- `ai-ta-assist` 
