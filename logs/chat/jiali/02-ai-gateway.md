# Coding Agent Interaction Summary: AI gateway

Date: 2026-11-08
Agents:
- Codex (orchestrator `gpt-6-sol`, implementers and reviewers `gpt-6-luna`)
- Claude Code (Claude Opus 5.5), for the earlier foundations covered in [01.md](01.md)

Task ID: `ai-gateway`
Specification: [`workflow/specs/ai-gateway.md`](../../../workflow/specs/ai-gateway.md)

Sessions:
- Codex *Orchestrate AI gateway workflow* (11:57–12:13 UTC)
- The gateway part of Codex *Finish team-based tasks* (14:08–14:55 UTC)

Scope of this summary: the shared AI gateway that every role-specific AI feature calls, from grouping its tasks to the reviewed implementation.

## Objective and context

- CodeClinic needs one server-side path to the SoC LLM (SoCLaaS), so that each role's AI feature reuses the same configuration, secret redaction, size caps, rate limits, output validation and usage records. Without it, each feature would reimplement these.
- A Claude Code session had already written the configuration, redaction and limits (`0566d2c`), then stopped at the hand-over in [01.md](01.md).
- Codex took over as the orchestrator defined in `workflow/agents/orchestrator.toml`. The handoff to it listed the approved artifacts by path and commit; it did not paste their contents.

## Discussion summary

1. The orchestrator proposed a dependency-ordered grouping of the nine tasks:
   - first, T01, T02, T03, T06 and T07 in parallel;
   - then T04 after T01's config shape, and T05 after T03's parse contract;
   - then T08, then T09.

   It also noted that only T06 edits an existing file (`server/auth/firestore-store.js`), so the existing auth tests had to pass unchanged. The human replied "approved". The orchestrator recorded the approval and noted that dispatch needed its own approval.
2. In the later session the human asked Codex to "continue the work that claude code done halfway" on team-level tasks only. Codex found Claude's unfinished gateway transport fixes in temporary worktrees, recovered them, and continued from there instead of redoing them.
3. The gateway reviewer found that the spec did not say what happens to a call without a valid actor, since no per-user usage record can be made for it. The implementation already rejected such calls. The orchestrator proposed wording that makes this explicit, and the human approved the clarification.

## Key decisions and rationale

- **One gateway, many features:** features register a fixed system prompt, a content builder, caps and a parser (`server/ai/features.js`). Shared concerns stay in one place, so the code doesn't repeat itself and each module has one job.
- **Fail closed:** missing `SOCLAAS_*` settings disable the gateway, which returns `AI_UNAVAILABLE` while the rest of the server runs.
- **Spec before code:** the actor ambiguity was settled by amending the spec wording, not by changing behaviour quietly.

## Agents and coordination

| Agent | Model, effort | Job |
| --- | --- | --- |
| Orchestrator (main Codex thread) | `gpt-6-sol`, high | Grouping, dispatch, reconciliation, approval requests |
| `apply_gateway_grouping` | `gpt-6-luna`, medium | Recorded the approved grouping in the task files |
| `gateway_review` | `gpt-6-luna`, high | Independent review of the pipeline and startup wiring |

Agent briefs passed artifact paths, not documents. The reviewer worked from the committed snapshot, not the implementer's context.

## Work completed

- `efea34c` *Complete the shared AI gateway*: pipeline and startup wiring, bounded transport, schema validation and usage store.
- Review: [`workflow/tasks/ai-gateway/review-report.md`](../../../workflow/tasks/ai-gateway/review-report.md), verdict **pass with follow-up**, with a [security review](../../../workflow/tasks/ai-gateway/security-review.md).

## Verification

- The targeted AI tests pass.
- An emulator integration test ran the gateway against a local fake provider and checked the usage record written to Firestore.
- The full suite later passed in the combined change: 645 tests, with three emulator integrations (see [03-account-management.md](03-account-management.md)).

## Resource use

| Thread | Input tokens | Cached | Output | Of which reasoning |
| --- | --- | --- | --- | --- |
| Orchestration session (main) | 2,152,070 | 1,972,096 (91.6%) | 8,527 | 3,808 (44.7%) |
| Its one spawned agent | 384,189 | 339,072 (88.3%) | 4,368 | 713 |

The *Finish team-based tasks* session also covered account management and notifications. Its totals are in [03-account-management.md](03-account-management.md) and are not split by task. Source: the last `token_count` event in each Codex session file.

## Open items and next steps

- Role-specific features had to register with the gateway. The TA features did so in [07-ai-ta-assist.md](07-ai-ta-assist.md).
