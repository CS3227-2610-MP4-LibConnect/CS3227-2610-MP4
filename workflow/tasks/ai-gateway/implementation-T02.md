# Implementation report: ai-gateway T02 (redaction and input caps)

Status: implemented, awaiting independent review. Not committed.
Specification: `workflow/specs/ai-gateway.md` v0.1 (2026-11-08), requirement R6, scenario 6.
Checklist and handoff: v0.1 (2026-11-08). Group 1 (human-approved grouping).
Branch/worktree: `ai-gateway-t02`, based on `da3c249`.
Skill: path-adapted `openspec-apply-change` (per approved handoff).

## Changed files

- `src/codeclinic/server/ai/redact.js` (new)
- `src/codeclinic/test/ai-redact.test.js` (new, 46 tests)

No existing file was edited. No dependency, configuration, or CI change.

## Exported interface (`server/ai/redact.js`, CommonJS, pure)

- `REDACTED` = `'[REDACTED]'`
- `AI_INPUT_TOO_LARGE` = `'AI_INPUT_TOO_LARGE'`
- `redact(text: string): string` — applies every R6 pattern; throws `TypeError` for non-strings.
- `checkInputCap(redactedContent: string, maxInputChars: number)` →
  `{ ok: true, content }` or `{ ok: false, code: 'AI_INPUT_TOO_LARGE' }`; never truncates;
  throws `TypeError` for a non-string or a cap that is not a positive safe integer.
- `redactAndCap(content, maxInputChars)` — redact, then cap the redacted content (R6 order).

Pattern order: private key blocks, AWS key IDs, GitHub tokens, Google API keys,
Bearer tokens (token only), secret assignments (value only, quotes kept), emails.

## Verification

Run in `src/codeclinic` (node_modules symlinked to the shared install; `npm ci` not run):

| Command | Result |
| --- | --- |
| `CI=true npm test -- --watch=false` | 20 suites passed, 1 skipped (pre-existing `firestore-mode.integration.test.js`); 314 tests passed, 1 skipped |
| `npm run build` | Compiled successfully |
| `git diff --check` | Clean |

Tests cover each pattern, near misses, multi-line and unterminated key blocks,
multi-line assignments, already-redacted values, emails, idempotence, the cap
boundary (equal, one over, UTF-16 length, growth and shrinkage through
redaction), invalid arguments, and a ~800k-character adversarial input that
must finish under 2 s (observed well under 100 ms in ad hoc profiling).

## Deviations and assumptions

- Assumption: an unterminated private key block is redacted to end of content
  (spec says "to the matching end line"; this is the fail-safe reading).
- Assumption: Bearer tokens need at least 8 token characters, GitHub token
  bodies at least 20, so prose is not redacted. Shorter real tokens would be missed.
- Assumption: assignment values are single-line; a quoted value spanning lines
  is not redacted. Names are matched as substrings (for example `myToken`).
- Assumption: `maxInputChars` is measured in UTF-16 code units (`string.length`).
- Fix during implementation: the assignment value now accepts an already-redacted
  `[REDACTED]` value so `token = ghp_...` yields one marker, not `[REDACTED]]`.
- Environment: an earlier run in this worktree hit ENOSPC (disk full) while setting up
  dependencies; resumed after the coordinator freed space and symlinked node_modules.

## Unresolved risks

- Redaction is best-effort (R6); patterns can miss secrets in other formats
  (for example JWTs without `Bearer`, generic hex keys, URLs with credentials).
- Email redaction also hits email-shaped strings in code (for example npm scopes
  in `user@host.tld` form), which may reduce AI usefulness slightly.
