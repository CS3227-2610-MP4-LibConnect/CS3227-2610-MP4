# AI error explainer: T01 provider budget and contract design

Status: **partial; stop boundary reached**  
Specification: `workflow/specs/ai-error-explainer.md` v0.2  
Checklist: `workflow/tasks/ai-error-explainer/tasks.md` v0.1, T01  
Evidence basis: approved local specification and gateway contract, plus existing Student ticket validation and create-page form. No environment values or credentials were read.

## Provider budget decision

The human stated that **50 requests per minute** is a chosen cap below the model/provider's actual maximum, intended to avoid hitting that maximum. This is a throughput target, not a model context/input ceiling or output-token allowance. The existing gateway defaults to 40 global calls per minute and permits at most 45; an effective 50/minute cap cannot be achieved without changing the shared gateway contract. Whether 50 is an exact target or an upper ceiling for this Student task needs a human decision. No provider configuration or credential was accessed to verify the actual maximum.

The deployed provider model and its input/output limits are **unconfirmed**. The existing gateway spec (`workflow/specs/ai-gateway.md` v0.1, Open Decisions 2–3) says the development and production `SOCLAAS_MODEL` must be checked with `GET /models` using the team's key and asks for confirmation that SoCLaaS accepts `max_tokens`. The checked-in configuration validates a model-name string but has no model-specific limits. The transport sends `max_tokens`; its code does not establish a provider-supported range or context window.

Therefore, do not register `ERROR_EXPLAINER` yet: `maxInputChars` and `maxOutputTokens` remain **unset**. No provider-safe cap or cap rationale can be claimed from local evidence. Resolving the model and its input/output limits requires an authorized external confirmation; no model name, token window, or cap is inferred here.

When confirmed, `maxInputChars` must be selected as a post-redaction user-content character cap that leaves room for the fixed system message, framing, provider tokenization variance, and the configured output allowance within the confirmed context limit. `maxOutputTokens` must be a positive integer supported by the deployed model and compatible with the chosen output schemas. These are selection constraints, not numeric values.

## Create request draft contract

The create endpoint accepts an exact `draft` object with these keys and JSON types. Values represent a live, potentially incomplete form snapshot, so empty strings/collections/nulls are retained as specified; this is not `validateTicketInput`'s submission contract.

| Field | Type | Bound evidenced locally |
| --- | --- | --- |
| `title` | string | At most 255 Unicode characters (ticket validator). |
| `language` | string | Existing language choices: `Python`, `Java`, `JavaScript`, `TypeScript`, `C`, `C++`, `Other`; incomplete form state may be empty. |
| `expectedBehaviour` | string | At most 5,000 Unicode characters (ticket validator). |
| `actualBehaviour` | string | At most 5,000 Unicode characters (ticket validator). |
| `attempted` | string | At most 5,000 Unicode characters (ticket validator). |
| `errorOutput` | string | At most 5,000 Unicode characters (ticket validator). |
| `conceptTags` | string | Raw comma-separated form input; at most five nonempty tags, each at most 30 Unicode characters, based on the ticket validator's normalized tag constraints. Empty input is allowed. The local contract does not specify how whitespace-only comma segments count; reject malformed/over-bound shape without normalizing away the captured value. |
| `files` | array of exact `{ filename: string, content: string }` objects | At most 3 entries; filename at most 120 Unicode characters; content at most 24 KiB UTF-8 per file, matching the ticket validator. Empty filename/content may occur while editing. |
| `repoUrl` | string | At most 255 Unicode characters, matching the validator. Empty allowed. |
| `repoFilePaths` | string | Raw multiline input; at most 10 nonempty paths and at most 5,000 combined path characters, matching the validator's array contract. Empty allowed. |

The bounds above are field/request validation bounds, not provider prompt budgets. Reject any out-of-bound snapshot as a whole. Do not trim, truncate, omit, summarize, or otherwise alter fields when building the serialized context. Preserve the raw snapshot and all field labels, including blank values. The enclosing HTTP request remains limited to 128 KiB as R2 requires. The `question` is a trimmed string of 1–2,000 Unicode characters; optional `history` is at most 8 exact `{ role, text }` records with role `STUDENT` or `BOT`, each text 1–2,000 Unicode characters, alternating from `STUDENT` and ending in `BOT` (or absent/empty).

