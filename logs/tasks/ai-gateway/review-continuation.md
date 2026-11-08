# AI gateway continuation review — factual execution log

Date: 2026-11-08. Role: independent reviewer. Task: T08/T09 and recovered transport hardening.

## Reviewed artifacts

- Frozen snapshot: `/private/tmp/codeclinic-gateway-review-20261108` (no `.git` directory), base recorded as `652e8ee`.
- Exact supplied change set: `gateway-continuation.diff`.
- Approved spec/checklist/handoff: AI gateway v0.1; checklist T08/T09; human approval evidence was recorded in those artifacts.
- Reviewed `AGENTS.md`, `workflow/README.md`, `workflow/specs/ai-gateway.md`, task `spec.md`, `tasks.md`, `handoff.md`, `implementation-report.md`, continuation log, and prior G1/G2 review/integration logs.
- Source/test inspection: `server/ai/gateway.js`, `server/ai/transport.js`, `server/index.js`, new gateway, browser-boundary, and transport-hardening tests; prior AI modules/tests as acceptance dependencies.
- No source or test files were edited. No real key, provider, network service, or Firestore instance was accessed.

## Commands and results

1. Read reviewer profile and `ai-security-review` skill; read repository workflow and approved artifacts — completed.
2. `CI=true npm test -- --watch=false --runInBand --runTestsByPath test/ai-config.test.js test/ai-features.test.js test/ai-gateway.test.js test/ai-parse.test.js test/ai-prompt.test.js test/ai-rate-limit.test.js test/ai-redact.test.js test/ai-transport.test.js test/ai-transport-hardening.test.js test/ai-usage-store.test.js test/ai-browser-boundary.test.js` from snapshot `src/codeclinic` — exit 0; 11 suites passed, 259 tests passed.
3. `CI=true npm test -- --watch=false --runInBand` from snapshot `src/codeclinic` — exit 1; 8 suites failed, 1 skipped, 22 passed (31 total); 192 failed, 1 skipped, 418 passed (611 total). The reported failures include `listen EPERM: operation not permitted 127.0.0.1` in existing tests that start local HTTP servers. The environment therefore did not permit a clean full-suite result.
4. `npm run build` from snapshot `src/codeclinic` — exit 0; optimized production build compiled successfully.
5. Local HTTP + Firestore-emulator integration — not run by this reviewer in the frozen snapshot. Human-only SoCLaaS `/models` and completion smoke — not run. No key or external provider call was made.

## Follow-on integration evidence inspected

After the frozen snapshot review, the orchestrator added `src/codeclinic/test/ai-gateway-emulator.integration.test.js` in the main repository. I inspected it read-only. It gates on `RUN_FIRESTORE_EMULATOR_TESTS=1`, requires the local `demo-codeclinic` emulator target, uses a synthetic actor, routes injected fetch to a loopback fake HTTP provider, checks redaction/result/usage/token metadata/counters, deletes that actor's usage records, and terminates Firestore. It does not delete the generated hashed `aiRateCounters` documents; this is a low test-isolation follow-up.

The orchestrator's `logs/tasks/ai-gateway/continuation.md` records the exact bounded command, Java Temurin 21.0.12.1+1-LTS, and result: exit 0, 2 suites and 2 tests passed in 6.9 seconds after sandbox escalation for loopback. This was not independently rerun by this reviewer. The real SoCLaaS smoke remains unverified.

That same orchestrator log records its later full-regression run with additional cross-feature fixture regressions as well as sandbox loopback failures (9 failed suites, 22 passed, 2 skipped; 199 failed tests, 420 passed, 2 skipped). My frozen-snapshot full-suite run separately reported 8 failed suites, 1 skipped, 22 passed, with 192 failed tests, 1 skipped, 418 passed; observed failures included `listen EPERM` from local HTTP tests. The production build in the snapshot passed; the orchestrator log records a later main-repository build exit 0 with an unrelated AccountPages dependency warning pending fix.

## Finding and outcome

- M1: Spec ambiguity between R4/R11 audit completeness and the safe behavior for missing/malformed actors. Current code returns unavailable without fabricating an audit identity. See `workflow/tasks/ai-gateway/review-report.md` and `security-review.md`.
- L1: The opt-in emulator integration test leaves synthetic hashed rate-counter documents in a reused emulator; see the report/security review.
- Verdict: **pass with follow-up**. AI suites/build and the orchestrator-run fake-provider/emulator integration pass. Full regression has sandbox and fixture failures; invalid-actor audit semantics, emulator counter cleanup, and the live provider smoke remain follow-ups.

## Reviewer runtime usage

| Role | Task/run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| reviewer | ai-gateway continuation, run 1 | gpt-6-luna (reviewer profile) | unavailable | unavailable | unavailable | unavailable; runtime counts not exposed to this agent |

## Read-only follow-up — 2026-11-08

Reviewed the approved spec R4/R11, checklist T08, and handoff clarification. They now explicitly require registered-feature and valid server-resolved actor validation before per-user usage recording, and disallow provider calls or fabricated audit identities for invalid actors. M1 is resolved; the original finding remains above as historical evidence.

Reviewed the amended `ai-gateway-emulator.integration.test.js`. It deletes `ai-user-minute` and `ai-user-day` counter documents using `sha256(kind + ':' + userId)`, matching `server/shared/firestore-rate-counter.js`. It leaves the environment-wide counter to the documented disposable `firebase emulators:exec` process. L1 is addressed in source. The orchestrator plans to rerun the opt-in integration after account integration stabilizes; this reviewer did not rerun it or broad tests.

Remaining unverified: amended opt-in emulator integration rerun; clean full regression (prior results include sandbox loopback `EPERM` and fixture failures); human-only live provider smoke for `SOCLAAS_MODEL` and `max_tokens`. No source, tests, checklist status, or approval state were edited by this reviewer. Runtime input/output/total token counts remain unavailable.

This addendum supersedes the prior M1/L1 open statuses: M1 is resolved by the human-approved spec clarification; L1 is addressed in source pending the opt-in integration rerun. The original findings remain above as historical evidence.
