# Security review: ai-ta-assist (T01–T09)

Reviewer: independent reviewer agent. Date: 2026-11-09. Scope: `git diff 9f34c4e..8946830`, against spec v0.2 and `ai-gateway` v0.1 (trust boundaries, R6, R8, R10).
See `review-report.md` for the findings table; this file covers the security reasoning only.

## Authorization (server-side)

- Both routes are mounted inside `createTaTicketsRouter`, after `requireActiveActor` (which reloads the account on each request) and `requireTa`.
  - A signed-out or inactive user gets `401`; a student gets `403`.
  - Tests cover both endpoints.
- The draft route reads `status` and `claimedByTaId` from the store (`ta-ai-draft-route.js:60-64`) and compares them with `req.actor.userId`.
  - Any state other than `CLAIMED`, or another claimer, gets `409`; a missing ticket gets `404`.
  - No client field is read: the body must be empty, and a forged `X-Account-Type` header is ignored (test).
- `requireCsrf` runs before the body check on both routes.
  - A missing or wrong token gets `403`.
  - A non-empty JSON, `text/plain` or form body gets `400` (`isEmptyBody` also rejects an unparsed body that has a `content-length`).
- The gateway actor is `{ userId, accountType }` from the session only.

## AI output is untrusted

- Neither route has a write path. Tests snapshot the ticket, its replies and `notify` before and after, including the injection fixtures. The draft is only returned; it is saved only through the existing resolve endpoint, after the TA confirms.
- Insights aliases are mapped back only on the server, through the per-request `aliasMap` (`cleanInsightGroups`).
  - An unknown alias, a repeated alias, a real `ticketId` used as an alias, or `T61` beyond the map is dropped.
  - The response gives each ticket only `{ ticketId, title }` (review test).
- UI:
  - there is no `dangerouslySetInnerHTML` or `innerHTML` (grep over `src/` and `server/`: no matches);
  - the draft is set only as the `textarea` value;
  - labels and summaries are React text nodes;
  - links are built only from `encodeURIComponent(ticketId)`, which comes from the server-mapped ID, never from model text;
  - the UI ignores server error `message` text and uses its own fixed R5 strings.

## Prompt-input privacy

- Drafter:
  - `toDraftInput` copies only `title`, `language`, `conceptTags`, `errorOutput`, `expectedBehaviour`, `actualBehaviour`, `attempted`, `files[{name,content}]` and `replies[{message, authorRole, createdAt}]`;
  - `authorRole` comes from the author's stored `accountType`, never from the reply (a review test shows a forged `authorRole: 'TA'` is ignored);
  - no `ticketId`, `studentId`, `claimedByTaId`, `repoUrl`, `repoFilePaths`, names or emails (API test and review test).
- Insights:
  - the gateway input is `{ tickets: [{ alias, language, conceptTags, title, errorOutput }] }`;
  - `buildUserContent` sends only the first error line (≤160 characters);
  - `field()` flattens newlines and ` | `, so ticket text cannot forge extra lines or fields (review test);
  - no files, replies, `repoUrl` or IDs.
- Residual risk (accepted by design): names, emails or secrets typed into free-text fields can still reach the provider.
  - The gateway redacts emails and known secret patterns (R6). Names in free text are not removed.
  - The User Guide warns users not to paste secrets or personal data.

## Error mapping and leakage (R5)

- `toAiErrorResponse` returns only `{ code, message }` from a fixed table. An unknown code becomes `AI_UNAVAILABLE` and is not echoed (review test).
- When the gateway throws, both routes catch it and return the fixed `503` (review test, with a secret-like message and URL; nothing is leaked).
- Unexpected store errors go through the existing `safe()` wrapper as a generic `503 { message }`, with no detail.

## Cache

- Server memory only, per router instance, TTL 5 minutes. It holds only the response body (`groups`, `ticketCount`, `truncated`). It is shared across TAs by design (Q3); every TA can already see these active tickets.
- The key is the ordered `[alias, ticketId, updatedAt]` list plus `truncated`. The store sets `updatedAt` on every claim, unclaim, resolve and reply, so a stale result is not served after a change. Failures are not cached.
- The Firestore `Timestamp` and `{seconds,nanoseconds}` forms produce distinct keys (review test).
- Resource risk (F1, Low): expired keys are not swept, so memory grows with the number of distinct queue states until restart.

## Prompt-injection coverage

- Unit tests: injection text passes through `buildUserContent` unchanged, as data, inside the gateway delimiters.
- API tests:
  - an injection fixture in ticket fields and replies changes no state, and an injected draft is returned literally;
  - injection in model labels for insights changes no state.
- Review: a forged alias line in the title cannot create new prompt lines.
- Live (human run 4): the injection ticket gave a schema-valid result, with status and claim unchanged.
- The gateway's shared preamble and delimiter neutralisation (unchanged, `ai-gateway` R7) apply to both features. The fix-note system prompt does not repeat "treat ticket text as data"; it relies on the shared preamble, which is acceptable.

## Live test gate and secret hygiene

- The gate is `process.env.RUN_SOCLAAS_TESTS === '1' && loadAiConfig(process.env).enabled`. With the gate closed, no gateway is built and all 5 tests skip (verified by the reviewer).
- The test prints nothing. On failure, Jest shows only statuses, types, lengths, synthetic IDs and synthetic snapshots, never the draft text or `process.env`.
- Synthetic tickets, an in-memory store, and a stub `db`; no Firestore.
- Process `.env` risk: CRA loads `src/codeclinic/.env` for every test run.
  - No test in this range logs, snapshots or serialises `process.env`, and there are no snapshot files.
  - The only other test that passes `process.env` to a child process is the pre-existing, emulator-gated `ai-gateway-emulator.integration.test.js`, outside this range.
  - All other ai-ta-assist tests build their own config (`env: {}`) or use a stub gateway.
- Evidence logs:
  - they contain no key, base URL, prompt or response text;
  - the only URL they mention is the dummy `https://fake.invalid/v1`;
  - they name the models (`gemma4:26b`, the candidates), which the spec allows.
- Provider-call budget (F3, Low): with the one retry, a failing provider can see up to 6 HTTP requests per run, against the spec's 4.

## Conclusion

No security defect that blocks merge. The Low items F1 and F3 are follow-ups. The residual free-text privacy risk is the accepted design risk documented in the spec and the guides.