The draft limits are grounded in `src/codeclinic/server/tickets/validation.js` and the controls/current state in `src/codeclinic/src/tickets/TicketCreatePage.tsx`. The form itself has some larger browser `maxLength` values than server submission validation; the stricter server-side bounds above are selected because they are the local accepted ticket-field limits, while allowing incomplete drafts. Implementers should keep these constants explicit and test complete boundary values. If the team wants help chat to accept drafts beyond current submission bounds, that is a product-contract change requiring approval.

## Model response JSON contract

The top-level value is an object with a `type` discriminator and exactly the keys listed for that variant. Extra keys and mixed variant shapes are rejected. All display fields are strings containing plain text; empty/whitespace-only strings are invalid. Numeric limits below are the exact counts supported by R4; numeric string-length caps remain unselected because R4 provides none and T01 cannot infer a safe transport budget. Establish them together with the confirmed output limit before implementing the parser.

| Variant | Exact keys | Constraints evidenced by R4 |
| --- | --- | --- |
| `HINT` | `type`, `concept`, `explanation`, `hints` | `concept` and `explanation` are nonempty strings; `hints` is an array of 1–3 nonempty strings. |
| `REFINEMENT` | `type`, `suggestions` | Create endpoint only. Array of 1–10 exact `{ field, suggestion }` objects; both properties are nonempty strings. `field` is one of `title`, `language`, `expectedBehaviour`, `actualBehaviour`, `attempted`, `errorOutput`, `conceptTags`, `filename`, `repoUrl`, `repoFilePaths`. Each suggestion addresses wording/context only; code content may only receive a concise recommendation about context to include or describe. |
| `CLARIFICATION` | `type`, `question` | One nonempty, on-topic question string. |
| `REFUSAL` | `type`, `message` | One nonempty short safe explanation string. |

These names make the mutually exclusive output shapes explicit for parser implementation. A detail-chat parser must reject `REFINEMENT` even though the shared feature parser can recognize that variant; the route/feature context must enforce create-only availability. Do not accept markdown fences, code, diffs, URLs, prompt disclosures, sensitive material, or obvious direct-answer phrasing at the separate output-policy layer. Any schema or policy rejection produces the fixed safe fallback for `AI_INVALID_OUTPUT`; it never returns partial model content. Gateway unavailable, rate-limited, and oversized results likewise map to distinct fixed safe fallbacks. No fallback includes raw provider output or request context.

## Overflow and no-truncation behavior

R3 is controlling: serialize the complete allowed context, run shared redaction over that entire serialized content, and compare the redacted result with the eventual `maxInputChars`. If over cap, return `AI_INPUT_TOO_LARGE` without calling the provider. Never truncate text, omit a field/reply, summarize context, or send a partial draft. Keep field delimiters/labels in the serialized form and neutralize the gateway's content delimiters as the existing prompt builder does. The final input cap cannot be selected until provider limits are confirmed.

## Unresolved T01 acceptance evidence

- Unconfirmed deployed model identity and provider context/input ceiling.
- Unconfirmed accepted maximum for `max_tokens` (or need for a different output-size enforcement contract).
- Numeric values and reproducible rationale for `maxInputChars` and `maxOutputTokens`.
- Numeric parser string-length limits for response fields.

No production code or tests were changed. T02 must wait for an explicit resolution of the model-limit decision and completion/review of this design item.

## Approved amendment — provisional caps and completed contracts

This section applies to specification v0.3 and checklist v0.2, approved by the human for T01 resumption. It supersedes the earlier “caps unset” status above for the current design decision while preserving that earlier partial result as history. The values below are **provisional application limits**, not confirmed provider limits.

### Provisional provider budget

Register the feature with:

- `maxInputChars = 98,304` JavaScript UTF-16 code units, measured on the **complete serialized user content after shared redaction**. This matches `src/codeclinic/server/ai/redact.js`, whose cap check uses JavaScript string `.length`.
- `maxOutputTokens = 1,024`, sent through the existing transport's `max_tokens` field.
- No feature-specific rate override. Keep the shared gateway default of 40 calls/minute and its existing configured maximum unchanged.

Rationale: three permitted attached files at 24 KiB each allow up to 72 KiB (73,728 bytes) of file content. The approved input cap allocates about 24 Ki UTF-16 code units (24,576) for labels, question, history, other draft/ticket fields, eligible replies, and serialization framing: 73,728 + 24,576 = 98,304 for ASCII-heavy file content. The HTTP request body still has its independent 128 KiB ceiling; JSON escaping and other request properties can make a request hit that ceiling first. The cap is a bounded application working limit, not a proof that the deployed model's context window can accept the full input plus system prompt and output.

