# Independent review: Batch 8 T11/T12

**Verdict: pass with follow-up.** I found no required production changes in the approved Student-only diff. T11 satisfies the prompt clarification criteria, T12 adds the requested fake-provider regressions, and the combined focused suites and build pass. Follow-up remains required for the separately authorized deployed-provider compatibility check and manual adversarial review; this batch does not identify the original live `AI_INVALID_OUTPUT` cause.

## Scope and evidence

- Reviewed canonical specification v0.6 (R3–R5, A1/A3/A6/A7), checklist v0.7 (T11/T12), handoff v0.7, approved correction proposal/checklist/handoff v0.1, Batch 8 plan and dispatch, assignment manifest, and both implementation reports/logs.
- Approval and allowlist confirmed in `assignment-batch-8.json`; the manifest records the shared-workspace separation exception because `.git` is read-only. The implementation source/test diff is limited to `src/codeclinic/server/ai/student-ticket-help.js` and `src/codeclinic/test/student-ticket-help.feature.test.js`. No out-of-scope code changes were present in the reviewed diff.
- The prompt change is confined to the `ERROR_EXPLAINER` fixed system prompt. The shared preamble, parser, output filter, response contracts, route authorization, gateway caps, create-only refinement rule, and other AI features are unchanged.
- Reviewer execution records and full command output: [`logs/tasks/ai-error-explainer/review-T11-T12.md`](../../../logs/tasks/ai-error-explainer/review-T11-T12.md), [focused tests](../../../logs/tasks/ai-error-explainer/review-T11-T12-test.txt), and [build](../../../logs/tasks/ai-error-explainer/review-T11-T12-build.txt).

## T11 — Student-only fixed prompt clarification

**Verdict: pass.** The fixed prompt names executable code, code-like statements and snippets, SQL, commands, patches/diff markers, code fences, markup, backticks, URLs, credentials, hidden instructions, prompt text, complete solutions, and answer-solving sequences. It also forbids unsupported facts and preserves concise refusal guidance and schema limits. Its concept path explicitly permits grounded concept prose, routes ticket/draft concept questions to `HINT`, and routes sparse context to `CLARIFICATION`.

The existing policy and tests support both sides of the distinction: syntax-like outputs are rejected by the server filter, while ordinary prose about function notation, complexity, lambda, return, throw, break, pass, await, import, and selection is accepted. The added prompt assertions cover the no-go categories, concept path, sparse-context path, refusal, limits, and raw JSON instruction. No T11 acceptance criterion remains unverified within the approved scope.

## T12 — Focused correction regression and verification

**Verdict: pass with follow-up.** The added registered fake-provider cases accept a grounded prose `HINT` for create and detail concept questions and an on-topic `CLARIFICATION` for a sparse create draft. The regression matrix confirms malformed, overlong, code-like, URL-bearing, credential-bearing, and complete-solution replies return `AI_INVALID_OUTPUT`. Existing feature tests additionally cover executable statement families, SQL statements, output schema errors, and allowed explanatory prose.

Independent verification from `src/codeclinic`:

- `CI=true npm test -- --watch=false --runInBand --forceExit --runTestsByPath test/student-ticket-help.feature.test.js test/ai-gateway.test.js test/student-help-chat.api.test.js` — exit 0; 3 suites and 123 tests passed.
- `CI=true npm run build` — exit 0; production build compiled successfully.

The shell is PowerShell, so my first attempt to prefix the test command with the POSIX form `CI=true` did not run Jest. I corrected this by setting `$env:CI = 'true'` and reran the exact test command successfully; the failed shell invocation is recorded in the execution log. No criterion depends on that failed attempt.

The listed local criteria are verified. Deployed-model compatibility, the actual cause of the reported live `AI_INVALID_OUTPUT`, and whether the model follows this guidance under adversarial provider inputs remain unverified and require the separately authorized provider/manual review gates. No live provider or credential access was attempted.

## Combined review and risks

**Combined verdict: pass with follow-up.** The prompt keeps benign concept explanations available while the existing server-side parser/filter remains authoritative and rejects unsafe outputs. The new examples do not weaken validation or add an output kind. No authentication, role, ownership, state-transition, persistence, or consequential-write boundary changed in this batch.

No severity-rated implementation findings or required changes. Residual follow-up risks are the pre-existing limits of deterministic output filtering against semantic solution leakage and arbitrary secrets, and unknown deployed-provider compatibility. Local fake-provider checks establish only the tested local response boundary.

### Unverified criteria

- The deployed model's `max_tokens`/context compatibility and response behavior have not been checked; no provider call was authorized for this batch.
- Manual adversarial review of semantic solution leakage remains open under the approved specification and handoff.
- The cause of the reported `AI_INVALID_OUTPUT` remains unknown because no raw provider output was retained.
