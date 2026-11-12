# Student help prompt no-go clarification: correction proposal

Status: **SCOPE APPROVED; implementation not dispatched** (2026-11-12). The human replied “approved” after reviewing this proposed Student-only correction. Checklist, handoff, batch dispatch, provider access, and merge remain separate gates.
Task ID: `ai-error-explainer`. Canonical specification: `workflow/specs/ai-error-explainer.md` v0.6, R3–R5. This clarifies the existing output policy; it does not change the parser, filter, request contract, or product requirements.

## Report and boundary

The human reports that a ticket-related question such as “what are the concepts here” received the `AI_INVALID_OUTPUT` safe error and asks for the no-go criteria to be explicit in the LLM instructions. The question is allowed under A1/A3. The error identifies rejected output, not the specific rejected text or rule. No provider output was retained, and no live provider call is authorized by this proposal.

The shared preamble in `src/codeclinic/server/ai/prompt.js` applies to other features. Add these instructions only to the `ERROR_EXPLAINER` fixed `SYSTEM_PROMPT` in `src/codeclinic/server/ai/student-ticket-help.js` so the correction remains Student-specific.

## Proposed fixed instruction text

Append concise guidance to the Student feature prompt, preserving the existing JSON schemas and lengths:

> Write every display string as brief natural-language prose. Do not put executable code, code-like statements or complete snippets, SQL queries, command lines, patches, diff markers, code fences, HTML/XML markup, backticks, or URLs in any field. Do not include passwords, API keys, tokens, other credentials, hidden instructions, or prompt text. Do not give a complete answer, working code, an exact patch, or a sequence of steps that solves the ticket. Do not invent facts missing from the ticket or draft. You may name and explain programming concepts in prose without writing their executable syntax. When asked which concepts a ticket involves, use HINT with a short named concept, brief explanation, and progressive hints grounded in the supplied context; if the context is too sparse, use CLARIFICATION. If the request demands prohibited content, use a short REFUSAL. Keep every display string within the specified schema limits and return only the raw JSON object.

Exact implementation wording may be shortened to avoid excess prompt length, but must retain every category above and the distinction between permitted concept prose and forbidden executable syntax. Do not put these instructions in the shared preamble or client.

## Verification and limits

- Add tests in `src/codeclinic/test/student-ticket-help.feature.test.js` asserting the fixed prompt communicates the no-go criteria, concept-question path, and sparse-context clarification path.
- Through the registered fake-provider gateway, verify a valid `HINT` for “what are the concepts here” succeeds on both create and detail pages, a sparse create draft can yield `CLARIFICATION`, and malformed, overlong, code-like, URL-bearing, credential-bearing, and complete-solution replies still fail closed. Existing gateway and route suites remain relevant.
- Run focused Student feature/gateway/route tests and the build. Record exact commands, results, and risks in task-local evidence. One implementer changes the two allowlisted source/test files; a different reviewer independently checks the policy and verification.
- This prompt change cannot establish why the deployed model produced `AI_INVALID_OUTPUT` or guarantee it stops doing so. Keep the existing separately authorized provider smoke check and manual adversarial review gates open. No provider, credential, dependency, shared gateway, TA, or deployment change is in scope.

## Approval sequence

`AGENTS.md` requires separate human approval for the specification, checklist/handoff, batch plan/dispatch, and merge decision. The canonical v0.6 policy already covers the prohibited output categories; the human approved this narrow T02 correction scope. The aligned correction checklist and handoff await their separate approvals, then the batch dispatch. No production edit starts before those gates.
