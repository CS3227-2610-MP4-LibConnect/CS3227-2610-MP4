# Security review: ai-gateway Group 1

Reviewer: independent `reviewer` agent. Assessment only; not a human approval.
Date: 2026-11-08. Spec v0.1; checklist and handoff v0.1. Scope: staged diff on `ai-gateway-g1` (base `522afc4`).
Main report: `review-G1.md`. Log: `logs/tasks/ai-gateway/review-G1.md`.

## Summary

There are no Critical or High security findings. One Medium privacy gap: typed assignments are not redacted (M1 in `review-G1.md`). Residual prompt-injection and redaction-coverage risks are Low and match the spec's best-effort framing.

## Secrets (spec: key never in logs, errors, records, fixtures)

- `config.js` stores `apiKey` as a non-enumerable property of a frozen object. A probe confirmed that `JSON.stringify`, spread, `Object.keys`, and `util.inspect` (the `console.log` path) all omit it.
- The disabled `reason` is built only from variable names and fixed problem words. A probe with a malformed key containing a space produced `SOCLAAS_API_KEY malformed` and no value.
- `config.js` never logs or throws. Every other Group 1 module logs nothing, except the usage store's fixed message.
- Key validation rejects CR/LF and other whitespace, which blocks header injection in T04. As a side effect, a key with a trailing newline disables the gateway (L4, fail-safe).
- Test fixtures use `test-key-not-real` and `example.test` hosts. Scanning the diff for real-format secrets found none.

## Redaction (R6)

- All seven R6 families are implemented, run in a fixed order, and are idempotent on already-redacted values. The cap runs after redaction, and the gateway rejects rather than truncates.
- ReDoS: every pattern has a literal prefix, a run-start lookbehind, or bounded quantifiers. Seventeen adversarial inputs of about 1M characters each, built to defeat these guards, ran in 1-30 ms (log). No catastrophic backtracking was found. Because redaction runs before the cap, this matters for availability.
- Gaps: typed assignments leak the value (Medium, M1). Edge and out-of-scope formats are listed under L2 (Low). A zero-width or full-width variant also bypasses the patterns, but the threat model is a user accidentally pasting their own secret, not one hiding it.

## Prompt injection (R7)

- The system message is `SHARED_PREAMBLE + systemPrompt`, both fixed strings, with no per-request values. Tests check byte identity across inputs and a faked clock.
- The user message is the only place untrusted content appears, between fixed delimiters. Every `<<<`/`>>>` run is replaced first, so the exact ASCII delimiters cannot appear inside the content (a probe confirmed only the two framing delimiters remain).
- Residual risk (L1): the replacement characters, and full-width forms, still look like the delimiter, and there is no per-request nonce. The model may follow injected text regardless. The controls that bound impact are R9 schema validation, advisory-only output, no tools, and no writes. All of these are in later groups and must be verified there.
- The registry rejects unknown feature names, including prototype keys such as `__proto__`, through an allow-list check before the `Map` lookup. It also rejects extra definition fields such as `model` or `tools`, so a feature cannot select a model or tools through its definition.

## Rate limits (R5) and trust boundary

- Counters are keyed by `sha256(kind:identifier)`, so raw `userId`s are never stored as document IDs. The kind prefixes keep the user and global keyspaces disjoint, including a user named `all`.
- Fail-closed was verified: store error, non-boolean grant, empty or non-string `userId`, and a throwing or NaN clock all return `AI_UNAVAILABLE`. Release failures are swallowed and only over-count.
- `userId` must come from the server-resolved actor. The limiter cannot enforce that; T08 must pass `actor.userId` from the session and never read it from feature input.
- Single-document global counter: contention under bursts can abort transactions, which fails closed as `AI_UNAVAILABLE`. That is availability, not security. Real-Firestore behaviour is unverified (I1).

## Usage records (R11)

- Records are built from an explicit allow-list. Extra properties (`prompt`, `content`, `response`, `apiKey`, raw `usage` fields) never reach the document (probe and test). Token fields accept only non-negative safe integers.
- `record` never rejects. A store error, a throwing logger, or an entry whose property getters throw all return `false`. Error objects are discarded and only the fixed string is logged.

## Authorization and scope

- The auth store refactor keeps the login-failure counters byte-compatible (see `review-G1.md`). Session and CSRF code is untouched.
- No route, no browser change, no dependency, no CI or deployment change, and no network access appear in the diff.
- No Firestore rules file exists in the repository. The new `aiRateCounters` and `aiUsage` collections must not be client-readable. The server uses the Admin SDK, but if client SDK access is ever added, rules must deny these collections. Retention and TTL are a follow-up (L5).

## Required before the feature tasks

1. Fix M1 and add typed-assignment tests.
2. T08: log the disabled reason exactly once. Pass a trusted `actor.userId`. Always write valid usage metadata. Map parse, throw, and non-conforming results to `AI_INVALID_OUTPUT`.
3. Add an emulator-backed counter test (I1).
