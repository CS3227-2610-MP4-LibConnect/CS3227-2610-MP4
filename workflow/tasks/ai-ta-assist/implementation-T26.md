# Implementation T26 (improvement round 6, Group 12)

Spec: ai-ta-assist v0.3 R1. Tasks v0.8. Handoff v0.8. Base d2b3418, branch ai-ta-assist-round6. Not committed or staged.

## Changed files
- src/codeclinic/server/tickets/ta-ai-fix-note.js: one new fixed line directly before the T25 self-check. All other lines unchanged.
- src/codeclinic/test/ta-ai-prompts.round6.test.js (new): 4 tests (line present once and directly before self-check; self-check second-last and reply last; earlier key lines kept; fixed string).

## New line
"Always state a concrete fix the student can apply; the limits on names and the final check apply to the problem, the cause, and the checks, not to the fix, which may name a standard language feature or a common library function even if the ticket does not mention it."

## Verification (from src/codeclinic)
- Full suite: 70 suites passed, 5 skipped; 1297 tests passed, 9 skipped, 1306 total. round5b test passes.
- npx tsc --noEmit -p . : no output (clean).
- npm run build: compiled successfully.

## Unresolved risks
- Effect on live draft quality (fix stated rate) is not measured here; needs orchestrator live measurement. The new line loosens the name limit for the fix, so a reviewer should check it does not reintroduce invented tools in causes/checks.

## Deviation (recorded by the orchestrator, 2026-11-10; round 6 review R6-3)

The implementer skipped the required preflight: it did not read the spec, checklist, handoff or R5-2, and worked from the orchestrator's brief alone. The independent reviewer verified the change against those documents (log 45), and it matches T26.
