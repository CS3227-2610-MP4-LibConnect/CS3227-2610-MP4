# UI consistency and feedback — implementation report

Date: 2026-11-09 (Asia/Singapore)
Task/spec/checklist/handoff: `ui-consistency-and-feedback` v0.1.
Branch: `codex/ui-consistency-and-feedback`, implementation based on66517a7.
Status: all six implementation tasks independently verified. On 2026-11-09,
the human replied "approved, commit bah", approving the reviewed result and
requesting a local commit. No push, merge or deployment was requested.

## Delivered behavior

The authenticated pages share one consistent role-aware header with grouped
navigation, visible active/focus/hover treatment and a decorative outline bell
instead of an emoji. The Notifications inbox retains the menu across loading,
empty, populated and failed states, including manager lookup retry. Account
forms show safe, specific feedback beside the affected field, focus that field,
clear stale errors on correction, and distinguish current/temporary password
mismatch from session expiry, attempt limits and service/request failures.
Validation errors no longer offer a page-reload Retry button.

Authorization, ownership, CSRF, rate policy, password limits, confirmation flows,
session invalidation and one-time temporary-password behavior remain intact.
No dependencies, database models, login/registration policies, CI or deployment
configuration changed.

## Scope and task evidence

Twelve production source files and six test files changed. The exact list and
SHA-256 values are in [the final manifest](../../../logs/tasks/ui-consistency-and-feedback/review-source-manifest.json);
the complete final diff includes new files in
[implementation.patch](../../../logs/tasks/ui-consistency-and-feedback/implementation.patch).

| Task | Result and item evidence |
| --- | --- |
| U01 | Shared AppHeader/CSS and SVG bell; [implementation-U01.md](implementation-U01.md) |
| U02 | Dashboard/account/support/restricted-header integration and CSS cleanup; [implementation-U02.md](implementation-U02.md) |
| U03 | Persistent Notifications navigation, manager retry and protected logout; [implementation-U03.md](implementation-U03.md) |
| U04 | Typed self-account feedback with preserved policy; [implementation-U04.md](implementation-U04.md) |
| U05 | Form-specific accessible feedback and recovery; [implementation-U05.md](implementation-U05.md) |
| U06 | Combined tests, build and responsive evidence; [implementation-U06.md](implementation-U06.md) |

## Verification and review

- Final independent combined regression run: **14 suites, 239 tests passed**.
- Final independent production build: passed. The initial CI lint failure and
  the two scoped corrections remain in the logs; post-correction focused tests
  and the final independent combined run passed. A nonfatal Node deprecation
  warning is recorded.
- Synthetic browser checks: all three roles at 320/640/1280 CSS pixels, no
  horizontal overflow or overlapping controls, at least 42px navigation targets,
  visible focus/hover, correct error placement/ARIA/focus/correction, and retained
  inbox navigation. [Visual evidence](../../../logs/tasks/ui-consistency-and-feedback/visual-verification.md).
- Independent reviews all pass with no remaining findings. The initially
  reported API issue was disproved by executed requests and withdrawn; its
  history is retained. [Review reconciliation](review-report.md).

No real user records, secrets, external services or cloud databases were used.
Browser checks used a separate mock-only preview on port4174, leaving the user's
existing local app untouched. The temporary preview process and tab were closed,
and viewport overrides reset. The local implementation branch and isolated
review worktree remain available. Live deployment/backend testing was outside
scope; no such result is claimed. No material scope deviation or unresolved
implementation risk remains.

## Subagent token usage

Each row is a separate runtime run, including follow-ups. All were dispatched
with the repository profile's configured gpt-6-luna model; runtime model/token
metrics were not exposed. Reviewers used configured high reasoning; other
roles used medium. No session IDs, prompts or estimated counts are retained.

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | --- | --- | --- | --- |
| Test writer | Initial acceptance coverage | gpt-6-luna configured; runtime unavailable | unavailable | unavailable | unavailable | unavailable |
| Test writer | Coverage follow-up | gpt-6-luna configured; runtime unavailable | unavailable | unavailable | unavailable | unavailable |
| Task grouper | Initial proposal | gpt-6-luna configured; runtime unavailable | unavailable | unavailable | unavailable | unavailable |
| Task grouper | Apply human-approved grouping | gpt-6-luna configured; runtime unavailable | unavailable | unavailable | unavailable | unavailable |
| Implementer | U01 initial | gpt-6-luna configured; runtime unavailable | unavailable | unavailable | unavailable | unavailable |
| Implementer | U01 responsive CSS follow-up | gpt-6-luna configured; runtime unavailable | unavailable | unavailable | unavailable | unavailable |
| Implementer | U04 | gpt-6-luna configured; runtime unavailable | unavailable | unavailable | unavailable | unavailable |
| Implementer | U02 | gpt-6-luna configured; runtime unavailable | unavailable | unavailable | unavailable | unavailable |
| Implementer | U03 initial | gpt-6-luna configured; runtime unavailable | unavailable | unavailable | unavailable | unavailable |
| Implementer | U03 lint follow-up | gpt-6-luna configured; runtime unavailable | unavailable | unavailable | unavailable | unavailable |
| Implementer | U05 initial | gpt-6-luna configured; runtime unavailable | unavailable | unavailable | unavailable | unavailable |
| Implementer | U05 lint follow-up | gpt-6-luna configured; runtime unavailable | unavailable | unavailable | unavailable | unavailable |
| Implementer | U06 verification | gpt-6-luna configured; runtime unavailable | unavailable | unavailable | unavailable | unavailable |
| Reviewer | U01–U03 navigation | gpt-6-luna configured; runtime unavailable | unavailable | unavailable | unavailable | unavailable |
| Reviewer | U04 API initial | gpt-6-luna configured; runtime unavailable | unavailable | unavailable | unavailable | unavailable |
| Reviewer | U04 disputed-finding probe | gpt-6-luna configured; runtime unavailable | unavailable | unavailable | unavailable | unavailable |
| Reviewer | U05/U06 initial | gpt-6-luna configured; runtime unavailable | unavailable | unavailable | unavailable | unavailable |
| Reviewer | U05/U06 final combined run | gpt-6-luna configured; runtime unavailable | unavailable | unavailable | unavailable | unavailable |

Aggregate token usage: unavailable. No numeric total can be derived from the
runtime-provided evidence.
