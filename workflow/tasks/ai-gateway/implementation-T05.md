# Implementation report: ai-gateway T05 (Output parsing)

Status: complete, pending independent review and human approval.
Specification: `workflow/specs/ai-gateway.md` v0.1 (human-approved 2026-11-08), R9; scenario 10 (and the output half of 7).
Checklist / handoff: `tasks.md` v0.1, `handoff.md` v0.1 (human-approved). Group 2 dispatch under the human's grouping approval.
Branch / worktree: `ai-gateway-g2`, base `522afc4`. No commits.
Execution log: `logs/tasks/ai-gateway/implement-G2.md`.

## Changed files (all new)

- `src/codeclinic/server/ai/parse.js`
- `src/codeclinic/test/ai-parse.test.js`

## Interface

`parseModelOutput(response, featureParse)` → `{ ok: true, data }` or `{ ok: false, code: 'AI_INVALID_OUTPUT' }`; never throws.

- `response` is T04's `response` (parsed provider body or `null`). `featureParse` is the registered feature's `parse` (T03 contract: `parse(value) -> { ok: true, data } | { ok: false }`).
- Also exported: `extractContent(response)` (first choice `message.content` string or `null`), `stripCodeFence(content)`, `AI_INVALID_OUTPUT`.

## Acceptance (R9)

| Case | Status | Test |
| --- | --- | --- |
| Valid JSON → feature data | Met | "accepts valid JSON content..." |
| One surrounding fence accepted (with/without language tag, CRLF) | Met | "accepts one surrounding code fence" |
| Fenced with extra text, or a second fence → invalid | Met | "rejects fenced JSON with extra text..." |
| Missing choices/message/content → invalid | Met | "rejects %s" |
| Non-string content → invalid | Met | "rejects non-string content" |
| Non-JSON → invalid | Met | "rejects non-JSON content" |
| Schema-invalid → invalid | Met | "rejects schema-invalid JSON" |
| Throwing / non-conforming / async feature `parse` → invalid | Met | "treats a throwing or non-conforming feature parse..." |

Verification: see T04 report (shared run) and the execution log.

## Implementer choices and assumptions (for review)

1. A fence is stripped only when it encloses the whole trimmed content (opening ```` ``` ```` plus optional language tag and newline, closing ```` ``` ```` at the end). Everything else is passed to `JSON.parse` unchanged, so leading or trailing prose fails. No regex extraction of JSON from prose.
2. Only the first choice is read; later choices are ignored.
3. A feature `parse` result counts as success only if it is an object with `ok === true` and a `data` property; a Promise is rejected (T03 requires a synchronous `parse`).
4. JSON primitives (`null`, strings, arrays) are passed to the feature `parse`, which decides validity.

## Deviations and risks

- No Group 1 file modified or imported.
- No output-size character cap (spec open decision 3 fallback is not triggered while `max_tokens` is assumed supported).

## Subagent token usage

| Role | Task | Model | Input | Output | Total | Source |
| --- | --- | --- | --- | --- | --- | --- |
| implementer | T05 (Group 2) | unavailable | unavailable | unavailable | unavailable | not exposed by runtime to the subagent |
