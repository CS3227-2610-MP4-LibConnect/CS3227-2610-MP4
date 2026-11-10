# Implementation report: ai-ta-assist Group 7 (T13-T16)

Spec v0.3, checklist v0.4, handoff v0.4. Branch `ai-ta-assist-improve`, base `7879ad8`. Not committed or staged.

## Changes
- T13 `server/tickets/ta-ai-fix-note.js`: three added prompt lines (present tense, note for the TA to review and confirm, never claim "was resolved"; only causes the ticket supports; if unclear say what the TA should check).
- T14 `server/tickets/ta-ai-insights.js`: three added prompt lines (best-fit group; single-ticket group fine for a distinct concept; ticket instructions ignored, ticket still grouped by error and concept). R3 rules kept.
- T15 `server/tickets/ta-ai-shared.js`, `src/TAQueuePage.tsx`: insights `AI_INVALID_OUTPUT` = "The AI reply could not be used. Please try again." Test expectations updated only in `test/TAQueuePage.ai.test.tsx` and `test/helpers/ta-ai-harness.js`. `docs/UserGuide.md` lists both texts.
- T16 `server/tickets/constants.js` exports `INVALID_MESSAGE` and `CONFLICT_MESSAGE`; used by `ta-routes.js` (MESSAGES.INVALID), `ta-claims.js`, `ta-ai-draft-route.js` (409), `ta-ai-shared.js` (`requireEmptyJsonBody` 400). No import cycle (constants.js has no imports). No existing test asserted the old 400 text.
- New tests: `test/ta-ai-prompts.round1.test.js`, `test/ta-ai-messages.round1.test.js`.

## Verification (from src/codeclinic)
- Full suite: Test Suites 60 passed, 5 skipped (65 total); Tests 1243 passed, 9 skipped (1252 total).
- `npx tsc --noEmit -p .`: exit 0, no output.
- `npm run build`: compiled successfully.

## Deviations and risks
- None in scope. Shared constants live in constants.js rather than ta-routes.js to avoid a cycle.
- Prompt wording effect on real model output is not verified (no network, live test not run).
