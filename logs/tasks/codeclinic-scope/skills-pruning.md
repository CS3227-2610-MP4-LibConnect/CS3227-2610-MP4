# Skills pruning — factual log

Date: 2026-11-08
Branch: `codeclinic-scope`
Requested by: the human, as part of the CodeClinic workflow cleanup.

## Action

Removed nine skills from `.agents/skills/` with `git rm -r`, and removed their
entries from `skills-lock.json`. The removed skills cover platforms or products
the CodeClinic stack (React, Express, Firestore via the Admin SDK, Firebase App
Hosting, SoC LLM) does not use:

`xcode-project-setup`, `firebase-crashlytics`, `firebase-analytics`,
`firebase-remote-config-basics`, `firebase-data-connect`,
`extension-to-functions-codebase`, `firebase-ai-logic-basics` (Gemini, not the
SoC LLM), `firebase-hosting-basics` (static Hosting, not App Hosting), and
`firebase-auth-basics` (the app uses its own Argon2id authentication, not
Firebase Auth).

Kept: `firebase-app-hosting-basics`, `firebase-basics`, `firebase-firestore`,
`firebase-security-rules-auditor`, `firestore-rules-creation`, the six
`openspec-*` skills, `seedu-git-standard`, and `summarise-chat`.

## Measurement

Measured with a Python script that parsed each `SKILL.md` front matter
`description` (the text loaded into every agent session) and summed file sizes.

| Measure | Before | After | Change |
| --- | ---: | ---: | ---: |
| Skills | 22 | 13 | −9 |
| Skill description characters (loaded every session) | 7,269 | 4,446 | −2,823 (−39%) |
| Bytes in removed skill directories (loaded only on demand) | — | — | −360,929 |

Character counts are a proxy for context size; token counts were not measured.
The effect on agent behaviour (fewer wrong skill selections, fewer tokens per
session) has not been measured yet.

## Remaining

Kept skills still contain Android, iOS, and Flutter reference files, for example
under `firebase-basics/references/` and `firebase-firestore/references/`. These
load only when an agent opens them, so they were left in place.
