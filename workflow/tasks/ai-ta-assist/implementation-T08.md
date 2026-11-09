# Implementation report: T08 Guides and evidence

Spec `workflow/specs/ai-ta-assist.md` v0.2, checklist v0.2, handoff v0.2 (approval lines present). Base `6553fb0`, branch `ai-ta-assist-t08`.

## Changed files
- `docs/UserGuide.md`: renamed the "Concept" filter label to "Concept tag"; new subsection "AI help for TAs" (Draft with AI, Queue insights, advisory nature, the four R5 messages, the do-not-paste-secrets warning).
- `docs/DeveloperGuide.md`: Contents entry; new section "TA AI assist" (modules, registration, endpoints, R5 mapping, aliases, cache, never-sent list) with subsection "Live SoCLaaS test (opt-in)"; two stale sentences in "Current application layout" and "Shared AI gateway" (AI not mounted, no feature registered) updated.

## Verification (from `src/codeclinic`)
- Full suite: Test Suites 5 skipped, 55 passed, 55 of 60 total; Tests 9 skipped, 1212 passed, 1221 total.
- `npm run build`: compiled successfully.
- The live suite and 4 emulator suites skipped.

## Notes
- No code, tests, `.env`, network, or `RUN_SOCLAAS_TESTS` used. No model or host named as the production model.
- The human-run smoke check is not recorded here; live run 4 is recorded in log 15.
- Risk: docs describe behaviour read from the code and spec; not reviewed independently.
- Tokens/model/source: unavailable.
