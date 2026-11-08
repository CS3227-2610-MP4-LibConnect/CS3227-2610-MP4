# Group 1 integration — factual log

Date: 2026-11-08
Task ID: `codeclinic-rename`
Integration worktree: branch `codeclinic-rename-g1`, base `2892dfe`

## Base-commit incident

The `isolation: worktree` runtime created both implementer worktrees at
`0d26cd6` (`main`) instead of `2892dfe` (`codeclinic-scope`).

- T02 run 1 found the approved task files missing, stopped without changes, and
  its worktree was cleaned up. The orchestrator created a worktree from
  `2892dfe` manually (branch `codeclinic-rename-t02`) and re-dispatched T02.
- T01 fast-forwarded its clean worktree branch to `2892dfe` with
  `git merge --ff-only` before making changes, and recorded this deviation.

## Integration steps

1. `git worktree add -b codeclinic-rename-g1 <wt>/g1 2892dfe`
2. Exported each implementer's uncommitted changes with
   `git add -A -N . && git diff --binary` and applied them with
   `git apply --index`. Both patches applied without conflicts; the two tasks
   changed no common file.
3. Integration fix, a label rename only: in `test/LoginPage.integration.test.tsx`,
   the two radio selectors `{ name: /librarian/i }` became `{ name: /^ta$/i }`,
   matching T02's TA label. T01 had flagged this as needed at merge. No
   assertion changed.
4. `npm ci --no-audit --no-fund --cache <scratchpad>/npm-cache`: 1603 packages
   added.
5. `CI=true npm test -- --watch=false`: Test Suites 18 passed, 1 skipped (19);
   Tests 261 passed, 1 skipped (262). The skipped suite is the opt-in Firestore
   emulator test.
6. `npm run build`: Compiled successfully.

## Subagent token usage

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| task_grouper | grouping, run 1 | claude-opus-5-5 | unavailable | unavailable | 43,012 | Claude Code task completion notification |
| implementer | T02, run 1 (stopped: wrong base) | claude-opus-5-5 | unavailable | unavailable | 35,191 | Claude Code task completion notification |
| implementer | T02, run 2 | claude-opus-5-5 | unavailable | unavailable | 76,509 | Claude Code task completion notification |
| implementer | T01, run 1 | claude-opus-5-5 | unavailable | unavailable | 102,906 | Claude Code task completion notification |
| reviewer | G1 review, run 1 | claude-opus-5-5 | unavailable | unavailable | 97,199 | Claude Code task completion notification |

Each subagent reported its own counts as unavailable. The totals come from the
runtime notification. The aggregate across these five runs is 354,817 tokens.

Review finding F7 (no T01 row) is incorrect: the T01 row was present when the review ran.

## Human decisions

- 2026-11-08: The human approved committing G1 and merging it into `codeclinic-scope`, and gave a standing approval for the remaining `codeclinic-rename` and `ai-gateway` groups: after an independent review with no Critical or High findings, the orchestrator commits (SE-EDU style, no AI attribution) and merges into `codeclinic-scope`, then dispatches the next group. Critical or High findings, or spec, scope, or security changes, still require the human. No push or deployment.
