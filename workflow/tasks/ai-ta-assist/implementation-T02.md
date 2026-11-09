# Implementation report: ai-ta-assist T02 (Fix Note Drafter definition)

Spec `workflow/specs/ai-ta-assist.md` v0.2; checklist v0.2; handoff v0.2 (all human-approved 2026-11-09). Base `6ea07a4`, branch `ai-ta-assist-t02`.

## Changed files (under `src/codeclinic/`)
- new `server/tickets/ta-ai-fix-note.js`

## Exports
`FIX_NOTE_DRAFTER` (frozen feature definition): `feature: 'FIX_NOTE_DRAFTER'`, fixed `systemPrompt` (no interpolation), `buildUserContent(input) -> string`, `maxInputChars: 16000`, `maxOutputTokens: 700`, `parse(output) -> { ok: true, data: { draft } } | { ok: false }`.

- `buildUserContent` reads only title, language, conceptTags, errorOutput, expectedBehaviour, actualBehaviour, attempted, files (name + content) and replies (message, authorRole, createdAt). Replies are sorted oldest first (stable) and labelled `[STUDENT]` or `[TA]` only. Names, emails, user IDs, ticketId, repoUrl and repoFilePaths are never read.
- `parse` accepts exactly one key `draft` (string), trimmed, 1-2000 chars; the trimmed draft is returned unaltered otherwise (no HTML handling).

## Verification (from `src/codeclinic`)
- `CI=true npx react-scripts test --roots test --testMatch '**/test/**/*.test.*' --watchAll=false ta-ai-fix-note ta-ai-shared`: 2 suites passed, 56/56 tests passed.
- Full suite not run (orchestrator will run it after merging Group 2).

## Deviations and risks
- None. Any `authorRole` other than `TA` is labelled `STUDENT`. Unparseable `createdAt` sorts as time 0.
- The system prompt also asks for a `{"draft": ...}` JSON object, since the shared preamble requires JSON replies and `parse` expects that shape.
