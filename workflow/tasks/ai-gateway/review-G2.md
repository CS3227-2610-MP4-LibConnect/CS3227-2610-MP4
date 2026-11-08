# Review report: ai-gateway Group 2 (T04, T05) and the M1 fix

Reviewer: independent `reviewer` agent (Cursor). This group was reviewed in a single Wave 1 review that also covered AM-G1 and N-G1, as the human approved.
Date: 2026-11-08
Specification: `workflow/specs/ai-gateway.md` v0.1, human-approved. Checklist and handoff: v0.1, human-approved. Context read: `design.md`, `review-G1.md`.
Diff: worktree `ag-g2`, base `4498e56`, uncommitted. Modified files: `server/ai/redact.js` (the `ASSIGNMENT` pattern) and `test/ai-redact.test.js` (54 lines appended only). New files: `server/ai/{transport,parse}.js` and `test/ai-{transport,parse}.test.js`.
Security review: [`security-review-G2.md`](security-review-G2.md). Execution log: [`logs/tasks/ai-gateway/review-G2.md`](../../../logs/tasks/ai-gateway/review-G2.md)

## Conclusion

**Pass with follow-up.** I found no Critical, High, or Medium issues. The Group 1 finding M1 is resolved.

## Findings

| ID | Severity | Location | Finding | Recommended action |
| --- | --- | --- | --- | --- |
| L1 | Low | `server/ai/redact.js:53` | This is the residual gap for type annotations that contain a comma. My probe showed that `secret: Map<String, String> = "x"` still sends `"x"`. `api_keys: Dict[str, str] = {...}` redacts only `Dict[str`, and the container value that follows is sent unchanged. The implementer documented this. | Accept as residual risk (see ruling 2). Optionally allow a comma inside a bounded `<…>` or `[…]` pair in a later revision. |
| L2 | Low | `server/ai/transport.js:146-154` | `fetch` is called with the default `redirect: 'follow'`. A misconfigured or compromised base URL that answers with a 307 or 308 redirect would re-send the redacted prompt body to the new location. Node's fetch drops `Authorization` on cross-origin redirects, but relying on that is implicit. | Set `redirect: 'error'` (or `'manual'`) in a follow-up. |
| L3 | Low | `server/ai/transport.js:167` | `response.text()` on a 2xx reply has no size limit; only the 20-second timeout bounds it. | Optional: check `content-length` or cap the bytes read. |
| I1 | Info | `server/ai/transport.js:239-240` | A 2xx reply with a body that is not JSON counts as a success for the circuit breaker, then `parse.js` maps it to `AI_INVALID_OUTPUT`. This is consistent with R8's "No retry for … invalid output". | None. |

## Assumption rulings

1. **A `Retry-After` of 5 seconds or less is honoured as a minimum delay** (T04 assumption 1). **Accepted.** R8 says that a `Retry-After` above 5 seconds means no retry, which implies that a header of 5 seconds or less permits the retry. Retrying sooner than the provider asked would ignore "valid provider guidance" (`design.md`). The implementer's claim that a header of up to 5 seconds can exceed the 1–2 second jitter is correct: the delay is `max(1000 + jitter·1000, retryAfterMs)`, which is at most 5000 ms (`transport.js:190-196`). The worst-case latency is 20 s + 5 s + 20 s = 45 s. I recommend recording this reading in the next spec revision.
2. **Annotations containing a comma (`Dict[str, str]`) are not recognised** (M1-fix residual). **Accepted as Low.** Excluding commas keeps `password: hunter2, retries = 3` redacted, which is the more common leak shape. Values behind generic container types are usually not literal secrets. Other patterns, such as provider-key prefixes and Bearer tokens, still apply. R6 calls redaction "a privacy safeguard, not a guarantee".

## Acceptance-criteria traceability

| Criterion | Implementation | Tests | Result |
| --- | --- | --- | --- |
| R8 request shape (URL, Bearer, JSON body with `model`, `messages`, `max_tokens`, `reasoning_effort:"none"`, no streaming) | `transport.js:134-154`, `219-224` | `ai-transport.test.js` | Met |
| 20-second timeout per attempt, with abort; the body read is inside the timed race | `transport.js:139-187` | Fake timer tests | Met |
| Retry only for 429, 5xx, network errors, and timeouts; at most once; delay of 1–2 s with jitter | `RETRYABLE`, `categoryForStatus`, `send` | 400, 401, and 403 are not retried; each retryable case is tested | Met |
| A `Retry-After` above 5 s means no retry | `retryDelayMs` returns `null` | Tested, including the HTTP-date form | Met (ruling 1) |
| Circuit breaker opens after 5 consecutive failed calls for 60 s; the next failure after it reopens re-opens it immediately | `failure`, `openUntil` | Breaker tests with a fake clock | Met. Configuration and invalid-request results do not count. |
| Provider error bodies are not forwarded, logged, or stored | `discardBody`; only `status` and `retry-after` are read; thrown errors are discarded | Tests check that results contain no body, key, or header data | Met |
| R9: first choice `message.content` must be a string; strip at most one surrounding fence; parse the JSON; result goes only to the feature's `parse`; otherwise `AI_INVALID_OUTPUT` | `parse.js` | `ai-parse.test.js` (valid, fenced, fenced with extra text, missing, non-string, non-JSON, schema-invalid, `parse` that throws) | Met. A nested or second fence leaves the content unparseable, which fails closed. |
| M1: typed assignments redact the value after `=` | `redact.js` `ASSIGNMENT` with an optional bounded annotation followed by a lookahead for `=` but not `==` or `=>` | 12 typed forms, near misses, a check that untyped forms are unchanged, and a ReDoS-time test | Met. The existing redaction tests are unmodified: the diff is append-only, and the `expect(` count went from 53 to 64. |

## Verification

- `CI=true npm test -- --watch=false`: exit 0. 23 suites passed and 1 was skipped. 467 tests passed and 1 was skipped, out of 468.
- `npm run build`: exit 0.
- `grep -rn libconnect server test src`: no matches.
- Reviewer probes in local Node, with no network: the comma-gap strings above; adversarial `ASSIGNMENT` inputs of up to 185,000 characters took 4 ms or less; adversarial fence inputs of 200,000 characters took 1 ms or less.

No review-only test files were added. Nothing was run against the live provider (by design).
