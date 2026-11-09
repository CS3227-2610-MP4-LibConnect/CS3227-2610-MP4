# Implementation T07: Insights panel on the queue page

Spec: `workflow/specs/ai-ta-assist.md` v0.2 (R4, R5, R6; scenarios 8, 10). Checklist v0.2, handoff v0.2 (human-approved 2026-11-09).
Base: `f88ddf6`, branch `ai-ta-assist-t07`.

## Changed files
- `src/codeclinic/src/TAQueuePage.tsx`: Queue insights panel (heading, "AI suggestion" badge, Generate insights button, loading/error/empty/ready states, truncated and cached notes). Filter label "Concept" renamed "Concept tag".
- `src/codeclinic/src/TAQueuePage.css`: insights panel styles (theme tokens, wrapping, flex-wrap; reuses existing 640px breakpoint).

## Behaviour
- No request until the button is clicked. Click: GET `/api/auth/csrf`, then POST `/api/ta/tickets/insights` with `X-CSRF-Token`, no body. Button disabled while loading.
- Errors map by `code` to the fixed R5 messages; unknown codes and network failures show the "unavailable" message. Server message text is ignored.
- All AI text rendered as React text nodes; ticket links built only from `encodeURIComponent(ticketId)`. No innerHTML.
- Notes: "Based on the oldest 60 active tickets." (truncated), "Cached result." (cached).

## Deviation
- Renamed the existing filter label "Concept" to "Concept tag": the committed test does `getByText('Concept')` for the kind badge, which otherwise matches two elements. Existing test uses `/concept/i`, still passes. Needs orchestrator awareness.

## Verification (from src/codeclinic)
- `CI=true npx react-scripts test --roots test --testMatch '**/test/**/*.test.*' --watchAll=false TAQueuePage ta-ticket-queue.review`: 5 suites, 49 tests passed.
- `npx tsc --noEmit -p .`: exit 0.

## Risks
- Real endpoint (T05) not present; contract assumed from spec/test (`groups[].tickets[]`, `truncated`, `cached`, error `code`). No visual check at 320 px beyond CSS assertions.
