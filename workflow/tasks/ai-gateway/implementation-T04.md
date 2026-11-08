# Implementation report: ai-gateway T04 (Provider transport)

Status: complete, pending independent review and human approval.
Specification: `workflow/specs/ai-gateway.md` v0.1 (human-approved 2026-11-08), R8; scenarios 1 (request part), 4 (model), 8, 9.
Checklist / handoff: `tasks.md` v0.1, `handoff.md` v0.1 (human-approved). Group 2 dispatch under the human's grouping approval.
Branch / worktree: `ai-gateway-g2`, base `522afc4`, with Group 1 changes staged (not modified). No commits.
Execution log: `logs/tasks/ai-gateway/implement-G2.md`.

## Changed files (all new)

- `src/codeclinic/server/ai/transport.js`
- `src/codeclinic/test/ai-transport.test.js`

## Interface

`createTransport({ config, fetch, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout, sleep, random = Math.random })` returns frozen `{ send({ messages, maxOutputTokens }) }`.

- `config` is the `config` object from T01 `loadAiConfig(env)` (uses `baseUrl`, `model`, non-enumerable `apiKey`). `fetch` is injected (Node global `fetch` in production).
- `send` never throws and never logs. It resolves to `{ ok: true, response, attempts, usage }` or `{ ok: false, category, attempts, status? }`.
- `response`: parsed 2xx JSON body, or `null` if not JSON (untrusted; goes to T05). `usage`: provider `usage` object or `null` (for T07).
- Categories (`FAILURE_CATEGORIES`): `CONFIG_ERROR`, `INVALID_REQUEST`, `CIRCUIT_OPEN`, `TIMEOUT`, `NETWORK_ERROR`, `UPSTREAM_RATE_LIMITED` (429), `UPSTREAM_SERVER_ERROR` (5xx), `UPSTREAM_CLIENT_ERROR` (other non-2xx, incl. 400/401/403).
- Also exported: `parseRetryAfterMs`, `TIMEOUT_MS` (20000), `RETRY_MIN_DELAY_MS` (1000), `RETRY_JITTER_MS` (1000), `MAX_RETRY_AFTER_MS` (5000), `BREAKER_FAILURE_THRESHOLD` (5), `BREAKER_OPEN_MS` (60000).

## Acceptance (R8)

| Criterion | Status | Test |
| --- | --- | --- |
| `POST {baseUrl}/chat/completions`, Bearer + JSON headers, body `model`/`messages`/`max_tokens`/`reasoning_effort: "none"`, no streaming | Met | "posts the configured model..." |
| Configured model only; caller `model` ignored | Met | "ignores a caller-supplied model..." |
| 20 s timeout per attempt, aborted | Met | "times out each attempt at 20 s..." |
| One retry for 429/5xx/network/timeout after 1–2 s jitter | Met | "retries HTTP %i once...", "retries a network error once", "the jittered delay stays within 1-2 seconds" |
| No retry for 400/401/403 (also 404/422) | Met | "does not retry HTTP %i or read its body" |
| `Retry-After` > 5 s means no retry | Met | "a Retry-After above 5 seconds means no retry" |
| Breaker: 5 consecutive failed calls → 60 s without provider calls, then resumes | Met | "opens after 5 consecutive failed calls..." and three related breaker tests |
| Provider bodies not read/forwarded; key/header never in results; nothing logged | Met | "results never contain the key...", body `text` not called on failures |

Verification: T04+T05 suites 59/59 passed; full suite 23 passed / 1 skipped suites, 442 passed / 1 skipped tests (exit 0); `npm run build` compiled successfully (exit 0).

## Implementer choices and assumptions (for review)

1. `Retry-After` ≤ 5 s is honoured as a minimum: delay = max(1–2 s jitter, Retry-After). A 4 s header therefore waits 4 s, beyond the 1–2 s range in R8; the spec implies retry is allowed up to 5 s. Unparseable headers are ignored. Only delta-seconds and IMF-fixdate (`Day, ...`) are parsed.
2. Breaker counts failed *calls* (a retried call counts once), including 400/401/403. `CONFIG_ERROR` and `INVALID_REQUEST` do not count. While open, the failure count is kept, so a failed trial call after 60 s reopens immediately (half-open); a success resets it.
3. A 2xx body that is not JSON returns `ok: true, response: null` and resets the breaker; T05 then yields `AI_INVALID_OUTPUT` (R9: no retry for invalid output).
4. Failure results include the HTTP `status` number (no body, no headers) to help T08 choose the usage outcome. Mapping categories to R10 codes / R11 outcomes is left to T08 (suggested: `TIMEOUT` → `TIMEOUT`; others → `PROVIDER_ERROR`; all → `AI_UNAVAILABLE`).
5. Timeout uses `Promise.race` plus `AbortController.abort()`, so a fetch that ignores the signal still times out; the response body read is inside the same 20 s window.
6. Unusable config throws nothing; `send` returns `CONFIG_ERROR`. T08 should not create a transport for a disabled config anyway.

## Deviations and risks

- No Group 1 file modified. Uses only T01's config shape (`baseUrl`, `model`, `apiKey`); no imports from Group 1 modules.
- Breaker state is per process (per server instance), not shared via Firestore; the spec does not require sharing.
- Tests use the shared `node_modules` symlink, not a clean install from this worktree's lockfile.
- No real-provider test (manual smoke is human-only, per handoff); `max_tokens` support remains spec open decision 3.

## Subagent token usage

| Role | Task | Model | Input | Output | Total | Source |
| --- | --- | --- | --- | --- | --- | --- |
| implementer | T04 (Group 2) | unavailable | unavailable | unavailable | unavailable | not exposed by runtime to the subagent |
