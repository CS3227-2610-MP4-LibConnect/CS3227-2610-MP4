# Coding Agent Interaction Summary: TA AI assist

Date: 2026-11-09 to 2026-11-10
Agent: Claude Code (orchestrator Claude Opus 5.5, with Sonnet implementers and Opus reviewers)
Sessions:
- end of Claude Code `8ed011cc` (spec, 9 Nov);
- Claude Code `7d561e13` (12:40 UTC on 9 Nov to 07:41 UTC on 10 Nov).

Task ID: `ai-ta-assist`
Specification: [`workflow/specs/ai-ta-assist.md`](../../../workflow/specs/ai-ta-assist.md)
Scope of this summary: the TA role's two LLM features (Fix Note Drafter and Queue Insights), their security controls, live SoCLaaS checks, and six rounds of prompt improvement measured against live runs.

## Objective and context

- The MP4 brief requires at least one LLM feature per role. The TA features are:
  - **Draft with AI:** drafts a fix note for a claimed ticket;
  - **Queue insights:** groups active tickets by shared misconception.
- Both features go through the shared gateway ([02-ai-gateway.md](02-ai-gateway.md)). Their output is advisory: it never changes a ticket by itself.
- The human checked that insights are built from the ticket contents students provide, then approved spec v0.1.

## Discussion summary

1. Implementation ran in dependency order. T01 added the shared helpers. T02 and T03, the two feature definitions, ran in parallel. T04–T07, the endpoints and UI, ran as four parallel worktrees. The orchestrator checked reuse during merges; for example, T03 had to use T01's `errorSummary`.
2. **Live debugging without seeing secrets.** Live run 1 returned 503s without ever reaching SoCLaaS, because CRA's Jest 27 has no `fetch`. A test-only Jest environment fixed it (`c91ff81`). The orchestrator diagnosed it from the transport's failure category and HTTP status only, never from the key or the reply body. Live run 4 passed 4/4.
3. An independent Opus reviewer worked in a clean, detached checkout with no `.env` and no network. It found F1–F4:
   - an unbounded cache;
   - empty-queue text shown too widely;
   - the live test not counting retries;
   - a missing report.

   They were fixed as T10–T12 (`5cf2173`, `60c9074`, `6b12767`) and closed after a re-review (`3d8c4e8`).
4. At the human's explicit request, the orchestrator ran live run 5 itself, a one-time deviation from the handoff that is recorded in the report. It passed 4/4.
5. The human asked for "2 rounds of improvement-testing-improvement-testing" before opening the PR. The spec and checklist were amended first (`d133576`). Rounds 1–2 improved the prompts, messages and insights coverage.
6. **Measured rounds.** Each round was run live several times and scored against fixed security and behaviour checks:
   - Rounds 1–2: insights coverage rose from 4/6 and 5/6 to 6/6 and 6/6, and drafts with an unsupported cause fell from 2/2 to 0/2.
   - Round 3: the injected-instruction ticket was grouped in 10/10 runs, up from 3/5. Hedged drafts fell to 1/40, from 3/20. All runs passed 46/46 checks. This work came from another agent run by the human, after the orchestrator's dispatched implementer failed on the usage limit; the orchestrator verified it independently.
   - Round 4: drafts restate the displayed output instead of guessing its cause. The final 5 runs passed 51/51 checks with 7/7 coverage.
   - Round 5: drafts are limited to what the ticket mentions.
   - Round 6: the human pointed out that "name only what's in the ticket" could stop a draft from suggesting the right library. The drafter now always states a concrete fix, and the name limits apply to the problem, cause and checks, not the fix. All 5 runs passed 56/56 checks.

## Key decisions and rationale

- **Secrets stay with the human:** no subagent ever had the API key. Live runs used the human's `.env`, and the logs record only counts and statuses.
- **Output is advisory and checked:** model output is parsed against a strict schema and shown as plain text labelled **AI suggestion**. A draft never submits, and resolving still needs **Resolve…** and **Confirm resolve**.
- **Prompt changes are tested like code:** each round has a spec amendment, an implementation, a live measurement against fixed checks, and an independent review.
- **Resource-aware AI use:** insights are generated only on request, cover the oldest 60 active tickets, and are cached for 5 minutes while the queue is unchanged. Expired entries are pruned. The live test fails if the provider needs more than one retry.

## Agents and coordination

| Agent | Model | Job |
| --- | --- | --- |
| Orchestrator | Opus | Dispatch, merges, live-run analysis, evidence |
| Test writer | Sonnet | Stub-gateway tests for T01–T07 |
| Implementers T01–T26 | Sonnet | One task each, in its own worktree |
| Reviewers | Opus | Initial review, re-review, and a review of each improvement round |

## Work completed

- 38 `TA AI:` commits, from `9f34c4e` (spec) to `d558067` (round 6 results).
- Evidence: [`workflow/tasks/ai-ta-assist/`](../../../workflow/tasks/ai-ta-assist/): implementation reports T01–T26, `review-report.md`, `security-review.md` and `test-coverage-report.md`, with 45 factual logs in [`logs/tasks/ai-ta-assist/`](../../tasks/ai-ta-assist/).

## Verification

- Stub suites and the full regression run after each merge; 1275 tests at round 3.
- `tsc` and the build were clean.
- Live SoCLaaS runs as listed above. The fix counts in round 6 were checked by hand, because the keyword metric is only a rough proxy (log 44).

## Resource use

Claude Code usage for `7d561e13`, counted once per API message:

| Thread | Calls | Cache read | Cache write | Uncached input | Output | Cache-hit rate |
| --- | --- | --- | --- | --- | --- | --- |
| Orchestrator | 315 | 99,185,111 | 1,937,942 | 764 | 297,576 | 98.1% |
| 28 subagents | 259 | 15,105,866 | 1,650,085 | 516 | 282,095 | 90.1% |

The orchestrator read about 6.6 times as many cached tokens as all subagents together, because its context grew across the whole multi-round session. The usage limit was reached once mid-session (9 Nov); work resumed after the reset without repeating completed steps.

## Open items and next steps

- The live checks do not measure whether a draft suggests the *right* fix. Correctness of fixes was judged by hand.
- The Student role's AI feature belongs to the teammate and is not covered here.
