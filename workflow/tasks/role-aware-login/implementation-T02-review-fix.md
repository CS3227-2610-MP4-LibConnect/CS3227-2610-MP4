# T02 review finding F1 implementation handoff

Task ID: `role-aware-login` / T02 review fix (F1 only)  
Specification: `workflow/specs/role-aware-login.md`, version 0.2 (2026-11-05)  
Status: complete; ready for independent re-review

## Scope and changes

Implemented the human-approved recommended follow-up for finding F1 in `workflow/tasks/role-aware-login/review-T02.md`. The only code/test file changed is `src/libconnect-mp4/test/App.test.tsx`.

Added component coverage for HTTP 200 responses with invalid JSON, missing `accountType`, and unsupported `accountType`. Each case asserts the form error appears in a `role="alert"` region and that the UI does not enter signed-in state. Updated HTTP 401 denial and HTTP 503 retry tests to assert their messages appear in a `role="alert"` region. Existing test cases were not weakened. No production source, specification, checklist, package/configuration, Group 3/T04, or Firebase files were changed.

## Preflight and constraints

Read `AGENTS.md`, `workflow/agents/implementer.toml`, `workflow/README.md`, the approved v0.2 specification, task checklist and handoff, T02 implementation handoff and review, and the assigned component/source files. The applicable selected skill is `.agents/skills/openspec-apply-change/SKILL.md`, using the repository’s `workflow/specs/` adapter. `openspec list --json` returned a project root and `"changes": []`; the CLI has no `role-aware-login` change. Per the orchestrator assignment, continued using the approved canonical artifacts directly and recorded this limitation. No external services or live Firebase were accessed.

## Verification

Commands were run from `src/libconnect-mp4/`:

- `npm test -- --watchAll=false --runInBand --runTestsByPath test/App.test.tsx` — PASS, 1 suite and 13 tests.
- `npm test -- --watchAll=false --runInBand` — PASS, 4 suites and 51 tests.

The first focused run failed because singular `findByRole('alert')` was ambiguous among the form and empty field alert regions. A second run exposed an assertion timing issue for the invalid-JSON case. Assertions were refined to wait for the matching message among `getAllByRole('alert')`; the final focused and full runs passed. Node emitted a `[DEP0040]` `punycode` deprecation warning during test runs.

## Acceptance and remaining risks

F1's requested malformed HTTP 200 cases and direct alert-region assertions for denial and retry are covered. No production behavior was changed. This is component-level coverage using mocked fetch responses; it does not add HTTP integration or backend/session verification. Independent review of this exact test change remains pending. No checklist or shared implementation report status was modified.

## Next action

Independent reviewer: inspect this focused test diff and rerun relevant checks, then report findings to the orchestrator. This handoff does not grant merge approval.