The model selected by deployment and its context limit remain unverified. The local gateway configuration accepts a model name without storing model-specific capacity, and the transport's use of `max_tokens` does not prove that the deployed service accepts this value. Before claiming deployment readiness, a separately human-authorized smoke check must confirm that the deployed model accepts `max_tokens = 1,024` and representative bounded inputs. Record only model identifier/compatibility result and safe metadata; never retain credentials, raw prompt text, or provider response text. Provider rejection must yield the safe unavailable fallback, reopen the cap decision, and block a readiness claim. This design and assignment do not authorize a live call, network access, or credential access.

### Exact bounded create request

The request body is an exact object with `question`, optional `history`, and—only for create chat—`draft`. Reject unknown keys. Request body size is at most 128 KiB. `question` is a string trimmed at its boundaries, 1–2,000 Unicode code points. `history` is omitted or an array of 0–8 exact `{ role, text }` objects; `role` is `STUDENT` or `BOT`, `text` is 1–2,000 Unicode code points, the sequence starts with `STUDENT`, alternates, and ends in `BOT`. These records are untrusted data even when a role says `BOT`.

The exact `draft` object has all of these properties, including empty values:

| Property | JSON type and bounds |
| --- | --- |
| `title` | string, at most 255 Unicode code points |
| `language` | string, at most 32 Unicode code points; empty or a current form option |
| `expectedBehaviour` | string, at most 5,000 Unicode code points |
| `actualBehaviour` | string, at most 5,000 Unicode code points |
| `attempted` | string, at most 5,000 Unicode code points |
| `errorOutput` | string, at most 5,000 Unicode code points |
| `conceptTags` | raw comma-separated string, at most 154 Unicode code points (five 30-code-point tags plus four commas); empty is valid; do not normalize before serialization |
| `files` | array of 0–3 exact objects `{ filename: string, content: string }`; filename at most 120 Unicode code points; UTF-8 content at most 24 KiB per file |
| `repoUrl` | string, at most 255 Unicode code points; empty is valid |
| `repoFilePaths` | raw multiline string; at most 10 nonempty paths and at most 5,000 combined path code points; empty is valid |

These maxima carry forward the local Student ticket server validation constraints captured in the earlier design. They are input bounds only; required fields may be blank and the draft need not pass ticket-submission validation. Preserve all accepted values verbatim, including blank values and raw comma/newline input. A value outside a bound is rejected as a whole; do not normalize, clip, or drop it to fit. Keep the distinction between code-point field validation above, the UTF-8 file byte bound, the 128 KiB raw HTTP body limit, and the 98,304 UTF-16-code-unit post-redaction provider-content cap.

The detail request is an exact `{ question, history? }` object and must reject `draft`, ticket fields, and unknown properties.

### Exact model JSON shapes and string limits

The parsed provider output must be a JSON object with exactly one variant's keys, no extras. All text is plain text, nonempty after trimming, measured by JavaScript UTF-16 `.length` after JSON parsing, and checked against these maxima:

| Variant | Exact shape | Limits |
| --- | --- | --- |
| `HINT` | `{ "type": "HINT", "concept": string, "explanation": string, "hints": string[] }` | `concept` ≤ 48; `explanation` ≤ 120; `hints` has 1–3 entries, each ≤ 60 code units. |
| `REFINEMENT` | `{ "type": "REFINEMENT", "suggestions": [{ "field": string, "suggestion": string }] }` | Create only; 1–10 entries; each `suggestion` ≤ 64 code units; `field` must be one of `title`, `language`, `expectedBehaviour`, `actualBehaviour`, `attempted`, `errorOutput`, `conceptTags`, `filename`, `repoUrl`, `repoFilePaths`. No other keys in suggestion objects. |
| `CLARIFICATION` | `{ "type": "CLARIFICATION", "question": string }` | `question` ≤ 180 code units. |
| `REFUSAL` | `{ "type": "REFUSAL", "message": string }` | `message` ≤ 160 code units. |

