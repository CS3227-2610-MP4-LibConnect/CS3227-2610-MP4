# ai-ta-assist: pre-PR overall check (2026-11-09)

The human asked for overall testing before creating a PR, including the live model ("otherwise how could i make sure it will work"), and also wanted it to find AI security and functional issues. All checks ran in a clean detached checkout of `TA-coordinator` at `7879ad8`, which has no `.env`.

## 1. Unit, API and UI suites, types and build

- `CI=true npx react-scripts test --roots test --testMatch '**/test/**/*.test.*' --watchAll=false < /dev/null`: exit 0. Test Suites: 5 skipped, 58 passed, 58 of 63 total. Tests: 9 skipped, 1228 passed, 1237 total.
  - Console noise is limited to the existing `act()` warning from `NotificationBell`.
- `npx tsc --noEmit -p .`: exit 0.
- `npm run build`: exit 0, "Compiled successfully". There is one CRA tooling `DEP0176` deprecation warning.

## 2. Firestore emulator suites

- `firebase emulators:exec --only firestore --project demo-codeclinic "RUN_FIRESTORE_EMULATOR_TESTS=1 CODECLINIC_FIRESTORE_MODE=local-emulator CODECLINIC_FIRESTORE_PROJECT_ID=demo-codeclinic FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 CI=true npx react-scripts test ... emulator firestore-mode"`
  - First attempt: 4 failed, because the orchestrator set the wrong variable (`GCLOUD_PROJECT` instead of `CODECLINIC_FIRESTORE_PROJECT_ID`). This was an operator error, not a code failure.
  - Rerun: exit 0. Test Suites: 4 passed. Tests: 4 passed (`ai-gateway-emulator`, `account-emulator`, `ta-ticket-queue-emulator`, `firestore-mode`). Port 8080 was free afterwards.

## 3. Live end-to-end: real server, emulator and real SoCLaaS

- Scripts (orchestrator-written, in the scratchpad, not committed):
  - `e2e/live-e2e.js`;
  - `e2e/probe-preload.js`, a `fetch` wrapper preloaded into the server. For each provider request it records only booleans (whether a sentinel string appeared), never content.
- Setup:
  - the server is the real `server/index.js` `startServer()` on port 3137, against the emulator;
  - only the `SOCLAAS_*` values were read from the human's `src/codeclinic/.env`, at the human's request; they were never printed;
  - synthetic data: one student, two TAs and seven tickets (normal, prompt injection, fake secrets plus the student's email, HTML/script, and three queue tickets, one with an alias-injection title).
- Result: **46/46 checks passed**, exit 0. Ports 8080 and 3137 were free afterwards. The checks covered:
  - **Startup and configuration:** valid config; the server starts and serves the build; the server log has no key, URL or model value.
  - **Authorization with the live gateway attached:**
    - a student gets 403;
    - a TA who did not claim the ticket gets 409;
    - an OPEN ticket gets 409;
    - a missing CSRF token gets 403;
    - a request with a body gets 400;
    - none of these requests reached SoCLaaS.
  - **Live drafts:** all four were 200 (1.0–1.5 s each) and 193–394 characters long. None leaked a name, email, ID, repoUrl, fake secret or the system prompt, and no ticket changed. The injection ticket stayed CLAIMED by TA A.
  - **Resolve:** resolving with the AI draft as the fix note succeeded, and the student got a TICKET_RESOLVED notification.
  - **Live insights:**
    - 200 (2.5 s), with 2 groups;
    - all 4 links are real active tickets, with no T99 or invented IDs, and no ticket appears in two groups;
    - `ticketCount` was 6, which is correct;
    - no leaks in the group text;
    - a repeat by the other TA was cached, with 0 new requests.
  - **What was sent to SoCLaaS:** 5 requests in total, within budget. None contained a name, email, user ID, ticket ID, repoUrl, repo file path or fake secret. The secret ticket's request carried the redaction marker.
  - **aiUsage:** 5 records, one per call. The fields are `attempts`, `cachedTokens`, `createdAt`, `feature`, `inputTokens`, `latencyMs`, `outcome`, `outputTokens`, `usageId` and `userId`. They hold no prompt, reply, name, email or secret, and every record names the real TA.
- The AI output text was shown to the human in the session for quality review, and is deliberately not recorded here.

## Observations from the live output (quality, not defects)

- Q-1: insights linked 4 of the 6 active tickets. The fake-secret ticket and the alias-injection ticket (which has a recursion error) were left ungrouped. The model may have avoided the injected ticket. Grouping coverage is a model-quality matter, and the spec allows ungrouped tickets.
- Q-2: the HTML ticket's draft asserted a rendering cause that the ticket did not support, and described the fix in the past tense. This is advisory output that the TA must review, as the UI labels it.

_Note (2026-11-09): Q-2 was paraphrased after the rounds review (R1), so this log quotes no model output._
