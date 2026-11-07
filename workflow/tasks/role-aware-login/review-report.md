# Independent review: role-aware login T01

- **Reviewer scope:** Group 1, T01 only (R1: accessible login form).
- **Specification reviewed:** `workflow/specs/role-aware-login.md`, version 0.2 (2026-11-05).
- **Task artifacts reviewed:** `workflow/tasks/role-aware-login/spec.md` (canonical spec reference), `tasks.md` version 0.2, `handoff.md` version 0.2, and `implementation-report.md` (T01 section).
- **Checklist status:** T01 remains unchecked. The reviewer does not update the shared checklist.
- **Separate checkout exception:** The implementation is uncommitted and planning artifacts are untracked; `.git` is read-only for this review, so a separate worktree or clean checkout was not available. Compensating controls: independently read the approved artifacts, inspected the complete working-tree status and all tracked diff, read the current UI source and component tests, and ran the exact focused T01 test command. No production or test files were modified.

## Review findings

No T01/R1 correctness findings.

The working tree also contains edits to `workflow/agents/*.toml` and untracked planning/evidence files, outside the four T01 files listed by the implementation report. The supplied context does not establish which of these workspace changes belong to T01. The orchestrator should reconcile their ownership before treating the whole working-tree diff as a T01 implementation. This is an attribution/workflow follow-up, not a defect in the reviewed form.

## Acceptance traceability

| R1 criterion | Evidence | Result |
| --- | --- | --- |
| Labelled email and password controls; password masked | `App.tsx` associates labels through `htmlFor`/`id`; email is `type="email"`, password is `type="password"`; focused test asserts accessible labels and password type. | Pass |
| Accessible, unambiguous Member/Librarian selector; visible selection and change | Native radios share `name="accountType"` inside a `fieldset` with `legend`; wrapping labels name each radio; selected option gets `is-selected` styling. Focused test checks accessible names, checked state, keyboard focus, change, and visible-state class. CSS styles selected and focus-visible states. | Pass |
| Submit action | A labelled `Sign in` submit button is present and asserted in the focused component test. Form prevents navigation pending T02 behavior. | Pass for T01 |
| Accessible validation/server error location | Field error elements are connected with `aria-describedby`; a form-level error region exists. All are empty for T01 and T02 is responsible for populating them. | Pass for structural R1 scope |
| Responsive form | Card width is bounded to 440px and mobile padding changes at 520px; body minimum width is 320px. | Pass by source inspection; no browser viewport test run |

The selector is presentation context only in this task. No UI selection is used as authentication authority. No password, hash, session value, or real user data is present in reviewed T01 source or synthetic component test values.

## Verification

From `src/libconnect-mp4/`:

- `npm test -- --watchAll=false --roots test --testMatch "**/test/**/*.test.tsx" --testNamePattern "shows labelled credentials|accessible radio group"` — **passed**, 1 suite passed, 2 T01 tests passed, 8 non-T01 tests skipped. CRA emitted a Node `punycode` deprecation warning; it did not affect the result.

No build was run: the focused component tests passed and no build-specific T01 risk remained. `implementation-report.md` records a successful `npm run build`, which was not independently repeated.

## Security and scope review

- T01 contains no backend authentication or authorization behavior, consistent with its assigned scope.
- The selected account type is local component state; there is no client-side authority claim or Firestore access in the reviewed form.
- The implementation adds no dependencies or configuration changes among the T01 source files.
- Test fixtures use `.test` addresses and synthetic passwords; no secrets or private data were found.
- T02 validation, network behavior, and populated error behavior were not evaluated as T01 acceptance criteria. Backend/session/security criteria T03–T05 are outside this review.

## Verdict

**Pass with follow-up.** The reviewed T01 implementation satisfies R1 based on source inspection and focused tests. Before the orchestrator records final task evidence, reconcile the unrelated workflow-profile and planning-file changes in the shared tree with their owning stage/task. No production changes are requested. The shared-checkout limitation and the lack of an independent build rerun remain recorded constraints.

## Re-review addendum — default CRA discovery follow-up (2026-11-05)

The reopened change removes only `src/libconnect-mp4/src/App.test.tsx`, whose sole assertion expected the deleted CRA starter screen. The login component suite remains at `src/libconnect-mp4/test/App.test.tsx`, matching the repository's test-writer handoff path. No production source, test, or configuration change was introduced by this reviewer.

The focused command was rerun after the test cleanup:

```text
npm test -- --watchAll=false --roots test --testMatch "**/test/**/*.test.tsx" --testNamePattern "shows labelled credentials|accessible radio group"
```

Result: exit 0; 1 suite passed, 2 T01 tests passed, 8 T02 tests skipped. The Node `punycode` deprecation warning recurred.

The implementation report records this default command result:

```text
CI=true npm test -- --watch=false --runInBand --silent
```

It exits 1 with `No tests found`, because CRA's default test discovery searches under `src/`, while the login suite is under repository-level `test/`. This result does not indicate an R1 assertion failure and does not invalidate the explicitly configured focused T01 run. It is a separate test-discovery/CI integration risk: the project's expected default verification command must be reconciled before that command can serve as a merge gate. No source, test, or configuration change is authorized in this review to resolve it.

**Updated verdict: Pass with follow-up.** T01/R1 remains verified. Follow-up: resolve which test command CI and the project expect, then make the default runner discover the intended tests or ensure CI invokes the approved focused/rooted command. The discovery failure is not an R1 correctness blocker, but it remains an unresolved verification integration risk.

## Group 4 — T05 independent review and checklist reconciliation (2026-11-06)

The separate T05 reviewer inspected the new React-to-Express integration test, current source and prior test/review evidence against approved specification v0.2. See `review-T05.md` for all 15 scenario traces and evidence levels and `security-review.md` for the authentication boundary assessment. Focused tests passed (1 suite, 7 tests), the full suite passed (6 suites, 61 tests), and the production build compiled. Verdict: **pass with follow-up**; no T05-specific defect or code change requested. The orchestrator marked T05 `[x]` after review. This does not grant merge approval.

The follow-up limits are actual Firestore persistence/transaction behavior, browser rules and deployed IAM, HTTPS/proxy/API routing, registration/email-change canonical collisions and migration, and shared dirty-worktree ownership. These remain distinct from the verified synthetic T05 scope and require separate decisions before live integration or a whole-worktree merge.