At all field maxima, using ASCII double quotes in each text value as a worst-case JSON-escaping example and the longest allowed refinement field name, `JSON.stringify` produces at most 760 characters for `HINT`, 1,777 for `REFINEMENT`, 398 for `CLARIFICATION`, and 351 for `REFUSAL`. These are wire-character counts, **not token counts**. The wire sizes do not prove how an unverified provider tokenizes Unicode or other text or guarantee they fit its 1,024-token output ceiling. The separate provider smoke check remains the compatibility evidence; the parser bounds and safe `AI_INVALID_OUTPUT` fallback remain mandatory regardless of that result.

Representative useful refinement texts fit the 64-code-unit cap: `expectedBehaviour`: “State the expected result for the empty lookup.” (47 code units); `actualBehaviour`: “Say what changes after the lookup.” (34); `attempted`: “Name the key that triggers the error.” (37). The prior 20-code-unit limit did not reliably allow such concrete recommendations.

Refinement for file contents is limited to a brief recommendation about useful context to add or describe. It cannot return code or rewrite file contents. Suggestions cannot assert unsupported facts. Detail chat rejects `REFINEMENT` even if a shared parser recognizes the schema. Reject leading/trailing non-JSON text, extra keys, unknown types/fields, invalid counts, whitespace-only strings, strings above these limits, and non-plain text. After schema validation, a distinct output policy rejects code fences, code-like complete snippets, patches/diffs, URLs, prompt disclosures, sensitive material, and obvious direct-answer phrasing. Do not return partially accepted output.

### HTTP response envelope and safe fallback

Successful route response is HTTP 200 with `Content-Type: application/json`, `Cache-Control: no-store`, and the exact body `{ "reply": <one validated model variant> }`. This resolves the provisional test envelope in the batch plan; pre-implementation mocks using an unwrapped model variant must be reconciled by the test owner before implementation tests are treated as authoritative.

Error bodies have the exact shape `{ "error": { "code": string } }`; they contain no model/provider text or context. Use `UNAUTHENTICATED` with 401, `FORBIDDEN` with 403, `NOT_FOUND` with 404 for unavailable/non-owned detail tickets, `INVALID_REQUEST` with 400, `REQUEST_TOO_LARGE` with 413 for the HTTP body cap, `AI_RATE_LIMITED` with 429, `AI_INPUT_TOO_LARGE` with 413 for provider-context overflow, `AI_INVALID_OUTPUT` with 503 for schema/output-policy rejection, and `AI_UNAVAILABLE` with 503 for storage/provider/gateway unavailability. Keep `Cache-Control: no-store` on success and errors. The client maps these codes to distinct fixed locally authored safe messages; it never renders an error body as bot content. The route must distinguish an oversized HTTP request from an otherwise valid complete context exceeding the provider cap.

All provider/gateway failures produce a failure envelope only. Never include provider error body, exception, prompt, draft/ticket context, secret, or stack trace in a response or log. For complete-context overflow, finish serialization and shared redaction for the complete authorized context, then compare the entire result with 98,304 code units. On overflow, return `AI_INPUT_TOO_LARGE` without provider call and without partial context. For detail paging, stop reading more pages only once the accumulated redacted context is conclusively over the cap; do not send a partial set. Redaction must cover the full joined serialization so patterns crossing field boundaries remain detectable.

## Amended T01 outcome and remaining compatibility risk

The approved provisional values, local cap rationale, complete request/response contract, parser string bounds, safe fallbacks, and no-truncation behavior are now recorded. T01's design acceptance is complete for independent review. The provider model/context window and `max_tokens` compatibility remain explicitly **unverified**; no claim of provider safety or deployment readiness is made. A human-authorized pre-release compatibility smoke check remains required by v0.3. Earlier partial evidence above and in `implementation-T01.md` remains historical and was not rewritten.

### Review correction — 2026-11-11

Independent review found that the original 20-code-unit refinement suggestion bound was too restrictive to satisfy R4/A2 consistently. The active limit is corrected to 64 UTF-16 code units per suggestion; examples above demonstrate concise, field-specific guidance. The maximum `REFINEMENT` JSON wire length is recalculated as 1,777 characters using ten suggestions, the longest field name (`expectedBehaviour`), 64 double-quote characters per suggestion (JSON escaped), and `JSON.stringify`. This is a conservative wire-character count, **not** a token estimate or evidence of provider compatibility. Deployed model tokenization and whether a maximum-length response fits `maxOutputTokens = 1,024` remain unverified and must be covered by the separately authorized provider smoke check; truncation or malformed output continues to fail safely with `AI_INVALID_OUTPUT`.
