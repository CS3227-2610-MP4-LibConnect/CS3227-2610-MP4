# Implementation report — ai-gateway T03 (feature registry and prompt construction)

- Spec: `workflow/specs/ai-gateway.md` v0.1 (R3, R7; scenarios 2, 4, 7)
- Checklist item: `workflow/tasks/ai-gateway/tasks.md` T03 (Group 1)
- Branch/worktree: `ai-gateway-t03` (base `da3c249`); no commits made
- Status: implemented, awaiting independent review. This report does not mark T03 complete or grant any approval.

## Changed files (all new, untracked)

- `src/codeclinic/server/ai/features.js`
- `src/codeclinic/server/ai/prompt.js`
- `src/codeclinic/test/ai-features.test.js` (23 tests)
- `src/codeclinic/test/ai-prompt.test.js` (28 tests)

No existing file was modified. No dependency, CI, or deployment change.

## Exported interface

`server/ai/features.js`
- `FEATURE_NAMES` — frozen `['ERROR_EXPLAINER', 'FIX_NOTE_DRAFTER', 'QUEUE_INSIGHTS']`
- `FeatureDefinitionError` — `Error` subclass thrown by `register`
- `isAllowedFeatureName(name) -> boolean`
- `validateFeatureDefinition(def) -> { ok: true } | { ok: false, reason }` (reason names a field, never echoes values)
- `createFeatureRegistry() -> frozen { register(def) -> frozenDef, get(name) -> def | null, has(name) -> boolean, names() -> string[] }`
- `parse` contract: `parse(parsedJson) -> { ok: true, data } | { ok: false }`, synchronous; the gateway (T05/T08) maps `{ ok: false }`, a non-conforming return, or a throw to `AI_INVALID_OUTPUT`.

`server/ai/prompt.js`
- `BEGIN_DELIMITER = '<<<UNTRUSTED_CONTENT_BEGIN>>>'`, `END_DELIMITER = '<<<UNTRUSTED_CONTENT_END>>>'`
- `SHARED_PREAMBLE` — fixed string stating delimited content is data not instructions, no tools/no actions, JSON-only reply
- `buildSystemMessage(systemPrompt) -> string` (`SHARED_PREAMBLE + "\n\n" + systemPrompt`)
- `buildUserMessage(content) -> string` (delimited, neutralised)
- `buildMessages({ systemPrompt, content }) -> frozen [{ role: 'system', content }, { role: 'user', content }]`
- `neutraliseDelimiters(content) -> string` (`<<<` → `‹‹‹`, `>>>` → `›››`)
- Non-string content or empty/non-string `systemPrompt` throws `TypeError` without echoing the value.

## Deviations and additions (beyond the literal checklist text)

- `registry.has(name)` and `registry.names()` were added as convenience read-only lookups. They do not change behavior or policy.
- `validateFeatureDefinition` rejects any field outside the six R3 fields (for example `model` or `tools`), so a feature cannot smuggle a model choice or tool list into the definition. This is stricter than R3's wording; flagged for reviewer confirmation.
- Delimiter neutralisation replaces every run of three or more `<` or `>` with look-alike characters. Shorter runs (`<<`, `>>`, `<<=`) are untouched so code samples are preserved. This alters user content slightly (only those runs); it never truncates.

## Verification

Run in `<wt>/src/codeclinic` (Node v24.2.0):

| Command | Result |
| --- | --- |
| `CI=true npm test -- --watch=false` | 21 suites passed, 1 skipped; 319 passed, 1 skipped, 320 total |
| `CI=true npm test -- --watch=false --testPathPattern 'ai-(prompt\|features)'` | 2 suites, 51 passed (features 23, prompt 28) |
| `npm run build` | Compiled successfully; build folder ready |

Prompt tests cover: two-message order and keys, frozen output, preamble = shared + feature prompt, R7 preamble statements, byte-identical system message across six varied inputs with a faked `Date.now`, no per-request values (IDs, emails, dates, long numbers), injected instructions contained between exactly one BEGIN and one END delimiter, forged/lower-case/spaced/longer-run/bare delimiter variants neutralised, `<<`/`>>` untouched, no truncation of long content, empty/whitespace preservation, and `TypeError` for bad content and bad `systemPrompt` without echoing values.

## Unresolved risks

- Delimiters are a mitigation, not a guarantee: a model may still follow injected instructions inside the delimited block. R9 output validation and R10 advisory-only handling remain the controls; the real-provider behavior is untested (human smoke check, T09).
- Neutralisation is ASCII-only; Unicode look-alikes of `<`/`>` (for example `‹‹‹` itself, full-width `＜＜＜`) are not normalised. They cannot form the exact ASCII delimiter, but a model might still treat them as one.
- The byte-identical test fakes only `Date.now`; it does not prove that a future feature's `systemPrompt` is free of per-request values. R3 requires it be a fixed string, which the registry checks only as a non-empty string at registration.
- The local Node is v24.2.0 while `package.json` declares `engines.node >=24.12.0`; tests and build passed, but the engines constraint was not met in this environment.
- The extra-field rejection may conflict with a future feature that needs another field; that would need a spec change.

## Environment note

Implementation was interrupted by `ENOSPC` (disk full) during `npm ci` in the worktree. After the coordinator freed space, the worktree's `src/codeclinic/node_modules` was replaced by a symlink to the shared install in the main checkout; `npm ci` was not re-run. Results above therefore use the main checkout's installed dependency tree.
